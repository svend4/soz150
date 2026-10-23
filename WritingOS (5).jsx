import { useState, useRef, useEffect, useCallback, useMemo, Component } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// SKILLS DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const SKILLS = [
  { id:"deadline-calc", name:"Deadline Calc", cat:"legal",
    desc:"German legal deadlines: Widerspruch (§84 SGG 1mo), Klage (§87 SGG 1mo), Berufung. Handles weekends/holidays per §64 SGG, §37 SGB X postal rule +3 days.",
    triggers:["frist","deadline","widerspruch frist","klage frist","SGG §87","BGB §187","срок","дедлайн","berechnen","fristende"],
    ctx:`SKILL: Deadline Calculator\n- Widerspruch: 1 Monat ab Zustellung (§84 SGG)\n- Klage: 1 Monat ab Widerspruchsbescheid (§87 SGG)\n- Postal rule: +3 days if mailed (§37 SGB X)\n- Weekend/holiday shift → next Werktag (§64 Abs.3 SGG)\n- Always output: Fristbeginn, Fristende, Safety (-3d), Risk level` },
  { id:"court-analyzer", name:"Court Analyzer", cat:"legal",
    desc:"Analyzes German Bescheide, Urteile, Widerspruchsbescheide. Extracts parties, deadlines, §§, weaknesses. SGB IX/XII specialist. Case refs S 6 SO 58/26 ER, S 7 SO 99/25.",
    triggers:["analyze","bescheid","urteil","widerspruchsbescheid","проанализируй","analyse","KSV","Sozialgericht","court","weakness"],
    ctx:`SKILL: Court Document Analyzer\n1. PARTIES: Antragsteller, Behörde, Az.\n2. LEGAL BASIS: §§ cited + correctness\n3. DEADLINES: all Fristen\n4. WEAKNESSES: missing Begründung, wrong §§, procedural errors\n5. COUNTER-ARGS: BSG precedents\n6. NEXT STEP: Widerspruch/Klage/Eilantrag` },
  { id:"template-gen", name:"Template Generator", cat:"legal",
    desc:"Generates Widerspruch, Klage, Eilantrag (§86b SGG), Stellungnahme, PKH-Antrag, Akteneinsicht. Includes §§ and BSG citations.",
    triggers:["erstelle","generate","template","widerspruch schreiben","klage","шаблон","create","antrag","stellungnahme","verfassen"],
    ctx:`SKILL: Legal Template Generator\nFormats: Widerspruch, Klage (§90 SGG), Eilantrag (§86b SGG), PKH (§73a SGG)\nStyle: formal German, Sie-form. Include: Betreff, Az., Sachverhalt, Begründung+§§, Antrag, ANLAGE.\nKey BSG: B 8 SO 9/19 R (Pers.Budget), B 1 KR 10/17 R (EGH)` },
  { id:"pers-budget", name:"Persönliches Budget", cat:"legal",
    desc:"Expert §29 SGB IX: Arbeitgebermodell, Assistenzleistungen, Bedarfsermittlung §118, Gesamtplanverfahren §121, budget calculation, KSV Sachsen.",
    triggers:["persönliches budget","arbeitgebermodell","assistenz","§29","eingliederungshilfe","bedarfsermittlung","personal budget","PB","KSV"],
    ctx:`SKILL: Persönliches Budget §29 SGB IX\nProcess: Antrag→Bedarfsermittlung(§118)→Gesamtplan(§121)→Bescheid→Budget\nAmount: Sachleistungsäquivalent des Leistungsträgers\nArbeitgebermodell: Nutzer = Arbeitgeber\nWiderspruch: §84 SGG 1 Monat\nKSV Sachsen: zuständig stationäre EGH Sachsen` },
  { id:"sgb-xii", name:"SGB XII Expert", cat:"legal",
    desc:"SGB XII: Sozialhilfe, Grundsicherung §41, Schonvermögen §90, Einkommen §82-89, Hilfe zur Pflege §61.",
    triggers:["SGB XII","sozialhilfe","grundsicherung","schonvermögen","§90","§82","vermögen","einkommen"],
    ctx:`SKILL: SGB XII\nSchonvermögen §90: 10.000€ (single), 20.000€ (couple), +500€/dependent\nEinkommen §82: brutto - taxes - SV - Freibeträge\nHilfe zur Pflege §61: complements SGB XI Pflegegrad 1-5\nEGH: seit 1.1.2020 in SGB IX Part 2 §§99-150` },
  { id:"eilantrag", name:"Eilantrag §86b", cat:"legal",
    desc:"Urgent motions §86b SGG: Anordnungsanspruch + Anordnungsgrund + Glaubhaftmachung. Time-critical Sozialgericht proceedings.",
    triggers:["eilantrag","einstweilig","§86b","dringend","urgent","vorläufig","срочно","sofortige"],
    ctx:`SKILL: Eilantrag §86b SGG\nRequirements: Anordnungsanspruch (likely right) + Anordnungsgrund (urgency)\nUrgency: health risk, homelessness, financial emergency\nGlaubhaftmachung: eidesstattliche Versicherung accepted\nQuote: Art.19 Abs.4 GG + Art.2 GG\nTimeline: filing → decision ~1-4 weeks` },
  { id:"code-sandbox", name:"Code Sandbox", cat:"technical",
    desc:"Python 3.11 (Pyodide WASM) or JavaScript execution. Persistent REPL with namespace. numpy, pandas, datetime available. Best for calculations, data analysis, document generation.",
    triggers:["code","python","javascript","calculate","compute","run","pandas","numpy","вычисли","код","скрипт","script","compute","rechnen"],
    ctx:`SKILL: Live Code Sandbox\nPython: Pyodide 3.11 WASM, persistent REPL, numpy/pandas/datetime\nJS: isolated Web Worker (no DOM/window/localStorage/network), wrap in function run(){return result}; async run() is allowed\nPersistence: variables survive between calls\nLegal use: date calculations, template generation, data tables` },
  { id:"data-analysis", name:"Data Analysis", cat:"technical",
    desc:"Structured data analysis, tables, deadline matrices, cost calculations for Persönliches Budget, document tracking, pandas DataFrames.",
    triggers:["table","tabelle","data","statistics","timeline","costs","budget","диаграмма","таблица","статистика","matrix","übersicht"],
    ctx:`SKILL: Data Analysis\nTools: pandas, datetime, json\nLegal use cases: deadline matrices, cost-benefit Pers.Budget, document tracking\nOutput: markdown table, HTML, pandas DataFrame\nAlways include: headers, source notation, totals` },
  { id:"research", name:"Legal Research", cat:"legal",
    desc:"BSG/LSG/SG case law, legal commentaries, §§ validation, BSG Az. lookup, current jurisprudence for SGB IX/XII cases.",
    triggers:["BSG","LSG","rechtsprechung","case law","citation","precedent","recherche","найди","jurisprudenz","urteil suchen"],
    ctx:`SKILL: Legal Research\nKey BSG: B 8 SO 9/19 R, B 8 SO 21/17 R, B 1 KR 10/17 R, B 3 KR 14/20 R\nCite: BSG, Urteil v. DD.MM.YYYY, Az. X X XX/XX X, BSGE XXX, XX\nVerify: §§ currency (last amendment)\nSources: bundessozialgericht.de, dejure.org, gesetze-im-internet.de` },
  { id:"document-writer", name:"Document Writer", cat:"writing",
    desc:"Professional German documents: reports, memos, formal letters, analysis papers. German formal style, legal formatting, multilingual DE/RU/EN.",
    triggers:["write","schreiben","document","report","memo","letter","напиши","документ","formal","draft","brief","bericht"],
    ctx:`SKILL: Document Writer\nFormats: Bericht, Memo, Brief, Stellungnahme, Gutachten\nStyle: formal German Sie-form, passive constructions\nStructure: Betreff, date, Az., body, Unterschrift\nMultilingual: DE/RU/EN` },
];

const CAT = {
  legal:       { bg:"#0d2b0d", border:"#3fb95055", text:"#3fb950" },
  technical:   { bg:"#0d1928", border:"#58a6ff55", text:"#58a6ff" },
  writing:     { bg:"#1a0d28", border:"#bc8cff55", text:"#bc8cff" },
  productivity:{ bg:"#1a1400", border:"#d2992255", text:"#d29922" },
};

const MAX_RETRIES = 2;

// One place to change the model for every call below.
// claude-sonnet-5-5 is newer, but it runs adaptive thinking by default, which would eat the small
// max_tokens budgets of the router / summariser / retry calls — raise those before switching.
const MODEL = "claude-sonnet-4-6";

// First text block of a Messages API response ("" if there is none). content[0] is not always text.
const firstText = d => (d?.content || []).find(b => b?.type === "text")?.text || "";

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════
const ROUTER_SYS = `You are a semantic skill router. Given a task, select 1-3 best matching skills.
Return ONLY valid JSON (no markdown, no backticks):
{"selected":["id1","id2"],"scores":[0.95,0.72],"task_type":"legal|code|writing|data|other","reasoning":"short explanation","language":"ru|de|en"}`;

// ── Route cache: LRU of 20 ────────────────────────────────────────────────
// The key is the whole normalised task + a hash of the catalog the router actually sees, so adding,
// editing or removing a skill never serves a stale route. Only {id,score} pairs are stored; on a hit
// they are re-resolved against the CURRENT skills, so an edited ctx / deleted skill is never served.
// Failures (HTTP errors, unparsable output, no valid skill) are never cached.
const ROUTE_CACHE_MAX = 20;
const _routeCache = new Map();
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const routeCatalog = db => db.map(s =>
  `ID:${s.id} | ${s.name} | ${s.desc} | triggers:${s.triggers.slice(0,4).join(",")}`
).join("\n");

async function routeTask(task, allSkills) {
  const db = allSkills || SKILLS;
  const catalog = routeCatalog(db);
  const norm = task.trim().toLowerCase().replace(/\s+/g, " ");
  const key = `${hashStr(catalog)}|${norm.length}:${hashStr(norm)}`;

  const hit = _routeCache.get(key);
  if (hit) {
    const skills = hit.picks
      .map(p => { const s = db.find(x => x.id === p.id); return s ? { skill:s, score:p.score } : null; })
      .filter(Boolean);
    if (skills.length) {
      _routeCache.delete(key); _routeCache.set(key, hit);          // refresh recency (real LRU)
      return { skills, ...hit.meta };
    }
    _routeCache.delete(key);
  }

  const none = { skills:[], task_type:"other", reasoning:"", language:"ru" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:MODEL, max_tokens:300,
        system: ROUTER_SYS,
        messages:[{ role:"user", content:`SKILLS:\n${catalog}\n\nTASK: ${task}\n\nJSON only:` }],
      }),
    });
    if (!res.ok) return none;
    const txt = firstText(await res.json()) || "{}";
    const clean = txt.replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || "{}");
    const picks = (parsed.selected||[]).map((id,i) =>
      db.some(x => x.id===id) ? { id, score: parsed.scores?.[i] ?? 0.7 } : null
    ).filter(Boolean);
    const meta = { task_type: parsed.task_type||"other",
                   reasoning: parsed.reasoning||"", language: parsed.language||"ru" };
    const skills = picks.map(p => ({ skill: db.find(x => x.id===p.id), score: p.score }));
    if (skills.length) {
      if (_routeCache.size >= ROUTE_CACHE_MAX) _routeCache.delete(_routeCache.keys().next().value);
      _routeCache.set(key, { picks, meta });
    }
    return { skills, ...meta };
  } catch { return none; }
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY SUMMARY — rolling, kept beside the raw log
// ═══════════════════════════════════════════════════════════════════════════
// `history` keeps the full raw log. The summary lives next to it as {text, code[], upto}: the first
// `upto` raw messages are folded into `text`. What the model sees is
//     [summary pair] + history.slice(upto) + the new user message
// so the roles keep alternating and nothing is overwritten. Folding happens only once enough
// un-summarised messages have piled up (about every 4 exchanges), never on every send.
const SUMMARY_TRIGGER  = 12;  // fold when ≥12 raw messages sit beyond the summary…
const SUMMARY_KEEP     = 4;   // …keeping the last 4 (two exchanges) verbatim
const SUMMARY_HARD_MAX = 24;  // if summarising keeps failing, never send more raw messages than this
const SUMMARY_RETRY_GAP = 4;  // after a failed attempt wait for 4 more messages before trying again
const CODE_BUDGET      = 4000;

const clip = (s, head, tail) => s.length <= head + tail ? s : `${s.slice(0, head)}\n[…]\n${s.slice(-tail)}`;
const codeBlocksOf = text => [...String(text ?? "").matchAll(/```[a-z]*\n([\s\S]*?)```/gi)]
  .map(m => m[1].trim()).filter(Boolean);

// Where the verbatim tail starts: always a "user" message, so the array sent keeps alternating.
function foldPoint(history, upto) {
  let cut = history.length - SUMMARY_KEEP;
  while (cut > upto && history[cut]?.role !== "user") cut--;
  return cut > upto ? cut : upto;
}

// Code is kept verbatim (latest definition per function/class name), outside the lossy prose summary.
function mergeCode(prev, msgs) {
  const all = [...(prev || []), ...msgs.filter(m => m.role === "assistant").flatMap(m => codeBlocksOf(m.content))];
  const keyOf = c => (c.match(/^\s*(?:async\s+)?(?:def|function|class)\s+([A-Za-z_$][\w$]*)/m) || [])[1] || c;
  const byKey = new Map();
  for (const c of all) { const k = keyOf(c); byKey.delete(k); byKey.set(k, clip(c, 1100, 400)); }
  const out = [...byKey.values()];
  let size = out.reduce((n, c) => n + c.length, 0);
  while (out.length > 1 && size > CODE_BUDGET) size -= out.shift().length;
  return out;
}

const SUMMARY_SYS = `You compress a legal-assistant conversation into a rolling summary.
Output the updated summary only (max 250 words), in the conversation's language.
Keep verbatim: case numbers (Az.), dates, deadlines (Fristen), §§, amounts, names, decisions, open tasks,
and the names and signatures of any functions or variables that were defined.
If a PREVIOUS SUMMARY is given, keep every fact in it and add what the NEW MESSAGES change.`;

