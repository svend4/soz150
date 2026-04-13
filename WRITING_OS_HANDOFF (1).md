# Writing OS — Handoff Document
> Статус на 13.04.2026 | Для продолжения в новом чате

---

## 1. Что это такое

**Writing OS** — единый AI-powered sandbox для немецкой правовой документации (SGB IX/XII, SGG). Построен как React-артефакт на claude.ai с прямым доступом к Anthropic API.

**Главная идея:** Намерение (текст) → Semantic Router → Skills context → Claude generates code → Python/JS execution → Legal Assertion Check → результат.

Всё в одном файле: `WritingOS.jsx` (~2043 строк, 40 функций).

---

## 2. Архитектура: CAGE Pattern

```
User input
  → [1] Semantic Router     (LLM call, ~800ms) — выбирает 1-3 skills
  → [2] Context Injection   (buildSysPrompt)   — инжектирует skill.ctx
  → [3] Main LLM call       (streaming SSE)    — генерирует код
  → [4] Code Execution      (JS/Pyodide WASM)  — выполняет в браузере
  → [5] Auto-retry loop     (max 2 попытки)    — исправляет ошибки
  → [6] Legal Assertion Check (L1+L2 stream)   — проверяет документ
```

**CAGE = Context-Augmented Generative Execution** — каждый `execute` обогащает следующий `capture`.

---

## 3. Все реализованные функции

### 3.1 Core Pipeline

| Функция | Файл | Описание |
|---|---|---|
| `routeTask(task, allSkills)` | module | Semantic router через LLM, выбирает skills по задаче |
| `buildSysPrompt(lang, vars, routeResult)` | module | Инжектирует skill.ctx в system prompt |
| `send()` | component | Главный pipeline: route→inject→stream→execute→check |

### 3.2 Code Execution

| Функция | Описание |
|---|---|
| `rawExecute(code, lang)` | Одиночное выполнение JS (`new Function`) или Python (Pyodide) |
| `executeWithRetry(code, lang, sys, hist, attempt)` | Рекурсивный retry loop, max `MAX_RETRIES=2` |
| `runPY(code)` | Python через Pyodide, stdout redirect via `io.StringIO` |
| `runJS(code)` | JS через `new Function()`, вызывает `run()` |

### 3.3 Streaming

- **Main LLM call**: SSE streaming, placeholder message обновляется токен за токеном
- **Skill Composer**: SSE streaming при генерации skill структуры
- **Semantic Assertion Check**: SSE streaming с `onChunk`/`onComplete` callbacks

### 3.4 Skills System

| Функция | Описание |
|---|---|
| `SKILLS[]` (const) | 10 встроенных skills: Deadline Calc, Court Analyzer, Template Generator, Persönliches Budget, SGB XII, Eilantrag, Code Sandbox, Data Analysis, Legal Research, Document Writer |
| `loadCustomSkills()` | Загрузка из localStorage (`wos_custom_skills_v1`) |
| `persistCustomSkills(skills)` | Сохранение в localStorage |
| `allSkills = [...SKILLS, ...customSkills]` | Объединённый список для роутера |
| `SkillComposer` component | Модальное окно: диалог с Claude → JSON skill → сохранить |
| `extractSkillJSON(text)` | Парсинг ```json блока из ответа |
| `validateSkill(s)` | Проверка полей: id, name, cat, desc, triggers, ctx |

### 3.5 Session Management

| Функция | Описание |
|---|---|
| `getSessionVars()` | Читает Python globals() из Pyodide, возвращает `{name: {type, repr}}` |
| `getSessionVarsText()` | Текстовый формат для инжекции в prompt |
| `buildRestoreScript()` | Python код для восстановления namespace из сессии |
| `clearSession()` | Удаляет пользовательские переменные из Pyodide globals |
| `downloadJSON(data, name)` | Скачать `.wos` файл |
| `uploadJSON(cb)` | Загрузить `.wos` файл |

**Формат `.wos` файла:**
```json
{
  "version": "1.1",
  "app": "Writing OS Unified",
  "timestamp": "ISO string",
  "lang": "py|js",
  "execCount": 5,
  "curCode": "last executed code",
  "messages": [...],
  "history": [...],
  "output": {"result": "...", "error": null},
  "session": { "restoreScript": "import pandas as pd\n..." }
}
```

### 3.6 Legal Assertion Checker

| Функция | Описание |
|---|---|
| `ASSERTION_RULES` | Правила по типам: `widerspruch`, `eilantrag`, `klage`, `generic` |
| `detectLegalDocType(text)` | Определяет тип документа по ключевым словам |
| `isLegalDoc(text)` | Быстрый тест: длина >150 + ключевые слова SGG/SGB |
| `runStructuralCheck(text)` | L1: regex-проверка, ~0ms, возвращает `{results, score, errors, warnings}` |
| `streamSemanticCheck(text, type, onChunk, onComplete)` | L2: SSE streaming через Claude, форматированные строки + JSON |
| `parseStreamLines(text)` | Парсит `[✓]`/`[✗]`/`[⚠]`/`SCORE:` строки в цветные типы |
| `extractSemanticJSON(text)` | Вытаскивает ```json блок из конца стрима |

