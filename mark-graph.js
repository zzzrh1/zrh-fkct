#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function indexNodes(nodes) {
  const byId = new Map();
  nodes.forEach((node) => byId.set(node.id, node));
  return byId;
}

function parentIds(id, byId) {
  const node = byId.get(id);
  const parents = node ? node.parents || [] : [];
  return new Set(parents.filter((parentId) => {
    const parent = byId.get(parentId);
    return parent && (parent.parents || []).length;
  }));
}

function matchNodes(nodes, terms) {
  const normalized = terms.map((term) => String(term || "").trim()).filter(Boolean);
  const exact = nodes.filter((node) => {
    const names = [node.name].concat(node.keywords || []);
    return normalized.some((term) => names.includes(term));
  });
  if (exact.length) return exact;
  return nodes.filter((node) => normalized.some((term) => {
    const haystack = [node.name].concat(node.keywords || []).join("\n");
    return haystack.includes(term) || term.includes(node.name);
  }));
}

function markGraph(graph, terms) {
  const nodes = graph.nodes || [];
  const byId = indexNodes(nodes);
  const direct = new Set(matchNodes(nodes, terms).map((node) => node.id));
  const red = new Set(direct);
  direct.forEach((id) => parentIds(id, byId).forEach((parentId) => red.add(parentId)));
  const yellow = new Set();
  red.forEach((id) => {
    const node = byId.get(id);
    (node && node.confusables || []).forEach((relatedId) => {
      if (!red.has(relatedId)) yellow.add(relatedId);
    });
  });
  return nodes
    .filter((node) => red.has(node.id) || yellow.has(node.id))
    .map((node) => ({
      id: node.id,
      name: node.name,
      state: red.has(node.id) ? "red" : "yellow",
      reason: direct.has(node.id)
        ? "direct_match"
        : red.has(node.id)
          ? "parent_of_wrong_point"
          : "confusable_or_adjacent"
    }));
}

function main() {
  const graphPath = process.argv[2] || process.env.WRONG_QUESTION_GRAPH || path.join(__dirname, "../references/knowledge-graph-commercial-company-law.json");
  const terms = process.argv.slice(3);
  if (!terms.length) {
    console.error("Usage: mark-graph.js [graph.json] <knowledge point...>");
    process.exit(1);
  }
  const graph = readJson(graphPath);
  console.log(JSON.stringify(markGraph(graph, terms), null, 2));
}

if (require.main === module) main();

module.exports = { markGraph, matchNodes, parentIds };
