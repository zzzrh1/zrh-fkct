#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const CAUSE_OPTIONS = [
  "1. 知识点不会",
  "2. 知识点会但是做题思路不对"
];

function usage() {
  console.error("Usage: prepare-confirmation.js <recognized-mistakes.json> [out.md] [YYYY-MM-DD]");
  process.exit(2);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeInput(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.mistakes)) return raw.mistakes;
  if (Array.isArray(raw.mistake_cards)) return raw.mistake_cards;
  throw new Error("Input must be an array, or an object with mistakes/mistake_cards.");
}

function explanationItems(card) {
  if (Array.isArray(card.explanation_items) && card.explanation_items.length) return card.explanation_items;
  const text = card.explanation_summary || card.explanation || "";
  return text ? [String(text)] : [];
}

function knowledgePoints(card) {
  return []
    .concat(card.surface_points || [])
    .concat(card.root_cause_points || [])
    .concat(card.confusable_points || [])
    .concat(card.knowledge_points || [])
    .filter(Boolean);
}

function unique(items) {
  return Array.from(new Set(items));
}

function renderCard(card, idx) {
  const items = explanationItems(card);
  const options = items.length
    ? items.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "未识别到解析。";
  const points = unique(knowledgePoints(card));
  const pointOptions = points.length
    ? points.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "未识别到候选知识点。";
  return [
    `## 错题 ${idx + 1}`,
    "",
    "### 解析",
    "",
    options,
    "",
    "### 候选知识点",
    "",
    pointOptions,
    "",
    "### 请你确认",
    "",
    "- 解析默认原样随错题入库，不需要选择。",
    "- 入库知识点：直接写知识点；多个用顿号、逗号或换行分隔。",
    "- 错因：",
    CAUSE_OPTIONS.map((item) => `  - ${item}`).join("\n"),
    "",
    "### 确认结果填写区",
    "",
    "入库知识点：",
    "错因：",
    ""
  ].join("\n");
}

function main() {
  const inputFile = process.argv[2];
  const outFile = process.argv[3];
  const dateText = process.argv[4];
  if (!inputFile) usage();

  const cards = normalizeInput(readJson(inputFile));
  const body = [
    "# 错题入库确认单",
    "",
    "入库前只确认两件事：",
    "",
    "- 需要入库的知识点。",
    "- 错因标签只选一个：`1 知识点不会` 或 `2 知识点会但是做题思路不对`。",
    "",
    "确认单不展示题干和选项；题目会在结构化数据和最终错题卡里原样保存。解析如已识别，会默认原样随错题入库。",
    "",
    cards.map((card, index) => renderCard(card, index)).join("\n")
  ].join("\n");

  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, body);
    console.log(outFile);
  } else {
    console.log(body);
  }
}

if (require.main === module) main();
