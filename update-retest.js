#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { refreshWeeklyReviews } = require("./generate-weekly-review");
const { shouldRefreshOnIngest } = require("./configure-automation");

function usage() {
  console.error("Usage: update-retest.js <review-vault-dir> <mistake-id> <passed|failed|skipped> [note]");
  process.exit(2);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function appendRetestLog(root, id, status, note, item) {
  const logFile = path.join(root, "00-index", "retest-log.md");
  const line = `| ${today()} | ${id} | ${item.subject || ""} | ${(item.knowledge_points || []).join("、")} | ${status} | ${note || ""} |`;
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, [
      "# 七日复测日志",
      "",
      "| 日期 | mistake_id | 科目 | 知识点 | 结果 | 备注 |",
      "| --- | --- | --- | --- | --- | --- |",
      line,
      ""
    ].join("\n"));
    return;
  }
  const current = fs.readFileSync(logFile, "utf8");
  if (!current.includes(line)) fs.appendFileSync(logFile, `${line}\n`);
}

function main() {
  const root = process.argv[2];
  const id = process.argv[3];
  const status = process.argv[4];
  const note = process.argv.slice(5).join(" ");
  if (!root || !id || !["passed", "failed", "skipped"].includes(status)) usage();

  const indexFile = path.join(root, "00-index", "mistake-index.json");
  const queueFile = path.join(root, "00-index", "retest-queue.json");
  const index = readJson(indexFile, { mistakes: [] });
  const queue = readJson(queueFile, { retests: [] });
  let found = false;
  let logItem = {};

  for (const item of index.mistakes || []) {
    if (item.id === id) {
      item.retest_status = status;
      item.retest_reviewed_at = today();
      if (note) item.retest_note = note;
      logItem = item;
      found = true;
    }
  }

  for (const item of queue.retests || []) {
    if (item.id === id) {
      item.status = status;
      item.reviewed_at = today();
      if (note) item.note = note;
      logItem = { ...logItem, ...item };
      found = true;
    }
  }

  if (!found) {
    console.error(`No retest item found for ${id}`);
    process.exit(1);
  }

  index.updated_at = today();
  queue.updated_at = today();
  writeJson(indexFile, index);
  writeJson(queueFile, queue);
  appendRetestLog(root, id, status, note, logItem);
  const weeklyReviews = shouldRefreshOnIngest(root) ? refreshWeeklyReviews(root, today()) : [];
  console.log(JSON.stringify({ id, status, reviewed_at: today(), weekly_reviews: weeklyReviews }, null, 2));
}

if (require.main === module) main();