// Returns the new summary text, or null when the call fails (the caller keeps the old summary).
async function summarizeHistory(prev, msgs) {
  const excerpt = msgs.map(m => `${m.role}: ${clip(String(m.content ?? ""), 1500, 500)}`).join("\n---\n");
  const body = `${prev?.text ? `PREVIOUS SUMMARY:\n${prev.text}\n\n` : ""}NEW MESSAGES:\n${excerpt}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:MODEL, max_tokens:900, system:SUMMARY_SYS,
        messages:[{ role:"user", content:body }],
      }),
    });
    if (!res.ok) return null;
    return firstText(await res.json()).trim() || null;
  } catch { return null; }
}

// Folds old messages into the summary when enough have accumulated.
// Returns {summary, failedAt}: failedAt = history length at a failed attempt (back-off), else null.
async function compactHistory(history, summary, failedAt) {
  const upto = summary?.upto || 0;
  if (history.length - upto < SUMMARY_TRIGGER) return { summary, failedAt };
  if (failedAt != null && history.length - failedAt < SUMMARY_RETRY_GAP) return { summary, failedAt };
  const cut = foldPoint(history, upto);
  if (cut <= upto) return { summary, failedAt };
  const folded = history.slice(upto, cut);
  const text = await summarizeHistory(summary, folded);
  if (!text) return { summary, failedAt: history.length };
  return { summary: { text, code: mergeCode(summary?.code, folded), upto: cut }, failedAt: null };
}

// Messages sent to the model before the new user message.
function contextMessages(history, summary) {
  let tail = history.slice(summary?.upto || 0);
  if (tail.length > SUMMARY_HARD_MAX) {                       // summarising keeps failing: bound the context
    tail = tail.slice(-(SUMMARY_HARD_MAX - SUMMARY_TRIGGER));
    while (tail.length && tail[0].role !== "user") tail.shift();
  }
  if (!summary?.text) return tail;
  const code = summary.code?.length
    ? `\n\n[Code from earlier steps]\n${summary.code.map(c => "```\n" + c + "\n```").join("\n")}` : "";
  return [
    { role:"user",      content:`[Сводка предыдущего диалога]\n${summary.text}${code}` },
    { role:"assistant", content:"Понял, продолжаю с учётом этого контекста." },
    ...tail,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM SKILLS — localStorage persistence
// ═══════════════════════════════════════════════════════════════════════════
const SKILLS_STORAGE_KEY = "wos_custom_skills_v1";

function loadCustomSkills() {
  try { return JSON.parse(localStorage.getItem(SKILLS_STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function persistCustomSkills(skills) {
  localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skills));
}

// ═══════════════════════════════════════════════════════════════════════════
// NAMESPACE AUTOSAVE — localStorage
// ═══════════════════════════════════════════════════════════════════════════
// Every 3rd successful Python run the runtime's restore script is stored here. On the next visit the app
// OFFERS to restore it (never runs it silently). It is removed by Clear, by loading a Python .wos session, by
// "Отбросить", and after 24 h. It holds case data in plain text — that is why it can be discarded.
const SNAPSHOT_KEY      = "wos_namespace_snapshot";        // the Python restore script itself
const SNAPSHOT_META_KEY = "wos_namespace_snapshot_meta";   // {ts, runs}
const SNAPSHOT_TTL_MS   = 24 * 3600 * 1000;

function saveSnapshotToStorage(script, runs) {
  if (!script) { clearSnapshotStorage(); return; }   // nothing restorable any more: do not keep the old copy
  try {
    localStorage.setItem(SNAPSHOT_KEY, script);
    localStorage.setItem(SNAPSHOT_META_KEY, JSON.stringify({ ts:Date.now(), runs }));
  } catch {
    // Quota exceeded / storage blocked: autosave is best effort. Drop the older snapshot too, so a
    // stale namespace is never offered in place of the one that could not be written.
    clearSnapshotStorage();
  }
}
function clearSnapshotStorage() {
  try { localStorage.removeItem(SNAPSHOT_KEY); localStorage.removeItem(SNAPSHOT_META_KEY); } catch { /* ignore */ }
}
// {script, ts, vars} when a fresh autosave exists, else null (stale ones are dropped).
function readSnapshotOffer() {
  try {
    const script = localStorage.getItem(SNAPSHOT_KEY);
    if (!script) return null;
    let meta = {};
    try { meta = JSON.parse(localStorage.getItem(SNAPSHOT_META_KEY) || "{}"); } catch { /* no meta */ }
    if (meta.ts && Date.now() - meta.ts > SNAPSHOT_TTL_MS) { clearSnapshotStorage(); return null; }
    return { script, ts: meta.ts || null, vars: (script.match(/^try:\n {4}[\p{L}_][\p{L}\p{N}_]*=/gmu) || []).length };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILL COMPOSER — system prompt + helpers
// ═══════════════════════════════════════════════════════════════════════════
const COMPOSER_SYS = `You are a skill architect for Writing OS, a German legal document management system with semantic skill routing.

Generate skill objects in this EXACT format (JSON inside triple backticks):
\`\`\`json
{
  "id": "unique-kebab-case-id",
  "name": "2-4 word display name",
  "cat": "legal|technical|writing|productivity",
  "desc": "2-3 sentences for semantic router. Include domain keywords, §§ numbers, German terms.",
  "triggers": ["keyword1", "phrase2", "§XX SGG", "русский", "deutsch", ...],
  "ctx": "SKILL: Name\\nKey rule 1\\nKey rule 2\\n..."
}
\`\`\`
Then 1 short sentence of explanation.

Rules:
- id: lowercase kebab-case, unique, descriptive
- triggers: 8-15 entries, multilingual (DE/RU/EN), include §§ references if legal
- ctx: max 450 chars, start with "SKILL: {name}\\n", specific facts/rules/formulas only
- If request is vague, generate reasonable draft and note assumptions
- Refinement requests: return full updated JSON
Respond in user's language (RU/DE/EN).`;

function extractSkillJSON(text) {
  const m = text.match(/```json\n([\s\S]*?)```/);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}

function validateSkill(s) {
  if (!s) return "нет JSON";
  if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) return "id должен быть kebab-case";
  if (!s.name || s.name.length < 2) return "нет name";
  if (!["legal","technical","writing","productivity"].includes(s.cat)) return "неверный cat";
  if (!s.desc || s.desc.length < 10) return "нет desc";
  if (!Array.isArray(s.triggers) || s.triggers.length < 3) return "triggers: мин. 3";
  if (!s.ctx || !s.ctx.startsWith("SKILL:")) return 'ctx должен начинаться с "SKILL:"';
  return null; // valid
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════════════
function buildSysPrompt(lang, sessionVars, routeResult) {
  const skillCtx = routeResult.skills.map(m =>
    `=== SKILL: ${m.skill.name} ===\n${m.skill.ctx}`
  ).join("\n\n");
  const sessionCtx = sessionVars
    ? `\nCurrent Python session variables:\n${sessionVars}` : "";
  const codeInstr = lang === "py"
    ? `Write Python. Use print() for output. Packages: numpy, pandas, datetime, json, re.\nSession is persistent — previous variables are accessible.${sessionCtx}\nFormat:\n\`\`\`python\n# code\nprint(result)\n\`\`\``
    : `Write JavaScript wrapped in function run(){return result}.\nIt runs in an isolated Web Worker: there is no document, window, DOM, localStorage or network access. Compute and return values (objects and arrays are shown as JSON; build HTML as a string if you need markup). async run() is allowed.\nFormat:\n\`\`\`javascript\nfunction run() {\n  // code\n  return result;\n}\n\`\`\``;
  return `You are Writing OS — German legal document management system with live code execution.
${skillCtx ? `\nACTIVE SKILLS:\n${skillCtx}\n` : ""}
${codeInstr}

After the code block, add 1-2 sentence explanation. Respond in user's language (RU/DE/EN).`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGAL ASSERTION CHECKER
// ═══════════════════════════════════════════════════════════════════════════
const ASSERTION_RULES = {
  widerspruch: [
    { id:"antrag",  label:"Antrag formuliert",         sev:"error",
      check: t => /beantragt?|antrag\s+stell|stattzugeben|aufzuheben/i.test(t),
      hint:"Fügen Sie einen klaren Antrag ein: 'Es wird beantragt…'" },
    { id:"beg",     label:"Begründung vorhanden",       sev:"error",
      check: t => /begründung/i.test(t) && t.length > 250,
      hint:"Eine Begründung (min. 2-3 Sätze) ist zwingend erforderlich" },
    { id:"az",      label:"Aktenzeichen vorhanden",     sev:"warning",
      check: t => /Az\.|S\s+\d+\s+\w+|KSV|\d{2,}\/\d{2,}/i.test(t),
      hint:"Aktenzeichen des angefochtenen Bescheids angeben" },
    { id:"para84",  label:"§84 SGG zitiert",            sev:"warning",
      check: t => /§\s*84\s+SGG/i.test(t),
      hint:"Rechtsgrundlage für Widerspruchsfrist: §84 SGG" },
    { id:"datum",   label:"Datum vorhanden",             sev:"warning",
      check: t => /\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/.test(t),
      hint:"Datum des Widerspruchs angeben" },
    { id:"sachv",   label:"Sachverhalt dargelegt",       sev:"info",
      check: t => /sachverhalt|zum sachverhalt/i.test(t) },
    { id:"bsg",     label:"BSG-Rechtsprechung zitiert", sev:"info",
      check: t => /BSG|B\s+\d+\s+\w+\s+\d+\/\d+/i.test(t),
      hint:"BSG-Entscheidungen stärken die Begründung erheblich" },
    { id:"anlage",  label:"Anlage-Liste vorhanden",     sev:"info",
      check: t => /anlage[n]?\s*[:|\n]/i.test(t) },
  ],
  eilantrag: [
    { id:"anspruch", label:"Anordnungsanspruch dargelegt", sev:"error",
      check: t => /anordnungsanspruch/i.test(t),
      hint:"Anordnungsanspruch muss explizit benannt und begründet werden" },
    { id:"grund",    label:"Anordnungsgrund (Dringlichkeit)", sev:"error",
      check: t => /anordnungsgrund|dringend|wesentliche?\s+nachteil|gesundheit/i.test(t),
      hint:"Dringlichkeit konkret darstellen: Gesundheit, existenzielle Not etc." },
    { id:"glaubh",  label:"Glaubhaftmachung erwähnt",   sev:"error",
      check: t => /glaubhaft|eidesstattlich|versichere/i.test(t),
      hint:"Glaubhaftmachung (§86b Abs.2 S.4 SGG) ist Voraussetzung" },
    { id:"para86b", label:"§86b Abs.2 SGG zitiert",     sev:"warning",
      check: t => /§\s*86b/i.test(t),
      hint:"Rechtsgrundlage §86b Abs.2 SGG angeben" },
    { id:"antrag",  label:"Antrag formuliert",           sev:"error",
      check: t => /beantragt?|antrag\s+stell/i.test(t) },
    { id:"art19",   label:"Art.19 Abs.4 GG erwähnt",    sev:"info",
      check: t => /art\.?\s*19\s+abs\.?\s*4|effektiver\s+rechtsschutz/i.test(t),
      hint:"Art.19 Abs.4 GG stärkt den Eilantrag erheblich" },
    { id:"datum",   label:"Datum vorhanden",              sev:"warning",
      check: t => /\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/.test(t) },
  ],
  klage: [
    { id:"antrag",  label:"Klageantrag formuliert",     sev:"error",
      check: t => /klag.*antrag|beantragt?|aufzuheben|verurteilt/i.test(t) },
    { id:"beg",     label:"Klagebegründung vorhanden",  sev:"error",
      check: t => /begründung|klagebegründung/i.test(t) && t.length > 300 },
    { id:"gericht", label:"Gericht adressiert",          sev:"warning",
      check: t => /sozialgericht|landessozialgericht|gericht/i.test(t) },
    { id:"para90",  label:"§§ 87-90 SGG zitiert",       sev:"warning",
      check: t => /§\s*87\s+SGG|§\s*90\s+SGG/i.test(t) },
    { id:"frist",   label:"Klagefrist erwähnt",          sev:"info",
      check: t => /frist|rechtzeitig|monat/i.test(t) },
    { id:"bsg",     label:"BSG-Rechtsprechung zitiert", sev:"info",
      check: t => /BSG|B\s+\d+\s+\w+\s+\d+\/\d+/i.test(t) },
  ],
  generic: [
    { id:"para",    label:"§§-Referenz vorhanden",      sev:"warning",
      check: t => /§\s*\d+/.test(t) },
    { id:"datum",   label:"Datum vorhanden",              sev:"warning",
      check: t => /\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/.test(t) },
    { id:"sign",    label:"Unterschrift/Grußformel",    sev:"info",
      check: t => /hochachtungsvoll|mit freundlichen|unterschrift|gez\./i.test(t) },
  ],
};

function detectLegalDocType(text) {
  const t = text.toLowerCase();
  if (/eilantrag|einstweilig/i.test(t))    return "eilantrag";
  if (/\bklage\b|kläger\b/i.test(t))       return "klage";
  if (/widerspruch/i.test(t))              return "widerspruch";
  if (/stellungnahme/i.test(t))            return "generic";
  return null; // not a legal document
}

function isLegalDoc(text) {
  return text.length > 150 &&
    /widerspruch|eilantrag|\bklage\b|§\s*\d+\s+SGG|SGB\s+(IX|XII)|sozialgericht/i.test(text);
}

function runStructuralCheck(text) {
  const docType = detectLegalDocType(text) || "generic";
  const rules   = ASSERTION_RULES[docType] || ASSERTION_RULES.generic;
  const results = rules.map(r => ({ ...r, passed: r.check(text) }));
  const passed  = results.filter(r => r.passed).length;
  return {
    docType,
    results,
    score:    Math.round((passed / results.length) * 100),
    errors:   results.filter(r => !r.passed && r.sev === "error"),
    warnings: results.filter(r => !r.passed && r.sev === "warning"),
    infos:    results.filter(r => !r.passed && r.sev === "info"),
  };
}

// Streaming-friendly prompt: readable lines first, then JSON
const SEMANTIC_STREAM_PROMPT = `You are a German social law expert (SGG/SGB IX/XII specialist).
Analyze this legal document. Output in EXACTLY this format:

ANALYSE: {detected document type}

[✓] Field — assessment (one line per finding, max 12 words)
[✗] Field — problem. Suggested fix
[⚠] Field — warning. Recommendation

SCORE: 0-100
STATUS: valid|warning|error

\`\`\`json
{"score":0-100,"valid":true|false,"issues":[{"severity":"error|warning|info","field":"German field","message":"specific problem","suggestion":"fix"}],"suggestions":["tip"],"strengths":["good aspect"]}
\`\`\`

Rules:
- Each [✓]/[✗]/[⚠] line is one finding, concise
- [✗] only for errors, [⚠] for warnings, [✓] for passing items
- JSON must be valid and at the very end
- Respond in document's language (DE/RU/EN)
- Score: 90+=court-ready, 70-89=minor, 50-69=revision, <50=problems`;

// Parse color-coded stream lines for display
function parseStreamLines(text) {
  const clean = text.replace(/```json[\s\S]*?```[\s]*/g, "").trimEnd();
  return clean.split("\n").map((line, i) => {
    const t = line.trim();
    if(!t) return { type:"blank",  text:"" };
    if(t.startsWith("[✓]"))    return { type:"pass",   text: t.slice(4) };
    if(t.startsWith("[✗]"))    return { type:"fail",   text: t.slice(4) };
    if(t.startsWith("[⚠]"))    return { type:"warn",   text: t.slice(4) };
    if(t.startsWith("SCORE:")) return { type:"score",  text: t };
    if(t.startsWith("STATUS:"))return { type:"status", text: t };
    if(t.startsWith("ANALYSE:")) return { type:"header", text: t.slice(9).trim() };
    return { type:"text", text: t };
  });
}

// Extract JSON from completed stream
function extractSemanticJSON(text) {
  const m = text.match(/```json\n?([\s\S]*?)```/);
  if(!m) return null;
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}

// Streaming semantic check — calls onChunk on every token, onComplete when done
async function streamSemanticCheck(text, docType, onChunk, onComplete) {
  let full = "", buf = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:MODEL, max_tokens:700,
        stream: true,
        system: SEMANTIC_STREAM_PROMPT,
        messages:[{ role:"user", content:`Document type: ${docType}\n\n${text}` }],
      }),
    });
    if(!res.ok) throw new Error(`API ${res.status}`);

    const reader = res.body.getReader();
    const dec = new TextDecoder();

    outer: while(true) {
      const {done, value} = await reader.read();
      if(done) break;
      buf += dec.decode(value, {stream:true});
      const lines = buf.split("\n"); buf = lines.pop();
      for(const ln of lines) {
        if(!ln.startsWith("data: ")) continue;
        const raw = ln.slice(6).trim();
        if(raw === "[DONE]") break outer;
        try {
          const evt = JSON.parse(raw);
          if(evt.type==="content_block_delta" && evt.delta?.type==="text_delta") {
            full += evt.delta.text;
            onChunk(full);
          }
        } catch {}
      }
    }
  } catch(e) {
    full = `[✗] Semantic check failed — ${e.message}`;
    onChunk(full);
  }
  onComplete(full, extractSemanticJSON(full));
}

// ═══════════════════════════════════════════════════════════════════════════
// PYTHON RUNTIME — Pyodide in a Web Worker
// ═══════════════════════════════════════════════════════════════════════════
// Pyodide runs in a dedicated Blob Web Worker, so an infinite loop can be killed without freezing the tab:
//   • runPython(code, {timeoutMs}) — default 30 s. On timeout the worker is terminate()d, a fresh one is
//     started in the background and the namespace is restored from the last snapshot.
//   • A snapshot (a Python restore script) is taken inside the worker after every completed run. It is
//     available synchronously via getSnapshot() and pushed to options.onSnapshot.
//   • If a Worker cannot be created at all (CSP / sandbox) the same operations run on the main thread
//     (old behaviour: no timeout). getMode() tells which one is active.
//   • Every helper is async. The worker and the fallback share createPyOps, so they cannot drift apart.
// Verified in headless Chromium against the real Pyodide 0.25.1 (kill + respawn + restore, stdout capture,
// error text, numpy/pandas round trips). Restore limits: functions, classes, sets, tuples, Series and
// arbitrary objects are not restorable and are skipped.

// ── Python snippets (one source of truth for the worker and the fallback) ──
const PY_SNIPPETS = {
  // executed once after the packages are loaded (and again after a clear)
  init: "import sys,io,json,re,datetime,collections,textwrap",

  // one run: capture stdout into a StringIO, restore it afterwards
  runBegin: "import sys,io\n_buf=io.StringIO()\nsys.stdout=_buf",
  runEnd: "_buf.getvalue()",
  runRestoreStdout: "sys.stdout=sys.__stdout__",

  // session variables as JSON {name:{type,repr}} (public names only)
  vars: String.raw`
import json as _j
_skip={'sys','io','json','re','datetime','collections','textwrap','_buf','_j','_skip','__builtins__','__name__','__doc__','__package__','__loader__','__spec__','_out2','_k2','_v2'}
_out2={}
for _k2,_v2 in list(globals().items()):
    if not _k2.startswith('_') and _k2 not in _skip:
        try: _out2[_k2]={'type':type(_v2).__name__,'repr':repr(_v2)[:100]}
        except: pass
_j.dumps(_out2)`,

  // delete every user-defined name, keep builtins and the base modules
  clear: String.raw`
_keep=set(dir(__builtins__))|{'sys','io','json','re','datetime','collections','textwrap','__builtins__','__name__','__doc__','__package__','__loader__','__spec__'}
for _k in list(globals().keys()):
    if _k not in _keep and not _k.startswith('__'):
        try: del globals()[_k]
        except: pass`,

  /* buildRestore - turns the namespace into a Python script that rebuilds it.
   *
   * The script's LAST expression is the string itself (it must not print()): runPython() returns it.
   *   - str/int/float/bool/None/list/dict: name=json.loads(<python repr of the JSON text>). Exact for
     *     plain data (NaN included, emoji stay intact). Containers that do NOT survive a JSON round trip
     *     (tuples inside lists, non-string dict keys, sets, ...) are never restored in a changed form:
     *     they are skipped and reported.
   *   - DataFrame: JSON text embedded with repr() (orient='split'), dtypes recorded and re-applied.
   *   - ndarray: dtype and NaN preserved.
   *   - modules the user imported (pd, np, math, ...) are re-imported.
   *   - every variable is restored in its own try/except; failures AND everything that cannot be
   *     restored at all (functions, classes, sets, tuples, bytes, Series, user objects, lossy
   *     containers) end up in _wos_failed, which popFailed reports to JS.
   *   - helper names are underscore-prefixed so they stay hidden from getSessionVars.
   * Returns "" when there is nothing restorable.
   */
  buildRestore: String.raw`
import json as _jr
_skip_r={'sys','io','json','re','datetime','collections','textwrap','_buf','__builtins__','__name__','__doc__','__package__','__loader__','__spec__'}
try:
    import pandas as _pd_r
except Exception:
    _pd_r=None
try:
    import numpy as _np_r
except Exception:
    _np_r=None
_lines_r=[]
_skipped_r=[]
_has_df_r=False
_has_np_r=False
def _blk_r(_k,_stmt):
    return "try:\n    "+_stmt+"\nexcept Exception:\n    _wos_failed.append("+repr(_k)+")"
for _k_r,_v_r in list(globals().items()):
    if _k_r.startswith('_') or _k_r in _skip_r or not _k_r.isidentifier(): continue
    try:
        if isinstance(_v_r,(str,int,float,bool,type(None),list,dict)):
            _js_r=_jr.dumps(_v_r)
            if repr(_jr.loads(_js_r))==repr(_v_r):
                _lines_r.append(_blk_r(_k_r,_k_r+"=json.loads("+repr(_js_r)+")"))
            else:
                _skipped_r.append(_k_r)
        elif _pd_r is not None and isinstance(_v_r,_pd_r.DataFrame):
            _lines_r.append(_blk_r(_k_r,_k_r+"=_wos_df("+repr(_v_r.to_json(orient='split',date_format='iso'))+","+repr([str(_t) for _t in _v_r.dtypes])+")"))
            _has_df_r=True
        elif _np_r is not None and isinstance(_v_r,_np_r.ndarray):
            _lines_r.append(_blk_r(_k_r,_k_r+"=_wos_np.array(json.loads("+repr(_jr.dumps(_v_r.tolist()))+"),dtype="+repr(str(_v_r.dtype))+")"))
            _has_np_r=True
        elif type(_v_r).__name__=='module':
            _mn_r=_v_r.__name__
            _lines_r.append(_blk_r(_k_r,("import "+_mn_r) if _mn_r==_k_r else ("import "+_mn_r+" as "+_k_r)))
        else:
            _skipped_r.append(_k_r)
    except Exception:
        _skipped_r.append(_k_r)
_hdr_r=["import json","_wos_failed=[]"]
if _has_np_r:
    _hdr_r.append("import numpy as _wos_np")
if _has_df_r:
    _hdr_r+=["import io as _wos_io","import pandas as _wos_pd","def _wos_df(js,dts):","    d=_wos_pd.read_json(_wos_io.StringIO(js),orient='split',dtype=False,convert_dates=False,convert_axes=False)","    for i,t in enumerate(dts):","        try: d.isetitem(i,d.iloc[:,i].astype(t))","        except Exception: pass","    return d"]
if _skipped_r:
    _hdr_r.append("_wos_failed.extend("+repr(_skipped_r)+")")
_script_r=("\n".join(_hdr_r+_lines_r)) if _lines_r else ""
_script_r`,

  // after replaying a restore script: which variables failed (and remove the helper)
  popFailed: "import json as _jx\n_jx.dumps(globals().pop('_wos_failed', []))"
};

// ── Operations on a Pyodide instance (used inside the worker AND by the main-thread fallback) ──
// MUST stay free of references to outer scope: its source is also baked into PY_WORKER_SOURCE below.
function createPyOps(SNIPPETS) {
  var py = null;

  // run user code with stdout captured: {result: trimmed stdout | "(нет вывода)", error: message | null}
  async function execCapture(code) {
    try {
      py.runPython(SNIPPETS.runBegin);
      await py.runPythonAsync(code);
      var out = py.runPython(SNIPPETS.runEnd);
      py.runPython(SNIPPETS.runRestoreStdout);
      return { result: out.trim() || "(нет вывода)", error: null };
    } catch (e) {
      try { py.runPython(SNIPPETS.runRestoreStdout); } catch (e2) {}
      var msg = (e && e.message !== undefined) ? e.message : String(e);
      var res = { result: null, error: msg };
      // Pyodide marks itself dead after an internal fatal error; tell the main thread to replace the worker
      if (/Pyodide has suffered a fatal error|Pyodide already fatally failed/.test(msg)) res.fatal = true;
      return res;
    }
  }

  function getVars() {
    try { return JSON.parse(py.runPython(SNIPPETS.vars)); } catch (e) { return {}; }
  }

  function clearNs() {
    py.runPython(SNIPPETS.clear);
    py.runPython(SNIPPETS.init);
  }

  // string = restore script ("" = nothing to restore), null = could not build one
  function snapshot() {
    try {
      var s = py.runPython(SNIPPETS.buildRestore);
      return (typeof s === 'string') ? s : null;
    } catch (e) { return null; }
  }

  function popFailed() {
    try { return JSON.parse(py.runPython(SNIPPETS.popFailed)); } catch (e) { return []; }
  }

  async function dispatch(op, msg) {
    switch (op) {
      case 'ping':
        return 'pong';
      case 'run': {
        var r = await execCapture(msg.code);
        // namespace snapshot after every completed run (success or Python exception)
        r.snapshot = (msg.snapshot === false) ? null : snapshot();
        return r;
      }
      case 'vars':
        return getVars();
      case 'clear':
        clearNs();
        return true;
      case 'snapshot':
        return snapshot();
      case 'restore': {
        var rr = await execCapture(msg.script);
        rr.failed = popFailed();
        rr.snapshot = (msg.snapshot === false) ? null : snapshot();
        return rr;
      }
    }
    throw new Error('Unknown op: ' + op);
  }

  return { setPy: function (p) { py = p; }, dispatch: dispatch };
}

// ── The worker script. Plain strings, so a transpiling bundler cannot rewrite it. ──
// Generated from createPyOps + pyWorkerMain; if you change createPyOps, change both copies.
const PY_WORKER_SOURCE = [
  "\"use strict\";",
  "var SNIPPETS = " + JSON.stringify(PY_SNIPPETS) + ";",
  "var createPyOps = function createPyOps(SNIPPETS) {",
  "  var py = null;",
  "",
  "  // run user code with stdout captured: {result: trimmed stdout | \"(нет вывода)\", error: message | null}",
  "  async function execCapture(code) {",
  "    try {",
  "      py.runPython(SNIPPETS.runBegin);",
  "      await py.runPythonAsync(code);",
  "      var out = py.runPython(SNIPPETS.runEnd);",
  "      py.runPython(SNIPPETS.runRestoreStdout);",
  "      return { result: out.trim() || \"(нет вывода)\", error: null };",
  "    } catch (e) {",
  "      try { py.runPython(SNIPPETS.runRestoreStdout); } catch (e2) {}",
  "      var msg = (e && e.message !== undefined) ? e.message : String(e);",
  "      var res = { result: null, error: msg };",
  "      // Pyodide marks itself dead after an internal fatal error; tell the main thread to replace the worker",
  "      if (/Pyodide has suffered a fatal error|Pyodide already fatally failed/.test(msg)) res.fatal = true;",
  "      return res;",
  "    }",
  "  }",
  "",
  "  function getVars() {",
  "    try { return JSON.parse(py.runPython(SNIPPETS.vars)); } catch (e) { return {}; }",
  "  }",
  "",
  "  function clearNs() {",
  "    py.runPython(SNIPPETS.clear);",
  "    py.runPython(SNIPPETS.init);",
  "  }",
  "",
  "  // string = restore script (\"\" = nothing to restore), null = could not build one",
  "  function snapshot() {",
  "    try {",
  "      var s = py.runPython(SNIPPETS.buildRestore);",
  "      return (typeof s === 'string') ? s : null;",
  "    } catch (e) { return null; }",
  "  }",
  "",
  "  function popFailed() {",
  "    try { return JSON.parse(py.runPython(SNIPPETS.popFailed)); } catch (e) { return []; }",
  "  }",
  "",
  "  async function dispatch(op, msg) {",
  "    switch (op) {",
  "      case 'ping':",
  "        return 'pong';",
  "      case 'run': {",
  "        var r = await execCapture(msg.code);",
  "        // namespace snapshot after every completed run (success or Python exception)",
  "        r.snapshot = (msg.snapshot === false) ? null : snapshot();",
  "        return r;",
  "      }",
  "      case 'vars':",
  "        return getVars();",
  "      case 'clear':",
  "        clearNs();",
  "        return true;",
  "      case 'snapshot':",
  "        return snapshot();",
  "      case 'restore': {",
  "        var rr = await execCapture(msg.script);",
  "        rr.failed = popFailed();",
  "        rr.snapshot = (msg.snapshot === false) ? null : snapshot();",
  "        return rr;",
  "      }",
  "    }",
  "    throw new Error('Unknown op: ' + op);",
  "  }",
  "",
  "  return { setPy: function (p) { py = p; }, dispatch: dispatch };",
  "};",
  "(function pyWorkerMain(SNIPPETS, createPyOps) {",
  "  var ops = createPyOps(SNIPPETS);",
  "  var ready = false;",
  "",
  "  function post(m) { self.postMessage(m); }",
  "",
  "  async function init(msg) {",
  "    var base = msg.indexURL;",
  "    post({ type: 'status', text: 'Загрузка Pyodide…' });",
  "    // Fail fast (instead of hanging until the init timeout) when CSP forbids WebAssembly compilation.",
  "    try { await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])); }",
  "    catch (e) { throw new Error(\"WebAssembly is blocked in this context (CSP needs 'wasm-unsafe-eval'): \" + e.message); }",
  "    importScripts(base + 'pyodide.js');               // classic worker: importScripts is allowed",
  "    post({ type: 'status', text: 'Инициализация Python 3.11…' });",
  "    var py = await self.loadPyodide({ indexURL: base });",
  "    post({ type: 'status', text: 'Загрузка numpy, pandas…' });",
  "    await py.loadPackagesFromImports('import numpy; import pandas');",
  "    py.runPython(SNIPPETS.init);",
  "    ops.setPy(py);",
  "    ready = true;",
  "    return { version: py.version };",
  "  }",
  "",
  "  self.onmessage = function (e) {",
  "    var msg = e.data;",
  "    if (!msg || typeof msg.id !== 'number') return;",
  "    Promise.resolve().then(function () {",
  "      if (msg.op === 'init') return init(msg);",
  "      if (!ready) throw new Error('Python is not initialised');",
  "      return ops.dispatch(msg.op, msg);",
  "    }).then(function (value) {",
  "      post({ id: msg.id, ok: true, value: value });",
  "    }, function (err) {",
  "      post({ id: msg.id, ok: false, error: { name: (err && err.name) || 'Error', message: (err && err.message !== undefined) ? err.message : String(err) } });",
  "    });",
  "  };",
  "",
  "  post({ type: 'hello' });",
  "})(SNIPPETS, createPyOps);",
].join("\n");