**Пайплайн чекера:**
```
isLegalDoc(output)?
  → L1: runStructuralCheck()     [~0ms,  показывается сразу]
  → if score >= 60:
    → L2: streamSemanticCheck()  [~1.5s, токен за токеном]
         onChunk → semanticStream state обновляется
         onComplete → semantic JSON + finalScore = 0.4*L1 + 0.6*L2
```

---

## 4. UI Компоненты

### Панели

| Компонент | Описание |
|---|---|
| `OutputPane` | Вывод кода. Показывает retry chain (`✗ try1 → ✓ fixed`), retrying indicator |
| `SessionPane` | Python namespace: таблица name/type/value, 💾 Save, 📂 Load, ✕ Clear |
| `SkillsPane` | Вкладки: `Matched` (matched skills с score bars) / `All` (все skills с edit/del) |
| `AssertionPane` | Score ring + L1 structural checks + L2 streaming + structured issues |
| `SkillComposer` | Модальное окно создания/редактирования skills |

### Chat Messages

| Компонент | Аватар | Когда |
|---|---|---|
| `Msg` (user) | фиолетовый "M" | Запрос пользователя |
| `Msg` (assistant, streaming) | тёмно-зелёный с рамкой + `streaming…` | Во время SSE |
| `Msg` (assistant, final) | зелёный + skill badges | После завершения |
| `RetryMsg` | жёлтый "⟳" | Auto-fix попытка при ошибке |

### Вкладки нижней панели

```
◈ Output  |  ⬡ Session (py only)  |  ⬡ Skills  |  ⚖ Checks
```
- **Output**: результат выполнения кода
- **Session**: Python namespace (только в Python-режиме)
- **Skills**: matched skills / all skills + New button
- **Checks**: Legal Assertion Checker — автооткрывается при юридическом документе

---

## 5. Технические детали

### Зависимости (все через CDN, нет npm)

| Библиотека | Источник | Для чего |
|---|---|---|
| React + hooks | встроено в артефакт | UI |
| Pyodide 0.25.1 | `cdn.jsdelivr.net` | Python 3.11 в WASM |
| numpy, pandas | загружаются через Pyodide | data analysis |
| IBM Plex Mono + Fira Code | Google Fonts | типографика |

### Anthropic API использование

| Вызов | Назначение | `max_tokens` |
|---|---|---|
| Router call | Выбор skills по задаче | 300 |
| Main call (streaming) | Генерация кода + объяснения | 1000 |
| Skill Composer (streaming) | Генерация skill JSON | 900 |
| Semantic Assertion (streaming) | Проверка юридического документа | 700 |
| Auto-fix retry | Исправление ошибок кода | 800 |

### Константы

```javascript
MAX_RETRIES = 2                    // Максимум auto-fix попыток
SKILLS_STORAGE_KEY = "wos_custom_skills_v1"  // localStorage ключ
SEMANTIC_THRESHOLD = 60            // Минимальный L1 score для запуска L2
FINAL_SCORE = 0.4*L1 + 0.6*L2     // Весовая формула
```

---

## 6. Файловая структура

