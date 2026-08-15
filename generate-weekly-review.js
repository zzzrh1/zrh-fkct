#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DAY_MS = 24 * 60 * 60 * 1000;
const AUTO_START = "<!-- AUTO-GENERATED:START -->";
const AUTO_END = "<!-- AUTO-GENERATED:END -->";

function usage() {
  console.error("Usage: generate-weekly-review.js <review-vault-dir> [YYYY-MM-DD]");
  process.exit(2);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function parseDate(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText || ""))) {
    throw new Error(`日期格式必须是 YYYY-MM-DD：${dateText}`);
  }
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`日期无效：${dateText}`);
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateText, days) {
  const date = parseDate(dateText);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function weekInfo(dateText) {
  const sourceDate = parseDate(dateText);
  const weekday = sourceDate.getUTCDay() || 7;
  const monday = new Date(sourceDate);
  monday.setUTCDate(sourceDate.getUTCDate() - weekday + 1);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthWeekday = januaryFourth.getUTCDay() || 7;
  const firstMonday = new Date(januaryFourth);
  firstMonday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthWeekday + 1);
  const week = Math.floor((monday.getTime() - firstMonday.getTime()) / (DAY_MS * 7)) + 1;
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    label: `${year}-W${String(week).padStart(2, "0")}`,
    start: formatDate(monday),
    end: formatDate(sunday)
  };
}

function inRange(value, start, end) {
  return String(value || "") >= start && String(value || "") <= end;
}

function groupedCounts(items, valueFn) {
  const counts = new Map();
  for (const item of items) {
    const value = valueFn(item) || "未分类";
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])));
}

function percentage(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "0%";
}

function knowledgePoints(item) {
  return Array.from(new Set([]
    .concat(item.knowledge_points || [])
    .concat(item.surface_points || [])
    .concat(item.root_cause_points || [])
    .filter(Boolean)));
}

function rowOrEmpty(rows, fallback) {
  return rows.length ? rows.join("\n") : fallback;
}

function buildGeneratedBlock(info, index, queue, generatedAt) {
  const mistakes = index.mistakes || [];
  const retests = queue.retests || [];
  const weekMistakes = mistakes.filter((item) => inRange(item.date, info.start, info.end));
  const countedMistakes = weekMistakes.filter((item) => item.counted !== false);
  const dueRetests = retests.filter((item) => inRange(item.retest_due, info.start, info.end));
  const reviewedRetests = retests.filter((item) => inRange(item.reviewed_at, info.start, info.end));
  const passedRetests = reviewedRetests.filter((item) => item.status === "passed");
  const failedRetests = reviewedRetests.filter((item) => item.status === "failed");
  const skippedRetests = reviewedRetests.filter((item) => item.status === "skipped");
  const subjectRows = groupedCounts(countedMistakes, (item) => item.subject)
    .map(([subject, count]) => `| ${subject} | ${count} |`);
  const causeRows = groupedCounts(countedMistakes, (item) => item.primary_cause)
    .map(([cause, count]) => `| ${cause} | ${count} | ${percentage(count, countedMistakes.length)} |`);
  const pointCounts = new Map();
  countedMistakes.forEach((item) => knowledgePoints(item).forEach((point) => pointCounts.set(point, (pointCounts.get(point) || 0) + 1)));
  const pointRows = Array.from(pointCounts.entries())
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .slice(0, 10)
    .map(([point, count]) => `| ${point} | ${count} |`);
  const dailyDates = Array.from(new Set(weekMistakes.map((item) => item.date).filter(Boolean))).sort();
  const dailyLinks = dailyDates.map((dateText) => `- [[../01-daily/${dateText}/${dateText}|${dateText}]]`);
  const mistakeRows = countedMistakes.slice(0, 20).map((item) => {
    const points = knowledgePoints(item).slice(0, 2).join("、");
    const source = item.source_file ? `[[../${item.source_file.replace(/\.md$/, "")}]]` : "";
    return `| ${item.id || ""} | ${item.subject || ""} | ${points} | ${item.primary_cause || ""} | ${source} |`;
  });

  return [
    AUTO_START,
    `# ${info.label} 周复盘`,
    "",
    `- 统计周期：${info.start} 至 ${info.end}`,
    `- 自动生成：${generatedAt}`,
    "",
    "## 数据概览",
    "",
    `- 本周导入错题：${weekMistakes.length}`,
    `- 本周 counted 错题：${countedMistakes.length}`,
    `- 本周到期复测：${dueRetests.length}`,
    `- 本周已复测：${reviewedRetests.length}`,
    `- 本周复测通过：${passedRetests.length}`,
    `- 本周复测失败：${failedRetests.length}`,
    `- 本周复测跳过：${skippedRetests.length}`,
    `- 本周复测通过率：${percentage(passedRetests.length, passedRetests.length + failedRetests.length)}`,
    "",
    "## 科目分布",
    "",
    "| 科目 | counted 错题数 |",
    "| --- | ---: |",
    rowOrEmpty(subjectRows, "| - | 0 |"),
    "",
    "## 错因组成",
    "",
    "| 错因 | 数量 | 比例 |",
    "| --- | ---: | ---: |",
    rowOrEmpty(causeRows, "| - | 0 | 0% |"),
    "",
    "## 高频薄弱点",
    "",
    "| 知识点 | 出现次数 |",
    "| --- | ---: |",
    rowOrEmpty(pointRows, "| - | 0 |"),
    "",
    "## 本周错题入口",
    "",
    "| mistake_id | 科目 | 知识点 | 主错因 | 错题卡 |",
    "| --- | --- | --- | --- | --- |",
    rowOrEmpty(mistakeRows, "| - | - | - | - | - |"),
    "",
    "## 每日复盘入口",
    "",
    rowOrEmpty(dailyLinks, "- 本周暂无已入库错题。"),
    "",
    AUTO_END
  ].join("\n");
}

