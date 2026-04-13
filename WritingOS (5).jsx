import { useState, useRef, useEffect, useCallback } from "react";

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
    ctx:`SKILL: Live Code Sandbox\nPython: Pyodide 3.11 WASM, persistent REPL, numpy/pandas/datetime\nJS: in-browser eval, wrap in function run(){return result}\nPersistence: variables survive between calls\nLegal use: date calculations, template generation, data tables` },
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

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════
const ROUTER_SYS = `You are a semantic skill router. Given a task, select 1-3 best matching skills.
Return ONLY valid JSON (no markdown, no backticks):
{"selected":["id1","id2"],"scores":[0.95,0.72],"task_type":"legal|code|writing|data|other","reasoning":"short explanation","language":"ru|de|en"}`;

// ── LRU cache: last 20 unique queries (~2 hours of work) ─────────────────
const _routeCache = new Map();
function _routeCacheSet(key, val) {
  if (_routeCache.size >= 20) _routeCache.delete(_routeCache.keys().next().value);
  _routeCache.set(key, val);
}

async function routeTask(task, allSkills) {
  const db = allSkills || SKILLS;
  const cacheKey = task.slice(0, 60).toLowerCase().replace(/\s+/g,' ').trim();
  if (_routeCache.has(cacheKey)) return _routeCache.get(cacheKey);

  const catalog = db.map(s =>
    `ID:${s.id} | ${s.name} | ${s.desc} | triggers:${s.triggers.slice(0,4).join(",")}`
  ).join("\n");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-sonnet-4-6", max_tokens:300,
        system: ROUTER_SYS,
        messages:[{ role:"user", content:`SKILLS:\n${catalog}\n\nTASK: ${task}\n\nJSON only:` }],
      }),
    });
    const d = await res.json();
    const txt = d.content?.[0]?.text || "{}";
    const clean = txt.replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || "{}");
    const skills = (parsed.selected||[]).map((id,i) => {
      const s = db.find(x => x.id===id);
      return s ? { skill:s, score: parsed.scores?.[i] ?? 0.7 } : null;
    }).filter(Boolean);
    const result = { skills, task_type: parsed.task_type||"other",
                     reasoning: parsed.reasoning||"", language: parsed.language||"ru" };
    _routeCacheSet(cacheKey, result);
    return result;
  } catch { return { skills:[], task_type:"other", reasoning:"", language:"ru" }; }
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY SUMMARIZATION — rolling summary every 6 messages
// ═══════════════════════════════════════════════════════════════════════════
async function summarizeHistory(hist) {
  try {
    const excerpt = hist.map(m => `${m.role}: ${m.content.slice(0,300)}`).join('\n---\n');
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-sonnet-4-6", max_tokens:250,
        messages:[{ role:"user", content:`Summarize in max 180 words (keep: case numbers, deadlines, §§, key decisions):\n\n${excerpt}` }],
      }),
    });
    const d = await res.json();
    return d.content?.[0]?.text || "";
  } catch { return ""; }
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
    : `Write JavaScript wrapped in function run(){return result}.\nFormat:\n\`\`\`javascript\nfunction run() {\n  // code\n  return result;\n}\n\`\`\``;
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
        model:"claude-sonnet-4-6", max_tokens:700,
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
// PYODIDE SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
let _py = null, _pyLoading = false, _pyCbs = [];
async function getPyodide(onStatus) {
  if (_py) return _py;
  if (_pyLoading) return new Promise(r => _pyCbs.push(r));
  _pyLoading = true;
  onStatus("Загрузка Pyodide…");
  await new Promise((res,rej) => {
    if (window.loadPyodide) { res(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
    s.onload=res; s.onerror=rej; document.head.appendChild(s);
  });
  onStatus("Инициализация Python 3.11…");
  _py = await window.loadPyodide({ indexURL:"https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" });
  onStatus("Загрузка numpy, pandas…");
  await _py.loadPackagesFromImports("import numpy; import pandas");
  _py.runPython("import sys,io,json,re,datetime,collections,textwrap");
  _pyLoading = false; _pyCbs.forEach(cb=>cb(_py)); _pyCbs=[];
  return _py;
}
async function runPY(code) {
  try {
    _py.runPython("import sys,io\n_buf=io.StringIO()\nsys.stdout=_buf");
    await _py.runPythonAsync(code);
    const out = _py.runPython("_buf.getvalue()");
    _py.runPython("sys.stdout=sys.__stdout__");
    return { result: out.trim()||"(нет вывода)", error:null };
  } catch(e) {
    try { _py.runPython("sys.stdout=sys.__stdout__"); } catch {}
    return { result:null, error:e.message };
  }
}
const DANGEROUS_JS = /document\.cookie|window\.location\s*=|eval\s*\(|document\.write\s*\(/;
function runJS(code) {
  if (DANGEROUS_JS.test(code)) return Promise.resolve({ result:null, error:"⛔ Небезопасный паттерн заблокирован" });
  return new Promise(resolve => {
    const src = `self.onmessage=function(){try{${code}\nconst r=typeof run==='function'?run():undefined;self.postMessage({result:String(r??'(undefined)'),error:null});}catch(e){self.postMessage({result:null,error:e.message});}};`;
    const url = URL.createObjectURL(new Blob([src],{type:'application/javascript'}));
    const w = new Worker(url);
    const t = setTimeout(()=>{ w.terminate(); URL.revokeObjectURL(url); resolve({result:null,error:'⏱ Timeout: выполнение превысило 10s'}); }, 10000);
    w.onmessage = e => { clearTimeout(t); w.terminate(); URL.revokeObjectURL(url); resolve(e.data); };
    w.onerror   = e => { clearTimeout(t); w.terminate(); URL.revokeObjectURL(url); resolve({result:null,error:e.message}); };
    w.postMessage({});
  });
}
function getSessionVars() {
  if (!_py) return {};
  try {
    const raw = _py.runPython(`
import json as _j
_skip={'sys','io','json','re','datetime','collections','textwrap','_buf','_j','_skip','__builtins__','__name__','__doc__','__package__','__loader__','__spec__','_out2','_k2','_v2'}
_out2={}
for _k2,_v2 in list(globals().items()):
    if not _k2.startswith('_') and _k2 not in _skip:
        try: _out2[_k2]={'type':type(_v2).__name__,'repr':repr(_v2)[:100]}
        except: pass
_j.dumps(_out2)`);
    return JSON.parse(raw);
  } catch { return {}; }
}
function getSessionVarsText() {
  return Object.entries(getSessionVars()).map(([k,d])=>`  ${k}(${d.type})=${d.repr}`).join("\n");
}
function clearSession() {
  if (!_py) return;
  _py.runPython(`
_keep=set(dir(__builtins__))|{'sys','io','json','re','datetime','collections','textwrap','__builtins__','__name__','__doc__','__package__','__loader__','__spec__'}
for _k in list(globals().keys()):
    if _k not in _keep and not _k.startswith('__'):
        try: del globals()[_k]
        except: pass`);
  _py.runPython("import sys,io,json,re,datetime,collections,textwrap");
}
function buildRestoreScript() {
  if (!_py) return "";
  try {
    return _py.runPython(`
import json as _jr
_skip_r={'sys','io','json','re','datetime','collections','textwrap','_buf','_jr','_skip_r','_lines_r','_k_r','_v_r','__builtins__','__name__','__doc__','__package__','__loader__','__spec__'}
_lines_r=["import json,re,collections,textwrap","from datetime import datetime,date,timedelta"]
try:
    import pandas as _pd_r; _lines_r.append("import pandas as pd")
except: _pd_r=None
try:
    import numpy as _np_r; _lines_r.append("import numpy as np")
except: _np_r=None
for _k_r,_v_r in list(globals().items()):
    if _k_r.startswith('_') or _k_r in _skip_r: continue
    try:
        if isinstance(_v_r,(str,int,float,bool,type(None))): _lines_r.append(f"{_k_r}={_jr.dumps(_v_r)}")
        elif isinstance(_v_r,(list,dict)): _lines_r.append(f"{_k_r}={_jr.dumps(_v_r)}")
        elif _pd_r and isinstance(_v_r,_pd_r.DataFrame): _lines_r.append(f"{_k_r}=pd.read_json('{_v_r.to_json()}')")
        elif _np_r and isinstance(_v_r,_np_r.ndarray): _lines_r.append(f"{_k_r}=np.array({_v_r.tolist()})")
    except: pass
print("\\n".join(_lines_r))`);
  } catch { return ""; }
}
function downloadJSON(data, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
// DOMPURIFY — lazy CDN loader for safe HTML output
// ═══════════════════════════════════════════════════════════════════════════
let _dp = null;
function loadDOMPurify() {
  if (_dp) return Promise.resolve(_dp);
  return new Promise((res, rej) => {
    if (window.DOMPurify) { _dp = window.DOMPurify; res(_dp); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js';
    s.onload = () => { _dp = window.DOMPurify; res(_dp); };
    s.onerror = rej;
    document.head.appendChild(s);
  });
}
function SafeHtml({ html }) {
  const [safe, setSafe] = useState('');
  useEffect(() => { loadDOMPurify().then(dp => setSafe(dp.sanitize(html))).catch(() => setSafe('')); }, [html]);
  return <div style={{ background:"#fff",borderRadius:6,padding:12,fontSize:13,color:"#111" }}
    dangerouslySetInnerHTML={{ __html: safe }}/>;
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
function OutputPane({result, error, running, pyStatus, retrying, retryLog}) {
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

  if (!result&&!error) return <div style={{ padding:14,color:C.textMuted,fontSize:12,fontFamily:"monospace" }}>// output</div>;
  const isHtml = typeof result==="string" && /^\s*<[a-z]/i.test(result);
  const isObj  = typeof result==="object" && result!==null;
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
            <div style={{ color:C.textDim,marginBottom:4 }}>>>> (empty session)</div>
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
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:900,
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

function AssertionPane({ result, checking, onAutoFix, onRecheck }) {
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
  const chatRef = useRef(null);

  // All skills = built-in + user-created
  const allSkills = [...SKILLS, ...customSkills];

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[messages]);

  useEffect(()=>{
    if(lang==="py"&&!pyReady&&!_pyLoading) {
      getPyodide(setPyStatus).then(()=>{ setPyReady(true); setPyStatus(""); setSessionVars(getSessionVars()); });
    }
    if(lang==="py"&&_py) { setPyReady(true); setPyStatus(""); }
  },[lang,pyReady]);

  const refreshSession = useCallback(()=>{ if(_py) setSessionVars(getSessionVars()); },[]);

  // ── Raw single execution (no retry) ─────────────────────────────────────
  const rawExecute = useCallback(async (code, language)=>{
    setRunning(true); setCurCode(code);
    let r;
    if(language==="py") { r=await runPY(code); refreshSession(); }
    else { await new Promise(res=>setTimeout(res,180)); r=await runJS(code); }
    setRunning(false);
    return r;
  },[refreshSession]);

  // ── Execute with auto-retry (max MAX_RETRIES attempts) ───────────────────

  const executeWithRetry = useCallback(async (code, language, sysPrompt, hist, attempt=0)=>{
    const r = await rawExecute(code, language);

    if(r.error && attempt < MAX_RETRIES) {
      // Record this failure in log
      setRetryLog(prev=>[...prev,{attempt:attempt+1, error:r.error, code, status:"failed"}]);
      setRetrying({attempt:attempt+1, error:r.error.slice(0,300)});

      // Build fix request — send error + failing code back to Claude
      const errMsg = `Runtime error (attempt ${attempt+1}/${MAX_RETRIES}):\n${r.error}\n\nFailing code:\n\`\`\`${language==="py"?"python":"javascript"}\n${code}\n\`\`\`\n\nFix the bug. Return only the corrected code block, no explanation needed.`;
      const fixHist = [...hist, {role:"user", content: errMsg}];

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            model:"claude-sonnet-4-6", max_tokens:800,
            system:sysPrompt, messages:fixHist,
          }),
        });
        const d = await res.json();
        const fixTxt = d.content?.[0]?.text || "";
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
          return executeWithRetry(fixedCode, language, sysPrompt, hist, attempt+1);
        }
      } catch(e) { /* network error — fall through to show original error */ }
      setRetrying(null);
    }

    // Final result (success or all retries exhausted)
    setRetryLog(prev=>[...prev,{
      attempt:attempt+1, code,
      result:r.result, error:r.error,
      status: r.error ? "final_fail" : "ok",
    }]);
    if(!r.error && language==="py") {
      setExecCount(n => {
        const next = n + 1;
        if (next % 3 === 0) {
          try {
            const snap = buildRestoreScript();
            if (snap) localStorage.setItem('wos_namespace_snapshot', snap);
          } catch {}
        }
        return next;
      });
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
              setAssertResult(prev => prev
                ? { ...prev, semanticStream: streamText }
                : prev);
            },
            // onComplete — set parsed JSON + final score
            (streamText, parsed) => {
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
  const send = useCallback(async (text)=>{
    if(!text.trim()||loading) return;
    if(lang==="py"&&!pyReady) { setToast("Python ещё загружается…"); return; }
    const time = new Date().toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});
    setMessages(p=>[...p,{role:"user",content:text,lang,time}]);
    setInput(""); setLoading(true); setOutput({result:null,error:null});
    setAssertResult(null); setAssertChecking(false);

    // STEP 1: ROUTER MIDDLEWARE
    setRouting(true);
    const routeResult = await routeTask(text, allSkills);
    setRouting(false);
    setLastRoute(routeResult);

    // STEP 2: BUILD ENRICHED SYSTEM PROMPT
    const sysPrompt = buildSysPrompt(lang,
      lang==="py" ? getSessionVarsText() : null,
      routeResult
    );

    // STEP 3: MAIN LLM CALL — STREAMING
    // Rolling summary: compress old history when it grows beyond 6 messages
    let compactHistory = history;
    if (history.length >= 6) {
      const summary = await summarizeHistory(history.slice(0, -3));
      if (summary) {
        compactHistory = [
          { role:"user",      content:`[Сводка предыдущего диалога]: ${summary}` },
          { role:"assistant", content:"Понял, продолжаю с учётом контекста." },
          ...history.slice(-3),
        ];
      }
    }
    const newHist = [...compactHistory, {role:"user",content:text}];

    // Insert placeholder message immediately — fills in token by token
    setMessages(p=>[...p,{
      role:"assistant", content:"", code:null, lang, time,
      skills:routeResult.skills.slice(0,3), streaming:true,
    }]);

    setStreaming(true);
    let fullText = "";
    let sseBuffer = "";

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          stream:true, system:sysPrompt, messages:newHist,
        }),
      });
      if(!res.ok) throw new Error(`API ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      outer: while(true) {
        const {done, value} = await reader.read();
        if(done) break;

        sseBuffer += decoder.decode(value, {stream:true});
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop(); // keep incomplete last line

        for(const line of lines) {
          if(!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if(raw==="[DONE]") break outer;
          try {
            const evt = JSON.parse(raw);
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
          } catch { /* malformed SSE chunk — skip */ }
        }
      }
    } catch(e) {
      fullText = `Ошибка: ${e.message}`;
    } finally {
      setStreaming(false);
    }

    // Finalise: parse code, mark streaming done
    const code = extractCode(fullText, lang);
    setMessages(p=>{
      const arr = [...p];
      const last = arr[arr.length-1];
      if(last?.role==="assistant") arr[arr.length-1] = {...last, content:fullText, code, streaming:false};
      return arr;
    });
    setHistory([...newHist,{role:"assistant",content:fullText}]);

    // STEP 4: EXECUTE WITH AUTO-RETRY
    setRetryLog([]);
    if(code) {
      await executeWithRetry(code, lang, sysPrompt, newHist, 0);
    } else if(routeResult.skills.length>0) {
      setRightTab("skills");
    }
    setLoading(false);
  },[lang,pyReady,history,executeWithRetry]);

  // ── SAVE / LOAD ───────────────────────────────────────────────────────────
  const handleSave = ()=>{
    const ts = new Date().toISOString();
    const rs = lang==="py" ? buildRestoreScript() : null;
    downloadJSON({version:"1.1",app:"Writing OS Unified",timestamp:ts,
      lang,execCount,curCode,messages,history,output,
      session:rs?{restoreScript:rs}:null},
      `wos-${ts.slice(0,10)}-${ts.slice(11,16).replace(":","-")}.wos`);
    setLastSaved(new Date().toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    setToast("✓ Сессия сохранена");
  };
  const handleLoad = ()=>uploadJSON(async data=>{
    if(!data.messages) { setToast("✗ Неверный формат"); return; }
    setMessages(data.messages||[]); setHistory(data.history||[]);
    setCurCode(data.curCode||""); setOutput(data.output||{result:null,error:null});
    setExecCount(data.execCount||0);
    if(data.lang==="py") {
      setLang("py");
      if(!_py) { await getPyodide(setPyStatus); setPyReady(true); setPyStatus(""); }
      if(data.session?.restoreScript) { await runPY(data.session.restoreScript); refreshSession(); }
    } else setLang(data.lang||"js");
    setToast(`✓ Загружено (${new Date(data.timestamp).toLocaleDateString("ru")})`);
  });
  const handleClear = ()=>{ clearSession(); setSessionVars({}); setExecCount(0); setToast("✓ Namespace очищен"); };
  const switchLang = l=>{ setLang(l); setMessages([]); setHistory([]); setCurCode(""); setOutput({result:null,error:null}); setAssertResult(null); setAssertChecking(false); };

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
              {curCode&&<button className="rb" onClick={()=>rawExecute(curCode,lang)} style={{
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
              {rightTab==="output"&&<OutputPane result={output.result} error={output.error}
                running={running} retrying={retrying} retryLog={retryLog}
                pyStatus={lang==="py"&&!pyReady?pyStatus:""}/>}
              {rightTab==="session"&&<SessionPane vars={sessionVars} execCount={execCount}
                onClear={handleClear} onSave={handleSave} onLoad={handleLoad} lastSaved={lastSaved}/>}
              {rightTab==="skills"&&<SkillsPane routeResult={lastRoute}
                allSkills={allSkills} customSkills={customSkills}
                onNew={()=>{setEditingSkill(null);setShowComposer(true);}}
                onEdit={handleEditSkill} onDelete={handleDeleteSkill}/>}
              {rightTab==="assert"&&<AssertionPane
                result={assertResult} checking={assertChecking}
                onAutoFix={handleAutoFix} onRecheck={handleRecheck}/>}
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
          {lang==="py"?`Python 3.11 · Pyodide WASM${execCount>0?` · ${execCount} runs`:""}` :"JavaScript · eval"}
        </span>
        {streaming&&<span style={{ color:C.green,animation:"streamPulse 1s infinite" }}>▶ streaming</span>}
        {lastSaved&&<span style={{ color:C.green }}>💾 {lastSaved}</span>}
        <span style={{ marginLeft:"auto" }}>
          {messages.filter(m=>m.role==="user").length} queries · {SKILLS.length}+{customSkills.length} skills
        </span>
      </div>
    </div>
  );
}