```
WritingOS.jsx          — единый файл, ~2043 строк
  ├─ SKILLS[]          — база 10 встроенных skills
  ├─ routeTask()       — LLM semantic router
  ├─ CUSTOM SKILLS     — localStorage + Composer helpers
  ├─ SKILL COMPOSER    — COMPOSER_SYS + extractSkillJSON + validateSkill
  ├─ buildSysPrompt()  — context injection
  ├─ ASSERTION RULES   — по типам документов
  ├─ streamSemanticCheck() — SSE checker
  ├─ PYODIDE           — singleton + runPY + session helpers
  ├─ COLORS (C)        — дизайн-система
  ├─ UI ATOMS          — LangTag, SkillBadge, Dot, Toast, Typing, CodeLines
  ├─ OutputPane        — вывод + retry chain
  ├─ SessionPane       — Python namespace
  ├─ SkillsPane        — matched + all skills
  ├─ SkillComposer     — modal для создания skills
  ├─ ASSERTION PANE    — SEV_STYLE, LINE_STYLE, ScoreRing, SemanticStream, AssertionPane
  ├─ RetryMsg          — авто-фикс сообщение
  ├─ Msg               — сообщение чата (user/assistant/retry)
  └─ WritingOS()       — главный компонент (~600 строк state + handlers + JSX)
```

---

## 7. Известные ограничения

| Проблема | Severity | Описание |
|---|---|---|
| `new Function()` без sandbox | HIGH | XSS риск если Claude сгенерирует вредоносный JS |
| `dangerouslySetInnerHTML` без DOMPurify | HIGH | HTML output не санитизирован |
| Нет execution timeout | MEDIUM | Бесконечный Python loop повесит вкладку |
| History без summarization | MEDIUM | После 8-10 сообщений context window заполняется |
| Router без кэша | MEDIUM | Одинаковые запросы платят полную цену router call |
| Нет autosave namespace | MEDIUM | Закрыл вкладку без Save — namespace потерян |
| Мобильная вёрстка | LOW | 3-колонный layout не адаптирован |

---

## 8. Что уже было исследовано теоретически

В этом чате была разработана полная теоретическая база:

### Таксономия L0–L5
- **L0** — Hardcoded (if task=="x" → function)
- **L1** — Configurable (SKILL.md инструкции)
- **L2** — Pluggable (swap implementations at deploy)
- **L3** — Hot-swappable (runtime load/unload) — **MCP**
- **L4** — Generative (AI создаёт плагины on-demand) — **Writing OS сейчас**
- **L5** — Self-modifying (система переписывает себя) — **frontier**

### CAGE методология
```
State S = {H: history, N: namespace, K: skills, R: route_cache}
S_t+1 = EXECUTE(GENERATE(AUGMENT(CAPTURE(input, S_t), SELECT(K, input)), S_t.H, S_t.N), S_t)
```

### Анализ слабых мест
1. 2 API-вызова на запрос (+~800ms накладные расходы)
2. LLM-роутинг недетерминированный (разные run → разные scores)
3. Context window давление (history + skills + vars → ~8 сообщений до truncation)
4. Skills hardcoded → нужен Skill Composer (реализован)
5. Нет error recovery (реализован auto-retry)

---

## 9. Дорожная карта: что делать дальше

### Приоритет 1 — Безопасность (КРИТИЧНО)

```javascript
// 1. DOMPurify для HTML output
import DOMPurify from 'dompurify'; // через CDN
const safeHtml = DOMPurify.sanitize(result);

// 2. Execution timeout через Worker
const worker = new Worker(URL.createObjectURL(blob));
const timeout = setTimeout(() => worker.terminate(), 10000);

// 3. Базовая фильтрация опасного кода
const DANGEROUS = /document\.cookie|localStorage|window\.location|eval\(/;
if(DANGEROUS.test(code)) throw new Error("Unsafe code pattern");
```

### Приоритет 2 — Производительность

**Router LRU cache** (~2 часа работы):
```javascript
const ROUTER_CACHE = new Map(); // LRU(20)
const cacheKey = task.slice(0, 60).toLowerCase();
if(ROUTER_CACHE.has(cacheKey)) return ROUTER_CACHE.get(cacheKey);
const result = await routeTask(task, allSkills);
ROUTER_CACHE.set(cacheKey, result);
return result;
```

**History Rolling Summary** (~4 часа):
```javascript
// Каждые 6 сообщений — сжать в ~200 токен summary
if(history.length > 6 && history.length % 6 === 0) {
  const summary = await summarizeHistory(history.slice(0, -3));
  setHistory([{role:"system", content:`Summary: ${summary}`}, ...history.slice(-3)]);
}
```

