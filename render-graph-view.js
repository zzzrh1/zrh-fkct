#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { markGraph } = require("./mark-graph");

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function childMap(nodes) {
  const map = new Map();
  nodes.forEach((node) => map.set(node.id, []));
  nodes.forEach((node) => {
    (node.parents || []).forEach((parentId) => {
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId).push(node);
    });
  });
  return map;
}

function renderNode(node, children, stateById) {
  const mark = stateById.get(node.id);
  const state = mark ? mark.state : "normal";
  const reason = mark ? mark.reason : "normal";
  const kids = (children.get(node.id) || []).map((child) => renderNode(child, children, stateById)).join("");
  return `
    <li class="node ${esc(state)}">
      <div class="node-row">
        <span class="dot"></span>
        <span class="name">${esc(node.name)}</span>
        <span class="reason">${esc(reason)}</span>
      </div>
      ${kids ? `<ul>${kids}</ul>` : ""}
    </li>`;
}

function renderHtml(graph, marked, terms) {
  const nodes = graph.nodes || [];
  const stateById = new Map(marked.map((item) => [item.id, item]));
  const children = childMap(nodes);
  const roots = nodes.filter((node) => !(node.parents || []).length);
  const counts = marked.reduce((acc, item) => {
    acc[item.state] = (acc[item.state] || 0) + 1;
    return acc;
  }, {});
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(graph.metadata && graph.metadata.name || "知识图谱标红")}</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f6f5f1; color: #24231f; }
    main { max-width: 1080px; margin: 0 auto; padding: 28px 18px 56px; }
    h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.2; letter-spacing: 0; }
    .sub { margin: 0 0 18px; color: #6b675f; font-size: 14px; }
    .summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0 22px; }
    .chip { border: 1px solid #d8d1c4; background: #fffdf8; border-radius: 6px; padding: 8px 10px; font-size: 14px; }
    .chip.red { border-color: #e58d8d; color: #aa2424; background: #fff1f1; }
    .chip.yellow { border-color: #e2c35a; color: #7a5a00; background: #fff8d9; }
    .panel { background: #fffdf8; border: 1px solid #e2ddd4; border-radius: 8px; padding: 16px; }
    ul { list-style: none; margin: 0; padding-left: 22px; border-left: 1px solid #e7e1d8; }
    .tree > ul { padding-left: 0; border-left: 0; }
    .node { margin: 7px 0; }
    .node-row { display: inline-flex; align-items: center; gap: 8px; min-height: 30px; padding: 4px 9px; border-radius: 6px; border: 1px solid transparent; background: #faf8f2; }
    .dot { width: 10px; height: 10px; border-radius: 999px; background: #c7c0b5; flex: 0 0 auto; }
    .name { font-weight: 600; }
    .reason { color: #817b70; font-size: 12px; }
    .node.red > .node-row { background: #ffecec; border-color: #ed9b9b; color: #9b1c1c; }
    .node.red > .node-row .dot { background: #d93030; }
    .node.yellow > .node-row { background: #fff6cf; border-color: #e5c84f; color: #6f5200; }
    .node.yellow > .node-row .dot { background: #d6a900; }
    .node.normal > .node-row { color: #3d3a34; }
    .legend { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px; color: #6b675f; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <h1>${esc(graph.metadata && graph.metadata.name || "知识图谱标红")}</h1>
    <p class="sub">输入知识点：${esc(terms.join("、")) || "未指定"}。红色是直接薄弱点和上一层上位概念，不自动染红根节点；黄色是相邻/易混点。</p>
    <section class="summary">
      <div class="chip red">红色 ${counts.red || 0}</div>
      <div class="chip yellow">黄色 ${counts.yellow || 0}</div>
      <div class="chip">节点总数 ${nodes.length}</div>
    </section>
    <section class="panel tree">
      <ul>${roots.map((node) => renderNode(node, children, stateById)).join("")}</ul>
    </section>
    <div class="legend">
      <span>direct_match：错题直接命中</span>
      <span>parent_of_wrong_point：上一层上位概念</span>
      <span>confusable_or_adjacent：易混/相邻点</span>
    </div>
  </main>
</body>
</html>`;
}

function main() {
  const graphPath = process.argv[2] || process.env.WRONG_QUESTION_GRAPH || path.join(__dirname, "../references/knowledge-graph-commercial-company-law.json");
  const outPath = process.argv[3] || process.env.WRONG_QUESTION_GRAPH_OUTPUT || path.join(process.cwd(), "graph-view.html");
  const terms = process.argv.slice(4);
  if (!terms.length) {
    console.error("Usage: render-graph-view.js [graph.json] [out.html] <knowledge point...>");
    process.exit(1);
  }
  const graph = readJson(graphPath);
  const marked = markGraph(graph, terms);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderHtml(graph, marked, terms));
  console.log(outPath);
}

if (require.main === module) main();
