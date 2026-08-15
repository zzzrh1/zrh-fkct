# Review System

Use this when the user wants durable daily复盘, seven-day retests, visual wrong-question maps, and cause statistics across subjects and units.

## Layers

1. **图谱层**
   - Base knowledge graph as `.xmind` files under `03-maps/<科目>/01-base/`; normal graph files stay uncolored.
   - On ingestion, confirmed knowledge points mark `01-base/*.xmind` nodes red (知识点不会) or yellow (易混点), writing a separate `-标注版.xmind` to `02-marked/`. Unconfirmed knowledge points never mark the graph.

2. **复盘层**
   - Daily review summarizes what went wrong today.
   - Seven-day retest checks whether the weak point actually recovered.
   - Weekly review rolls daily records into trend-level insight.

3. **索引层**
   - `mistake-index.json` is the source of truth for counted vs uncounted mistakes.
   - Each mistake has one stable `id`.
   - Folder copies, subject views, and cause views must reference the same `id`.

4. **分类层**
   - Mistakes can appear under subject and cause folders, but counting always comes from the index.
   - This avoids double-counting one mistake because it appears in multiple views.

5. **知识层**
   - Knowledge points are archived by subject to `04-mistakes/by-knowledge/<科目>/` (民诉 entries live in `by-knowledge/民诉/`).
   - Any knowledge point written to the knowledge library must be user-confirmed — both user-supplied entries and mistake-attached `selected_knowledge_points`. Mistakes are organized directly without confirmation; unconfirmed knowledge points are skipped from the knowledge library and reported as `knowledge_pending_confirmation`.
   - `04-mistakes/by-subject/<科目>/错误知识点汇集.md` aggregates all confirmed knowledge points for that subject.

## Folder Layout

```text
00-index/
  skill-config.json
  mistake-index.json
  retest-queue.json
01-daily/
  YYYY-MM-DD/
    YYYY-MM-DD.md
    1-原始错题素材/
    2-整理好的错题/
02-weekly/
  YYYY-Www.md
03-maps/
  民诉/
    00-source/
    01-base/
    02-marked/
04-mistakes/
  by-subject/
  by-cause/
  by-knowledge/
05-learning-docs/
06-assets/
```

Subject folders are created on demand. The bundled example currently covers 民诉; a user-provided `.xmind` file can initialize another subject without precreating empty folders for every exam subject.

## Weekly Review Automation

The weekly review is generated into `02-weekly/YYYY-Www.md` from `00-index/mistake-index.json` and `00-index/retest-queue.json`.

- `on_ingest`: refresh the current and previous ISO week after confirmed ingestion or retest updates.
- `launchd`: optional macOS LaunchAgent scheduling, enabled only after the user chooses it during first-time configuration.
- `manual`: generate only when explicitly requested.

Generated content is enclosed in `AUTO-GENERATED` markers. Manual notes outside the markers are preserved on later refreshes.

## Daily Folder Rule

When the learner says the daily material should be organized by date, use a folder, not a single flat daily file.

```text
01-daily/YYYY-MM-DD/
  YYYY-MM-DD.md
  1-原始错题素材/
    README.md
  2-整理好的错题/
    README.md
```

- The date folder name must be the full year-month-day format: `YYYY-MM-DD`.
- Put screenshots, pasted OCR, question-bank exports, and other unprocessed source material under `1-原始错题素材/`.
- Put cleaned mistake cards, AI explanations, and confirmed structured Markdown under `2-整理好的错题/`.
- The date summary file `YYYY-MM-DD.md` should link to the source-material folder, the cleaned-mistake folder, counted/uncounted mistakes, seven-day retest items, and the subject weak-point pages touched that day.
- Keep raw source assets out of subject map folders. Subject folders should stay for durable maps and knowledge pages.

## Per-Subject Weak-Point Pages

Every subject needs its own error knowledge-point collection page:

```text
04-mistakes/by-subject/民法/错误知识点汇集.md
04-mistakes/by-subject/刑法/错误知识点汇集.md
04-mistakes/by-subject/民诉/错误知识点汇集.md
04-mistakes/by-subject/刑诉/错误知识点汇集.md
04-mistakes/by-subject/行政法/错误知识点汇集.md
04-mistakes/by-subject/商经知/错误知识点汇集.md
04-mistakes/by-subject/理论法/错误知识点汇集.md
04-mistakes/by-subject/三国法/错误知识点汇集.md
```

User-supplied knowledge points (no stem) are confirmed first, then archived by subject to `04-mistakes/by-knowledge/<科目>/K-<id>.md`. The subject collection page aggregates all confirmed knowledge points.

Each page should collect:

- high-frequency wrong knowledge points;
- mistake ids that support each point;
- current status: `待复盘`, `七日复测中`, `已恢复`;
- source daily folders;
- links to related maps in `03-maps/<科目>/`.

Do not count mistakes by scanning these pages. Counting still comes only from `00-index/mistake-index.json`.

## Obsidian Clean Output Rule

Keep the learner-facing Obsidian vault small.

- Put durable reading and review files in Obsidian.
- Do not put source page screenshots, raw OCR files, Canvas files, graph JSON, metadata, or generator scripts in Obsidian by default.
- Keep technical artifacts in the workspace `output/` tree and backups in `backups/`.
- A map page should normally expose only:
  - `<topic>.smm.md`
- Do not create same-topic `.md` sidecars for ordinary map pages.
- Add marked maps, index entries, or daily review files only when they serve the current learning workflow.

## Count Rules

- `counted: true`: included in statistics and maps.
- `counted: false`: imported or drafted but not yet confirmed.
- `daily_reviewed: true`: already included in that day's复盘.
- `retest_status: pending|passed|failed|skipped`.
- `retest_due`: default is mistake date + 7 days.

## Daily Review Questions

Each daily review should answer:

- 今天错题主要集中在哪门课、哪个单元？
- 主错因是什么？
- 哪些错题还没算入统计，为什么？
- 哪些知识点需要七天后复测？
- 哪一个知识点最值得明天优先修？

## Visual Map Metrics

Per subject and unit, track:

```json
{
  "subject": "民法",
  "unit": "民事权利",
  "mistake_count": 3,
  "cause_counts": {
    "知识点不会": 2,
    "概念混淆": 1
  },
  "weak_points": ["形成权", "抗辩权"],
  "last_wrong_at": "2026-07-02",
  "retest_due_count": 2
}
```

## Obsidian And Feishu

- Obsidian: use folders, Markdown, JSON, and Canvas directly.
- Feishu: mirror the same structure with tables:
  - mistakes table
  - daily review table
  - retest queue table
  - subject-unit dashboard table

Keep the data fields identical so the same agent logic can move between Obsidian and Feishu.
