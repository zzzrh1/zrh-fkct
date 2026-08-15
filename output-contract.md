# Output Contract

## Basic Report

Use this order unless the user asks for JSON only:

1. `今日结论`: one short paragraph naming the main weakness.
2. `错因组成`: percent table.
3. `错题卡片`: one card per mistake.
4. `知识图谱更新`: affected nodes and colors.
5. `推荐练习`: ratio-based next practice plan.
6. `缺失信息`: OCR,题库,图谱,答案,解析,或用户反馈中缺少的内容。

## Minimal Agent Response Example

```markdown
## 今日结论

你今天主要不是单纯记错答案，而是“善意取得”和“处分权”的关系没有稳定。

## 错因组成

| 错因 | 比例 |
|---|---:|
| 概念混淆 | 50% |
| 知识点不会 | 50% |

## 推荐练习

| 知识点 | 比例 | 原因 |
|---|---:|---|
| 处分权 | 70% | 它是本题更上游的薄弱点 |
| 善意取得 | 20% | 表层错点需要复测 |
| 无权处分 | 10% | 相邻混淆点 |
```

## Mistake Card Shape

```json
{
  "id": "optional",
  "subject": "民法",
  "stem": "",
  "options": [],
  "user_answer": "",
  "correct_answer": "",
  "explanation_summary": "",
  "explanation_items": [],
  "selected_explanation_indexes": "optional backward-compatible field",
  "selected_explanations": "optional backward-compatible field",
  "selected_knowledge_point_indexes": [],
  "selected_knowledge_points": [],
  "upper_concept_points": [],
  "parent_points": [],
  "primary_cause": "1|2|大意|知识点不会|知识点会但是做题思路不对",
  "secondary_causes": [],
  "surface_points": [],
  "root_cause_points": [],
  "confusable_points": [],
  "confidence": "low|medium|high",
  "manual_required": false,
  "source_images": [],
  "raw_files": [],
  "evidence": [],
  "next_action": ""
}
```

## Confirmation Gate

任何错题入库前都必须确认知识点和错因。先检查原始资料是否含解析：有解析则从解析中抽取候选知识点；无解析则明确询问用户知识点。候选知识点必须由用户显式选择或改写；单独回复“确认”无效。

Before writing any knowledge point into the durable knowledge library (by-knowledge file, subject collection page, or graph marking), ask the learner to confirm:

1. Which specific knowledge points should be attached to this mistake. The learner must write or unambiguously select them.
2. The cause tag, choosing exactly one displayed option:
   - `1 知识点不会`
   - `2 知识点会但是做题思路不对`

At the confirmation gate, do not display the question stem/options back to the learner. Show only:

- candidate knowledge points, if useful;
- the two displayed cause-tag choices.

Confirmed knowledge points are archived by subject to `04-mistakes/by-knowledge/<科目>/` (民诉 entries live in `by-knowledge/民诉/`). Unconfirmed knowledge points are skipped from the knowledge library and reported as `knowledge_pending_confirmation`; the mistake card itself is still organized.

Do not ask the learner to choose explanations. If explanations exist, store all recognized explanation text exactly with the wrong-question card. Do not ask whether to ingest. Once the learner confirms the knowledge points and cause, durable write is implied.

Store the answer as:

```json
{
  "selected_knowledge_points": ["..."],
  "primary_cause": "1",
  "user_confirmed": true
}
```

错题（`type: "mistake"`）直接整理入库，错题卡不要求确认。其知识点写入知识库用 `knowledge_confirmed: true` 标记；未确认的知识点不写知识库（不写 by-knowledge、不进科目汇集页、不标图谱），导入输出会列出 `knowledge_pending_confirmation` 待确认卡。**知识条目（`type: "knowledge"`）必须 `user_confirmed: true`** 才能运行 `scripts/ingest-mistakes.js`；未确认的知识条目会被脚本拒绝并提示先确认知识点和错因。

When a confirmed knowledge point is too fine-grained for the subject map, store the confirmed wording exactly in the wrong-question card. The marked-graph output may instead red-mark a nearest upper concept from explicit upper fields or, if needed, infer one from the card's stem/explanation/evidence text.

## Graph Update Shape

```json
{
  "knowledge_id": "",
  "name": "",
  "subject": "",
  "old_color": "green|yellow|red|unknown",
  "new_color": "green|yellow|red",
  "reason": "",
  "source_mistake_ids": [],
  "confidence": "low|medium|high"
}
```

## Recommendation Shape

```json
{
  "knowledge_id": "",
  "name": "",
  "ratio": 70,
  "type": "root_cause|surface|confusable|parent",
  "reason": "",
  "practice_source": "question_bank|manual|ai_experimental",
  "question_ids": []
}
```

## AI Member Learning Document

Use this structure:

```markdown
# 学习文档：知识点名称

## 前置知识

## 正文讲解

## 易混点

## 思考题

1. ...

## 你的反馈

- 读不懂的位置标 `???`
- 你的问题：
- 你的理解：
```

## Study Log Delta

Record only durable learning memory:

- learned points
- weak points
- repeated confusions
- `???` marks
- thinking-question answers
- recommended retest date
- next practice plan

## Review System Files

When maintaining the durable review layer, use these files:

```text
00-index/mistake-index.json
00-index/retest-queue.json
01-daily/YYYY-MM-DD/YYYY-MM-DD.md
01-daily/YYYY-MM-DD/1-原始错题素材/
01-daily/YYYY-MM-DD/2-整理好的错题/
02-weekly/YYYY-Www.md
03-maps/<subject>/<unit>.canvas
04-mistakes/by-subject/<subject>/错误知识点汇集.md
04-mistakes/by-cause/<cause>/<mistake-id>.md
05-learning-docs/<knowledge-point>.md
```

### mistake-index.json

```json
{
  "mistakes": [
    {
      "id": "M-20260702-001",
      "date": "2026-07-02",
      "subject": "民法",
      "unit": "民事权利",
      "knowledge_points": ["形成权"],
      "primary_cause": "知识点不会",
      "counted": true,
      "daily_reviewed": true,
      "retest_due": "2026-07-09",
      "retest_status": "pending",
      "source_file": "04-mistakes/by-subject/民法/M-20260702-001.md"
    }
  ]
}
```

### Daily Review

```markdown
# Daily 复盘：2026-07-02

## 今日错题地图

| 科目 | 单元 | 错题数 | 主错因 |
|---|---|---:|---|

## 错因组成

| 错因 | 数量 | 比例 |
|---|---:|---:|

## 未计入错题

## 七天后复测

## 今日结论
```

### Weekly Review

```markdown
# 2026-W27 周复盘

<!-- AUTO-GENERATED:START -->
## 数据概览

- 本周导入错题：
- 本周 counted 错题：
- 本周复测通过率：

## 科目分布

## 错因组成

## 高频薄弱点

## 每日复盘入口
<!-- AUTO-GENERATED:END -->

## 人工复盘补充
```

The generated section is refreshed from `mistake-index.json` and `retest-queue.json`; manual content outside the markers is preserved.
