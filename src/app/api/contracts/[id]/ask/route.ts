/**
 * POST /api/contracts/[id]/ask — RAG Q&A over one contract + the whole law corpus.
 *
 * Guarded by session + explicit ownership. Embeds the question, retrieves top-K from BOTH
 * contract_chunks (owner's contract) and law_chunks (global), gates on similarity, then streams
 * a grounded Claude answer. The retrieved sources (with markers the model was told to cite) ride
 * back on the `X-Sources` response header so the UI can render the citations panel.
 *
 * Fallback (owner decision): if the contract yields < CONTRACT_MIN_HITS above threshold, we drop
 * the weak contract context entirely and answer law-only, logging it for pattern analysis.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getContract } from "@/lib/db/contracts";
import { matchLawChunksHybrid, matchContractChunksHybrid } from "@/lib/db/retrieval";
import { embedText } from "@/lib/embeddings/openai";
import { buildKeywordQuery } from "@/lib/rag/query";
import {
  buildRagPrompt,
  MIN_SIMILARITY,
  CONTRACT_MIN_HITS,
  type LawContextItem,
  type ContractContextItem,
} from "@/lib/rag/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const TOP_K = 6;
const MODEL = "claude-sonnet-5";

const askSchema = z.object({
  question: z.string().trim().min(3, "שאלה קצרה מדי").max(1000, "שאלה ארוכה מדי"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const contract = await getContract(user.id, id);
  if (!contract) {
    return NextResponse.json({ error: "החוזה לא נמצא" }, { status: 404 });
  }
  if (contract.status !== "embedded") {
    return NextResponse.json(
      { error: "החוזה עדיין לא עובד. הרץ 'עבד' לפני שאלה." },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "שאלה לא תקינה" },
      { status: 400 }
    );
  }
  const { question } = parsed.data;

  // ---- Retrieval (hybrid: vector + keyword RRF) ----
  let lawItems: LawContextItem[];
  let contractItems: ContractContextItem[];
  try {
    const queryEmbedding = await embedText(question);
    const keywordQuery = buildKeywordQuery(question);
    const [lawHits, contractHits] = await Promise.all([
      matchLawChunksHybrid(queryEmbedding, keywordQuery, TOP_K),
      matchContractChunksHybrid(user.id, id, queryEmbedding, keywordQuery, TOP_K),
    ]);

    // A hit is relevant if it's a strong vector match OR the keyword arm matched it
    // (keyword catches dense sections that vector dilution buries, e.g. חוק השכירות §25י).
    const relevant = (h: { similarity: number; keyword_matched?: boolean }) =>
      h.similarity >= MIN_SIMILARITY || h.keyword_matched === true;

    lawItems = lawHits.filter(relevant).map((h) => ({
      short_title: h.short_title,
      section_number: h.section_number,
      text: h.text,
      similarity: h.similarity,
      keyword_matched: h.keyword_matched,
    }));

    const strongContract = contractHits.filter(relevant);
    if (strongContract.length < CONTRACT_MIN_HITS) {
      // Weak contract retrieval → law-only, per owner decision. Log for pattern analysis.
      console.warn(
        `[ask] weak contract retrieval: ${strongContract.length}/${CONTRACT_MIN_HITS} hits >= ${MIN_SIMILARITY} ` +
          `(contract=${id}, q="${question.slice(0, 60)}") → law-only fallback`
      );
      contractItems = [];
    } else {
      contractItems = strongContract.map((h) => ({
        section_number: h.section_number,
        text: h.text,
        similarity: h.similarity,
        keyword_matched: h.keyword_matched,
      }));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "retrieval failed";
    return NextResponse.json({ error: `אחזור נכשל: ${message}` }, { status: 500 });
  }

  const { system, prompt, sources } = buildRagPrompt(question, lawItems, contractItems);

  const result = streamText({
    model: anthropic(MODEL),
    system,
    prompt,
    // claude-sonnet-5 does not support `temperature` (AI SDK warns + ignores it).
    maxOutputTokens: 2048,
  });

  const sourcesB64 = Buffer.from(JSON.stringify(sources), "utf-8").toString("base64");
  return result.toTextStreamResponse({
    headers: {
      "X-Sources": sourcesB64,
      "Access-Control-Expose-Headers": "X-Sources",
    },
  });
}