// ── Main-thread API ──
var PYWORKER_DEFAULT_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/';

function createPyRuntime(userOptions) {
  var ROOT = (typeof globalThis !== 'undefined') ? globalThis : window;

  var cfg = Object.assign({
    indexURL: PYWORKER_DEFAULT_INDEX_URL,
    defaultTimeoutMs: 30000,      // runPython
    helperTimeoutMs: 10000,       // vars / clear / snapshot (a hostile __repr__ must not hang us either)
    initTimeoutMs: 180000,        // loading Pyodide + numpy + pandas
    restoreTimeoutMs: 60000,      // replaying a restore script
    retryCooldownMs: 5000,        // after a failed (re)start, implicit retries by other calls wait this long (initPy() always retries)
    fallback: true,               // main-thread Pyodide if no Worker is possible
    snapshotSeed: '',             // restore script replayed on the first init (e.g. from localStorage)
    workerSource: (typeof PY_WORKER_SOURCE !== 'undefined') ? PY_WORKER_SOURCE : null,
    snippets: (typeof PY_SNIPPETS !== 'undefined') ? PY_SNIPPETS : null,
    opsFactory: (typeof createPyOps !== 'undefined') ? createPyOps : null,
    onStatus: null,               // (text) loading progress, also during respawns
    onEvent: null,                // ({type,...}) timeout | respawn-start | respawn-ready | respawn-failed | fallback | snapshot-dropped
    onSnapshot: null              // (script) called after every snapshot update
  }, userOptions || {});

  var S = {
    mode: null,                   // 'worker' | 'main'
    worker: null,
    gen: 0,
    nextId: 1,
    pending: new Map(),           // id -> {id, op, worker, resolve, reject, timer}
    ready: false,
    readyPromise: null,
    info: null,
    snapshot: cfg.snapshotSeed || '',
    chain: Promise.resolve(),
    mainOps: null,
    disposed: false,
    respawns: 0,
    inflight: 0,
    events: [],
    workersCreated: 0,
    lastFail: null
  };

  function mkErr(kind, message) { var e = new Error(message); e.kind = kind; return e; }
  function now() { return (ROOT.performance && ROOT.performance.now) ? ROOT.performance.now() : Date.now(); }
  function emit(ev) {
    ev.t = Date.now();
    S.events.push(ev); if (S.events.length > 300) S.events.shift();
    if (cfg.onEvent) { try { cfg.onEvent(ev); } catch (e) {} }
  }
  function status(text) { if (cfg.onStatus) { try { cfg.onStatus(text); } catch (e) {} } }
  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(mkErr('timeout', label + ': timed out after ' + ms + ' ms')); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function safeTerminate(w) {
    try { w.onmessage = null; w.onerror = null; w.onmessageerror = null; } catch (e) {}
    try { w.terminate(); } catch (e) {}
    if (w && w._url) { try { URL.revokeObjectURL(w._url); } catch (e) {} w._url = null; }
  }

  // ---------------------------------------------------------------- snapshot
  function commitSnapshot(script) {
    if (typeof script !== 'string') return;
    S.snapshot = script;
    if (cfg.onSnapshot) { try { cfg.onSnapshot(script); } catch (e) {} }
  }

  // ---------------------------------------------------------------- serialisation of calls
  function enqueue(fn) {
    var run = S.chain.then(fn);
    S.chain = run.then(null, function () {});
    return run;
  }

  // ---------------------------------------------------------------- worker plumbing
  // One Blob URL PER worker, revoked as soon as the worker has started (hello) or is discarded.
  // A long-lived shared URL could be revoked from inside the worker (self.location.href), which would
  // make every later (re)spawn fail.
  function revokeWorkerUrl(w) {
    if (w && w._url) { try { URL.revokeObjectURL(w._url); } catch (e) {} w._url = null; }
  }

  function rejectPendingFor(w, err) {
    S.pending.forEach(function (p, id) {
      if (p.worker === w) { clearTimeout(p.timer); S.pending.delete(id); p.reject(err); }
    });
  }

  function onWorkerMessage(w, d) {
    if (!d) return;
    w._seen = true;
    if (d.type === 'hello') { revokeWorkerUrl(w); return; }
    if (d.type === 'status') { status(d.text); return; }
    var p = S.pending.get(d.id);
    if (!p) return;
    S.pending.delete(d.id); clearTimeout(p.timer);
    if (d.ok) p.resolve(d.value);
    else { var e = mkErr('remote', d.error && d.error.message); e.name = (d.error && d.error.name) || 'Error'; p.reject(e); }
  }

  // 'error' / 'messageerror' event of the Worker object.
  //  - before the worker said hello (script blocked by CSP, URL refused): fatal, kind 'worker-unavailable'
  //  - while loading Pyodide (not ready yet): fatal, kind 'crash'
  //  - once ready: NOT fatal.  A dedicated worker survives uncaught errors, and Pyodide itself raises them
  //    for harmless things: `raise SystemExit` / `sys.exit()` in user code is re-thrown by the asyncio web loop
  //    as an uncaught error event while runPythonAsync() still rejects normally.  We only log an event; real
  //    breakage is caught by the timeouts and by the "Pyodide fatal error" detection in callLive().
  function onWorkerFatal(w, what, message) {
    if (S.worker !== w) return;
    if (S.ready) { emit({ type: 'worker-error', what: what, message: String(message || '').slice(0, 300) }); return; }
    var kind = w._seen ? 'crash' : 'worker-unavailable';
    rejectPendingFor(w, mkErr(kind, 'Worker ' + what + (message ? ': ' + message : '')));
  }

  function startWorker() {
    if (typeof Worker === 'undefined') throw mkErr('worker-unavailable', 'Worker is not available in this context');
    var w, url = null;
    try {
      if (!cfg.workerSource) throw mkErr('worker-unavailable', 'PY_WORKER_SOURCE is not defined');
      url = URL.createObjectURL(new Blob([cfg.workerSource], { type: 'application/javascript' }));
      w = new Worker(url);
    } catch (e) {
      if (url) { try { URL.revokeObjectURL(url); } catch (e2) {} }
      throw (e && e.kind) ? e : mkErr('worker-unavailable', 'new Worker() failed: ' + (e && e.message));
    }
    S.workersCreated++; S.gen++;
    w._seen = false; w._url = url;
    w.onmessage = function (ev) { if (S.worker === w) onWorkerMessage(w, ev.data); };
    w.onerror = function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); onWorkerFatal(w, 'error', ev && ev.message); };
    w.onmessageerror = function () { onWorkerFatal(w, 'messageerror', ''); };
    S.worker = w;
    return w;
  }

  function killWorker(w, reason) {
    if (S.worker === w) { S.worker = null; S.ready = false; }
    safeTerminate(w);
    rejectPendingFor(w, mkErr('terminated', 'Python worker terminated: ' + reason));
  }

  // one RPC on a specific worker; rejects with kind timeout|crash|terminated|remote|worker-unavailable
  function callOn(w, op, payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var id = S.nextId++;
      var p = { id: id, op: op, worker: w, resolve: resolve, reject: reject, timer: null };
      if (timeoutMs != null && isFinite(timeoutMs)) {
        p.timer = setTimeout(function () {
          if (S.pending.get(id) === p) {
            S.pending.delete(id);
            var e = mkErr('timeout', op + ': timed out after ' + timeoutMs + ' ms'); e.timeoutMs = timeoutMs;
            reject(e);
          }
        }, timeoutMs);
      }
      S.pending.set(id, p);
      try { w.postMessage(Object.assign({ id: id, op: op }, payload)); }
      catch (e) { S.pending.delete(id); clearTimeout(p.timer); reject(mkErr('crash', 'postMessage failed: ' + e.message)); }
    });
  }

  // RPC on the live worker.  A timeout (or crash) kills it and starts the replacement before rejecting.
  async function callLive(op, payload, timeoutMs) {
    if (S.mode === 'main') return S.mainOps.dispatch(op, payload);       // no kill possible
    var w = S.worker;
    if (!w) throw mkErr('terminated', 'no live worker');
    S.inflight++;
    try {
      var value = await callOn(w, op, payload, timeoutMs);
      // Pyodide reports an unrecoverable internal failure in the error text of the run result:
      // the interpreter is unusable from now on -> replace the worker (result is still returned to the caller)
      if (value && value.fatal && S.worker === w) {
        emit({ type: 'fatal', op: op, message: String(value.error || '').slice(0, 200) });
        killWorker(w, 'pyodide fatal error'); respawn('pyodide fatal error');
      }
      return value;
    } catch (e) {
      if (e.kind === 'timeout') {
        emit({ type: 'timeout', op: op, timeoutMs: timeoutMs });
        if (S.worker === w) { killWorker(w, op + ' timeout'); respawn(op + ' timeout'); }
      } else if (e.kind === 'crash' && S.worker === w) {
        killWorker(w, op + ' crash'); respawn(op + ' crash');
      }
      throw e;
    } finally { S.inflight--; }
  }

  // ---------------------------------------------------------------- spawn / respawn
  // main-thread fallback; bounded by a watchdog because a CSP that silently blocks WebAssembly makes loadPyodide() hang forever
  function spawnMain(restoreScript) {
    return withTimeout(spawnMainInner(restoreScript), cfg.initTimeoutMs, 'main-thread init').then(function (info) {
      S.mode = 'main'; S.ready = true; return info;
    });
  }
  async function spawnMainInner(restoreScript) {
    var snippets = cfg.snippets, factory = cfg.opsFactory;
    if (!snippets || !factory) throw mkErr('unavailable', 'main-thread fallback needs PY_SNIPPETS and createPyOps');
    var ops = S.mainOps || (S.mainOps = factory(snippets));
    status('Загрузка Pyodide…');
    if (!ROOT.loadPyodide) {
      await new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = cfg.indexURL + 'pyodide.js'; s.onload = res; s.onerror = function () { rej(mkErr('unavailable', 'pyodide.js failed to load')); };
        document.head.appendChild(s);
      });
    }
    status('Инициализация Python 3.11…');
    var py = await ROOT.loadPyodide({ indexURL: cfg.indexURL });
    status('Загрузка numpy, pandas…');
    await py.loadPackagesFromImports('import numpy; import pandas');
    py.runPython(snippets.init);
    ops.setPy(py);
    var info = { version: py.version, mode: 'main', restored: false, failed: [], restoreError: null };
    if (restoreScript) {
      var r = await ops.dispatch('restore', { script: restoreScript, snapshot: false });
      info.restored = !r.error; info.failed = r.failed || []; info.restoreError = r.error;
    }
    return info;
  }

  async function spawn(restoreScript, isRespawn) {
    if (S.mode === 'main') return spawnMain(restoreScript);
    var w = null, initInfo;
    try {
      w = startWorker();
      initInfo = await callOn(w, 'init', { indexURL: cfg.indexURL }, cfg.initTimeoutMs);
    } catch (e) {
      if (w) { if (S.worker === w) S.worker = null; safeTerminate(w); rejectPendingFor(w, mkErr('terminated', 'spawn failed')); }
      // WebAssembly blocked by CSP hits the main thread exactly the same way: do not waste a whole init timeout on the fallback
      var wasmBlocked = /WebAssembly is blocked/.test(e.message || '');
      if (cfg.fallback && !isRespawn && S.mode !== 'worker' && !wasmBlocked && (e.kind === 'worker-unavailable' || e.kind === 'remote')) {
        emit({ type: 'fallback', reason: e.message, kind: e.kind });
        try { return await spawnMain(restoreScript); }
        catch (e2) { S.mode = null; throw mkErr('unavailable', 'Worker: ' + e.message + ' | main thread: ' + e2.message); }
      }
      throw e;
    }
    S.mode = 'worker';
    var info = { version: initInfo && initInfo.version, mode: 'worker', restored: false, failed: [], restoreError: null };
    if (restoreScript) {
      var r;
      try { r = await callOn(w, 'restore', { script: restoreScript, snapshot: false }, cfg.restoreTimeoutMs); }
      catch (e) {
        // the snapshot itself hangs / crashes the interpreter: drop it and boot a clean one
        if (S.worker === w) S.worker = null; safeTerminate(w); rejectPendingFor(w, mkErr('terminated', 'restore failed'));
        S.snapshot = '';
        emit({ type: 'snapshot-dropped', error: e.message });
        var clean = await spawn('', true);
        clean.restoreError = 'restore script failed: ' + e.message;
        return clean;
      }
      info.restored = !r.error; info.failed = r.failed || []; info.restoreError = r.error;
    }
    if (S.worker !== w) throw mkErr('terminated', 'worker replaced while starting');
    S.ready = true;
    return info;
  }

  function startSpawn(isRespawn) {
    S.ready = false;
    var p = spawn(S.snapshot, isRespawn).then(function (info) { S.info = info; return info; });
    S.readyPromise = p;
    p.then(function () { S.lastFail = null; }, function (err) {
      S.lastFail = { err: err, at: Date.now() };
      if (S.readyPromise === p) S.readyPromise = null;             // next call retries (after the cooldown)
      if (isRespawn) emit({ type: 'respawn-failed', error: err && err.message });
    });
    return p;
  }

  function respawn(reason) {
    if (S.disposed) return null;
    S.respawns++;
    var t0 = now();
    emit({ type: 'respawn-start', reason: reason, snapshotChars: S.snapshot.length });
    var p = startSpawn(true);
    p.then(function (info) {
      emit({ type: 'respawn-ready', reason: reason, ms: Math.round(now() - t0), restored: info.restored, failed: info.failed, restoreError: info.restoreError });
    }, function () {});
    return p;
  }

  async function ensureReady() {
    for (var i = 0; i < 3 && !S.ready; i++) {
      if (S.disposed) throw mkErr('disposed', 'runtime disposed');
      if (!S.readyPromise) {
        if (S.lastFail && Date.now() - S.lastFail.at < cfg.retryCooldownMs) throw S.lastFail.err;   // do not hammer a broken start
        startSpawn(false);
      }
      await S.readyPromise;
    }
    if (!S.ready) throw mkErr('unavailable', 'Python is not ready');
  }

  function errorResult(e, timeoutMs) {
    if (e.kind === 'timeout') {
      var secs = Math.round(timeoutMs / 100) / 10;
      return { result: null, error: '⏱ Timeout: выполнение превысило ' + secs + 's — процесс Python остановлен и перезапускается, переменные восстанавливаются из последнего снимка', timedOut: true };
    }
    return { result: null, error: 'Python worker: ' + e.message };
  }

  // ---------------------------------------------------------------- public API
  function initPy(onStatus) {
    if (onStatus) cfg.onStatus = onStatus;
    if (S.disposed) return Promise.reject(mkErr('disposed', 'runtime disposed'));
    if (S.ready && S.readyPromise) return S.readyPromise;
    if (!S.readyPromise) startSpawn(false);
    return S.readyPromise;
  }

  function runPython(code, o) {
    o = o || {};
    var timeoutMs = (o.timeoutMs == null) ? cfg.defaultTimeoutMs : o.timeoutMs;
    return enqueue(async function () {
      try { await ensureReady(); }
      catch (e) { return { result: null, error: 'Python недоступен: ' + e.message }; }
      try {
        var v = await callLive('run', { code: String(code), snapshot: o.snapshot !== false }, timeoutMs);
        if (v.snapshot != null) commitSnapshot(v.snapshot);
        return { result: v.result, error: v.error };
      } catch (e) { return errorResult(e, timeoutMs); }
    });
  }

  function getSessionVars() {
    return enqueue(async function () {
      if (!S.readyPromise && !S.ready) return {};                   // like `if (!_py) return {}`
      try { await ensureReady(); } catch (e) { return {}; }
      try { return await callLive('vars', {}, cfg.helperTimeoutMs); } catch (e) { return {}; }
    });
  }

  async function getSessionVarsText() {
    var v = await getSessionVars();
    return Object.entries(v).map(function (kv) { return '  ' + kv[0] + '(' + kv[1].type + ')=' + kv[1].repr; }).join('\n');
  }

  function clearSession() {
    return enqueue(async function () {
      var before = S.snapshot;
      S.snapshot = '';                                              // a kill right now must not resurrect cleared variables
      if (!S.readyPromise && !S.ready) return false;
      var ok = true;
      try { await ensureReady(); await callLive('clear', {}, cfg.helperTimeoutMs); }
      catch (e) {
        // helper timeout => worker was killed and respawns with the (now empty) snapshot, i.e. cleared anyway
        if (e.kind !== 'timeout') { ok = false; if (e.kind === 'remote') S.snapshot = before; }
      }
      if (ok && cfg.onSnapshot) { try { cfg.onSnapshot(''); } catch (e) {} }
      return ok;
    });
  }

  function buildRestoreScript() {
    return enqueue(async function () {
      if (!S.readyPromise && !S.ready) return S.snapshot;
      try {
        await ensureReady();
        var s = await callLive('snapshot', {}, cfg.helperTimeoutMs);
        if (typeof s === 'string') { commitSnapshot(s); return s; }
      } catch (e) {}
      return S.snapshot;                                            // stale but better than nothing
    });
  }

  function restoreFromScript(script) {
    return enqueue(async function () {
      try { await ensureReady(); }
      catch (e) { return { result: null, error: 'Python недоступен: ' + e.message, failed: [] }; }
      try {
        var r = await callLive('restore', { script: String(script), snapshot: true }, cfg.restoreTimeoutMs);
        if (r.snapshot != null) commitSnapshot(r.snapshot);
        return { result: r.result, error: r.error, failed: r.failed || [] };
      } catch (e) { var er = errorResult(e, cfg.restoreTimeoutMs); er.failed = []; return er; }
    });
  }

  function dispose() {
    S.disposed = true; S.ready = false;
    if (S.worker) killWorker(S.worker, 'dispose');
    S.pending.forEach(function (p) { clearTimeout(p.timer); p.reject(mkErr('disposed', 'runtime disposed')); });
    S.pending.clear();
  }

  function getState() {
    if (S.disposed) return 'disposed';
    if (S.ready) return S.inflight > 0 ? 'running' : 'ready';
    if (S.readyPromise) return S.respawns > 0 ? 'respawning' : 'loading';
    return 'idle';
  }

  return {
    initPy: initPy,
    runPython: runPython,
    getSessionVars: getSessionVars,
    getSessionVarsText: getSessionVarsText,
    clearSession: clearSession,
    buildRestoreScript: buildRestoreScript,
    restoreFromScript: restoreFromScript,
    isReady: function () { return S.ready; },
    whenReady: function () { return ensureReady(); },
    getMode: function () { return S.mode; },
    getState: getState,
    getSnapshot: function () { return S.snapshot; },
    setSnapshot: function (s) { S.snapshot = String(s || ''); },
    configure: function (o) { Object.assign(cfg, o || {}); },
    getConfig: function () { return Object.assign({}, cfg, { workerSource: cfg.workerSource ? '[' + cfg.workerSource.length + ' chars]' : null, snippets: undefined, opsFactory: undefined }); },
    dispose: dispose,
    _debug: function () { return { S: S, cfg: cfg, events: S.events.slice(), respawns: S.respawns, workersCreated: S.workersCreated, worker: S.worker, pending: S.pending.size, workerUrl: S.worker ? S.worker._url : null }; }
  };
}

