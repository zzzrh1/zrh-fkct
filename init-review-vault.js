#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
const today = process.argv[3] || new Date().toISOString().slice(0, 10);

if (!root) {
  console.error("Usage: node init-review-vault.js <review-vault-dir>");
  process.exit(2);
}

const dirs = [
  "00-index",
  "01-daily",
  `01-daily/${today}`,
  `01-daily/${today}/1-原始错题素材`,
  `01-daily/${today}/2-整理好的错题`,
  "02-weekly",
  "03-maps",
  "04-mistakes/by-subject",
  "04-mistakes/by-cause",
  "04-mistakes/by-knowledge",
  "05-learning-docs",
  "06-assets"
];

for (const dir of dirs) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
}

function writeIfMissing(file, data) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, data);
  }
}

function ensureSubjectScaffold(subject) {
  const normalizedSubject = String(subject || "").trim();
  if (!normalizedSubject) return;
  const subjectDirs = [
    `03-maps/${normalizedSubject}/00-source`,
    `03-maps/${normalizedSubject}/01-base`,
    `03-maps/${normalizedSubject}/02-marked`,
    `04-mistakes/by-subject/${normalizedSubject}`
  ];
  for (const dir of subjectDirs) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  writeIfMissing(
    path.join(root, "03-maps", normalizedSubject, "README.md"),
    [
      `# ${normalizedSubject}知识图谱`,
      "",
      "- `00-source/`：用户提供的原始 `.xmind` 文件。",
      "- `01-base/`：无错题颜色的基础图谱。",
      "- `02-marked/`：确认后生成的红/黄/绿标注图谱。",
      ""
    ].join("\n")
  );
}

writeIfMissing(
  path.join(root, "00-index", "mistake-index.json"),
  JSON.stringify({ mistakes: [] }, null, 2)
);

writeIfMissing(
  path.join(root, "00-index", "retest-queue.json"),
  JSON.stringify({ retests: [] }, null, 2)
);

writeIfMissing(
  path.join(root, "00-index", "skill-config.json"),
  JSON.stringify({
    schema: "wrong-question.skill-config.v1",
    version: 1,
    subject_mode: "on_demand",
    bundled_subjects: ["民诉"],
    weekly_review: {
      method: process.platform === "darwin" ? "unconfigured" : "on_ingest",
      configured: false
    }
  }, null, 2) + "\n"
);

writeIfMissing(
  path.join(root, "README.md"),
  [
    "# 错题复盘系统",
    "",
    "- `00-index`: counted/uncounted source of truth.",
    "- `01-daily`: daily review notes.",
    "- `02-weekly`: weekly trend review.",
    "- `03-maps`: per-subject and per-unit visual maps.",
    "- `04-mistakes`: subject and cause views; do not count from folders.",
    "- `05-learning-docs`: AI learning documents and feedback areas.",
    ""
  ].join("\n")
);

writeIfMissing(
  path.join(root, "01-daily", "README.md"),
  [
    "# Daily 复盘",
    "",
    "每天新增一个 `YYYY-MM-DD/` 文件夹。",
    "",
    "```text",
    "YYYY-MM-DD/",
    "  YYYY-MM-DD.md",
    "  1-原始错题素材/",
    "  2-整理好的错题/",
    "```",
    "",
    "- `1-原始错题素材/`：截图、OCR、原题文本、未清洗材料。",
    "- `2-整理好的错题/`：结构化错题卡、AI 讲解、确认后的知识点。",
    "- 当天复盘文件记录错因、未计入项、七日复测、关联科目汇总页。",
    ""
  ].join("\n")
);

writeIfMissing(
  path.join(root, "01-daily", today, "README.md"),
  [
    `# ${today}`,
    "",
    "- `1-原始错题素材/`：今天的原始截图、OCR、题干、解析。",
    "- `2-整理好的错题/`：今天确认后的错题卡与学习文档。",
    `- \`${today}.md\`：今天的复盘总表。`,
    ""
  ].join("\n")
);

writeIfMissing(
  path.join(root, "01-daily", today, "1-原始错题素材", "README.md"),
  [
    "# 1 原始错题素材",
    "",
    "放今天未处理或未完全确认的原始材料：截图、OCR、题库复制文本、手写备注。",
    "",
    "- 文件命名建议：`科目-来源-序号.md` 或 `科目-来源-序号.png`。",
    "- 不在这里做最终统计；确认后再进入 `2-整理好的错题/` 和 `00-index/mistake-index.json`。",
    ""
  ].join("\n")
);

writeIfMissing(
  path.join(root, "01-daily", today, "2-整理好的错题", "README.md"),
  [
    "# 2 整理好的错题",
    "",
    "放今天已经整理成结构化错题卡的内容。",
    "",
    "- 每道题保留稳定 `mistake_id`。",
    "- 同步更新 `00-index/mistake-index.json`。",
    "- 同步写入对应科目的 `04-mistakes/by-subject/<科目>/错误知识点汇集.md`。",
    ""
  ].join("\n")
);

writeIfMissing(
  path.join(root, "01-daily", today, `${today}.md`),
  [
    `# ${today} 错题复盘`,
    "",
    "## 今日入口",
    "",
    "- 原始错题素材：[[1-原始错题素材/README]]",
    "- 整理好的错题：[[2-整理好的错题/README]]",
    "",
    "## 今日错题",
    "",
    "| mistake_id | 科目 | 单元/专题 | 错因 | counted | 七日复测 |",
    "| --- | --- | --- | --- | --- | --- |",
    "",
    "## 错因小结",
    "",
    "- 主错因：",
    "- 次错因：",
    "- 未纳入统计的题：",
    "",
    "## 科目错误知识点",
    "",
    "- 按实际使用的科目创建 `04-mistakes/by-subject/<科目>/` 页面。",
    "",
    "## 七天后复测",
    "",
    "| mistake_id | 知识点 | retest_due | 状态 |",
    "| --- | --- | --- | --- |",
    ""
  ].join("\n")
);

ensureSubjectScaffold(process.env.SUBJECT);

console.log(path.resolve(root));
