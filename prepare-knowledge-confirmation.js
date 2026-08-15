#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const CAUSE_OPTIONS = [
  "1. 知识点不会",
  "2. 知识点会但是做题思路不对"
];

function usage() {
  console.error("Usage: prepare-knowledge-confirmation.js <recognized-knowledge.json> [out.md]");
  process.exit(2);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeInput(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.knowledge_points)) return raw.knowledge_points;
  if (Array.isArray(raw.knowledge_entries)) return raw.knowledge_entries;
  throw new Error("Input must be an array, or an object with knowledge_points/knowledge_entries.");
}

function listItems(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(/[\n,，、;；]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function unique(items) {
  return Array.from(new Set(items));
}

function renderEntry(entry, idx) {
  const points = unique(listItems(entry.selected_knowledge_points).concat(listItems(entry.knowledge_points)).concat(listItems(entry.surface_points)).concat(listItems(entry.root_cause_points)).concat(listItems(entry.confusable_points)));
  const pointOptions = points.length
    ? points.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "未识别到候选知识点。";
  return [
    `## 错误知识点 ${idx + 1}`,
    "",
    `- 科目：${entry.subject || "未分类"}`,
    "",
    "### 候选知识点",
    "",
    pointOptions,
    "",
    "### 请你确认",
    "",
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
  if (!inputFile) usage();

  const entries = normalizeInput(readJson(inputFile));
  const body = [
    "# 错误知识点入库确认单",
    "",
    "只整理你单独列出的错误知识点。知识点必须经你确认后才写入知识库；错题本身不需要确认，直接整理。",
    "",
    "入库前只确认两件事：",
    "",
    "- 需要入库的知识点。",
    "- 错因标签只选一个：`1 知识点不会` 或 `2 知识点会但是做题思路不对`。",
    "",
    entries.map((entry, index) => renderEntry(entry, index)).join("\n")
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
