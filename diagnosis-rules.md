# Diagnosis Rules

## Cause Taxonomy

For the learner-facing test workflow, ask the user to choose exactly one displayed primary cause label:

- `1 知识点不会`: The learner lacks the rule, concept, prerequisite, element, exception, or legal relation needed to solve the question.
- `2 知识点会但是做题思路不对`: The learner knows the knowledge point but used the wrong solving path, issue-spotting order, elimination logic, or fact-rule matching method.

Keep these durable primary cause labels available for records and backward compatibility:

- `大意`: The learner was careless, missed wording, chose too fast, copied the answer wrong, or made another non-knowledge slip. If the user types `大衣`, normalize it to `大意`.
- `知识点不会`: The learner lacks the rule, concept, prerequisite, element, exception, or legal relation needed to solve the question.
- `知识点会但是做题思路不对`: The learner knows the knowledge point but used the wrong solving path, issue-spotting order, elimination logic, or fact-rule matching method.

Use the detailed labels below only as internal secondary diagnosis when useful; do not replace the three primary labels in durable user-facing records.

- `法条记错`: The learner knows the topic but misremembers a statute, element, exception, period, or legal effect.
- `概念混淆`: The learner confuses adjacent concepts, such as 善意取得 vs 无权处分, 处分权 vs 代理权, or 债权效力 vs 物权变动.
- `审题错误`: The learner misses a qualifier, party identity, time sequence, exception, or ask wording.
- `排除法失误`: The learner can remove some choices but chooses poorly between remaining options.
- `时间太长`: The learner reaches the right path slowly or needs too much reconstruction.
- `粗心`: The learner knew the concept and method but made a slip not explained by knowledge or reading gaps.

## Confidence

- `high`: Explanation, answer, and user note all point to the same cause.
- `medium`: Two signals point to the same cause, or a strong explanation implies it.
- `low`: OCR is weak, the answer is missing, or only a manual tag exists.

## Knowledge Mapping

Map three layers when evidence allows:

1. `surface_point`: the visible tested point in the question.
2. `root_cause_point`: the prerequisite or upstream concept likely causing repeated mistakes.
3. `confusable_points`: adjacent concepts the learner may be mixing up.

When no trusted graph exists, return the user's manual tags and set confidence to `low` or `medium`.

If the learner confirms a fine-grained or personal wording that does not exist as a map node, preserve that wording in the wrong-question knowledge page. For graph marking, mark the nearest available upper concept in red, using this fallback order: explicit `upper_concept_points` or `parent_points`, then `surface_points`, then `root_cause_points`, then `knowledge_points`, then the card `unit`. If none of those fields match the map, infer the nearest upper concept from the user wording, stem, explanation summary, explanation items, and evidence text; record the chosen node(s) under `以上位概念兜底的细碎知识点`.

## Graph Color Rules

- Normal/base Markdown, JSON, and Obsidian Canvas files are uncolored. Do not write Canvas `color` fields into the source map.
- Colors are a mistake-analysis output, not the default state of the knowledge map.
- `red`: repeated mistakes, high-confidence knowledge gap, or root-cause point with multiple affected descendants.
- `yellow`: one mistake, low-confidence diagnosis, pending review, or recently learned but not retested.
- `green`: only after a successful retest or explicit mastery evidence.

Update only the direct parent layer by default. Do not automatically mark subject/page root nodes or every ancestor up to the subject-level root. A direct parent turns red when the mistake clearly depends on that parent concept or several sibling child nodes fail.

## Recommendation Rules

Default ratio when a root cause is identified:

- 70% root-cause point
- 20% surface point
- 10% confusable or adjacent point

Default ratio when no root cause is identified:

- 60% surface point
- 30% parent prerequisite
- 10% adjacent confusion point

Do not recommend AI-generated questions as authoritative unless the user asked for experimental practice. Prefer existing trusted question-bank IDs when available.