/* ---------------------------------------------------------------------------
 * Default singleton + the spec'd top-level names
 * ------------------------------------------------------------------------- */
var _pyDefaultRuntime = null;
function _pyRt() { return _pyDefaultRuntime || (_pyDefaultRuntime = createPyRuntime()); }
function initPy(onStatus, options) {
  if (!_pyDefaultRuntime) _pyDefaultRuntime = createPyRuntime(options);
  else if (options) _pyDefaultRuntime.configure(options);
  return _pyDefaultRuntime.initPy(onStatus);
}
function runPython(code, o) { return _pyRt().runPython(code, o); }
function getSessionVars() { return _pyRt().getSessionVars(); }
function getSessionVarsText() { return _pyRt().getSessionVarsText(); }
function clearSession() { return _pyRt().clearSession(); }
function buildRestoreScript() { return _pyRt().buildRestoreScript(); }
function restoreFromScript(script) { return _pyRt().restoreFromScript(script); }
function isReady() { return _pyRt().isReady(); }
function getSnapshot() { return _pyRt().getSnapshot(); }

// ═══════════════════════════════════════════════════════════════════════════
// JS EXECUTION — a Web Worker, ideally inside a CSP-locked sandbox frame
// ═══════════════════════════════════════════════════════════════════════════
// The generated code is NOT spliced into any script source: it is posted as data and compiled inside a
// Web Worker with new Function. A syntax error is therefore an ordinary catchable error, nothing in the
// code can collide with the wrapper's identifiers, and a top-level `return` still works.
//
// Three tiers, strongest first (the first one that starts is remembered and never silently downgraded):
//   "frame"  The worker lives inside a hidden, sandboxed, OPAQUE-ORIGIN iframe whose CSP is
//            `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:;
//            connect-src 'none'`; the worker inherits it. The BROWSER then refuses every network request
//            (fetch, XHR, WebSocket(Stream), WebTransport, FontFace, import(), …) and the opaque origin
//            has no access to the app's IndexedDB / Cache / OPFS. A list of removed names can never be
//            complete (FontFace, WebSocketStream, navigator.storageBuckets all got around one); this is
//            the real boundary.
//   "worker" A plain Blob worker: no DOM, cookies or localStorage; common network names are deleted along
//            the whole prototype chain — best effort only, dynamic import() stays reachable. Used when the
//            host does not allow the frame.
//   "inline" The old in-page behaviour (no isolation, no timeout) when Workers are unavailable.
// Everything a worker sends back is untrusted data: it is validated, normalised and size-capped here.
const JS_TIMEOUT_MS       = 10000;
const JS_READY_TIMEOUT_MS = 4000;     // a tier that has not said "ready" by then is treated as unavailable
const MAX_OUT_CHARS       = 200000;   // cap on anything shown in the UI or sent to the model
const DANGEROUS_JS = /\bdocument\s*\.\s*(?:cookie|write)\b|\bwindow\s*\.\s*location\s*=|\beval\s*\(|\bimport\s*\(/;

const capText = (s, n = MAX_OUT_CHARS) => { s = String(s); return s.length > n ? `${s.slice(0, n)}\n…[обрезано ${s.length - n} симв.]` : s; };

// Result normalisation: objects/arrays/Dates become plain JSON values (OutputPane pretty-prints them),
// circular or exotic values fall back to a string, everything is size-capped. Keep in sync with `pack` in
// JS_WORKER_SRC (the worker applies the same limits first so that huge values are not even transferred).
function packJsResult(v) {
  if (v === undefined || v === null) return "(undefined)";
  const t = typeof v;
  if (t === "string") return capText(v);
  if (t === "number" || t === "boolean") return v;
  if (t === "object") {
    try { const j = JSON.stringify(v); if (j !== undefined) return j.length > MAX_OUT_CHARS ? capText(j) : JSON.parse(j); }
    catch { /* circular / BigInt: fall through */ }
  }
  return capText(String(v));
}
// Host-side check of a worker reply: exactly {result, error: string|null}, anything else is an error.
function sanitizeJsReply(d) {
  if (!d || typeof d !== "object") return { result:null, error:"Некорректный ответ Worker" };
  if (typeof d.error === "string" && d.error) return { result:null, error:capText(d.error) };
  if (d.error != null && d.error !== "") return { result:null, error:"Некорректный ответ Worker" };
  return { result: packJsResult(d.result), error:null };
}
const jsTimeoutResult = () => ({
  result:null, timedOut:true,
  error:`⏱ Timeout: выполнение превысило ${JS_TIMEOUT_MS / 1000}s — процесс остановлен`,
});

const JS_WORKER_SRC = `
var LIMIT = ${MAX_OUT_CHARS};
var NET = ["fetch","XMLHttpRequest","WebSocket","EventSource","importScripts","indexedDB","caches","BroadcastChannel","SharedWorker","Worker"];
(function () {
  // Best effort for the "worker" tier: delete the names along the WHOLE prototype chain (deleting only
  // self.fetch merely shadows it). The "frame" tier does not rely on this.
  var o = self;
  while (o && o !== Object.prototype) {
    for (var i = 0; i < NET.length; i++) { try { delete o[NET[i]]; } catch (e) {} }
    o = Object.getPrototypeOf(o);
  }
})();
function cap(s) { s = String(s); return s.length > LIMIT ? s.slice(0, LIMIT) + "\\n…[truncated]" : s; }
function pack(v) {
  if (v === undefined || v === null) return "(undefined)";
  var t = typeof v;
  if (t === "string") return cap(v);
  if (t === "number" || t === "boolean") return v;
  if (t === "object") { try { var j = JSON.stringify(v); if (j !== undefined) return j.length > LIMIT ? cap(j) : JSON.parse(j); } catch (e) {} }
  return cap(v);
}
self.onmessage = async function (ev) {
  try {
    var fn = new Function(ev.data.code + "\\nreturn typeof run==='function'?run():undefined;");
    var v = await fn();
    self.postMessage({ result: pack(v), error: null });
  } catch (e) {
    self.postMessage({ result: null, error: cap((e && e.message) || e) });
  }
};
self.postMessage({ ready: true });
`;

// ── tier "frame": the bridge document that hosts the worker ────────────────
const JS_FRAME_CSP = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'";
const jsFrameHtml = () => '<!doctype html><meta charset="utf-8">'
  + `<meta http-equiv="Content-Security-Policy" content="${JS_FRAME_CSP}"><script>`
  + `(function () {
  var W = ${JSON.stringify(JS_WORKER_SRC).replace(/</g, "\\u003c")};
  var worker = null, url = null, readies = 0, done = false;
  function send(m) { parent.postMessage(m, "*"); }
  function fail(msg) { if (done) return; done = true; try { worker && worker.terminate(); } catch (e) {} send({ kind: "error", message: String(msg) }); }
  try {
    url = URL.createObjectURL(new Blob([W], { type: "application/javascript" }));
    worker = new Worker(url);
    worker.onmessage = function (e) {
      var d = e.data;
      if (d && d.ready === true) {
        if (readies++) return fail("worker sent a second ready message");
        try { URL.revokeObjectURL(url); } catch (x) {}
        return send({ kind: "ready" });
      }
      if (done) return;                       // first reply wins; a flood after it is dropped
      done = true; worker.terminate();
      send({ kind: "reply", data: d });
    };
    worker.onerror = function (e) { if (e.preventDefault) e.preventDefault(); fail(readies ? (e.message || "worker error") : "worker failed to start"); };
  } catch (e) { fail("worker failed to start: " + ((e && e.message) || e)); }
  addEventListener("message", function (ev) {
    if (ev.source === parent && ev.data && typeof ev.data.code === "string" && worker && !done) worker.postMessage({ code: ev.data.code });
  });
})();` + '<\/script>';

// → result | null (null = this tier is unavailable here)
function runJSFrame(code) {
  return new Promise(resolve => {
    let frame, readyTimer, runTimer, ready = false, settled = false;
    const finish = out => {
      if (settled) return; settled = true;
      clearTimeout(readyTimer); clearTimeout(runTimer);
      window.removeEventListener("message", onMsg);
      try { frame.remove(); } catch { /* already gone */ }
      resolve(out);
    };
    const onMsg = ev => {
      if (!frame || ev.source !== frame.contentWindow) return;
      const m = ev.data;
      if (!m || typeof m !== "object") return;
      if (m.kind === "ready" && !ready) {
        ready = true; clearTimeout(readyTimer);
        runTimer = setTimeout(() => finish(jsTimeoutResult()), JS_TIMEOUT_MS);
        frame.contentWindow.postMessage({ code }, "*");
      } else if (m.kind === "reply" && ready) finish(sanitizeJsReply(m.data));
      else if (m.kind === "error") finish(ready ? { result:null, error:capText(m.message || "Ошибка Worker") } : null);
    };
    window.addEventListener("message", onMsg);
    try {
      frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts");     // deliberately NOT allow-same-origin: opaque origin
      frame.setAttribute("aria-hidden", "true"); frame.tabIndex = -1; frame.title = "js-sandbox";
      frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none";
      frame.srcdoc = jsFrameHtml();
      document.body.appendChild(frame);
    } catch { return finish(null); }
    readyTimer = setTimeout(() => finish(null), JS_READY_TIMEOUT_MS);
  });
}

// ── tier "worker": plain Blob worker, one fresh Blob URL per run ───────────
// (a long-lived shared URL could be revoked from inside the worker, which would break every later run)
function runJSWorker(code) {
  return new Promise(resolve => {
    let w, url = null, readyTimer, runTimer, ready = false, done = false;
    const stop = () => {
      done = true; clearTimeout(readyTimer); clearTimeout(runTimer);
      try { w?.terminate(); } catch { /* already gone */ }
      if (url) { try { URL.revokeObjectURL(url); } catch { /* ignore */ } url = null; }
    };
    const settle = out => { if (done) return; stop(); resolve(out); };
    try {
      url = URL.createObjectURL(new Blob([JS_WORKER_SRC], { type:"application/javascript" }));
      w = new Worker(url);
    } catch { return settle(null); }
    readyTimer = setTimeout(() => settle(null), JS_READY_TIMEOUT_MS);
    w.onmessage = e => {
      if (e.data?.ready === true) {
        if (ready) return settle({ result:null, error:"Worker отправил повторное сообщение ready" });
        ready = true; clearTimeout(readyTimer);
        try { URL.revokeObjectURL(url); } catch { /* ignore */ } url = null;
        runTimer = setTimeout(() => settle(jsTimeoutResult()), JS_TIMEOUT_MS);
        w.postMessage({ code });
        return;
      }
      if (ready) settle(sanitizeJsReply(e.data));      // first reply wins; terminate() drops any flood after it
    };
    // Errors in the generated code are caught inside the worker, so an error EVENT before "ready" means the
    // worker itself cannot run here (CSP / sandbox) → tier unavailable.
    w.onerror = e => { e.preventDefault?.(); settle(ready ? { result:null, error:e.message || "Ошибка Worker" } : null); };
    w.onmessageerror = () => settle({ result:null, error:"Результат нельзя передать из Worker" });
  });
}

// ── tier "inline": previous in-page behaviour — no isolation, no timeout ───
async function runJSInline(code) {
  try {
    // eslint-disable-next-line no-new-func
    const r = await new Function(code + "\nreturn typeof run==='function'?run():undefined;")();
    return { result: packJsResult(r), error: null };
  } catch (e) { return { result:null, error:capText(e?.message || e) }; }
}

let _jsTier = null;                  // null = not tested yet, else "frame" | "worker" | "inline"
const getJsTier = () => _jsTier;
async function runJS(code) {
  if (DANGEROUS_JS.test(code)) return { result:null, error:"⛔ Небезопасный паттерн заблокирован" };
  if (_jsTier === null || _jsTier === "frame") {
    const r = await runJSFrame(code);
    if (r) { _jsTier = "frame"; return r; }
    if (_jsTier === "frame") return { result:null, error:"JS-песочница не ответила" };   // worked before: never silently downgrade
  }
  if (_jsTier === null || _jsTier === "worker") {
    const r = await runJSWorker(code);
    if (r) { _jsTier = "worker"; return r; }
    if (_jsTier === "worker") return { result:null, error:"JS Worker не ответил" };
  }
  _jsTier = "inline";
  return runJSInline(code);
}

// The Python worker is untrusted as well (user code can post forged replies): accept only strings, cap sizes.
async function runPy(code) {
  const r = await runPython(code);
  return {
    result:   r?.result == null ? null : capText(r.result),
    error:    r?.error  == null ? null : capText(r.error),
    timedOut: r?.timedOut === true,
  };
}

// A render error inside a pane (for example from an unexpected value) must not blank the whole app.
// It resets itself when the user switches tab or a new result arrives.
class PaneBoundary extends Component {
  constructor(props) { super(props); this.state = { err:null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidUpdate(prev) {
    if (this.state.err && (prev.tab !== this.props.tab || prev.output !== this.props.output)) this.setState({ err:null });
  }
  render() {
    if (!this.state.err) return this.props.children;
    return <div style={{ padding:14,color:C.red,fontSize:11,fontFamily:"monospace",lineHeight:1.6 }}>
      ✗ Не удалось отобразить содержимое вкладки: {String(this.state.err?.message || this.state.err)}
    </div>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// .DOCX EXPORT — no dependencies
// ═══════════════════════════════════════════════════════════════════════════
// A .docx is a ZIP of XML parts. This writes the smallest document Word, LibreOffice and pandoc accept
// (ZIP "stored" = uncompressed: letters are a few KB), so a generated Widerspruch / Brief leaves the app
// as an editable letter. Each text line becomes a paragraph; empty lines stay empty paragraphs; **bold**
// and a "BETREFF:" line are bold; tabs and leading spaces are kept; monospace for table-like output.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// files: [{name, data: Uint8Array}] → Uint8Array containing a ZIP archive (method 0 = stored, UTF-8 names)
function zipStore(files, date = new Date()) {
  const enc = new TextEncoder();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = (Math.max(0, date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    if (size > 0xFFFFFFF0 || offset > 0xFFFFFFF0) throw new Error("ZIP64 is not supported");
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);  lh.setUint16(4, 20, true);  lh.setUint16(6, 0x0800, true);  lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true);    lh.setUint16(12, dosDate, true);
    lh.setUint32(14, crc, true);        lh.setUint32(18, size, true);        lh.setUint32(22, size, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);  ch.setUint16(4, 20, true);  ch.setUint16(6, 20, true);  ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true);    ch.setUint16(14, dosDate, true);
    ch.setUint32(16, crc, true);        ch.setUint32(20, size, true);        ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true);  /* 30 extra, 32 comment, 34 disk, 36/38 attrs = 0 */  ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);    end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}

const xmlEsc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Keep only characters XML 1.0 allows (and Word is happy with). Separators keep their MEANING instead of
// gluing the neighbouring words together: VT / FF / NEL / U+2028 / U+2029 → new line, FS..US → space.
// Other control characters, C1, DEL, noncharacters (U+FDD0..FDEF, U+nFFFE/FFFF) are dropped; lone surrogates → U+FFFD.
function xmlClean(str) {
  const s = String(str);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13) out += s[i];
    else if (c === 0x0B || c === 0x0C || c === 0x85 || c === 0x2028 || c === 0x2029) out += "\n";
    else if (c >= 0x1C && c <= 0x1F) out += " ";
    else if (c < 0x20 || (c >= 0x7F && c <= 0x9F) || (c >= 0xFDD0 && c <= 0xFDEF) || c === 0xFFFE || c === 0xFFFF) continue;
    else if (c >= 0xD800 && c <= 0xDBFF) {
      const d = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (d >= 0xDC00 && d <= 0xDFFF) {
        const cp = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00);
        if ((cp & 0xFFFF) < 0xFFFE) out += s[i] + s[i + 1];   // astral noncharacters are dropped
        i++;
      } else out += "\uFFFD";
    }
    else if (c >= 0xDC00 && c <= 0xDFFF) out += "\uFFFD";
    else out += s[i];
  }
  return out;
}

