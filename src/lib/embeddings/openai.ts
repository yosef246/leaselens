/**
 * Shared OpenAI embedding helper. Used identically for the law corpus (P1, this file's first
 * consumer), contract chunks (P2), and query-time embedding (P3/P5) per docs/ARCHITECTURE.md §1.
 */
import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

// OpenAI's embeddings endpoint accepts up to 2048 inputs per request; we stay well under that
// so a single failed batch is cheap to retry and doesn't risk request-size limits on long texts.
const MAX_BATCH_SIZE = 96;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local (see .env.example) before running embeddings."
    );
  }
  client = new OpenAI({ apiKey });
  return client;
}

/**
 * Batch-embeds an array of strings with text-embedding-3-small (1536 dims). Splits into
 * batches of MAX_BATCH_SIZE. Returns embeddings in the same order as the input `texts`
 * (OpenAI's response `index` field is used to re-sort each batch defensively).
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const openai = getClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    const ordered = [...response.data].sort((a, b) => a.index - b.index);
    for (const item of ordered) {
      results.push(item.embedding);
    }
  }

  return results;
}

/** Embeds a single string (e.g. a chat question or an analysis query). */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