function mergeWithExisting(existing, generatedBlock) {
  if (!existing) {
    return [
      generatedBlock,
      "",
      "## 人工复盘补充",
      "",
      "- 本周最需要巩固：",
      "- 本周仍有疑问：",
      "- 下周行动：",
      ""
    ].join("\n");
  }
  const start = existing.indexOf(AUTO_START);
  const end = existing.indexOf(AUTO_END);
  if (start >= 0 && end >= start) {
    return `${existing.slice(0, start)}${generatedBlock}${existing.slice(end + AUTO_END.length)}`;
  }
  return `${generatedBlock}\n\n${existing.trimStart()}`;
}

function generateWeeklyReview(root, dateText, generatedAt = new Date().toISOString()) {
  const info = weekInfo(dateText);
  const index = readJson(path.join(root, "00-index", "mistake-index.json"), { mistakes: [] });
  const queue = readJson(path.join(root, "00-index", "retest-queue.json"), { retests: [] });
  const outputFile = path.join(root, "02-weekly", `${info.label}.md`);
  const existing = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, "utf8") : "";
  const generatedBlock = buildGeneratedBlock(info, index, queue, generatedAt);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, mergeWithExisting(existing, generatedBlock));
  return { label: info.label, file: outputFile, start: info.start, end: info.end };
}

function refreshWeeklyReviews(root, dateText) {
  const generatedAt = new Date().toISOString();
  const dates = [dateText, shiftDate(dateText, -7)];
  const labels = new Set();
  const outputs = [];
  for (const currentDate of dates) {
    const result = generateWeeklyReview(root, currentDate, generatedAt);
    if (!labels.has(result.label)) {
      labels.add(result.label);
      outputs.push(result);
    }
  }
  return outputs;
}

function main() {
  const root = process.argv[2];
  const dateText = process.argv[3] || formatDate(new Date());
  if (!root) usage();
  console.log(JSON.stringify(refreshWeeklyReviews(root, dateText), null, 2));
}

if (require.main === module) main();

module.exports = { generateWeeklyReview, refreshWeeklyReviews, weekInfo };