// one run of text: tabs become <w:tab/>, spaces are preserved
function docxRun(text, bold) {
  if (!text) return "";
  const rpr = bold ? "<w:rPr><w:b/><w:bCs/></w:rPr>" : "";
  return text.split("\t").map((seg, i) =>
    (i ? `<w:r>${rpr}<w:tab/></w:r>` : "") + (seg ? `<w:r>${rpr}<w:t xml:space="preserve">${xmlEsc(seg)}</w:t></w:r>` : "")
  ).join("");
}
function docxParagraph(line) {
  if (!line.trim()) return "<w:p/>";
  let bold = false, text = line;
  const h = text.match(/^\s{0,3}#{1,6}\s+([\s\S]*)$/);                  // markdown heading → bold paragraph
  if (h) { text = h[1]; bold = true; }
  else if (/^\s*(BETREFF|Betreff)\s*:/.test(text)) bold = true;
  // **bold** spans (an unbalanced ** is kept literally)
  const runs = []; let last = 0, m; const re = /\*\*((?:[^*\n]|\*(?!\*))+)\*\*/g;
  while ((m = re.exec(text))) { runs.push(docxRun(text.slice(last, m.index), bold), docxRun(m[1], true)); last = m.index + m[0].length; }
  runs.push(docxRun(text.slice(last), bold));
  return `<w:p>${runs.join("")}</w:p>`;
}
// table-like / aligned output (pandas, ASCII tables, code) reads better in a monospace font
const looksTabular = text => (text.match(/^.*\S {3,}\S.*$/gm) || []).length >= 3 || /[│┌└├─]{3,}/.test(text);

// text → Uint8Array of a .docx file (A4, Arial 11 pt, DIN-5008-like margins: 25 mm left, 20 mm elsewhere)
function buildDocx(text, { title = "Writing OS", mono, date = new Date() } = {}) {
  const clean = xmlClean(text).replace(/\r\n?/g, "\n");
  const useMono = mono ?? looksTabular(clean);
  const cyr = (clean.match(/[Ѐ-ӿ]/g) || []).length, letters = (clean.match(/\p{L}/gu) || []).length || 1;
  const lang = cyr / letters > 0.3 ? "ru-RU" : "de-DE";
  const font = useMono ? "Courier New" : "Arial", size = useMono ? 20 : 22;
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const body = clean.split("\n").map(docxParagraph).join("");
  const now = date.toISOString().replace(/\.\d+Z$/, "Z");
  const enc = new TextEncoder();
  const part = (name, xml) => ({ name, data: enc.encode(HEAD + xml) });
  return zipStore([
    part("[Content_Types].xml",
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      + '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
      + '</Types>'),
    part("_rels/.rels",
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
      + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
      + '</Relationships>'),
    part("word/_rels/document.xml.rels",
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'
      + '</Relationships>'),
    // compatibilityMode 15 = current Word layout; without it Word shows "[Compatibility Mode]" in the title bar
    part("word/settings.xml",
      `<w:settings ${NS}><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`),
    part("word/styles.xml",
      `<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr>`
      + `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`
      + `<w:lang w:val="${lang}" w:eastAsia="${lang}" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>`
      + '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
      + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>'),
    part("word/document.xml",
      `<w:document ${NS}><w:body>${body}`
      + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1417" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>'
      + '</w:body></w:document>'),
    part("docProps/core.xml",
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" '
      + 'xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + `<dc:title>${xmlEsc(xmlClean(title))}</dc:title><dc:creator>Writing OS</dc:creator>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`),
    part("docProps/app.xml",
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Writing OS</Application></Properties>'),
  ], date);
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }, 10000);
}
const DOCX_KIND = { widerspruch:"widerspruch", eilantrag:"eilantrag", klage:"klage", generic:"dokument" };
// → the file name that was offered for download
function exportDocx(text) {
  const kind = DOCX_KIND[detectLegalDocType(text)] || "dokument";
  const name = `wos-${kind}-${new Date().toISOString().slice(0, 10)}.docx`;
  downloadBlob(new Blob([buildDocx(text, { title: `Writing OS — ${kind}` })], { type: DOCX_MIME }), name);
  return name;
}

function downloadJSON(data, name) {
  downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), name);
}
function uploadJSON(cb) {
  const i = document.createElement("input"); i.type="file"; i.accept=".json,.wos";
  i.onchange = e => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{try{cb(JSON.parse(ev.target.result));}catch{alert("Invalid JSON");}};r.readAsText(f); };
  document.body.appendChild(i); i.click(); document.body.removeChild(i);
}
function extractCode(text, lang) {
  const m = text.match(lang==="py" ? /```(?:python|py)\n([\s\S]*?)```/ : /```(?:javascript|js)\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFE HTML OUTPUT — DOMPurify + sandboxed iframe
// ═══════════════════════════════════════════════════════════════════════════
// HTML produced by generated code is untrusted. It is sanitised with DOMPurify (pinned version, SRI) and
// then shown in a sandboxed iframe: no scripts, deny-all CSP. Whatever survives sanitising (<style>,
// position:fixed overlays, styled boxes) therefore cannot touch the app around it; remote images and
// stylesheets are blocked by the CSP, and links are removed.
const DOMPURIFY_URL = "https://cdn.jsdelivr.net/npm/dompurify@3.4.16/dist/purify.min.js";
const DOMPURIFY_SRI = "sha384-a7SzOxErzJ3ZpQz0zJ32d67dSitNzPcbfybc/ykU9KJhMgZkwqfSxlhhdJRS+XGL";
let _dp = null, _dpLoading = null;
function loadDOMPurify() {
  if (_dp) return Promise.resolve(_dp);
  if (_dpLoading) return _dpLoading;
  _dpLoading = new Promise((res, rej) => {
    if (window.DOMPurify) { _dp = window.DOMPurify; res(_dp); return; }
    const s = document.createElement("script");
    s.src = DOMPURIFY_URL; s.integrity = DOMPURIFY_SRI; s.crossOrigin = "anonymous";
    s.onload  = () => window.DOMPurify ? (_dp = window.DOMPurify, res(_dp)) : rej(new Error("DOMPurify missing"));
    s.onerror = () => rej(new Error("DOMPurify failed to load"));
    document.head.appendChild(s);
  }).catch(e => { _dpLoading = null; throw e; });   // allow a later retry
  return _dpLoading;
}

const HTML_FRAME_CSS = "html,body{margin:0}body{padding:12px;font:13px/1.5 system-ui,sans-serif;color:#111;background:#fff;overflow-wrap:anywhere}";
function SafeHtml({ html }) {
  const [view, setView] = useState({ status:"loading", srcDoc:"" });
  const [height, setHeight] = useState(120);
  useEffect(() => {
    let alive = true;
    setView({ status:"loading", srcDoc:"" });
    loadDOMPurify().then(dp => {
      const clean = dp.sanitize(String(html), {
        FORCE_BODY: true,   // keep a leading <style>
        // <a>/<area>: links cannot work inside the sandbox anyway, and Ctrl/middle-click would still open them
        FORBID_TAGS: ["a","area","form","input","button","textarea","select","base","meta","link","iframe","frame","object","embed"],
      });
      const srcDoc = '<!doctype html><html><head><meta charset="utf-8">'
        + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">'
        + `<base target="_blank"><style>${HTML_FRAME_CSS}</style></head><body>${clean}</body></html>`;
      if (alive) setView({ status:"ok", srcDoc });
    }).catch(() => { if (alive) setView({ status:"unavailable", srcDoc:"" }); });
    return () => { alive = false; };
  }, [html]);

  if (view.status === "loading") return <div style={{ padding:12,color:C.textMuted,fontSize:11,fontFamily:"monospace" }}>⟳ HTML…</div>;
  if (view.status === "unavailable") return <div>
    <div style={{ color:C.yellow,fontSize:11,marginBottom:6,fontFamily:"monospace" }}>
      ⚠ HTML-Vorschau nicht verfügbar (DOMPurify konnte nicht geladen werden) — Rohtext:
    </div>
    <pre style={{ color:C.code,fontSize:12,fontFamily:"'Fira Code',monospace",whiteSpace:"pre-wrap",margin:0,
      background:"#060a0e",border:`1px solid ${C.border2}`,borderRadius:6,padding:12,maxHeight:180,overflowY:"auto" }}>
      {String(html)}
    </pre>
  </div>;
  return <iframe title="html-output" sandbox="allow-same-origin" srcDoc={view.srcDoc}
    onLoad={e => { try { setHeight(Math.min(480, Math.max(60, e.target.contentDocument.documentElement.scrollHeight))); } catch { /* keep default */ } }}
    style={{ display:"block",width:"100%",height,border:`1px solid ${C.border2}`,borderRadius:6,background:"#fff" }}/>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  bg:"#080b0f", panel:"#0d1117", border:"#161b22", border2:"#21262d",
  accent:"#58a6ff", accentDim:"#1f6feb",
  py:"#f7cc4b", pyDim:"#7a5500",
  green:"#3fb950", greenDim:"#0d2b0d",
  red:"#f85149", yellow:"#d29922", orange:"#f97316",
  text:"#e6edf3", textDim:"#8b949e", textMuted:"#30363d", code:"#e6edf3",
};

// ═══════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════
function LangTag({lang}) {
  return <span style={{ fontSize:9,fontWeight:700,letterSpacing:"0.08em",padding:"1px 5px",borderRadius:3,
    background:lang==="py"?C.pyDim:C.accentDim, color:lang==="py"?C.py:C.accent }}>{lang==="py"?"PY":"JS"}</span>;
}
function SkillBadge({skill, score}) {
  const cc = CAT[skill.cat]||CAT.technical;
  return (
    <span title={`${skill.name}: ${Math.round(score*100)}%`} style={{
      fontSize:9,fontFamily:"monospace",padding:"1px 6px",borderRadius:3,
      background:cc.bg, border:`1px solid ${cc.border}`, color:cc.text,
      display:"inline-flex",alignItems:"center",gap:3,
    }}>
      {skill.name}
      <span style={{ opacity:0.6 }}>{Math.round(score*100)}%</span>
    </span>
  );
}
function Dot({ok}) {
  return <span style={{ display:"inline-block",width:7,height:7,borderRadius:"50%",
    background:ok?C.green:C.red,marginRight:5,boxShadow:ok?`0 0 5px ${C.green}`:`0 0 5px ${C.red}` }}/>;
}
function Toast({msg, onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[onDone]);
  const err = msg.startsWith("✗");
  return <div style={{ position:"fixed",bottom:36,left:"50%",transform:"translateX(-50%)",
    background:err?"#2d0d0d":"#0d2b0d",border:`1px solid ${err?C.red:C.green}`,
    color:err?C.red:C.green,padding:"8px 20px",borderRadius:8,fontSize:12,
    fontFamily:"monospace",zIndex:9999,animation:"fadeUp 0.2s ease-out" }}>{msg}</div>;
}
function Typing({label,color=C.accent}) {
  return <div style={{ display:"flex",alignItems:"center",gap:8,color,fontSize:11,fontFamily:"monospace",padding:"6px 0" }}>
    <div style={{ display:"flex",gap:3 }}>
      {[0,1,2].map(i=><div key={i} style={{ width:4,height:4,borderRadius:"50%",background:color,
        animation:`pulse 1s ease-in-out ${i*0.2}s infinite` }}/>)}
    </div>
    {label}
  </div>;
}
function CodeLines({code}) {
  return <pre style={{ margin:0,fontSize:12.5,lineHeight:1.75,fontFamily:"'Fira Code',monospace",
    whiteSpace:"pre-wrap",color:C.code }}>
    {code.split("\n").map((ln,i)=>(
      <div key={i} style={{ display:"flex" }}>
        <span style={{ color:C.textMuted,width:30,flexShrink:0,textAlign:"right",paddingRight:12,userSelect:"none",fontSize:11 }}>{i+1}</span>
        <span>{ln||" "}</span>
      </div>
    ))}
  </pre>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PANELS
// ═══════════════════════════════════════════════════════════════════════════
function OutputPane({result, error, running, pyStatus, retrying, retryLog, onExportDocx}) {
  if (pyStatus) return <div style={{ padding:16 }}>
    <div style={{ color:C.py,fontSize:12,marginBottom:8,fontFamily:"monospace" }}>⟳ {pyStatus}</div>
    <div style={{ height:3,background:C.border2,borderRadius:2,overflow:"hidden" }}>
      <div style={{ height:"100%",background:C.py,animation:"progress 1.5s ease-in-out infinite" }}/>
    </div>
  </div>;

  // Show retry-in-progress state
  if (retrying) return <div style={{ padding:12 }}>
    <div style={{ fontSize:11,color:C.red,marginBottom:8,fontFamily:"monospace",
      background:"#2d0d0d",borderRadius:4,padding:"6px 10px",
      borderLeft:`2px solid ${C.red}` }}>
      <Dot ok={false}/>attempt {retrying.attempt} failed
      <div style={{ fontSize:10,color:"#fca5a5",marginTop:3,
        whiteSpace:"pre-wrap",maxHeight:60,overflow:"hidden" }}>
        {retrying.error.split("\n").slice(0,3).join("\n")}
      </div>
    </div>
    <Typing label={`⟳ Auto-fix attempt ${retrying.attempt}/2…`} color={C.yellow}/>
  </div>;

  if (running) return <Typing label="Выполняется…" color={C.yellow}/>;

  // Show retry chain summary if there were retries
  const hadRetries = retryLog && retryLog.length > 1;

  if ((result===null||result===undefined)&&!error) return <div style={{ padding:14,color:C.textMuted,fontSize:12,fontFamily:"monospace" }}>// output</div>;
  const isHtml = typeof result==="string" && /^\s*<[a-z]/i.test(result);
  const isObj  = typeof result==="object" && result!==null;
  const canExport = !!onExportDocx && typeof result==="string" && !isHtml && result.trim() !== "" && result !== "(нет вывода)" && result !== "(undefined)";
  return <div style={{ padding:12 }}>
    {/* Retry chain summary badge */}
    {hadRetries&&<div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
      {retryLog.map((entry,i)=>(
        <div key={i} style={{ display:"flex",alignItems:"center",gap:3,
          fontSize:10,fontFamily:"monospace",
          color:entry.status==="ok"?C.green:entry.status==="failed"?C.red:C.yellow }}>
          {i>0&&<span style={{ color:C.textMuted }}>→</span>}
          <span style={{ background:entry.status==="ok"?"#0d2b0d":entry.status==="failed"?"#2d0d0d":"#1a1400",
            padding:"1px 7px",borderRadius:3,
            border:`0.5px solid ${entry.status==="ok"?C.green:entry.status==="failed"?C.red:C.yellow}44` }}>
            {entry.status==="ok"?"✓ fixed":`✗ try ${entry.attempt}`}
          </span>
        </div>
      ))}
    </div>}
    {error ? <>
      <div style={{ color:C.red,fontSize:11,marginBottom:6,fontFamily:"monospace" }}><Dot ok={false}/>
        {retryLog.length>1 ? `All ${MAX_RETRIES} auto-fix attempts failed` : "RuntimeError"}
      </div>
      <pre style={{ color:"#fca5a5",fontSize:12,margin:0,fontFamily:"'Fira Code',monospace",whiteSpace:"pre-wrap" }}>{error}</pre>
    </> : <>
      <div style={{ color:C.green,fontSize:11,marginBottom:8,fontFamily:"monospace" }}>
        <Dot ok={true}/>OK · {isObj?"object":isHtml?"html":typeof result}
        {hadRetries&&<span style={{ color:C.yellow,marginLeft:8 }}>⟳ auto-fixed</span>}
        {canExport&&<button onClick={onExportDocx} title="Скачать как Word-документ (.docx)" style={{ float:"right",
          background:"transparent",border:`1px solid ${C.border2}`,color:C.textDim,padding:"1px 9px",borderRadius:4,
          cursor:"pointer",fontSize:10,fontFamily:"inherit" }}>📄 .docx</button>}
      </div>
      {isHtml
        ? <SafeHtml html={result}/>
        : <pre style={{ color:C.code,fontSize:12.5,fontFamily:"'Fira Code',monospace",
            whiteSpace:"pre-wrap",margin:0,background:"#060a0e",
            border:`1px solid ${C.border2}`,borderRadius:6,padding:12,
            maxHeight:180,overflowY:"auto" }}>
            {isObj?JSON.stringify(result,null,2):String(result)}
          </pre>
      }
    </>}
  </div>;
}

function SessionPane({vars, execCount, onClear, onSave, onLoad, lastSaved}) {
  const entries = Object.entries(vars);
  const typeColor = t => ({str:C.green,int:"#79c0ff",float:"#79c0ff",bool:"#bc8cff",
    list:C.yellow,dict:C.yellow,DataFrame:C.orange,ndarray:C.orange}[t]||C.textDim);
  return <div style={{ height:"100%",display:"flex",flexDirection:"column" }}>
    <div style={{ padding:"5px 14px",borderBottom:`1px solid ${C.border}`,
      display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
      <span style={{ fontSize:9,color:C.textDim,letterSpacing:"0.1em",textTransform:"uppercase" }}>
        ⬡ Namespace · {execCount} runs · {entries.length} vars
      </span>
      <div style={{ marginLeft:"auto",display:"flex",gap:4 }}>
        <button onClick={onLoad} style={{ background:"transparent",border:`1px solid ${C.border2}`,
          color:C.textDim,padding:"2px 8px",borderRadius:3,fontSize:9,cursor:"pointer",fontFamily:"inherit" }}>📂</button>
        <button onClick={onSave} style={{ background:C.accentDim+"44",border:`1px solid ${C.accent}44`,
          color:C.accent,padding:"2px 8px",borderRadius:3,fontSize:9,cursor:"pointer",fontFamily:"inherit" }}>💾</button>
        {entries.length>0&&<button onClick={onClear} style={{ background:"transparent",
          border:`1px solid ${C.red}44`,color:C.red,padding:"2px 8px",borderRadius:3,
          fontSize:9,cursor:"pointer",fontFamily:"inherit" }}>✕</button>}
      </div>
    </div>
    {lastSaved&&<div style={{ padding:"3px 14px",fontSize:9,color:C.textMuted,
      borderBottom:`1px solid ${C.border}`,background:C.panel }}>saved: {lastSaved}</div>}
    <div style={{ flex:1,overflowY:"auto" }}>
      {entries.length===0
        ? <div style={{ padding:14,color:C.textMuted,fontSize:11,lineHeight:1.8 }}>
            <div style={{ color:C.textDim,marginBottom:4 }}>{">>>"} (empty session)</div>
            Python variables appear here after execution.
          </div>
        : <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
            <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {["name","type","value"].map(h=><th key={h} style={{ padding:"3px 12px 4px",
                textAlign:"left",color:C.textMuted,fontSize:9,fontWeight:500,textTransform:"uppercase" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {entries.map(([n,{type:t,repr:r}])=><tr key={n} style={{ borderBottom:`1px solid ${C.border}22` }}>
                <td style={{ padding:"4px 12px",color:C.accent,fontFamily:"'Fira Code',monospace" }}>{n}</td>
                <td style={{ padding:"4px 8px",color:typeColor(t),fontSize:10,fontFamily:"'Fira Code',monospace" }}>{t}</td>
                <td style={{ padding:"4px 12px 4px 0",color:C.textDim,fontFamily:"'Fira Code',monospace",
                  fontSize:10,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r}</td>
              </tr>)}
            </tbody>
          </table>
      }
    </div>
  </div>;
}

function SkillsPane({routeResult, allSkills, customSkills, onNew, onEdit, onDelete}) {
  const [view, setView] = useState("matched"); // "matched" | "all"

  return <div style={{ height:"100%",display:"flex",flexDirection:"column" }}>
    {/* Tab + New button */}
    <div style={{ borderBottom:`1px solid ${C.border}`,display:"flex",
      alignItems:"center",flexShrink:0 }}>
      {["matched","all"].map(v=>(
        <button key={v} onClick={()=>setView(v)} style={{
          background:"transparent",border:"none",
          borderBottom:view===v?`2px solid ${C.accent}`:"2px solid transparent",
          color:view===v?C.accent:C.textDim,
          padding:"5px 14px",fontSize:9,cursor:"pointer",fontFamily:"monospace",
          letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:-1 }}>
          {v==="matched"?"◈ Matched":"⬡ All"}
          {v==="all"&&<span style={{ marginLeft:5,background:C.border2,color:C.textDim,
            borderRadius:10,padding:"0 5px",fontSize:8 }}>{allSkills?.length}</span>}
          {v==="matched"&&routeResult?.skills?.length>0&&(
            <span style={{ marginLeft:5,background:C.greenDim,color:C.green,
              borderRadius:10,padding:"0 5px",fontSize:8 }}>{routeResult.skills.length}</span>
          )}
        </button>
      ))}
      <button onClick={onNew} style={{ marginLeft:"auto",marginRight:8,
        background:"transparent",border:`1px solid ${C.accent}55`,
        color:C.accent,padding:"2px 10px",borderRadius:4,
        fontSize:9,cursor:"pointer",fontFamily:"monospace" }}>+ New</button>
    </div>

    <div style={{ flex:1,overflowY:"auto",padding:"10px 12px" }}>

      {/* MATCHED view */}
      {view==="matched"&&(
        !routeResult
          ? <div style={{ color:C.textMuted,fontSize:11,lineHeight:1.8 }}>
              Router активируется при следующем запросе.
            </div>
          : <>
              <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap" }}>
                <span style={{ fontSize:9,color:C.textMuted,fontFamily:"monospace",textTransform:"uppercase" }}>
                  task_type
                </span>
                <span style={{ fontSize:10,background:C.accentDim+"44",color:C.accent,
                  padding:"1px 7px",borderRadius:3,fontFamily:"monospace" }}>{routeResult.task_type}</span>
                <span style={{ fontSize:9,color:C.textMuted }}>lang:{routeResult.language}</span>
              </div>
              {routeResult.reasoning&&<p style={{ fontSize:11,color:C.textDim,margin:"0 0 10px",lineHeight:1.5 }}>
                {routeResult.reasoning}
              </p>}
              {routeResult.skills.length===0&&<div style={{ color:C.textMuted,fontSize:11 }}>
                Нет подходящих skills.
              </div>}
              {routeResult.skills.map(({skill,score})=>{
                const cc=CAT[skill.cat]||CAT.technical, pct=Math.round(score*100);
                return <div key={skill.id} style={{ border:`1px solid ${cc.border}`,background:cc.bg,
                  borderRadius:7,padding:"9px 11px",marginBottom:6 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                    <span style={{ fontSize:9,fontFamily:"monospace",padding:"1px 5px",borderRadius:3,
                      background:cc.border,color:cc.text,fontWeight:600 }}>{skill.cat}</span>
                    <span style={{ fontSize:12,fontWeight:500,color:C.text,flex:1 }}>{skill.name}</span>
                    {skill.custom&&<span style={{ fontSize:8,color:C.yellow,fontFamily:"monospace",
                      padding:"1px 5px",borderRadius:3,background:"#1a1400",
                      border:`1px solid ${C.yellow}33` }}>custom</span>}
                    <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                      <div style={{ width:50,height:3,background:C.border2,borderRadius:2,overflow:"hidden" }}>
                        <div style={{ height:"100%",borderRadius:2,width:`${pct}%`,
                          background:pct>85?C.green:pct>65?C.accent:C.yellow }}/>
                      </div>
                      <span style={{ fontSize:10,fontFamily:"monospace",color:cc.text }}>{pct}%</span>
                    </div>
                  </div>
                  <pre style={{ fontSize:10,color:C.textMuted,margin:0,fontFamily:"monospace",
                    lineHeight:1.5,whiteSpace:"pre-wrap",background:C.panel,borderRadius:4,
                    padding:"5px 8px",border:`0.5px solid ${C.border}`,maxHeight:55,overflow:"hidden" }}>
                    {skill.ctx.split("\n").slice(0,3).join("\n")}…
                  </pre>
                </div>;
              })}
            </>
      )}

      {/* ALL view */}
      {view==="all"&&(allSkills||[]).map(s=>{
        const cc=CAT[s.cat]||CAT.technical;
        return <div key={s.id} style={{ border:`1px solid ${cc.border}`,background:cc.bg,
          borderRadius:6,padding:"8px 11px",marginBottom:5,
          opacity:s.custom?1:0.75 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:9,fontFamily:"monospace",padding:"1px 5px",borderRadius:3,
              background:cc.border,color:cc.text,fontWeight:600 }}>{s.cat}</span>
            <span style={{ fontSize:12,fontWeight:500,color:C.text,flex:1 }}>{s.name}</span>
            {s.custom&&<span style={{ fontSize:8,color:C.yellow,fontFamily:"monospace",
              padding:"1px 5px",borderRadius:3,background:"#1a1400",
              border:`1px solid ${C.yellow}33` }}>custom</span>}
            {s.custom&&(
              <div style={{ display:"flex",gap:4 }}>
                <button onClick={()=>onEdit(s)} style={{ background:"transparent",
                  border:`1px solid ${C.border2}`,color:C.textDim,
                  padding:"1px 7px",borderRadius:3,fontSize:9,cursor:"pointer",fontFamily:"monospace" }}>
                  edit
                </button>
                <button onClick={()=>onDelete(s.id)} style={{ background:"transparent",
                  border:`1px solid ${C.red}44`,color:C.red,
                  padding:"1px 7px",borderRadius:3,fontSize:9,cursor:"pointer",fontFamily:"monospace" }}>
                  del
                </button>
              </div>
            )}
          </div>
          <div style={{ fontSize:10,color:C.textMuted,marginTop:3,
            fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",
            whiteSpace:"nowrap" }}>
            {s.desc.slice(0,90)}{s.desc.length>90?"…":""}
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILL COMPOSER MODAL
// ═══════════════════════════════════════════════════════════════════════════
function SkillComposer({ onSave, onClose, editingSkill }) {
  const [msgs,    setMsgs]    = useState(() => editingSkill ? [{
    role:"note", content:`Редактирование: ${editingSkill.name}. Опиши что изменить.`
  }] : []);
  const [hist,    setHist]    = useState(() => editingSkill ? [{
    role:"user",
    content:`Edit this existing skill and return updated JSON:\n\`\`\`json\n${JSON.stringify(editingSkill,null,2)}\n\`\`\``
  }] : []);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [skill,   setSkill]   = useState(editingSkill || null);
  const [jsonTxt, setJsonTxt] = useState(editingSkill ? JSON.stringify(editingSkill,null,2) : "");
  const [jsonErr, setJsonErr] = useState(null);
  const [tab,     setTab]     = useState("preview");
  const chatRef = useRef(null);

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[msgs]);

  const handleJsonChange = v => {
    setJsonTxt(v);
    try { setSkill(JSON.parse(v)); setJsonErr(null); }
    catch(e) { setJsonErr(e.message.split("\n")[0]); }
  };

  const send = async text => {
    if(!text.trim()||loading) return;
    setMsgs(p=>[...p,{role:"user",content:text}]);
    setInput(""); setLoading(true);
    const newHist = [...hist,{role:"user",content:text}];
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:MODEL, max_tokens:900,
          stream:true, system:COMPOSER_SYS, messages:newHist }),
      });
      let full="", buf="";
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      setMsgs(p=>[...p,{role:"assistant",content:"",streaming:true}]);
      outer: while(true) {
        const {done,value} = await reader.read();
        if(done) break;
        buf += dec.decode(value,{stream:true});
        const lines = buf.split("\n"); buf=lines.pop();
        for(const ln of lines) {
          if(!ln.startsWith("data: ")) continue;
          const raw=ln.slice(6).trim(); if(raw==="[DONE]") break outer;
          try {
            const e=JSON.parse(raw);
            if(e.type==="content_block_delta"&&e.delta?.type==="text_delta") {
              full+=e.delta.text;
              setMsgs(p=>{const a=[...p];const l=a[a.length-1];if(l?.streaming)a[a.length-1]={...l,content:full};return a;});
            }
          } catch {}
        }
      }
      setMsgs(p=>{const a=[...p];a[a.length-1]={...a[a.length-1],content:full,streaming:false};return a;});
      setHist([...newHist,{role:"assistant",content:full}]);
      const parsed = extractSkillJSON(full);
      if(parsed) { setSkill(parsed); setJsonTxt(JSON.stringify(parsed,null,2)); setJsonErr(null); }
    } catch(e) {
      setMsgs(p=>[...p,{role:"assistant",content:`Ошибка: ${e.message}`,streaming:false}]);
    } finally { setLoading(false); }
  };

  const handleSave = () => {
    const err = validateSkill(skill);
    if(err) { alert(`Ошибка: ${err}`); return; }
    onSave({...skill, custom:true});
    onClose();
  };

  const valErr = validateSkill(skill);
  const cc = skill ? (CAT[skill.cat]||CAT.technical) : null;
  const EXAMPLES_COMPOSER = [
    "Создай skill для расчёта PKH §73a SGG с порогами дохода",
    "Skill für Berufung §143 SGG gegen Sozialgericht-Urteile",
    "Skill for tracking multiple case deadlines across different courts",
  ];

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",
      zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ width:"min(90vw,860px)",height:"82vh",background:C.bg,
        border:`1px solid ${C.border2}`,borderRadius:10,
        display:"flex",flexDirection:"column",overflow:"hidden" }}>

        {/* Header */}
        <div style={{ borderBottom:`1px solid ${C.border}`,padding:"8px 16px",
          display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <span style={{ fontSize:11,color:C.textDim,fontFamily:"monospace" }}>⬡ Skill Composer</span>
          {skill&&<span style={{ fontSize:9,color:C.textMuted,fontFamily:"monospace" }}>· {skill.id}</span>}
          {skill&&!valErr&&<span style={{ fontSize:9,color:C.green,fontFamily:"monospace" }}>✓ valid</span>}
          {skill&&valErr&&<span style={{ fontSize:9,color:C.red,fontFamily:"monospace" }}>✗ {valErr}</span>}
          <button onClick={onClose} style={{ marginLeft:"auto",background:"transparent",
            border:`1px solid ${C.border2}`,color:C.textDim,padding:"2px 10px",
            borderRadius:4,cursor:"pointer",fontSize:11,fontFamily:"monospace" }}>✕</button>
        </div>

        {/* Two columns */}
        <div style={{ flex:1,display:"flex",minHeight:0 }}>

          {/* LEFT — chat */}
          <div style={{ width:"44%",borderRight:`1px solid ${C.border}`,
            display:"flex",flexDirection:"column" }}>
            <div style={{ padding:"5px 12px",borderBottom:`1px solid ${C.border}`,
              fontSize:9,color:C.textDim,letterSpacing:"0.1em",textTransform:"uppercase" }}>
              ◎ Описание навыка
            </div>
            <div ref={chatRef} style={{ flex:1,overflowY:"auto",padding:12 }}>
              {msgs.length===0&&(
                <div>
                  <p style={{ fontSize:12,color:C.textDim,lineHeight:1.7,marginTop:0 }}>
                    Опиши skill — Claude сгенерирует структуру.<br/>
                    Затем можешь уточнять в диалоге.
                  </p>
                  <div style={{ fontSize:9,color:C.textMuted,marginBottom:8,
                    textTransform:"uppercase",letterSpacing:"0.1em" }}>примеры</div>
                  {EXAMPLES_COMPOSER.map((ex,i)=>(
                    <button key={i} onClick={()=>send(ex)} style={{
                      display:"block",width:"100%",textAlign:"left",
                      background:"transparent",border:`1px solid ${C.border}`,
                      color:C.textMuted,padding:"6px 10px",borderRadius:4,
                      fontSize:11,cursor:"pointer",marginBottom:5,fontFamily:"inherit" }}>
                      → {ex}
                    </button>
                  ))}
                </div>
              )}
              {msgs.map((m,i)=>{
                if(m.role==="note") return (
                  <div key={i} style={{ fontSize:11,color:C.yellow,padding:"5px 10px",
                    background:"#1a1400",borderRadius:4,marginBottom:10,
                    border:`1px solid ${C.yellow}33`,fontFamily:"monospace" }}>✎ {m.content}</div>
                );
                const isU=m.role==="user";
                const stripped=m.content?.replace(/```[\s\S]*?```/g,"").trim();
                return (
                  <div key={i} style={{ marginBottom:12,display:"flex",gap:8 }}>
                    <div style={{ width:22,height:22,borderRadius:"50%",flexShrink:0,
                      background:isU?"#bc8cff":m.streaming?"#1a3a1a":C.green,
                      border:m.streaming?`1.5px solid ${C.green}`:"none",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:9,fontWeight:700,color:m.streaming?C.green:"#000" }}>
                      {isU?"M":"AI"}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      {isU
                        ? <div style={{ color:C.text,fontSize:12,lineHeight:1.6 }}>{m.content}</div>
                        : <div style={{ color:C.textDim,fontSize:12,lineHeight:1.6,
                            fontFamily:m.streaming?"'Fira Code',monospace":"inherit",
                            whiteSpace:m.streaming?"pre-wrap":"normal",wordBreak:"break-word" }}>
                            {stripped||m.content}
                            {m.streaming&&<span style={{ display:"inline-block",width:2,height:12,
                              background:C.green,marginLeft:1,verticalAlign:"text-bottom",
                              animation:"blink 0.65s step-end infinite" }}/>}
                          </div>
                      }
                    </div>
                  </div>
                );
              })}
              {loading&&!msgs[msgs.length-1]?.streaming&&(
                <div style={{ display:"flex",gap:4,alignItems:"center",color:C.green,fontSize:11 }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:4,height:4,borderRadius:"50%",
                    background:C.green,animation:`pulse 1s ease-in-out ${i*0.2}s infinite` }}/>)}
                  <span style={{ marginLeft:4 }}>генерирует skill…</span>
                </div>
              )}
            </div>
            <div style={{ padding:8,borderTop:`1px solid ${C.border}` }}>
              <div style={{ display:"flex",background:C.panel,
                border:`1px solid ${C.border2}`,borderRadius:6,overflow:"hidden" }}>
                <textarea value={input} rows={2}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}}
                  placeholder="Опиши или уточни skill…"
                  style={{ flex:1,background:"transparent",border:"none",
                    padding:"8px 10px",color:C.text,fontSize:12,
                    fontFamily:"inherit",resize:"none",lineHeight:1.5 }}
                />
                <button onClick={()=>send(input)} disabled={loading} style={{
                  background:loading?C.textMuted:C.accent,border:"none",
                  padding:"0 14px",cursor:loading?"not-allowed":"pointer",
                  color:"#000",fontWeight:700,fontSize:14 }}>↑</button>
              </div>
            </div>
          </div>

          {/* RIGHT — preview / JSON */}
          <div style={{ flex:1,display:"flex",flexDirection:"column" }}>
            <div style={{ borderBottom:`1px solid ${C.border}`,display:"flex" }}>
              {["preview","json"].map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{
                  background:"transparent",border:"none",
                  borderBottom:tab===t?`2px solid ${C.accent}`:"2px solid transparent",
                  color:tab===t?C.accent:C.textDim,
                  padding:"6px 16px",fontSize:9,cursor:"pointer",fontFamily:"monospace",
                  letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:-1 }}>
                  {t==="preview"?"◈ Preview":"⌥ JSON"}
                </button>
              ))}
            </div>

            <div style={{ flex:1,overflowY:"auto",padding:12 }}>
              {!skill&&<div style={{ color:C.textMuted,fontSize:11,lineHeight:1.8 }}>
                Skill появится здесь после ответа Claude.
              </div>}

              {skill&&tab==="preview"&&cc&&(
                <div style={{ border:`1px solid ${cc.border}`,background:cc.bg,
                  borderRadius:8,padding:"12px 14px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                    <span style={{ fontSize:9,fontFamily:"monospace",padding:"1px 6px",
                      borderRadius:3,background:cc.border,color:cc.text,fontWeight:600 }}>{skill.cat}</span>
                    <span style={{ fontSize:14,fontWeight:500,color:C.text }}>{skill.name}</span>
                    <span style={{ fontSize:10,color:C.textMuted,fontFamily:"monospace",
                      marginLeft:"auto" }}>{skill.id}</span>
                  </div>
                  <p style={{ fontSize:12,color:C.textDim,margin:"0 0 10px",lineHeight:1.55 }}>{skill.desc}</p>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:9,color:C.textMuted,marginBottom:5,
                      textTransform:"uppercase",letterSpacing:"0.1em" }}>triggers ({(skill.triggers||[]).length})</div>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                      {(skill.triggers||[]).map((t,i)=>(
                        <span key={i} style={{ fontSize:10,fontFamily:"monospace",
                          padding:"1px 7px",borderRadius:3,
                          background:C.panel,border:`0.5px solid ${C.border2}`,color:C.textDim }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize:9,color:C.textMuted,marginBottom:5,
                    textTransform:"uppercase",letterSpacing:"0.1em" }}>ctx · injected into prompt</div>
                  <pre style={{ fontSize:11,color:C.code,margin:0,fontFamily:"'Fira Code',monospace",
                    lineHeight:1.6,whiteSpace:"pre-wrap",background:"#060a0e",
                    border:`0.5px solid ${C.border2}`,borderRadius:5,padding:"8px 10px",
                    maxHeight:160,overflowY:"auto" }}>{skill.ctx}</pre>
                </div>
              )}

              {tab==="json"&&(
                <div>
                  <textarea value={jsonTxt} onChange={e=>handleJsonChange(e.target.value)}
                    style={{ width:"100%",minHeight:300,background:"#060a0e",color:C.code,
                      border:`1px solid ${jsonErr?C.red:C.border2}`,borderRadius:6,
                      padding:"10px 12px",fontFamily:"'Fira Code',monospace",fontSize:11.5,
                      lineHeight:1.65,resize:"vertical",outline:"none" }}/>
                  {jsonErr&&<div style={{ color:C.red,fontSize:10,fontFamily:"monospace",marginTop:4 }}>
                    ✗ {jsonErr}
                  </div>}
                  {!jsonErr&&skill&&<div style={{ color:C.green,fontSize:10,fontFamily:"monospace",marginTop:4 }}>
                    ✓ valid JSON
                  </div>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:"10px 12px",borderTop:`1px solid ${C.border}`,
              display:"flex",gap:8,justifyContent:"flex-end",alignItems:"center",flexShrink:0 }}>
              {skill&&<span style={{ fontSize:10,color:C.textMuted,marginRight:"auto",fontFamily:"monospace" }}>
                {(skill.triggers||[]).length} triggers · {(skill.ctx||"").length} chars ctx
              </span>}
              <button onClick={onClose} style={{ background:"transparent",
                border:`1px solid ${C.border2}`,color:C.textDim,
                padding:"5px 16px",borderRadius:5,cursor:"pointer",
                fontSize:12,fontFamily:"monospace" }}>Отмена</button>
              <button onClick={handleSave} disabled={!!valErr||!skill} style={{
                background:(!skill||valErr)?C.textMuted:C.green,
                border:"none",color:"#000",fontWeight:600,
                padding:"5px 20px",borderRadius:5,
                cursor:(!skill||valErr)?"not-allowed":"pointer",
                fontSize:12,fontFamily:"monospace" }}>
                {editingSkill?"✓ Обновить":"✓ Сохранить skill"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSERTION PANE
// ═══════════════════════════════════════════════════════════════════════════
const SEV_STYLE = {
  error:   { bg:"#2d0d0d", border:`${C.red}55`,   text:C.red,    icon:"✗" },
  warning: { bg:"#1a1200", border:`${C.yellow}55`, text:C.yellow, icon:"!" },
  info:    { bg:"#0d1928", border:`${C.accent}44`, text:C.accent, icon:"i" },
};

const LINE_STYLE = {
  pass:   { color:C.green,    prefix:"✓ " },
  fail:   { color:C.red,      prefix:"✗ " },
  warn:   { color:C.yellow,   prefix:"⚠ " },
  score:  { color:C.text,     prefix:"",   weight:500 },
  header: { color:C.accent,   prefix:"",   weight:500 },
  status: { color:C.textMuted, prefix:"" },
  text:   { color:C.textDim,  prefix:"" },
  blank:  { color:"transparent", prefix:"" },
};


function ScoreRing({ score, size=52 }) {
  const r = (size/2)-5, cx = size/2;
  const circ = 2*Math.PI*r;
  const offset = circ*(1-Math.max(0,Math.min(100,score))/100);
  const color = score>=80?C.green:score>=60?C.yellow:C.red;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={C.border2} strokeWidth="4"/>
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition:"stroke-dashoffset 0.5s ease, stroke 0.3s" }}/>
      <text x={cx} y={cx+1} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize:13, fontWeight:500, fill:color, fontFamily:"var(--font-mono)" }}>
        {score}
      </text>
    </svg>
  );
}