**Autosave namespace** (~1 час):
```javascript
// В executeWithRetry после успешного выполнения Python:
if(!r.error && lang==="py" && execCount % 3 === 0) {
  const snapshot = buildRestoreScript();
  localStorage.setItem("wos_namespace_snapshot", snapshot);
}
```

### Приоритет 3 — Новые возможности

#### 3a. Transformers.js Vector Router (2 недели)
Заменить LLM-роутинг на embeddings в браузере:
```javascript
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
const embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');

// Precompute skill embeddings once
const skillEmbeddings = await Promise.all(
  allSkills.map(s => embedder(s.desc, { pooling:'mean', normalize:true }))
);

// Route via cosine similarity (~20ms, deterministic, offline)
function cosineSim(a, b) {
  return a.data.reduce((sum,v,i)=>sum+v*b.data[i], 0);
}
```

Преимущества: ~20ms вместо ~800ms, детерминированный, offline, не тратит API tokens.

#### 3b. Query Decomposition
Сложные запросы разбивать на суб-задачи:
```javascript
async function decomposeQuery(task) {
  // "Анализируй Bescheid и напиши Widerspruch"
  // → ["Анализируй Bescheid", "Напиши Widerspruch"]
  const res = await callClaude(`Split into atomic sub-tasks (JSON array): "${task}"`);
  return JSON.parse(res); // ["task1", "task2"]
}

// Then route each sub-task independently
const subTasks = await decomposeQuery(task);
const subResults = await Promise.all(subTasks.map(t => executeWithRoute(t)));
```

#### 3c. Document Output Pipeline
Генерировать настоящий .docx из Python:
```python
# В Pyodide через micropip
import micropip
await micropip.install('python-docx')
from docx import Document

doc = Document()
doc.add_heading('Widerspruch', 0)
doc.add_paragraph(generated_text)
# Сохранить через FileSystemFileHandle или base64 download
```

#### 3d. Temporal Skill Activation
Skills активируются по дедлайнам:
```javascript
function getTemporalSkills(customSkills, caseData) {
  const now = new Date();
  const urgentCases = caseData?.filter(c => {
    const deadline = new Date(c.deadline);
    const daysLeft = (deadline - now) / (1000*60*60*24);
    return daysLeft <= 14;
  });
  if(urgentCases?.length > 0) {
    return ["eilantrag", ...getBaseSkills()]; // Eilantrag всегда в top
  }
  return getBaseSkills();
}
```

#### 3e. Collaborative .wos Sessions
```javascript
// Простой relay через BroadcastChannel (same-browser tabs)
const channel = new BroadcastChannel("wos_session");
channel.onmessage = (e) => restoreFromSnapshot(e.data);

// Или через простой WebSocket relay (50 строк Node.js)
const ws = new WebSocket("wss://relay.example.com/session/abc123");
ws.onmessage = (e) => applyDelta(JSON.parse(e.data));
```

### Приоритет 4 — Архитектурные улучшения

#### Рефакторинг state management
Сейчас: 14+ `useState` хуков в главном компоненте.
Нужно: `useReducer` или Zustand:
```javascript
const [state, dispatch] = useReducer(wosReducer, initialState);
// dispatch({ type: 'EXECUTION_START', payload: { code, lang } })
// dispatch({ type: 'ASSERTION_UPDATE', payload: { result } })
```

#### Skill Graph (Knowledge Graph)
```javascript
// Связи между skills, делами, нормами, прецедентами
const caseGraph = {
  nodes: [
    { id: "case-1", type: "case", label: "S 6 SO 58/26 ER" },
    { id: "norm-84", type: "norm", label: "§84 SGG" },
    { id: "bsg-1", type: "precedent", label: "B 8 SO 9/19 R" },
  ],
  edges: [
    { from: "case-1", to: "norm-84", rel: "governed_by" },
    { from: "case-1", to: "bsg-1", rel: "cites" },
  ]
};
// Router traverses graph for richer context
```

### Приоритет 5 — Мечты (горизонт 2027+)

1. **Living Specification** — правовые нормы как аннотации в коде: `# @norm §84 SGG: 1 Monat`. LLM интерпретирует при генерации.

