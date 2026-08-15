#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function usage() {
  console.error("Usage: generate-learning-doc.js <review-vault-dir> <knowledge-point> [subject] [mistake-id...]");
  process.exit(2);
}

function slug(value) {
  return String(value || "未命名")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function main() {
  const root = process.argv[2];
  const point = process.argv[3];
  const subject = process.argv[4] || "";
  const mistakeIds = process.argv.slice(5);
  if (!root || !point) usage();

  const file = path.join(root, "05-learning-docs", `${slug(subject ? `${subject}-${point}` : point)}.md`);
  const body = [
    `# 学习文档：${point}`,
    "",
    "## 关联错题",
    "",
    mistakeIds.length ? mistakeIds.map((id) => `- ${id}`).join("\n") : "- ",
    "",
    "## 前置知识",
    "",
    "- ",
    "",
    "## 正文讲解",
    "",
    "- ",
    "",
    "## 易混点",
    "",
    "| 易混概念 | 区分标准 | 常见误判 |",
    "| --- | --- | --- |",
    "|  |  |  |",
    "",
    "## 思考题",
    "",
    "1. 这个知识点的成立条件是什么？",
    "2. 它和最容易混淆的相邻概念差在哪里？",
    "3. 如果题干改一个条件，结论会不会变？为什么？",
    "",
    "## 你的反馈",
    "",
    "- 读不懂的位置标 `???`：",
    "- 你的问题：",
    "- 你的理解：",
    "- 下一次复测日期：",
    "",
    "## 学习日志增量",
    "",
    "- learned_points:",
    "- weak_points:",
    "- repeated_confusions:",
    "- thinking_question_answers:",
    "- next_practice_plan:",
    ""
  ].join("\n");

  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, body);
  console.log(file);
}

if (require.main === module) main();