function SemanticStream({ text, done }) {
  const lines = parseStreamLines(text);
  const lastIdx = lines.reduce((acc,l,i)=>l.type!=="blank"?i:acc, 0);
  return (
    <div style={{ padding:"6px 14px 10px", borderTop:`0.5px solid ${C.border}` }}>
      <div style={{ fontSize:9, color:C.textMuted, letterSpacing:"0.1em",
        textTransform:"uppercase", fontFamily:"monospace", marginBottom:6,
        display:"flex", alignItems:"center", gap:8 }}>
        ⬡ Semantic Analysis
        {!done && <span style={{ color:C.green, fontSize:8,
          animation:"streamPulse 1s ease-in-out infinite" }}>● streaming</span>}
        {done  && <span style={{ color:C.green, fontSize:8 }}>✓ done</span>}
      </div>
      <div style={{ fontFamily:"'Fira Code',monospace", fontSize:11.5, lineHeight:1.75 }}>
        {lines.map((line,i) => {
          if(line.type==="blank") return <div key={i} style={{ height:4 }}/>;
          const s = LINE_STYLE[line.type]||LINE_STYLE.text;
          const isLast = i===lastIdx;
          return (
            <div key={i} style={{ color:s.color, fontWeight:s.weight||400 }}>
              {s.prefix}{line.text}
              {isLast&&!done&&<span style={{ display:"inline-block", width:2, height:12,
                background:C.green, marginLeft:2, verticalAlign:"text-bottom",
                animation:"blink 0.65s step-end infinite" }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssertionPane({ result, checking, onAutoFix, onRecheck, onExportDocx }) {
  const [expandedId, setExpandedId] = useState(null);

  if(checking && !result) return (
    <div style={{ padding:16 }}>
      <Typing label="⚖ L1: structural check…" color={C.accent}/>
    </div>
  );
  if(!result) return (
    <div style={{ padding:16, color:C.textMuted, fontSize:11, lineHeight:1.8 }}>
      <div style={{ color:C.textDim, marginBottom:4 }}>⚖ Legal Assertion Checker</div>
      Автоматически запускается когда вывод содержит<br/>
      правовой документ (Widerspruch, Eilantrag, Klage…)
    </div>
  );

  const { structural, semantic, semanticStream, finalScore, docType } = result;
  const isStreamingNow = checking && !!semanticStream && !semantic;
  const streamDone     = !checking && !!semanticStream;

  const docLabels = { widerspruch:"Widerspruch", eilantrag:"Eilantrag §86b",
                      klage:"Klage", generic:"Legal document" };

  const structIssues = [
    ...structural.errors.map(r=>({...r,severity:"error"})),
    ...structural.warnings.map(r=>({...r,severity:"warning"})),
  ];
  const semIssues  = (semantic?.issues||[]).filter(i=>i.severity!=="info");
  const fixable    = [...structIssues, ...semIssues];
  const errorCount = structIssues.filter(i=>i.severity==="error").length
                   + (semantic?.issues||[]).filter(i=>i.severity==="error").length;
  const isValid    = finalScore>=70 && errorCount===0;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>

      {/* Score header */}
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <ScoreRing score={finalScore}/>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
            <span style={{ fontSize:12, fontWeight:500, color:C.text }}>
              {docLabels[docType]||docType}
            </span>
            <span style={{ fontSize:9, fontFamily:"monospace", padding:"1px 7px",
              borderRadius:99, fontWeight:600,
              background:isValid?"#0d2b0d":errorCount>0?"#2d0d0d":"#1a1200",
              color:isValid?C.green:errorCount>0?C.red:C.yellow }}>
              {isValid?"✓ valid":errorCount>0?`✗ ${errorCount} errors`:"⚠ warnings"}
            </span>
            {isStreamingNow&&<span style={{ fontSize:9, color:C.green,
              fontFamily:"monospace", animation:"streamPulse 1s ease-in-out infinite" }}>
              semantic…
            </span>}
          </div>
          <div style={{ fontSize:10, color:C.textMuted, fontFamily:"monospace" }}>
            L1 {structural.results.filter(r=>r.passed).length}/{structural.results.length}
            {semantic?` · L2 ${semantic.score}`:isStreamingNow?" · L2 streaming":" · L2 pending"}
            {" · "}combined {finalScore}
          </div>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          <button onClick={onRecheck} style={{ background:"transparent",
            border:`1px solid ${C.border2}`, color:C.textDim,
            padding:"3px 9px", borderRadius:4, cursor:"pointer",
            fontSize:9, fontFamily:"monospace" }}>↺</button>
          {onExportDocx&&<button onClick={onExportDocx} title="Скачать как Word-документ (.docx)" style={{ background:"transparent",
            border:`1px solid ${C.border2}`, color:C.textDim,
            padding:"3px 9px", borderRadius:4, cursor:"pointer",
            fontSize:9, fontFamily:"monospace" }}>📄 .docx</button>}
          {fixable.length>0&&(
            <button onClick={()=>onAutoFix(fixable)} style={{
              background:"#0d2b0d", border:`1px solid ${C.green}55`,
              color:C.green, padding:"3px 10px", borderRadius:4,
              cursor:"pointer", fontSize:9, fontFamily:"monospace" }}>
              ⟳ auto-fix
            </button>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>

        {/* L1 structural */}
        <div style={{ padding:"5px 14px 2px", fontSize:9, color:C.textMuted,
          letterSpacing:"0.1em", textTransform:"uppercase",
          fontFamily:"monospace", marginTop:4 }}>
          ◎ L1 Structural · {structural.score}%
        </div>
        {structural.results.map(r=>(
          <div key={r.id}
            onClick={()=>setExpandedId(expandedId===r.id?null:r.id)}
            style={{ display:"flex", alignItems:"flex-start", gap:8,
              padding:"5px 14px", borderBottom:`0.5px solid ${C.border}22`,
              cursor:(!r.passed&&r.hint)?"pointer":"default" }}>
            <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0,
              marginTop:1, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:9, fontWeight:700,
              background:r.passed?"#0d2b0d":SEV_STYLE[r.sev]?.bg||C.panel,
              color:r.passed?C.green:SEV_STYLE[r.sev]?.text||C.textDim,
              border:`1px solid ${r.passed?C.green+"44":SEV_STYLE[r.sev]?.border||C.border}`,
            }}>
              {r.passed?"✓":SEV_STYLE[r.sev]?.icon||"·"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:r.passed?C.textDim:C.text }}>{r.label}</div>
              {!r.passed&&expandedId===r.id&&r.hint&&(
                <div style={{ fontSize:11, color:C.textMuted, marginTop:3,
                  fontFamily:"monospace", lineHeight:1.5 }}>→ {r.hint}</div>
              )}
            </div>
            {!r.passed&&<span style={{ fontSize:9, fontFamily:"monospace",
              color:SEV_STYLE[r.sev]?.text, flexShrink:0, marginTop:2 }}>{r.sev}</span>}
          </div>
        ))}

        {/* L2 streaming view */}
        {semanticStream&&!semantic&&(
          <SemanticStream text={semanticStream} done={streamDone}/>
        )}

        {/* L2 structured results */}
        {semantic&&(
          <>
            {semantic.issues?.length>0&&(
              <>
                <div style={{ padding:"8px 14px 4px", fontSize:9, color:C.textMuted,
                  letterSpacing:"0.1em", textTransform:"uppercase",
                  fontFamily:"monospace", marginTop:4 }}>
                  ⬡ L2 Semantic · {semantic.score}
                </div>
                {semantic.issues.map((issue,i)=>{
                  const st=SEV_STYLE[issue.severity]||SEV_STYLE.info;
                  const iid=`sem-${i}`;
                  return (
                    <div key={iid}
                      onClick={()=>setExpandedId(expandedId===iid?null:iid)}
                      style={{ margin:"3px 10px", borderRadius:6,
                        background:st.bg, border:`1px solid ${st.border}`,
                        overflow:"hidden", cursor:"pointer" }}>
                      <div style={{ display:"flex", alignItems:"flex-start",
                        gap:8, padding:"7px 10px" }}>
                        <div style={{ width:16,height:16,borderRadius:"50%",flexShrink:0,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:9,fontWeight:700,background:st.text+"22",
                          color:st.text,marginTop:1 }}>{st.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12,color:C.text,marginBottom:1 }}>{issue.field}</div>
                          <div style={{ fontSize:11,color:st.text,lineHeight:1.4 }}>{issue.message}</div>
                          {expandedId===iid&&issue.suggestion&&(
                            <div style={{ fontSize:11,color:C.textDim,marginTop:4,
                              fontFamily:"monospace",lineHeight:1.5,
                              paddingTop:4,borderTop:`0.5px solid ${st.border}` }}>
                              → {issue.suggestion}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize:9,color:st.text,
                          fontFamily:"monospace",flexShrink:0,marginTop:2 }}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {semantic.strengths?.length>0&&(
              <div style={{ padding:"8px 14px 4px" }}>
                <div style={{ fontSize:9,color:C.textMuted,marginBottom:5,
                  textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"monospace" }}>
                  ✓ Strengths
                </div>
                {semantic.strengths.map((s,i)=>(
                  <div key={i} style={{ fontSize:11,color:C.textDim,
                    padding:"1px 0",lineHeight:1.5 }}>✓ {s}</div>
                ))}
              </div>
            )}
            {semantic.suggestions?.length>0&&(
              <div style={{ padding:"8px 14px" }}>
                <div style={{ fontSize:9,color:C.textMuted,marginBottom:5,
                  textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"monospace" }}>
                  → Suggestions
                </div>
                {semantic.suggestions.map((s,i)=>(
                  <div key={i} style={{ fontSize:11,color:C.textDim,
                    padding:"2px 0 2px 8px",lineHeight:1.5,
                    borderLeft:`2px solid ${C.border2}`,marginBottom:2 }}>{s}</div>
                ))}
              </div>
            )}
            {isValid&&(
              <div style={{ padding:"10px 14px",color:C.green,fontSize:12 }}>
                ✓ Document is ready for submission
              </div>
            )}
          </>
        )}

        {!semanticStream&&!semantic&&!checking&&structural.score>=60&&(
          <div style={{ padding:"10px 14px",color:C.textMuted,fontSize:11,
            fontFamily:"monospace" }}>
            ✓ L1 passed. Semantic analysis starting…
          </div>
        )}
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════
function RetryMsg({msg}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ marginBottom:14,display:"flex",gap:10,opacity:0.92 }}>
      <div style={{ width:26,height:26,borderRadius:"50%",flexShrink:0,marginTop:1,
        background:"#7a5500",border:`1.5px solid ${C.yellow}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:11,fontWeight:700,color:C.yellow }}>⟳</div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap" }}>
          <span style={{ fontSize:11,color:C.yellow,fontFamily:"monospace" }}>auto-fix</span>
          <span style={{ fontSize:9,background:"#7a550088",color:C.yellow,
            padding:"1px 7px",borderRadius:99,fontFamily:"monospace",border:`1px solid ${C.yellow}44` }}>
            attempt {msg.attempt}/{2}
          </span>
          <span style={{ fontSize:10,color:C.textMuted }}>{msg.time}</span>
        </div>
        {/* collapsed error that triggered the fix */}
        <div onClick={()=>setExpanded(e=>!e)} style={{
          cursor:"pointer",fontSize:11,color:C.red,fontFamily:"monospace",
          background:"#2d0d0d",borderRadius:4,padding:"4px 10px",marginBottom:6,
          borderLeft:`2px solid ${C.red}`,display:"flex",alignItems:"center",gap:6,
        }}>
          <span style={{ flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
            ✗ {msg.originalError?.split("\n")[0]}
          </span>
          <span style={{ color:C.textMuted,fontSize:10,flexShrink:0 }}>{expanded?"▲":"▼"}</span>
        </div>
        {expanded&&<pre style={{ fontSize:10,color:"#fca5a5",fontFamily:"'Fira Code',monospace",
          background:"#2d0d0d",borderRadius:4,padding:"6px 10px",margin:"0 0 6px",
          whiteSpace:"pre-wrap",maxHeight:100,overflowY:"auto",
          border:`0.5px solid ${C.red}44` }}>{msg.originalError}</pre>}
        {/* fixed code preview */}
        {msg.code&&<pre style={{ margin:0,fontSize:12,lineHeight:1.65,color:C.code,
          fontFamily:"'Fira Code',monospace",whiteSpace:"pre-wrap",background:"#060a0e",
          border:`1px solid ${C.yellow}33`,borderRadius:6,padding:"9px 12px",
          maxHeight:120,overflowY:"auto" }}>
          {msg.code.split("\n").slice(0,6).join("\n")}{msg.code.split("\n").length>6?"\n…":""}
        </pre>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT MESSAGE
// ═══════════════════════════════════════════════════════════════════════════
function Msg({msg}) {
  if(msg.role==="retry") return <RetryMsg msg={msg}/>;
  const isUser   = msg.role==="user";
  const isStream = msg.streaming === true;
  // Only strip code fences when finalized
  const stripped = isStream ? null : msg.content?.replace(/```[\s\S]*?```/g,"").trim();

  return <div style={{ marginBottom:18,display:"flex",gap:10 }}>
    <div style={{ width:26,height:26,borderRadius:"50%",flexShrink:0,marginTop:1,
      background:isUser?"#bc8cff":isStream?"#1a3a1a":C.green,
      border:isStream?`1.5px solid ${C.green}`:"none",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:10,fontWeight:700,color:isStream?C.green:"#000",
      transition:"background 0.3s" }}>
      {isUser?"M":"AI"}
    </div>
    <div style={{ flex:1,minWidth:0 }}>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap" }}>
        <span style={{ fontSize:11,color:C.textDim,fontFamily:"monospace" }}>{isUser?"dev":"claude"}</span>
        {msg.lang&&<LangTag lang={msg.lang}/>}
        {isStream&&<span style={{ fontSize:9,color:C.green,fontFamily:"monospace",
          animation:"streamPulse 1s ease-in-out infinite" }}>streaming…</span>}
        {!isStream&&<span style={{ fontSize:10,color:C.textMuted }}>{msg.time}</span>}
        {msg.skills&&!isStream&&msg.skills.map(({skill,score})=>(
          <SkillBadge key={skill.id} skill={skill} score={score}/>
        ))}
      </div>
      {isUser
        ? <div style={{ color:C.text,fontSize:13,lineHeight:1.65 }}>{msg.content}</div>
        : isStream
          /* ── Streaming view: raw text + cursor ── */
          ? <div style={{ color:C.textDim,fontSize:12,lineHeight:1.65,
              fontFamily:"'Fira Code',monospace",whiteSpace:"pre-wrap",wordBreak:"break-word" }}>
              {msg.content}
              <span style={{ display:"inline-block",width:2,height:13,
                background:C.green,marginLeft:2,verticalAlign:"text-bottom",
                animation:"blink 0.65s step-end infinite" }}/>
            </div>
          /* ── Finalized view: code preview + explanation ── */
          : <>
              {msg.code&&<pre style={{ margin:"0 0 6px",fontSize:12,lineHeight:1.65,color:C.code,
                fontFamily:"'Fira Code',monospace",whiteSpace:"pre-wrap",background:"#060a0e",
                border:`1px solid ${C.border2}`,borderRadius:6,padding:"9px 12px",
                maxHeight:130,overflowY:"auto" }}>
                {msg.code.split("\n").slice(0,7).join("\n")}{msg.code.split("\n").length>7?"\n…":""}
              </pre>}
              {stripped&&<div style={{ color:C.textDim,fontSize:12,lineHeight:1.65,marginTop:4 }}>
                {stripped}
              </div>}
            </>
      }
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════
const EXAMPLES = [
  "Рассчитай дедлайн Widerspruch: Bescheid от 01.04.2026",
  "Erstelle Eilantrag §86b SGG gegen KSV Sachsen",
  "Создай pandas DataFrame с ANLAGE документами дела S 6 SO 58/26",
  "Schonvermögen §90 SGB XII berechnen: Vermögen 12.500€",
  "Analyze: KSV hat Persönliches Budget abgelehnt ohne Begründung",
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function WritingOS() {
  const [lang, setLang]           = useState("py");
  const [pyReady, setPyReady]     = useState(false);
  const [pyStatus, setPyStatus]   = useState("");
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [routing, setRouting]     = useState(false);
  const [curCode, setCurCode]     = useState("");
  const [output, setOutput]       = useState({result:null,error:null});
  const [running, setRunning]     = useState(false);
  const [history, setHistory]     = useState([]);
  const [rightTab, setRightTab]   = useState("output");
  const [sessionVars, setSessionVars] = useState({});
  const [execCount, setExecCount] = useState(0);
  const [lastRoute, setLastRoute] = useState(null);
  const [toast, setToast]         = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  // ── Auto-retry state ──────────────────────────────────────────────────────
  const [retrying, setRetrying]   = useState(null);  // null | {attempt, error}
  const [retryLog, setRetryLog]   = useState([]);    // [{attempt, error, status}]
  // ── Streaming state ───────────────────────────────────────────────────────
  const [streaming, setStreaming] = useState(false);
  // ── Legal Assertion Checker state ─────────────────────────────────────────
  const [assertResult,   setAssertResult]   = useState(null);
  const [assertChecking, setAssertChecking] = useState(false);
  // ── Custom skills (localStorage) ─────────────────────────────────────────
  const [customSkills,  setCustomSkills]  = useState(()=>loadCustomSkills());
  const [showComposer,  setShowComposer]  = useState(false);
  const [editingSkill,  setEditingSkill]  = useState(null);
  // ── Python runtime / autosave ─────────────────────────────────────────────
  const [restoreOffer,  setRestoreOffer]  = useState(null);   // {script, ts, vars} from a previous visit
  const [pyMode,        setPyMode]        = useState(null);   // "worker" | "main" (main = no timeout protection)
  const [jsTier,        setJsTier]        = useState(null);   // "frame" | "worker" | "inline" (how JS is isolated)
  const chatRef = useRef(null);
  // Refs, not state: they are read inside async callbacks and must never be stale.
  const busyRef        = useRef(false);   // a send() is in flight
  const epochRef       = useRef(0);       // bumped when the session is replaced (language switch / load)
  const summaryRef     = useRef(null);    // {text, code[], upto} — rolling summary of `history`
  const summaryFailRef = useRef(null);    // history length at the last failed summarisation (back-off)
  const runsRef        = useRef(0);       // successful Python runs → autosave cadence
  const abortRef       = useRef(null);    // AbortController of the exchange in flight

  // All skills = built-in + user-created (memoised: send() depends on it)
  const allSkills = useMemo(()=>[...SKILLS, ...customSkills],[customSkills]);

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[messages]);

  // Python runtime events → notices (timeouts, restarts, fallback to the main thread)
  const onPyEvent = useCallback(ev=>{
    if(ev.type==="timeout")            setToast("⏱ Python остановлен по таймауту, перезапуск…");
    else if(ev.type==="respawn-ready") {
      const lost = ev.failed?.length ? ` · не сохраняются: ${ev.failed.slice(0,6).join(", ")}` : "";
      setToast(ev.restored ? `✓ Python перезапущен, переменные восстановлены${lost}` : `✓ Python перезапущен${lost}`);
      getSessionVars().then(setSessionVars);   // the Session tab must not keep listing what the restart lost
    }
    else if(ev.type==="respawn-failed") setToast("✗ Не удалось перезапустить Python");
    else if(ev.type==="fallback")      setPyMode("main");
  },[]);

  // Load Python once (initPy is idempotent). Afterwards offer to restore an autosaved namespace.
  useEffect(()=>{
    if(lang!=="py"||pyReady) return;
    let alive = true;
    initPy(setPyStatus,{ onEvent:onPyEvent }).then(async ()=>{
      if(!alive) return;
      setPyReady(true); setPyStatus(""); setPyMode(_pyRt().getMode());
      setSessionVars(await getSessionVars());
      const offer = readSnapshotOffer();
      if(offer) setRestoreOffer(offer);
    }).catch(e=>{ if(alive){ setPyStatus(""); setToast("✗ Python недоступен: "+(e?.message||e)); } });
    return ()=>{ alive = false; };
  },[lang,pyReady,onPyEvent]);

  const refreshSession = useCallback(async ()=>{ setSessionVars(await getSessionVars()); },[]);

  const handleRestore = async ()=>{
    const offer = restoreOffer; setRestoreOffer(null);
    if(!offer) return;
    const r = await restoreFromScript(offer.script);
    await refreshSession();
    setToast(r.error ? "✗ Восстановление не удалось: "+String(r.error).split("\n").pop()
      : r.failed?.length ? `✓ Восстановлено; пропущено: ${r.failed.join(", ")}` : "✓ Namespace восстановлен");
  };
  const handleDiscardSnapshot = ()=>{ clearSnapshotStorage(); setRestoreOffer(null); };

  // ── Raw single execution (no retry) ─────────────────────────────────────
  // `epoch`: the session this run belongs to. If the session was replaced (language switch / load) before
  // the run starts, nothing is executed and no state is touched.
  const rawExecute = useCallback(async (code, language, epoch)=>{
    const mine = ()=>epoch===undefined || epoch===epochRef.current;
    if(!mine()) return { result:null, error:null, replaced:true };
    setRunning(true); setCurCode(code);
    let r;
    try {
      if(language==="py") { r=await runPy(code); refreshSession(); }
      else { await new Promise(res=>setTimeout(res,180)); r=await runJS(code); setJsTier(getJsTier()); }
    } finally { if(mine()) setRunning(false); }
    return r;
  },[refreshSession]);

  // ── Execute with auto-retry (max MAX_RETRIES attempts) ───────────────────
  // Every await is followed by a stale() check: an exchange abandoned by a language switch / load must not
  // write its output, retry bubbles or counters into the NEW session, nor run its fixed code there.
  const executeWithRetry = useCallback(async (code, language, sysPrompt, hist, attempt=0, epoch=epochRef.current)=>{
    const stale = ()=>epoch!==epochRef.current;
    const r = await rawExecute(code, language, epoch);
    if(stale()) return r;

    if(r.error && attempt < MAX_RETRIES) {
      // Record this failure in log
      setRetryLog(prev=>[...prev,{attempt:attempt+1, error:r.error, code, status:"failed"}]);
      setRetrying({attempt:attempt+1, error:r.error.slice(0,300)});

      // Build fix request — send error + failing code back to Claude
      const hint = r.timedOut ? "\n\nThe code exceeded the time limit (an endless loop or a very heavy computation). Rewrite it so that it finishes quickly." : "";
      const errMsg = `Runtime error (attempt ${attempt+1}/${MAX_RETRIES}):\n${r.error}${hint}\n\nFailing code:\n\`\`\`${language==="py"?"python":"javascript"}\n${code}\n\`\`\`\n\nFix the bug. Return only the corrected code block, no explanation needed.`;
      const fixHist = [...hist, {role:"user", content: errMsg}];

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            model:MODEL, max_tokens:800,
            system:sysPrompt, messages:fixHist,
          }),
        });
        if(!res.ok) throw new Error(`API ${res.status}`);
        const d = await res.json();
        if(stale()) return r;
        const fixTxt = firstText(d);
        const fixedCode = extractCode(fixTxt, language);

        const time = new Date().toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});
        // Add retry message to chat (visible record of the fix)
        setMessages(prev=>[...prev,{
          role:"retry", content:fixTxt, code:fixedCode||"", lang:language, time,
          attempt:attempt+1, originalError:r.error.slice(0,200),
        }]);
        setRetrying(null);

        if(fixedCode) {
          // Recurse with the fixed code
          return executeWithRetry(fixedCode, language, sysPrompt, hist, attempt+1, epoch);
        }
      } catch(e) { /* network error — fall through to show original error */ }
      if(stale()) return r;
      setRetrying(null);
    }

    // Final result (success or all retries exhausted)
    setRetryLog(prev=>[...prev,{
      attempt:attempt+1, code,
      result:r.result, error:r.error,
      status: r.error ? "final_fail" : "ok",
    }]);
    if(!r.error && language==="py") {
      setExecCount(n=>n+1);
      // Autosave every 3rd successful run. The snapshot was already captured inside the worker after the
      // run, so this is a cheap synchronous read — and it lives outside any state updater. An EMPTY
      // snapshot (everything was deleted / nothing restorable) removes the old autosave instead of keeping it.
      runsRef.current += 1;
      if(runsRef.current % 3 === 0) saveSnapshotToStorage(getSnapshot(), runsRef.current);
    }
    setOutput(r);
    setRetrying(null);
    setRightTab("output");

    // ── Auto-trigger Legal Assertion Checker ───────────────────────────────
    if(!r.error) {
      const outputText = String(r.result || "");
      if(isLegalDoc(outputText)) {
        setAssertResult(null);
        setAssertChecking(true);
        setRightTab("assert");
        // L1: structural (sync, instant)
        const structural = runStructuralCheck(outputText);
        const l1Score = structural.score;
        setAssertResult({ structural, semantic:null, semanticStream:"",
          finalScore:l1Score, docType:structural.docType });
        // L2: semantic streaming (only if L1 >= 60%)
        if(l1Score >= 60) {
          streamSemanticCheck(
            outputText,
            structural.docType,
            // onChunk — update stream text as tokens arrive
            (streamText) => {
              if(stale()) return;
              setAssertResult(prev => prev
                ? { ...prev, semanticStream: streamText }
                : prev);
            },
            // onComplete — set parsed JSON + final score
            (streamText, parsed) => {
              if(stale()) return;
              setAssertChecking(false);
              const semantic = parsed || null;
              const finalScore = semantic
                ? Math.round(l1Score * 0.4 + (semantic.score || 0) * 0.6)
                : l1Score;
              setAssertResult({ structural, semantic, semanticStream:streamText,
                finalScore, docType:structural.docType });
            }
          );
        } else {
          setAssertChecking(false);
        }
      }
    }

    return r;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[rawExecute]);

  // ── UNIFIED PIPELINE: route → inject → generate → execute ────────────────
  // In-flight guard is busyRef (set synchronously, released in `finally`): a `loading` state value read
  // from a memoised closure goes stale and used to swallow every message after the first exchange.
  // `epoch` ties the exchange to the session it started in: abandon() (language switch / load) bumps the
  // epoch, aborts the stream and releases the lock; the old exchange then notices and stops writing state.
  const send = useCallback(async (text)=>{
    if(!text.trim()) return;
    if(busyRef.current) { setToast("Подождите: предыдущий запрос ещё выполняется"); return; }
    if(lang==="py"&&!pyReady) { setToast("Python ещё загружается…"); return; }
    busyRef.current = true;
    const epoch = epochRef.current;
    const replaced = ()=>epoch!==epochRef.current;
    const ac = new AbortController(); abortRef.current = ac;
    const time = new Date().toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});
    setMessages(p=>[...p,{role:"user",content:text,lang,time}]);
    setInput(""); setLoading(true); setOutput({result:null,error:null});
    setAssertResult(null); setAssertChecking(false);

    try {
      // STEP 1: ROUTER MIDDLEWARE (+ history compaction when due — independent, so run together)
      setRouting(true);
      const [routeResult, compacted] = await Promise.all([
        routeTask(text, allSkills),
        compactHistory(history, summaryRef.current, summaryFailRef.current),
      ]);
      if(replaced()) return;
      setRouting(false);
      setLastRoute(routeResult);
      summaryRef.current = compacted.summary; summaryFailRef.current = compacted.failedAt;

      // STEP 2: BUILD ENRICHED SYSTEM PROMPT
      const sysPrompt = buildSysPrompt(lang,
        lang==="py" ? await getSessionVarsText() : null,
        routeResult
      );
      if(replaced()) return;

      // STEP 3: MAIN LLM CALL — STREAMING
      // `history` is the raw log; the model gets [summary pair] + the un-summarised tail + this message.
      const newHist = [...contextMessages(history, summaryRef.current), {role:"user",content:text}];

      // Insert placeholder message immediately — fills in token by token
      setMessages(p=>[...p,{
        role:"assistant", content:"", code:null, lang, time,
        skills:routeResult.skills.slice(0,3), streaming:true,
      }]);

      setStreaming(true);
      let fullText = "";
      let sseBuffer = "";
      let failed = false;

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST", headers:{"Content-Type":"application/json"}, signal:ac.signal,
          body:JSON.stringify({
            model:MODEL, max_tokens:1000,
            stream:true, system:sysPrompt, messages:newHist,
          }),
        });
        if(!res.ok) throw new Error(`API ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        outer: while(true) {
          const {done, value} = await reader.read();
          if(done || replaced()) break;

          sseBuffer += decoder.decode(value, {stream:true});
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop(); // keep incomplete last line

          for(const line of lines) {
            if(!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if(raw==="[DONE]") break outer;
            let evt;
            try { evt = JSON.parse(raw); } catch { continue; }   // malformed SSE chunk — skip
            if(evt.type==="error") throw new Error(evt.error?.message || "stream error");
            if(evt.type==="content_block_delta" && evt.delta?.type==="text_delta") {
              fullText += evt.delta.text;
              // Update placeholder in-place — no new array element
              setMessages(p=>{
                const arr = [...p];
                const last = arr[arr.length-1];
                if(last?.streaming) arr[arr.length-1] = {...last, content:fullText};
                return arr;
              });
            }
          }
        }
      } catch(e) {
        if(replaced()) return;                       // aborted on purpose
        fullText = `Ошибка: ${e.message}`;
        failed = true;
      } finally {
        if(!replaced()) setStreaming(false);
      }
      if(replaced()) return;

      // Finalise: parse code, mark streaming done
      const code = failed ? null : extractCode(fullText, lang);
      setMessages(p=>{
        const arr = [...p];
        const last = arr[arr.length-1];
        if(last?.role==="assistant") arr[arr.length-1] = {...last, content:fullText, code, streaming:false};
        return arr;
      });
      // A failed call must not enter the history (it would be re-sent to the model on every later turn).
      if(failed) return;
      setHistory([...history, {role:"user",content:text}, {role:"assistant",content:fullText}]);

      // STEP 4: EXECUTE WITH AUTO-RETRY
      setRetryLog([]);
      if(code) {
        await executeWithRetry(code, lang, sysPrompt, [...newHist, {role:"assistant",content:fullText}], 0, epoch);
      } else if(routeResult.skills.length>0) {
        setRightTab("skills");
      }
    } finally {
      // Only the exchange that still owns the session may release the lock / reset the flags: an abandoned
      // one must not unlock (or clear the indicators of) a newer exchange.
      if(!replaced()) {
        busyRef.current = false;
        setRouting(false); setStreaming(false); setLoading(false);
      }
    }
  },[lang,pyReady,history,allSkills,executeWithRetry]);

  // A new session replaces the current one (language switch / .wos load): stop caring about whatever is in
  // flight. The old exchange sees the new epoch and stops; its stream is aborted; the input unlocks at once.
  const abandon = ()=>{
    epochRef.current++;
    abortRef.current?.abort();
    busyRef.current = false;
    summaryRef.current = null; summaryFailRef.current = null;
    setLoading(false); setRouting(false); setStreaming(false); setRunning(false); setRetrying(null);
  };

  // ── SAVE / LOAD ───────────────────────────────────────────────────────────
  const handleSave = async ()=>{
    const ts = new Date().toISOString();
    // No isReady() gate: buildRestoreScript waits for a respawn in progress (or returns the last snapshot),
    // whereas the gate silently wrote session:null exactly when the user most wanted to secure the work.
    const rs = lang==="py" ? await buildRestoreScript() : null;
    downloadJSON({version:"1.2",app:"Writing OS Unified",timestamp:ts,
      lang,execCount,curCode,messages,history,summary:summaryRef.current,output,
      session:rs?{restoreScript:rs}:null},
      `wos-${ts.slice(0,10)}-${ts.slice(11,16).replace(":","-")}.wos`);
    setLastSaved(new Date().toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    setToast(lang==="py" && !rs ? "✓ Сессия сохранена (переменных для сохранения нет)" : "✓ Сессия сохранена");
  };
  const handleLoad = ()=>uploadJSON(async data=>{
    if(!data.messages) { setToast("✗ Неверный формат"); return; }
    abandon();
    setMessages(data.messages||[]); setHistory(data.history||[]);
    summaryRef.current = data.summary?.text ? data.summary : null;
    setCurCode(data.curCode||""); setOutput(data.output||{result:null,error:null});
    setExecCount(data.execCount||0); runsRef.current = 0;
    let note = "";
    if(data.lang==="py") {
      setLang("py");
      if(!isReady()) { await initPy(setPyStatus,{ onEvent:onPyEvent }); setPyReady(true); setPyStatus(""); }
      if(data.session?.restoreScript) {
        const r = await restoreFromScript(data.session.restoreScript);
        await refreshSession();
        if(r.error) note = "переменные не восстановлены: "+String(r.error).split("\n").pop();
        else if(r.failed?.length) note = "пропущено: "+r.failed.slice(0,6).join(", ");
      }
      // The loaded session defines the namespace now: an older autosave must not be offered afterwards.
      clearSnapshotStorage(); setRestoreOffer(null);
    } else setLang(data.lang||"js");
    // ONE toast: a second setToast in the same tick would replace the first, hiding a failed restore
    const when = data.timestamp ? new Date(data.timestamp).toLocaleDateString("ru") : "";
    setToast(note ? `⚠ Загружено${when?` (${when})`:""}, но ${note}` : `✓ Загружено${when?` (${when})`:""}`);
  });
  const handleExportDocx = ()=>{
    const text = typeof output.result==="string" ? output.result : "";
    if(!text.trim()) { setToast("Нет текста для экспорта"); return; }
    try { setToast(`✓ ${exportDocx(text)} сохранён`); }
    catch(e) { setToast("✗ Не удалось создать .docx: "+(e?.message||e)); }
  };
  const handleClear = async ()=>{
    await clearSession(); clearSnapshotStorage(); setRestoreOffer(null);
    setSessionVars({}); setExecCount(0); runsRef.current = 0;
    setToast("✓ Namespace очищен");
  };
  const switchLang = l=>{
    abandon();
    setLang(l); setMessages([]); setHistory([]); setCurCode(""); setOutput({result:null,error:null});
    setAssertResult(null); setAssertChecking(false);
  };

  // ── Skill management ──────────────────────────────────────────────────────
  const handleSaveSkill = (skill) => {
    setCustomSkills(prev => {
      const filtered = prev.filter(s => s.id !== skill.id); // replace if same id
      const updated = [...filtered, skill];
      persistCustomSkills(updated);
      return updated;
    });
    setToast(`✓ Skill "${skill.name}" сохранён`);
  };
  const handleDeleteSkill = (id) => {
    setCustomSkills(prev => {
      const updated = prev.filter(s => s.id !== id);
      persistCustomSkills(updated);
      return updated;
    });
    setToast("✓ Skill удалён");
  };
  const handleEditSkill = (skill) => {
    setEditingSkill(skill);
    setShowComposer(true);
  };

  // ── Assertion Checker actions ─────────────────────────────────────────────
  const handleAutoFix = useCallback((issues) => {
    const list = issues.map(i =>
      `- ${i.severity.toUpperCase()}: ${i.label || i.field} — ${i.hint || i.message || ""}`
    ).join("\n");
    send(`Исправь документ. Обнаруженные проблемы:\n${list}\n\nВерни исправленный полный документ.`);
  }, [send]);

  const handleRecheck = useCallback(() => {
    const outputText = String(output.result || "");
    if(!isLegalDoc(outputText)) { setToast("Вывод не содержит правового документа"); return; }
    setAssertResult(null); setAssertChecking(true); setRightTab("assert");
    const structural = runStructuralCheck(outputText);
    setAssertResult({ structural, semantic:null, semanticStream:"",
      finalScore:structural.score, docType:structural.docType });
    if(structural.score >= 60) {
      streamSemanticCheck(
        outputText,
        structural.docType,
        (streamText) => {
          setAssertResult(prev => prev ? { ...prev, semanticStream: streamText } : prev);
        },
        (streamText, parsed) => {
          setAssertChecking(false);
          const semantic = parsed || null;
          const finalScore = semantic
            ? Math.round(structural.score * 0.4 + (semantic.score || 0) * 0.6)
            : structural.score;
          setAssertResult({ structural, semantic, semanticStream:streamText,
            finalScore, docType:structural.docType });
        }
      );
    } else { setAssertChecking(false); }
  }, [output.result]);

  const ac = lang==="py"?C.py:C.accent;

  return (
    <div style={{ background:C.bg,minHeight:"100vh",color:C.text,
      fontFamily:"'IBM Plex Mono','Fira Code',monospace",
      display:"flex",flexDirection:"column",fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Fira+Code:wght@300;400;500&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:2px}
        textarea{outline:none!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes streamPulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes progress{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}
        @keyframes routerPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .lb:hover{opacity:.8} .eb:hover{background:${C.border2}!important}
        .sb:hover{opacity:.85} .rb:hover{opacity:.85}
        .rtab{cursor:pointer;transition:all 0.12s} .rtab:hover{opacity:.85}
        button{transition:opacity 0.12s}
      `}</style>

      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      {showComposer&&<SkillComposer
        editingSkill={editingSkill}
        onSave={handleSaveSkill}
        onClose={()=>{setShowComposer(false);setEditingSkill(null);}}
      />}

      {/* ── HEADER ── */}
      <div style={{ borderBottom:`1px solid ${C.border}`,padding:"8px 18px",
        display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ display:"flex",gap:5 }}>
          {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{ width:10,height:10,borderRadius:"50%",background:c }}/>)}
        </div>
        <span style={{ fontSize:11,color:C.textDim }}>
          Writing OS — <span style={{ color:ac }}>Unified Sandbox</span>
        </span>
        {/* router + stream indicator */}
        <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:10,
          color:routing?C.yellow:streaming?C.green:C.textMuted }}>
          <span style={{ animation:(routing||streaming)?"routerPulse 0.6s infinite":"none" }}>
            {streaming?"▶":"⬡"}
          </span>
          <span style={{ fontFamily:"monospace" }}>
            {routing?"routing…":streaming?"streaming…":"router ready"}
          </span>
          {!routing&&!streaming&&<span style={{ color:C.textMuted }}>· {SKILLS.length} skills</span>}
        </div>
        {/* lang switcher */}
        <div style={{ marginLeft:"auto",display:"flex",gap:3,
          background:C.panel,border:`1px solid ${C.border2}`,borderRadius:6,padding:3 }}>
          {["js","py"].map(l=><button key={l} className="lb" onClick={()=>switchLang(l)} style={{
            background:lang===l?(l==="py"?C.pyDim:C.accentDim):"transparent",
            border:"none",borderRadius:4,
            color:lang===l?(l==="py"?C.py:C.accent):C.textDim,
            padding:"3px 12px",cursor:"pointer",fontSize:11,fontWeight:600,
            fontFamily:"inherit",letterSpacing:"0.06em" }}>
            {l==="js"?"JS":"Python"}
          </button>)}
        </div>
        {lang==="py"&&<div style={{ fontSize:10,color:pyReady?C.green:C.yellow,
          display:"flex",alignItems:"center",gap:4 }}>
          <span style={{ animation:pyReady?"none":"pulse 1s infinite" }}>●</span>
          {pyReady?"Python 3.11":"loading…"}
        </div>}
      </div>

      {/* ── RESTORE OFFER: namespace autosaved by an earlier visit ── */}
      {restoreOffer && lang==="py" && execCount===0 && (
        <div style={{ borderBottom:`1px solid ${C.border}`,padding:"6px 18px",background:C.panel,
          display:"flex",alignItems:"center",gap:10,fontSize:11,color:C.textDim }}>
          <span style={{ color:C.yellow }}>↺</span>
          <span>
            Найдена сохранённая сессия Python
            {restoreOffer.ts?` от ${new Date(restoreOffer.ts).toLocaleString("ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`:""}
            {restoreOffer.vars>0?` · ${restoreOffer.vars} перем.`:""}
          </span>
          <button onClick={handleRestore} style={{ background:C.greenDim,border:`1px solid ${C.green}55`,
            color:C.green,padding:"2px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"inherit" }}>Восстановить</button>
          <button onClick={handleDiscardSnapshot} style={{ background:"transparent",border:`1px solid ${C.border2}`,
            color:C.textDim,padding:"2px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"inherit" }}>Отбросить</button>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ flex:1,display:"flex",minHeight:0 }}>

        {/* CHAT */}
        <div style={{ width:"42%",borderRight:`1px solid ${C.border}`,
          display:"flex",flexDirection:"column" }}>
          <div style={{ padding:"5px 14px",borderBottom:`1px solid ${C.border}`,
            fontSize:9,color:C.textDim,letterSpacing:"0.12em",textTransform:"uppercase",
            display:"flex",alignItems:"center",gap:8 }}>
            ◎ Chat <LangTag lang={lang}/>
            {lang==="py"&&pyReady&&execCount>0&&(
              <span style={{ marginLeft:"auto",fontSize:9,color:C.textMuted }}>{execCount} runs</span>
            )}
          </div>

          <div ref={chatRef} style={{ flex:1,overflowY:"auto",padding:14 }}>
            {messages.length===0&&(
              <div>
                <p style={{ fontSize:12,color:C.textDim,lineHeight:1.75,marginTop:0 }}>
                  Semantic Router автоматически находит нужные skills<br/>
                  и инжектирует их контекст перед каждым запросом.
                </p>
                <div style={{ fontSize:9,color:C.textMuted,marginBottom:8,
                  textTransform:"uppercase",letterSpacing:"0.1em" }}>примеры</div>
                {EXAMPLES.map((ex,i)=><button key={i} className="eb"
                  onClick={()=>{setInput(ex);setTimeout(()=>send(ex),50);}} style={{
                  display:"block",width:"100%",textAlign:"left",
                  background:"transparent",border:`1px solid ${C.border}`,
                  color:C.textDim,padding:"7px 12px",borderRadius:5,
                  fontSize:11.5,cursor:"pointer",marginBottom:6,fontFamily:"inherit" }}>
                  → {ex}
                </button>)}
              </div>
            )}
            {messages.map((m,i)=><Msg key={i} msg={m}/>)}
            {routing&&<Typing label="⬡ Router: сопоставляю с базой skills…" color={C.yellow}/>}
            {loading&&!routing&&!streaming&&!retrying&&(
              <Typing label={lang==="py"&&Object.keys(sessionVars).length>0
                ?"генерирует с учётом сессии…":"генерирует код…"} color={C.green}/>
            )}
            {retrying&&(
              <Typing label={`⟳ Auto-fix attempt ${retrying.attempt}/2: исправляю ошибку…`} color={C.yellow}/>
            )}
          </div>

          {/* INPUT */}
          <div style={{ padding:10,borderTop:`1px solid ${C.border}` }}>
            <div style={{ display:"flex",background:C.panel,
              border:`1px solid ${C.border2}`,borderRadius:7,overflow:"hidden" }}>
              <textarea value={input} rows={2}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}}
                placeholder="Задача → Router → Skills → Code → Execute"
                style={{ flex:1,background:"transparent",border:"none",
                  padding:"9px 12px",color:C.text,fontSize:12,
                  fontFamily:"inherit",resize:"none",lineHeight:1.55 }}
              />
              <button className="sb" onClick={()=>send(input)} disabled={loading} style={{
                background:loading?C.textMuted:ac,border:"none",
                padding:"0 15px",cursor:loading?"not-allowed":"pointer",
                color:"#000",fontWeight:700,fontSize:15 }}>↑</button>
            </div>
            <div style={{ fontSize:9.5,color:C.textMuted,marginTop:4,textAlign:"right" }}>
              Enter · send &nbsp;·&nbsp; Shift+Enter · newline
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ flex:1,display:"flex",flexDirection:"column" }}>

          {/* CODE */}
          <div style={{ flex:"0 0 50%",borderBottom:`1px solid ${C.border}`,
            display:"flex",flexDirection:"column" }}>
            <div style={{ padding:"5px 14px",borderBottom:`1px solid ${C.border}`,
              fontSize:9,color:C.textDim,letterSpacing:"0.12em",textTransform:"uppercase",
              display:"flex",alignItems:"center",gap:8 }}>
              <span>⌥ Code</span>
              <span style={{ color:C.textMuted }}>{lang==="py"?"sandbox.py":"sandbox.js"}</span>
              {curCode&&<button className="rb" disabled={running||loading} onClick={async()=>{ const r=await rawExecute(curCode,lang); if(r&&!r.replaced){ setOutput(r); setRightTab("output"); } }} style={{
                marginLeft:"auto",background:C.greenDim,border:`1px solid ${C.green}44`,
                color:C.green,padding:"2px 10px",borderRadius:4,fontSize:9,
                cursor:"pointer",fontFamily:"inherit" }}>▶ Run</button>}
            </div>
            <div style={{ flex:1,overflowY:"auto",padding:"10px 4px" }}>
              {curCode
                ? <CodeLines code={curCode}/>
                : <div style={{ padding:"8px 14px",color:C.textMuted,fontSize:12 }}>
                    {lang==="py"?"# код появится здесь":"// код появится здесь"}
                  </div>
              }
            </div>
          </div>

          {/* BOTTOM TABS */}
          <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
            <div style={{ borderBottom:`1px solid ${C.border}`,display:"flex",flexShrink:0 }}>
              {[
                { id:"output", label:"◈ Output" },
                ...(lang==="py"?[{ id:"session", label:"⬡ Session" }]:[]),
                { id:"skills",  label:"⬡ Skills" },
                { id:"assert",  label:"⚖ Checks" },
              ].map(t=>(
                <button key={t.id} className="rtab" onClick={()=>setRightTab(t.id)} style={{
                  background:"transparent",border:"none",
                  borderBottom:rightTab===t.id?`2px solid ${ac}`:"2px solid transparent",
                  padding:"5px 14px",fontSize:9,fontWeight:rightTab===t.id?600:400,
                  color:rightTab===t.id?ac:C.textDim,
                  letterSpacing:"0.12em",textTransform:"uppercase",
                  cursor:"pointer",fontFamily:"inherit",marginBottom:-1 }}>
                  {t.label}
                  {t.id==="session"&&Object.keys(sessionVars).length>0&&(
                    <span style={{ marginLeft:5,background:C.pyDim,color:C.py,
                      borderRadius:10,padding:"0 5px",fontSize:8 }}>
                      {Object.keys(sessionVars).length}
                    </span>
                  )}
                  {t.id==="skills"&&lastRoute?.skills?.length>0&&(
                    <span style={{ marginLeft:5,background:C.greenDim,color:C.green,
                      borderRadius:10,padding:"0 5px",fontSize:8 }}>
                      {lastRoute.skills.length}
                    </span>
                  )}
                  {t.id==="skills"&&customSkills.length>0&&(
                    <span style={{ marginLeft:3,background:"#1a1400",color:C.yellow,
                      borderRadius:10,padding:"0 5px",fontSize:8 }}>
                      +{customSkills.length}
                    </span>
                  )}
                  {t.id==="assert"&&assertResult&&(()=>{
                    const errs = [
                      ...assertResult.structural.errors,
                      ...(assertResult.semantic?.issues?.filter(i=>i.severity==="error")||[])
                    ].length;
                    return errs > 0
                      ? <span style={{ marginLeft:5,background:"#2d0d0d",color:C.red,
                          borderRadius:10,padding:"0 5px",fontSize:8 }}>{errs}</span>
                      : assertResult.finalScore >= 70
                        ? <span style={{ marginLeft:5,background:"#0d2b0d",color:C.green,
                            borderRadius:10,padding:"0 5px",fontSize:8 }}>✓</span>
                        : null;
                  })()}
                </button>
              ))}
            </div>
            <div style={{ flex:1,overflowY:"auto" }}>
              <PaneBoundary tab={rightTab} output={output}>
              {rightTab==="output"&&<OutputPane result={output.result} error={output.error}
                running={running} retrying={retrying} retryLog={retryLog}
                onExportDocx={handleExportDocx}
                pyStatus={lang==="py"&&!pyReady?pyStatus:""}/>}
              {rightTab==="session"&&<SessionPane vars={sessionVars} execCount={execCount}
                onClear={handleClear} onSave={handleSave} onLoad={handleLoad} lastSaved={lastSaved}/>}
              {rightTab==="skills"&&<SkillsPane routeResult={lastRoute}
                allSkills={allSkills} customSkills={customSkills}
                onNew={()=>{setEditingSkill(null);setShowComposer(true);}}
                onEdit={handleEditSkill} onDelete={handleDeleteSkill}/>}
              {rightTab==="assert"&&<AssertionPane
                result={assertResult} checking={assertChecking}
                onAutoFix={handleAutoFix} onRecheck={handleRecheck} onExportDocx={handleExportDocx}/>}
              </PaneBoundary>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={{ borderTop:`1px solid ${C.border}`,padding:"3px 18px",
        display:"flex",gap:18,fontSize:9.5,color:C.textMuted,alignItems:"center" }}>
        <span style={{ color:C.green }}>● Writing OS Unified</span>
        <span style={{ color:C.yellow }}>⬡ Semantic Router</span>
        <span style={{ color:ac }}>
          {lang==="py"?`Python 3.11 · Pyodide WASM${execCount>0?` · ${execCount} runs`:""}`
            :`JavaScript · ${jsTier==="frame"?"изолированная песочница":jsTier==="worker"?"Web Worker":jsTier==="inline"?"в странице":"Web Worker"}`}
        </span>
        {lang==="js"&&jsTier==="worker"&&<span style={{ color:C.yellow }}
          title="Песочница-iframe недоступна: код изолирован от страницы, но сетевые запросы блокирует только политика хоста">⚠ JS без сетевой изоляции</span>}
        {lang==="js"&&jsTier==="inline"&&<span style={{ color:C.yellow }}
          title="Worker недоступен в этом окружении: код выполняется в самой странице, без изоляции и без таймаута">⚠ JS без изоляции и таймаута</span>}
        {lang==="py"&&pyMode==="main"&&<span style={{ color:C.yellow }}
          title="Worker недоступен в этом окружении: бесконечный цикл Python нельзя прервать">⚠ Python без защиты от зависаний</span>}
        {streaming&&<span style={{ color:C.green,animation:"streamPulse 1s infinite" }}>▶ streaming</span>}
        {lastSaved&&<span style={{ color:C.green }}>💾 {lastSaved}</span>}
        <span style={{ marginLeft:"auto" }}>
          {messages.filter(m=>m.role==="user").length} queries · {SKILLS.length}+{customSkills.length} skills
        </span>
      </div>
    </div>
  );
}
