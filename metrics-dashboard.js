#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function usage() {
  console.error("Usage: metrics-dashboard.js <review-vault-dir> [out.md]");
  process.exit(2);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function pct(n, d) {
  return d ? `${Math.round((n / d) * 100)}%` : "0%";
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function main() {
  const root = process.argv[2];
  const out = process.argv[3] || path.join(root || "", "00-index", "metrics-dashboard.md");
  if (!root) usage();

  const index = readJson(path.join(root, "00-index", "mistake-index.json"), { mistakes: [] });
  const retests = readJson(path.join(root, "00-index", "retest-queue.json"), { retests: [] });
  const mistakes = index.mistakes || [];
  const counted = mistakes.filter((item) => item.counted !== false);
  const confirmed = counted.filter((item) => item.primary_cause && item.primary_cause !== "未分类");
  const pendingRetest = (retests.retests || []).filter((item) => item.status === "pending");
  const passedRetest = (retests.retests || []).filter((item) => item.status === "passed");
  const failedRetest = (retests.retests || []).filter((item) => item.status === "failed");

  const subjectRows = groupBy(counted, (item) => item.subject || "未分类")
    .map(([subject, count]) => `| ${subject} | ${count} |`)
    .join("\n");
  const causeRows = groupBy(counted, (item) => item.primary_cause || "未分类")
    .map(([cause, count]) => `| ${cause} | ${count} | ${pct(count, counted.length)} |`)
    .join("\n");

  const body = [
    "# 错题复盘指标面板",
    "",
    "## North Star",
    "",
    "> 每周完成闭环修复的薄弱知识点数。",
    "",
    "## 当前数据",
    "",
    `- 总错题数：${mistakes.length}`,
    `- counted 错题数：${counted.length}`,
    `- 错因确认率：${pct(confirmed.length, mistakes.length)}`,
    `- 待七日复测：${pendingRetest.length}`,
    `- 复测通过：${passedRetest.length}`,
    `- 复测失败：${failedRetest.length}`,
    `- 复测通过率：${pct(passedRetest.length, passedRetest.length + failedRetest.length)}`,
    "",
    "## 科目分布",
    "",
    "| 科目 | counted 错题数 |",
    "| --- | ---: |",
    subjectRows,
    "",
    "## 错因组成",
    "",
    "| 错因 | 数量 | 比例 |",
    "| --- | ---: | ---: |",
    causeRows,
    "",
    "## 产品指标口径",
    "",
    "| 指标 | 当前可计算口径 |",
    "| --- | --- |",
    "| 错因确认率 | `primary_cause` 非空且非未分类 / 总错题数 |",
    "| 复测通过率 | `passed` / (`passed` + `failed`) |",
    "| 待复测量 | `retest-queue.json` 中 pending 数 |",
    "| 科目错题分布 | counted 错题按 subject 聚合 |",
    ""
  ].join("\n");

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body);
  console.log(out);
}

if (require.main === module) main();
