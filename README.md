# soz150

Клиентское React-приложение **Writing OS** (v1.4, архитектура CAGE — *Context-Augmented Generative Execution*, а также модульная версия `wos-v14`) для подготовки, анализа и проверки немецких социально-правовых документов (SGB IX, SGB XII, SGG) с использованием Anthropic API.

## Содержимое ветки `main`

- `WritingOS (5).jsx` (110 731 байт, ~2 044 строки) — однофайловый React-артефакт (CDN-формат без `package.json`). Включает:
  - 10 встроенных навыков (`deadline-calc`, `court-analyzer`, `template-gen`, `pers-budget`, `sgb-xii`, `eilantrag`, `code-sandbox`, `data-analysis`, `research` и навык написания документов);
  - семантический LLM-маршрутизатор задач `routeTask` и конструктор пользовательских навыков `SkillComposer` (хранение в `localStorage` под ключом `wos_custom_skills_v1`);
  - выполнение кода в браузере: JavaScript (`new Function`) и Python 3.11 через Pyodide 0.25.1 WASM с CDN (`numpy`, `pandas`);
  - повторы запросов `executeWithRetry` (`MAX_RETRIES=2`), сохранение и загрузку сессий в JSON-формате `.wos`;
  - двухэтапную проверку правовых утверждений **Legal Assertion Checker**: этап L1 (регулярные выражения `runStructuralCheck`) и этап L2 (семантическая проверка через Anthropic SSE `streamSemanticCheck`).
- `WRITING_OS_HANDOFF (1).md` (22 709 байт, от 13.04.2026) — передаточная документация (описание архитектуры, навыков, формата `.wos`, известных ограничений и дорожной карты).
- `wos-v14/` — извлечённая модульная версия (**Writing OS v50 — `App.jsx` v14**: 38 вкладок и панелей в 5 группах, 3 темы `dark` / `sepia` / `light`, горячие клавиши `Alt+<key>`, блокировка по PIN):
  - `wos-v14/src/App.jsx`;
  - `wos-v14/src/panels/BriefGeneratorPanel.jsx`, `GutachtenPanel.jsx`, `StatistikProPanel.jsx`.
- `writing-os-v14.zip` (21 157 байт) — исходный архив модульной версии.
- `LICENSE` — лицензия проекта.

## Стек и запуск

Файл `package.json` в репозитории отсутствует: `WritingOS (5).jsx` выполнен как автономный React-артефакт с подключением библиотек через CDN и обращением к Anthropic API из браузера; папка `wos-v14/` содержит извлечённые модули `src/App.jsx` и `src/panels/*.jsx`.

## Ветки репозитория

- `main` — защищённая ветка по умолчанию.
- `claude/extract-archive-AQWKR` — содержит неслитые коммиты поверх PR #1 (`Extract writing-os-v14.zip archive contents`): обновлённые `WritingOS (5).jsx` (192 082 байта) и `WRITING_OS_HANDOFF (1).md` (29 929 байт). Добавлены: изоляция JS в Web Worker внутри скрытого sandbox-iframe с opaque origin (`connect-src 'none'`), запуск Pyodide в Blob Web Worker с таймаутом 30 с, санитизация HTML через DOMPurify 3.4.16, LRU-кэш маршрутизатора на 20 записей, суммаризация длинной истории, автосохранение по пространствам имён в `localStorage`, экспорт `.docx` на чистом JS без сторонних зависимостей, а также отчёт о тестировании от 24.10.2026 с отрицательным результатом по векторному роутеру на `Transformers.js` / `multilingual-e5-small` (вариант отклонён и не включён в сборку).
- `codex/readme-overview-20261118` — ветка открытого чернового PR #2 (`Add concise project README`, [PR #2](https://github.com/svend4/soz150/pull/2)), добавляющая краткий `README.md` (579 байт).

## Лицензия

Проект распространяется под лицензией **GNU Affero General Public License v3 (AGPL-3.0)** (см. `LICENSE`).
