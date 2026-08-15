#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const MARK_DIR = path.join("04-mistakes", "marked-graphs");

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function normalizeInput(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.mistakes)) return raw.mistakes;
  if (Array.isArray(raw.mistake_cards)) return raw.mistake_cards;
  throw new Error("Input must be an array, or an object with mistakes/mistake_cards.");
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/\^[\w.-]+$/g, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/^#+\s+/, "")
    .replace(/^\s*[-*+]\s*/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function conceptLabel(text) {
  return stripMarkdown(text)
    .replace(/^[一二三四五六七八九十]+[、.．]\s*/, "")
    .replace(/^\d+[.)、.．]\s*/, "")
    .replace(/^(定义|规则|核心规则|核心原则|核心逻辑|处理|效果|条件|情形|例外|注意|易错点|易错判断|辅助理解)[：:]\s*/, "")
    .trim();
}

function compact(text) {
  return stripMarkdown(text)
    .replace(/[，。、“”‘’：:；;（）()【】\[\]《》<>！!？?,.、\s]/g, "")
    .replace(/[的之]/g, "")
    .trim();
}

function compactConcept(text) {
  return compact(conceptLabel(text));
}

function termVariants(term) {
  const base = compact(term);
  if (!base) return [];
  const chunks = stripMarkdown(term)
    .split(/[，。、“”‘’：:；;（）()【】\[\]《》<>！!？?,.、\s]|的|之|后|前|与|和|及/)
    .map(compact)
    .filter((item) => item.length >= 4);
  return Array.from(new Set([base].concat(chunks)));
}

function listItems(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[\n,，、;；]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function unique(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function cardSearchTexts(card, fineTerm) {
  return unique([]
    .concat(fineTerm || [])
    .concat(card.stem || [])
    .concat(card.explanation_summary || [])
    .concat(card.explanation_items || [])
    .concat(card.evidence || [])
    .concat(card.unit || [])
    .filter(Boolean));
}

function selectedTerms(card) {
  return unique(listItems(card.selected_knowledge_points));
}

function upperConceptTerms(card, fineTerms = selectedTerms(card)) {
  const fineSet = new Set(fineTerms.map(compact));
  return unique([]
    .concat(card.upper_concept_points || [])
    .concat(card.parent_points || [])
    .concat(card.surface_points || [])
    .concat(card.root_cause_points || [])
    .concat(card.knowledge_points || [])
    .concat(card.unit ? [card.unit] : [])
    .filter(Boolean)
    .filter((term) => {
      const value = compact(term);
      return value && !fineSet.has(value);
    }));
}

function allTerms(card) {
  const selected = selectedTerms(card);
  const upper = upperConceptTerms(card, selected);
  const red = []
    .concat(selected)
    .concat(upper)
    .filter(Boolean);
  const yellow = (card.confusable_points || []).filter(Boolean);
  return { red: unique(red), yellow: unique(yellow), selected, upper };
}

function textData(markdown) {
  const index = markdown.indexOf("# textdata");
  if (index < 0) return "";
  return markdown.slice(index + "# textdata".length);
}

function smmNodes(markdown) {
  return textData(markdown)
    .split(/\r?\n/)
    .map((line, index) => {
      const uidMatch = line.match(/\^([\w.-]+)\s*$/);
      const text = stripMarkdown(line);
      return {
        line: index + 1,
        uid: uidMatch ? uidMatch[1] : "",
        text
      };
    })
    .filter((node) => node.text);
}

function walkFiles(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(file, output);
    else if (entry.isFile() && /\.(smm\.md|md)$/i.test(entry.name)) output.push(file);
  }
  return output;
}

function nodeGroups(root, files) {
  return files.map((file) => ({
    file,
    rel: path.relative(root, file),
    nodes: smmNodes(fs.readFileSync(file, "utf8"))
  }));
}

function matchNode(node, terms) {
  const nodeCompact = compact(node.text);
  if (!nodeCompact) return [];
  const matched = [];
  for (const term of terms) {
    const variants = termVariants(term);
    if (variants.some((variant) => {
      if (variant.length < 4) return false;
      if (nodeCompact.includes(variant)) return true;
      return variant.includes(nodeCompact) && nodeCompact.length >= 6;
    })) {
      matched.push(term);
    }
  }
  return matched;
}

function ngrams(text, size) {
  const value = compact(text);
  if (value.length < size) return [];
  const output = [];
  for (let index = 0; index <= value.length - size; index += 1) {
    output.push(value.slice(index, index + size));
  }
  return output;
}

function overlapScore(sourceText, nodeText) {
  const source = compact(sourceText);
  const node = compactConcept(nodeText);
  if (node.length < 4 || !source) return 0;
  if (source.includes(node)) return 1000 + Math.min(node.length, 30);
  if (node.includes(source) && source.length >= 6) return 900 + Math.min(source.length, 30);

  const sourceTokens = new Set([].concat(ngrams(source, 2)).concat(ngrams(source, 3)));
  const nodeTokens = unique([].concat(ngrams(node, 2)).concat(ngrams(node, 3)));
  if (!sourceTokens.size || !nodeTokens.length) return 0;
  const hits = nodeTokens.filter((token) => sourceTokens.has(token));
  const coverage = hits.length / nodeTokens.length;
  const density = hits.join("").length / Math.max(node.length, 1);
  return coverage >= 0.45 ? (coverage * 100) + (density * 20) : 0;
}

function inferUpperConceptMatches(groups, card, fineTerm) {
  const searchTexts = cardSearchTexts(card, fineTerm);
  const candidates = [];

  for (const group of groups) {
    for (const node of group.nodes) {
      const label = conceptLabel(node.text);
      const labelCompact = compact(label);
      if (labelCompact.length < 4 || labelCompact.length > 32) continue;

      const score = Math.max(...searchTexts.map((text) => overlapScore(text, label)));
      if (score < 80) continue;
      candidates.push({
        score,
        text: node.text,
        uid: node.uid,
        source_map: group.rel,
        source_line: node.line
      });
    }
  }

  const ordered = uniqueBy(candidates
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return compactConcept(left.text).length - compactConcept(right.text).length;
    }), (item) => [item.text, item.uid, item.source_map].join("|"));
  const bestScore = ordered.length ? ordered[0].score : 0;
  return ordered
    .filter((item) => item.score >= bestScore - 2)
    .slice(0, 2);
}

