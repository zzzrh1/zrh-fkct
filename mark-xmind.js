#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * 修改 xmind 文件，给指定的知识点节点标红/标黄
 *
 * 用法：
 * node mark-xmind.js <xmind文件路径> <标注JSON文件路径> [输出XMind路径]
 *
 * 标注JSON格式：
 * {
 *   "marks": [
 *     {"text": "参与主体：纠纷双方当事人 + 仲裁委员会", "state": "red"},
 *     {"text": "人民调解委员会", "state": "yellow"}
 *   ]
 * }
 */

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function compact(text) {
  return String(text || "")
    .replace(/[，。、""''：:；;（）()【】\[\]《》<>！!？?,.、\s]/g, "")
    .replace(/[的之]/g, "")
    .trim();
}

function stripNumberPrefix(text) {
  return String(text || "")
    .replace(/^[一二三四五六七八九十]+[、.．]\s*/, "")
    .replace(/^\d+[、.．)\]]\s*/, "")
    .trim();
}

function matchNode(nodeTitle, searchText) {
  const nodeCompact = compact(nodeTitle);
  const searchCompact = compact(searchText);

  // 中文术语 compact 后常为 2-3 字（如「诉分类」「确认诉」），门槛过低会误伤
  if (!nodeCompact || !searchCompact || searchCompact.length < 2) return false;

  // 节点标题先剥离「一、」「1.」等序号前缀再比较
  const nodeNoPrefix = compact(stripNumberPrefix(nodeTitle));
  const searchNoPrefix = compact(stripNumberPrefix(searchText));

  // 完全包含（优先用剥离前缀后的形式，兼顾原始形式）
  const candidates = [nodeCompact, nodeNoPrefix].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes(searchCompact)) return true;
    if (candidate.includes(searchNoPrefix) && searchNoPrefix.length >= 2) return true;
  }
  if (searchCompact.includes(nodeNoPrefix) && nodeNoPrefix.length >= 6) return true;

  return false;
}

function markNodes(node, marks) {
  let changed = false;

  // 检查当前节点是否匹配任何标注
  for (const mark of marks) {
    if (matchNode(node.title, mark.text)) {
      // 添加或修改style
      if (!node.style) {
        node.style = {
          id: `style-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          properties: {}
        };
      }
      if (!node.style.properties) {
        node.style.properties = {};
      }

      // 设置颜色
      if (mark.state === "red") {
        node.style.properties["svg:fill"] = "#FFE5D9"; // 浅红背景
        node.style.properties["fo:color"] = "#D32F2F"; // 深红文字
        node.style.properties["border-line-color"] = "#D32F2F"; // 红边框
      } else if (mark.state === "yellow") {
        node.style.properties["svg:fill"] = "#FFF9E6"; // 浅黄背景
        node.style.properties["fo:color"] = "#F57C00"; // 橙色文字
        node.style.properties["border-line-color"] = "#F57C00"; // 橙色边框
      }

      changed = true;
      console.log(`✓ 标记节点 [${mark.state}]: ${node.title.substring(0, 40)}`);
    }
  }

  // 递归处理子节点
  const children = node.children?.attached || [];
  for (const child of children) {
    if (markNodes(child, marks)) {
      changed = true;
    }
  }

  return changed;
}

function markXmindFile(xmindFile, marks, outputFileArgument) {
  if (!xmindFile) throw new Error("缺少 xmind 文件路径");
  if (!fs.existsSync(xmindFile)) throw new Error(`xmind文件不存在: ${xmindFile}`);
  if (path.extname(xmindFile).toLowerCase() !== ".xmind") {
    throw new Error("思维导图输入必须是 .xmind 格式");
  }
  if (!marks || !marks.length) throw new Error("标注中没有 marks 数组");

  const tmpDir = `/tmp/xmind-${process.pid}-${Date.now()}`;
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    execSync(`unzip -q "${xmindFile}" -d "${tmpDir}"`);

    const contentFile = path.join(tmpDir, "content.json");
    const content = readJson(contentFile);

    let totalChanged = 0;
    for (const sheet of content) {
      if (markNodes(sheet.rootTopic, marks)) totalChanged++;
    }

    fs.writeFileSync(contentFile, JSON.stringify(content));

    const dir = path.dirname(xmindFile);
    const basename = path.basename(xmindFile, ".xmind");
    const outputFile = outputFileArgument
      ? path.resolve(outputFileArgument)
      : path.join(dir, `${basename}-标注版.xmind`);
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

    execSync(`zip -X -0 "${outputFile}" metadata.json`, { cwd: tmpDir });
    execSync(`zip -X -0 "${outputFile}" content.xml`, { cwd: tmpDir });
    execSync(`zip -X -0 "${outputFile}" resources/`, { cwd: tmpDir });
    execSync(`zip -rX -0 "${outputFile}" resources/`, { cwd: tmpDir });
    execSync(`zip -X -0 "${outputFile}" content.json`, { cwd: tmpDir });
    execSync(`zip -X -0 "${outputFile}" manifest.json`, { cwd: tmpDir });

    return { outputFile, changed: totalChanged > 0 };
  } finally {
    execSync(`rm -rf "${tmpDir}"`);
  }
}

function main() {
  const xmindFile = process.argv[2];
  const marksFile = process.argv[3];
  const outputFileArgument = process.argv[4];

  if (!xmindFile || !marksFile) {
    console.error("用法: mark-xmind.js <xmind文件> <标注JSON> [输出XMind路径]");
    process.exit(1);
  }

  try {
    const marks = readJson(marksFile).marks || [];
    const result = markXmindFile(xmindFile, marks, outputFileArgument);
    console.log(`✓ 完成！输出文件: ${result.outputFile}`);
  } catch (error) {
    console.error("\n错误:", error.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { markXmindFile, markNodes, matchNode };