2. **Skill DNA Evolution** — skill с низким feedback мутирует: Claude предлагает улучшенную версию ctx. A/B тест двух версий.

3. **Ambient Legal Intelligence** — фоновое наблюдение за изменениями в законодательстве (RSS bundesgesetzblatt.de). Автообновление skills при изменении §§.

4. **Case Knowledge Graph** — все дела, нормы, прецеденты в networkx-графе. Router traverses граф для поиска прецедентов.

---

## 10. Как продолжить в новом чате

### Команда для старта нового чата

```
Я продолжаю разработку Writing OS — немецкой правовой AI-системы.
Загрузи файл WritingOS.jsx (прикреплён) и WRITING_OS_HANDOFF.md.

Текущий статус: полностью рабочий React-артефакт с:
- Semantic Router (LLM-based, 10 skills)
- Live Code Sandbox (JS + Python/Pyodide WASM)  
- Streaming SSE для main call и semantic checker
- Auto-retry loop (max 2 попытки при ошибках кода)
- Session save/load (.wos файлы)
- Skill Composer (создание skills через диалог)
- Legal Assertion Checker (L1 structural + L2 streaming semantic)

Следующая задача: [выбери из roadmap или опиши свою]
```

### Важные файлы для передачи

| Файл | Описание |
|---|---|
| `WritingOS.jsx` | Весь исходный код (~2043 строк) |
| `WRITING_OS_HANDOFF.md` | Этот документ |
| `*.wos` | Сохранённые сессии (если есть) |

### Рекомендуемые следующие задачи (по приоритету)

1. **Безопасность** — DOMPurify + execution timeout через Worker
2. **Router cache** — LRU кэш для повторных запросов (~2 часа)
3. **History summarization** — rolling summary каждые 6 сообщений
4. **Autosave namespace** — localStorage каждые 3 execution
5. **Transformers.js router** — заменить LLM-роутер на embeddings (~20ms)
6. **Document output** — .docx генерация через python-docx в Pyodide

---

## 11. Ключевые паттерны кода

### Добавить новый skill (в SKILLS[])
```javascript
{ id:"new-skill-id", name:"Short Name", cat:"legal|technical|writing|productivity",
  desc:"2-3 sentences for router matching. Include domain keywords.",
  triggers:["keyword1", "deutsch", "русский", "§XX SGG"],
  ctx:`SKILL: Name\nKey rule 1\nKey rule 2\n§§ references` },
```

### Добавить новую вкладку в нижней панели
```javascript
// В tabs array:
{ id:"newtab", label:"⬡ New Tab" }

// В render:
{rightTab==="newtab" && <NewTabPane result={...} onAction={handler}/>}
```

### Добавить новый handler
```javascript
const handleNewAction = useCallback((param) => {
  // логика
  setToast("✓ Действие выполнено");
}, [dependencies]);
```

### Добавить assertion rule
```javascript
// В ASSERTION_RULES.widerspruch (или другой тип):
{ id:"new-rule",
  label:"Neue Regel",
  sev:"error|warning|info",   // severity
  check: t => /regex/.test(t),
  hint:"Что добавить если правило не прошло" },
```

---

## 12. Глоссарий

| Термин | Значение |
|---|---|
| CAGE | Context-Augmented Generative Execution — архитектурный паттерн системы |
| Skill | Объект с `id, name, cat, desc, triggers[], ctx` — домен-специфичные инструкции |
| Router | LLM-вызов выбирающий 1-3 релевантных skills по семантике задачи |
| ctx | Строка контента skill, инжектируемая в system prompt Claude |
| allSkills | `[...SKILLS, ...customSkills]` — встроенные + пользовательские skills |
| .wos | Writing OS Session — JSON файл с чатом, кодом, Python namespace |
| L1/L2 | Structural (regex) / Semantic (LLM) уровни Legal Assertion Checker |
| REPL | Read-Eval-Print Loop — персистентная Python сессия в Pyodide |
| streamDone | Boolean: SSE stream завершился, `semantic` JSON распаршен |
| isStreamingNow | `checking && semanticStream && !semantic` — идёт L2 поток |
| MAX_RETRIES | `2` — максимум auto-fix попыток при ошибке выполнения кода |

---

*Документ сгенерирован: 13.04.2026 | Writing OS v1.4 | claude-sonnet-4*
