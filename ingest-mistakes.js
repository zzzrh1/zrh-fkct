#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { markXmindFile } = require("./mark-xmind");
const { refreshWeeklyReviews } = require("./generate-weekly-review");
const { shouldRefreshOnIngest } = require("./configure-automation");

const SUBJECTS = ["民法", "刑法", "民诉", "刑诉", "行政法", "商经知", "理论法", "三国法"];
const CAUSES = ["大意", "知识点不会", "知识点会但是做题思路不对"];

function usage() {
  console.error("Usage: ingest-mistakes.js <review-vault-dir> <mistakes.json> [YYYY-MM-DD]");
  process.exit(2);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function writeIfMissing(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, data);
}

function slug(value) {
  return String(value || "未命名")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function sourceImages(card) {
  return []
    .concat(card.source_images || [])
    .concat(card.original_images || [])
    .filter(Boolean);
}

function normalizeInput(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.mistakes)) return raw.mistakes;
  if (Array.isArray(raw.mistake_cards)) return raw.mistake_cards;
  throw new Error("Input must be an array, or an object with mistakes/mistake_cards.");
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextId(dateText, existingIds, index) {
  let n = index + 1;
  while (true) {
    const id = `M-${dateText.replace(/-/g, "")}-${String(n).padStart(3, "0")}`;
    if (!existingIds.has(id)) return id;
    n += 1;
  }
}

function bulletList(items) {
  const list = (items || []).filter(Boolean);
  return list.length ? list.map((item) => `- ${item}`).join("\n") : "- ";
}

function normalizeCause(value) {
  const cause = String(value || "").trim();
  if (cause === "1") return "知识点不会";
  if (cause === "2") return "知识点会但是做题思路不对";
  if (cause === "3") return "知识点会但是做题思路不对";
  if (cause === "大衣" || cause === "粗心") return "大意";
  if (CAUSES.includes(cause)) return cause;
  return "未确认";
}

