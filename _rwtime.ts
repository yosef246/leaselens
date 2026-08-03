import { loadLocalEnv } from "./src/lib/load-local-env.ts";
loadLocalEnv();
import { getSupabaseAdmin } from "./src/lib/supabase/admin.ts";
import { z } from "zod";
const s = getSupabaseAdmin();
const CID = "6b7246a2-1371-4f54-bbb3-e54555c3d7ec";
const ch = await s.from("contract_chunks").select("section_number,text,chunk_index").eq("contract_id",CID).order("chunk_index").limit(30);
const iss = await s.from("contract_issues").select("section_number,category,suggested_fix,user_approved").eq("contract_id",CID);
const originals = (ch.data||[]) as any[];
const approved = ((iss.data||[]) as any[]).filter(i=>i.user_approved);
console.log(`originals=${originals.length}  approved(user_approved=true)=${approved.length}  (total issues=${(iss.data||[]).length})`);

const fixByKey = new Map<string,any>();
for(const f of approved){ const k=f.section_number??""; if(!fixByKey.has(k)) fixByKey.set(k,f); }
const tasks:any[]=[];
originals.forEach((o,i)=>{ const fix=fixByKey.get(o.section_number??""); if(fix) tasks.push({ref:i,section_number:o.section_number,original:o.text,fix}); });
console.log(`rewrite tasks (fixed sections sent to Claude)=${tasks.length}`);
if(tasks.length===0){ console.log("⚠️ 0 tasks — nothing would be sent to Claude"); process.exit(0); }

const { createAnthropic } = await import("@ai-sdk/anthropic");
const { generateObject } = await import("ai");
const A = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const schema = z.object({ sections: z.array(z.object({ ref:z.number().int(), text:z.string() })) });
const SYSTEM = "אתה עורך דין. שכתב כל סעיף לפי התיקון המאושר, עברית, בלי הערות. החזר sections:[{ref,text}].";
const prompt = tasks.map(t=>`--- ref ${t.ref} | סעיף ${t.section_number} ---\nמקור: ${t.original}\nתיקון (${t.fix.category}): ${t.fix.suggested_fix}`).join("\n\n");
console.log(`prompt chars=${prompt.length}`);

const t0=Date.now();
const { object, usage } = await generateObject({ model:A("claude-sonnet-5"), schema, system:SYSTEM, prompt,
  providerOptions:{ anthropic:{ thinking:{ type:"disabled" } } } });
console.log(`\n⏱ Claude rewrite (thinking OFF): ${((Date.now()-t0)/1000).toFixed(1)}s  | returned ${object.sections.length} sections | out tokens=${usage.outputTokens}`);