function scanSubjectMaps(root, subject, cards) {
  const mapDir = path.join(root, "03-maps", subject);
  const files = walkFiles(mapDir);
  const groups = nodeGroups(root, files);
  const marks = [];
  const unmatched = [];
  const fallback = [];

  for (const card of cards) {
    const { red, yellow, selected, upper } = allTerms(card);
    const seenTerms = new Set();

    for (const group of groups) {
      for (const node of group.nodes) {
        const redTerms = matchNode(node, red);
        const yellowTerms = matchNode(node, yellow).filter((term) => !redTerms.includes(term));
        const matchedTerms = redTerms.length ? redTerms : yellowTerms;
        if (!matchedTerms.length) continue;
        matchedTerms.forEach((term) => seenTerms.add(term));
        marks.push({
          mistake_id: card.id || "",
          subject,
          state: redTerms.length ? "red" : "yellow",
          match_type: redTerms.length ? "direct_or_upper_concept" : "confusable_or_adjacent",
          text: node.text,
          uid: node.uid,
          source_map: group.rel,
          source_line: node.line,
          matched_terms: matchedTerms
        });
      }
    }

    selected.forEach((term) => {
      if (seenTerms.has(term)) return;
      const fallbackTerms = upper.filter((candidate) => seenTerms.has(candidate));
      if (fallbackTerms.length) {
        fallback.push({
          mistake_id: card.id || "",
          subject,
          term,
          fallback_terms: fallbackTerms,
          reason: "marked_upper_concept_instead"
        });
      } else {
        const inferred = inferUpperConceptMatches(groups, card, term);
        if (inferred.length) {
          inferred.forEach((node) => {
            marks.push({
              mistake_id: card.id || "",
              subject,
              state: "red",
              match_type: "inferred_upper_concept",
              text: node.text,
              uid: node.uid,
              source_map: node.source_map,
              source_line: node.source_line,
              matched_terms: [term]
            });
          });
          fallback.push({
            mistake_id: card.id || "",
            subject,
            term,
            fallback_terms: inferred.map((node) => node.text),
            reason: "auto_inferred_upper_concept_in_map"
          });
        } else {
          unmatched.push({
            mistake_id: card.id || "",
            subject,
            term,
            reason: "no_matching_smm_text_node"
          });
        }
      }
    });
  }

  return { marks, unmatched, fallback };
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function stateText(state) {
  if (state === "red") return '<span style="color:#d93025;font-weight:700">红</span>';
  if (state === "yellow") return '<span style="color:#b7791f;font-weight:700">黄</span>';
  return state || "";
}

function markdownFor(subject, data) {
  const rows = (data.marks || []).map((mark) => [
    stateText(mark.state),
    mark.text,
    (mark.matched_terms || []).join("、"),
    mark.mistake_id,
    `${mark.source_map}${mark.uid ? `#^${mark.uid}` : ""}`
  ]);
  const fallbackRows = (data.fallback_terms || []).map((item) => [
    item.mistake_id,
    item.term,
    (item.fallback_terms || []).join("、"),
    item.reason
  ]);
  const unmatchedRows = (data.unmatched_terms || []).map((item) => `- ${item.mistake_id}：${item.term}（${item.reason}）`);
  return [
    `# ${subject}错题知识图谱标记`,
    "",
    "## 标红/标黄节点",
    "",
    "| 状态 | 图谱节点 | 命中知识点 | mistake_id | 来源 |",
    "| --- | --- | --- | --- | --- |",
    rows.length ? rows.map((row) => `| ${row.join(" | ")} |`).join("\n") : "|  |  |  |  |  |",
    "",
    "## 以上位概念兜底的细碎知识点",
    "",
    "| mistake_id | 用户知识点 | 已标红的上位概念 | 原因 |",
    "| --- | --- | --- | --- |",
    fallbackRows.length ? fallbackRows.map((row) => `| ${row.join(" | ")} |`).join("\n") : "|  |  |  |  |",
    "",
    "## 未命中原图谱的用户知识点",
    "",
    unmatchedRows.length ? unmatchedRows.join("\n") : "- ",
    ""
  ].join("\n");
}

function updateMarkedMaps(root, cards, dateText) {
  const bySubject = new Map();
  for (const card of cards) {
    const subject = card.subject || "未分类";
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject).push(card);
  }

  const outputs = [];
  for (const [subject, subjectCards] of bySubject.entries()) {
    const current = scanSubjectMaps(root, subject, subjectCards);
    const incomingIds = new Set(subjectCards.map((card) => card.id).filter(Boolean));
    const keepPrevious = (item) => !incomingIds.size || !incomingIds.has(item.mistake_id);
    const jsonFile = path.join(root, MARK_DIR, `${subject}-知识图谱标记.json`);
    const mdFile = path.join(root, MARK_DIR, `${subject}-知识图谱标记.md`);
    const previous = readJson(jsonFile, {
      schema: "wrong-question.marked-smm-map.v1",
      updated_at: dateText,
      subject,
      marks: [],
      fallback_terms: [],
      unmatched_terms: []
    });
    const merged = {
      ...previous,
      updated_at: dateText,
      subject,
      marks: uniqueBy([].concat((previous.marks || []).filter(keepPrevious)).concat(current.marks), (item) => [
        item.mistake_id,
        item.state,
        item.source_map,
        item.uid,
        item.text,
        (item.matched_terms || []).join("/")
      ].join("|")),
      fallback_terms: uniqueBy([].concat((previous.fallback_terms || []).filter(keepPrevious)).concat(current.fallback), (item) => [
        item.mistake_id,
        item.subject,
        item.term,
        (item.fallback_terms || []).join("/")
      ].join("|")),
      unmatched_terms: uniqueBy([].concat((previous.unmatched_terms || []).filter(keepPrevious)).concat(current.unmatched), (item) => [
        item.mistake_id,
        item.subject,
        item.term
      ].join("|"))
    };
    writeJson(jsonFile, merged);
    fs.mkdirSync(path.dirname(mdFile), { recursive: true });
    fs.writeFileSync(mdFile, markdownFor(subject, merged));
    outputs.push(path.relative(root, mdFile));
  }
  return outputs;
}

function main() {
  const root = process.argv[2];
  const inputFile = process.argv[3];
  const dateText = process.argv[4] || new Date().toISOString().slice(0, 10);
  if (!root || !inputFile) {
    console.error("Usage: mark-smm-text-map.js <review-vault-dir> <mistakes.json> [YYYY-MM-DD]");
    process.exit(2);
  }
  const cards = normalizeInput(readJson(inputFile));
  console.log(JSON.stringify({ marked_graphs: updateMarkedMaps(root, cards, dateText) }, null, 2));
}

if (require.main === module) main();

module.exports = { updateMarkedMaps, scanSubjectMaps, smmNodes, matchNode, upperConceptTerms };