function splitListText(value) {
  return String(value || "")
    .split(/[\n,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function explanationItems(card) {
  if (Array.isArray(card.explanation_items) && card.explanation_items.length) {
    return card.explanation_items.filter(Boolean);
  }
  const text = card.explanation_summary || card.explanation || "";
  return text ? [String(text)] : [];
}

function selectedExplanations(card) {
  if (Array.isArray(card.selected_explanations) && card.selected_explanations.length) {
    return card.selected_explanations.filter(Boolean);
  }
  const items = explanationItems(card);
  const indexes = typeof card.selected_explanation_indexes === "string"
    ? splitListText(card.selected_explanation_indexes)
    : (card.selected_explanation_indexes || []);
  if (!indexes.length) return items;
  return indexes
    .map((index) => items[Number(index) - 1])
    .filter(Boolean);
}

function allKnowledgePoints(card) {
  return Array.from(new Set([]
    .concat(card.surface_points || [])
    .concat(card.root_cause_points || [])
    .concat(card.confusable_points || [])
    .concat(card.knowledge_points || [])
    .filter(Boolean)));
}

function selectedKnowledgePoints(card) {
  if (typeof card.selected_knowledge_points === "string") {
    const points = splitListText(card.selected_knowledge_points);
    if (points.length) return points;
  }
  if (Array.isArray(card.selected_knowledge_points) && card.selected_knowledge_points.length) {
    return card.selected_knowledge_points.filter(Boolean);
  }
  const items = allKnowledgePoints(card);
  const indexes = card.selected_knowledge_point_indexes || [];
  return indexes
    .map((index) => items[Number(index) - 1])
    .filter(Boolean);
}

function sortedUnique(items) {
  return Array.from(new Set((items || []).filter(Boolean))).sort();
}

function sameStringList(a, b) {
  const left = sortedUnique(a);
  const right = sortedUnique(b);
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function existingMistake(item, subject, dateText, mistakeIndex) {
  const points = selectedKnowledgePoints(item);
  return (mistakeIndex.mistakes || []).find((entry) => {
    return entry.date === (item.date || dateText)
      && entry.subject === subject
      && (entry.unit || "") === (item.unit || "")
      && sameStringList(entry.knowledge_points || [], points);
  });
}

function yamlFrontmatter(card) {
  const lines = [
    `id: "${card.id || ""}"`,
    `type: "mistake"`,
    `subject: "${card.subject || ""}"`,
    `unit: "${card.unit || ""}"`,
    `date: "${card.date || ""}"`,
    `primary_cause: "${card.primary_cause || ""}"`,
    `counted: ${card.counted !== false}`,
    `retest_due: "${card.retest_due || ""}"`,
    `retest_status: "${card.retest_status || "pending"}"`
  ];
  return `---\n${lines.join("\n")}\n---\n`;
}

function mistakeMarkdown(card) {
  return [
    yamlFrontmatter(card),
    `# ${card.id} ${card.subject || "未知科目"}错题卡`,
    "",
    "## 基本信息",
    "",
    `- 科目：${card.subject || ""}`,
    `- 单元/专题：${card.unit || ""}`,
    `- 用户答案：${card.user_answer || ""}`,
    `- 正确答案：${card.correct_answer || ""}`,
    `- 主错因：${card.primary_cause || ""}`,
    `- 次错因：${(card.secondary_causes || []).join("、")}`,
    `- 置信度：${card.confidence || "low"}`,
    `- counted：${card.counted !== false}`,
    `- 七日复测：${card.retest_due || ""}`,
    "",
    "## 题干",
    "",
    card.stem || card.ocr_text || "",
    "",
    "## 选项",
    "",
    (card.options || []).map((option) => `- ${option}`).join("\n"),
    "",
    "## 原始素材",
    "",
    bulletList(card.raw_files || []),
    "",
    "## 原始完整解析",
    "",
    card.explanation || card.explanation_summary || "",
    ""
  ].join("\n");
}

function copyRawMaterials(root, dateText, card) {
  const sources = sourceImages(card);
  if (!sources.length) return [];
  const rawDir = path.join(root, "01-daily", dateText, "1-原始错题素材");
  fs.mkdirSync(rawDir, { recursive: true });
  return sources
    .map((source, index) => {
      if (!fs.existsSync(source)) return "";
      const ext = path.extname(source);
      const base = path.basename(source, ext);
      const file = path.join(rawDir, `${card.id}-${String(index + 1).padStart(2, "0")}-${slug(base)}${ext}`);
      if (!fs.existsSync(file)) fs.copyFileSync(source, file);
      return path.relative(root, file);
    })
    .filter(Boolean);
}

function ensureKnowledgeCategoryDir(root, subject) {
  fs.mkdirSync(path.join(root, "04-mistakes", "by-knowledge", subject), { recursive: true });
}

function writeKnowledgeFile(root, subject, card, dateText) {
  ensureKnowledgeCategoryDir(root, subject);
  const points = selectedKnowledgePoints(card);
  if (!points.length) return null;
  const file = path.join(
    root, "04-mistakes", "by-knowledge", subject,
    `K-${card.id}.md`
  );
  const lines = [
    "---",
    `id: "${card.id}"`,
    `type: "knowledge_point"`,
    `subject: "${subject}"`,
    `date: "${card.date || dateText}"`,
    `retest_due: "${card.retest_due || ""}"`,
    `retest_status: "${card.retest_status || "pending"}"`,
    "---",
    "",
    `# ${subject}知识点`,
    "",
    ...points.map((point) => `- ${point}`),
    ""
  ];
  if (card.source_file) {
    lines.push(`来源错题：[[${card.source_file.replace(/\.md$/, "")}]]`);
    lines.push("");
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join("\n"));
  return path.relative(root, file);
}

function ensureSubjectPage(root, subject) {
  const file = path.join(root, "04-mistakes", "by-subject", subject, "错误知识点汇集.md");
  writeIfMissing(file, [
    "---",
    `type: "subject_knowledge_collection"`,
    `subject: "${subject}"`,
    "---",
    "",
    `# ${subject}错误知识点汇集`,
    "",
    "## 高频错误知识点",
    "",
    "| 知识点 | 错题次数 | mistake_ids | 当前状态 | 最近出错 | 关联地图 |",
    "| --- | ---: | --- | --- | --- | --- |",
    "",
    "## 待复盘",
    "",
    "- ",
    "",
    "## 七日复测中",
    "",
    "- ",
    "",
    "## 已恢复",
    "",
    "- ",
    ""
  ].join("\n"));
  return file;
}

function ensureSubjectMapScaffold(root, subject) {
  const subjectRoot = path.join(root, "03-maps", subject);
  for (const dir of ["00-source", "01-base", "02-marked"]) {
    fs.mkdirSync(path.join(subjectRoot, dir), { recursive: true });
  }
  writeIfMissing(path.join(subjectRoot, "README.md"), [
    `# ${subject}知识图谱`,
    "",
    "- `00-source/`：用户提供的原始 `.xmind` 文件。",
    "- `01-base/`：无错题颜色的基础图谱。",
    "- `02-marked/`：确认后生成的红/黄/绿标注图谱。",
    ""
  ].join("\n"));
}

function appendUnique(file, marker, lines) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const newLines = lines.filter((line) => line && !current.includes(line));
  if (!newLines.length) return;
  fs.appendFileSync(file, `\n${marker}\n${newLines.join("\n")}\n`);
}

function updateDailyReview(root, dateText, cards) {
  const dailyFile = path.join(root, "01-daily", dateText, `${dateText}.md`);
  writeIfMissing(dailyFile, `# ${dateText} 错题复盘\n\n## 今日错题\n\n| mistake_id | 科目 | 单元/专题 | 错因 | counted | 七日复测 |\n| --- | --- | --- | --- | --- | --- |\n`);
  const rows = cards.map((card) => `| ${card.id} | ${card.subject || ""} | ${card.unit || ""} | ${card.primary_cause || ""} | ${card.counted !== false} | ${card.retest_due || ""} |`);
  appendUnique(dailyFile, "## 自动导入错题", rows);
}

function updateSubjectPages(root, cards) {
  for (const card of cards) {
    const subject = card.subject || "未分类";
    ensureSubjectMapScaffold(root, subject);
    const file = ensureSubjectPage(root, subject);
    const points = selectedKnowledgePoints(card);
    const rows = points.map((point) => `| ${point} | 1 | ${card.id} | 待复盘 | ${card.date} | [[../../../03-maps/${subject}/]] |`);
    appendUnique(file, "## 自动汇集", rows);
    const explanations = selectedExplanations(card).map((item) => `- ${card.id}：${item}`);
    appendUnique(file, "## 用户选入解析", explanations);
  }
}

function updateCausePages(root, cards) {
  for (const card of cards) {
    const cause = normalizeCause(card.primary_cause);
    const file = path.join(root, "04-mistakes", "by-cause", cause, `${card.id}.md`);
    const explanations = selectedExplanations(card);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, [
      `# ${card.id} ${cause}`,
      "",
      `- 科目：${card.subject || ""}`,
      `- 单元/专题：${card.unit || ""}`,
      `- 错题卡：[[../../../${card.source_file.replace(/\.md$/, "")}]]`,
      "",
      "## 选入错题知识页的解析",
      "",
      bulletList(explanations),
      ""
    ].join("\n"));
  }
}

/**
 * 用已确认的知识点标注该科目 03-maps/<科目>/01-base/ 下的 .xmind 图谱，
 * 红色=直接薄弱点/知识点不会，黄色=易混点，输出到 02-marked/。
 * 图谱标记强约束：只标注用户确认过的知识点。
 */
function markSubjectXmind(root, cards, dateText) {
  const outputs = [];
  for (const card of cards) {
    const subject = card.subject || "未分类";
    const baseDir = path.join(root, "03-maps", subject, "01-base");
    if (!fs.existsSync(baseDir)) continue;
    const marks = [];
    for (const point of selectedKnowledgePoints(card)) {
      marks.push({ text: point, state: "red" });
    }
    for (const confusable of (card.confusable_points || [])) {
      marks.push({ text: confusable, state: "yellow" });
    }
    if (!marks.length) continue;
    for (const file of fs.readdirSync(baseDir)) {
      if (!file.toLowerCase().endsWith(".xmind")) continue;
      const output = path.join(root, "03-maps", subject, "02-marked", `${path.basename(file, ".xmind")}-标注版.xmind`);
      try {
        markXmindFile(path.join(baseDir, file), marks, output);
        outputs.push(path.relative(root, output));
      } catch (error) {
        console.error(`图谱标注失败 ${file}: ${error.message}`);
      }
    }
  }
  return outputs;
}

function main() {
  const root = process.argv[2];
  const inputFile = process.argv[3];
  const dateText = process.argv[4] || new Date().toISOString().slice(0, 10);
  if (!root || !inputFile) usage();

  const input = normalizeInput(readJson(inputFile));
  const indexFile = path.join(root, "00-index", "mistake-index.json");
  const retestFile = path.join(root, "00-index", "retest-queue.json");
  const mistakeIndex = readJson(indexFile, { schema: "wrong-question.mistake-index.v1", updated_at: dateText, mistakes: [] });
  const retestQueue = readJson(retestFile, { schema: "wrong-question.retest-queue.v1", updated_at: dateText, retests: [] });
  const existingIds = new Set((mistakeIndex.mistakes || []).map((item) => item.id));

  const cards = input.map((item, idx) => {
    const subject = SUBJECTS.includes(item.subject) ? item.subject : (item.subject || "未分类");
    const cause = normalizeCause(item.primary_cause);
    const entryType = item.type === "knowledge" ? "knowledge" : "mistake";
    const knowledgeConfirmed = item.knowledge_confirmed || item.user_confirmed;
    if (!knowledgeConfirmed || cause === "未确认" || !selectedKnowledgePoints(item).length) {
      throw new Error(`条目 ${item.id || idx + 1} 未完成确认。必须显式提供 selected_knowledge_points、知识确认标记和错因后才能入库。`);
    }
    const existing = item.id ? null : existingMistake(item, subject, dateText, mistakeIndex);
    const id = item.id || (existing && existing.id) || nextId(dateText, existingIds, idx);
    existingIds.add(id);
    return {
      ...item,
      id,
      date: item.date || dateText,
      subject,
      primary_cause: cause,
      entry_type: entryType,
      counted: item.counted !== false,
      retest_due: item.retest_due || addDays(dateText, 7),
      retest_status: item.retest_status || "pending"
    };
  });

  for (const card of cards) {
    const cleanedDir = path.join(root, "01-daily", dateText, "2-整理好的错题");
    const cardFile = path.join(cleanedDir, `${card.id}-${slug(card.subject)}-${slug(card.unit || (card.surface_points || [])[0])}.md`);
    fs.mkdirSync(cleanedDir, { recursive: true });
    card.raw_files = Array.from(new Set([].concat(card.raw_files || []).concat(copyRawMaterials(root, dateText, card))));
    if (card.entry_type === "knowledge") {
      // 纯知识条目：知识库写入前必须已确认
      card.knowledge_file = writeKnowledgeFile(root, card.subject, card, dateText);
      card.source_file = card.knowledge_file;
    } else {
      fs.writeFileSync(cardFile, mistakeMarkdown(card));
      card.source_file = path.relative(root, cardFile);
      card.knowledge_file = writeKnowledgeFile(root, card.subject, card, dateText);
    }

    const indexEntry = {
        id: card.id,
        date: card.date,
        subject: card.subject,
        unit: card.unit || "",
        knowledge_points: selectedKnowledgePoints(card),
        primary_cause: card.primary_cause,
        counted: card.counted,
        daily_reviewed: true,
        raw_files: card.raw_files,
        retest_due: card.retest_due,
        retest_status: card.retest_status,
        source_file: card.source_file,
        knowledge_file: card.knowledge_file
    };
    const indexPosition = mistakeIndex.mistakes.findIndex((item) => item.id === card.id);
    if (indexPosition >= 0) mistakeIndex.mistakes[indexPosition] = indexEntry;
    else mistakeIndex.mistakes.push(indexEntry);

    const retestEntry = {
        id: card.id,
        date: card.date,
        subject: card.subject,
        knowledge_points: selectedKnowledgePoints(card),
        retest_due: card.retest_due,
        status: card.retest_status,
        source_file: card.source_file
    };
    const retestPosition = retestQueue.retests.findIndex((item) => item.id === card.id);
    if (retestPosition >= 0) retestQueue.retests[retestPosition] = retestEntry;
    else retestQueue.retests.push(retestEntry);
  }

  mistakeIndex.updated_at = dateText;
  retestQueue.updated_at = dateText;
  writeJson(indexFile, mistakeIndex);
  writeJson(retestFile, retestQueue);
  const mistakeCards = cards.filter((card) => card.entry_type !== "knowledge");
  const knowledgeCards = cards.filter((card) => card.entry_type === "knowledge");
  const confirmedKnowledgeCards = mistakeCards.filter((card) => card.knowledge_confirmed || card.user_confirmed);
  updateDailyReview(root, dateText, mistakeCards);
  updateSubjectPages(root, confirmedKnowledgeCards);
  updateCausePages(root, mistakeCards);
  const markedGraphs = markSubjectXmind(root, confirmedKnowledgeCards, dateText);
  const weeklyReviews = shouldRefreshOnIngest(root) ? refreshWeeklyReviews(root, dateText) : [];

  console.log(JSON.stringify({
    imported: cards.length,
    mistake_cards: mistakeCards.length,
    knowledge_entries: knowledgeCards.length,
    knowledge_pending_confirmation: [],
    marked_graphs: markedGraphs,
    weekly_reviews: weeklyReviews
  }, null, 2));
}

if (require.main === module) main();
