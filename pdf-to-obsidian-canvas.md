# PDF To Obsidian Mind Map Workflow

Use this when the user supplies a law-exam mind-map PDF and wants it turned into an Obsidian knowledge graph.

## Path Resolution

All locations in this workflow are runtime values, not fixed filesystem paths. Resolve them using `references/path-configuration.md`.

- `SOURCE_PDF`: the PDF supplied for the current run.
- `TECHNICAL_WORKSPACE`: writable temporary workspace for rendered pages, OCR, graphs, Canvas files, and scripts.
- `TARGET_VAULT`: the exact Obsidian vault or subfolder selected for clean reading files.
- `BACKUP_DIR`: the backup location selected before changing `TARGET_VAULT`.

Never reuse a path from this document, a sample graph, generated metadata, or another user's run. If `TARGET_VAULT` or `BACKUP_DIR` is not known, stop before durable file operations and resolve it from the current user or integration.

## User Preferences Learned

- Default layout: root/topic node near the center, knowledge points expanded on both left and right sides.
- Do not default to an all-right layout. It can be generated only as a comparison or when the user explicitly asks.
- Base Canvas files are normal study maps and must be uncolored. Do not write `color` fields into base `.canvas` files.
- Colors are only for mistake-marked outputs after a wrong question is analyzed.
- When marking a wrong point, mark the direct point and one direct parent layer only. Do not mark subject/page root nodes by default.
- Dense PDF pages should not be collapsed into a few outline cards. Preserve useful second- and third-level exam points.
- Do not flatten a mind map into only one layer of knowledge-point cards. Preserve the source hierarchy as much as possible: topic -> unit -> concept -> rule/condition/exception/effect. Dense pages should normally have at least 4 graph depths when the source image clearly contains those levels.
- Keep Canvas nodes visually compact. Obsidian Canvas does not expose per-node font size in the `.canvas` file, so improve readability by reducing oversized boxes and excess spacing; this lets the user zoom in more while still seeing the map.
- After testing, Simple mind map renders dense law-exam maps better than Obsidian Canvas. For dense pages, generate `.smm.md` as the primary reading map, and keep Canvas as a secondary format for compatibility, marking experiments, and layout debugging.
- Canonical reading layout: one original PDF page becomes one independent Simple Mind Map plugin file (`.smm.md`). Do not combine pages by default.
- Negative constraint from user correction: never merge multiple original pages into one `.smm.md` merely because they are the same subject, adjacent pages, or the user says "same canvas/one page" ambiguously. Treat "each page is independent" as the default.
- If the user explicitly asks to combine pages, confirm the exact desired form before writing files. The known bad outputs are: Obsidian Canvas text-node reproductions that appear as thin gray lines, screenshots/images instead of live plugin maps, `.smm.md` file cards inside Canvas, and one `.smm.md` tree that collapses independent pages into first-level branches when the user asked for independent pages.
- If the user asks for "two separate maps on one page" or "put pages together but keep them independent", create a same-page reading entry (`.md`) that embeds each independent page `.smm.md` in page order. Do not merge the page maps into one shared root, do not replace them with Canvas cards, and do not split the reading entry into separate pages. The embedded maps must visibly show content: populate each `.smm.md` `# svgdata` preview before relying on Markdown embeds, otherwise Obsidian will show blank/empty embeds.
- Obsidian Canvas may be kept only as a secondary technical/debug format. It is not the canonical reading surface for these law-exam maps.

## PDF Page Intake

1. Confirm page count and whether text extraction works.
   - Use `pdfinfo <pdf>`.
   - Use `pdftotext -f <page> -l <page> <pdf> -` when available.
2. If text extraction is empty or poor, render the page to an image:
   - `pdftoppm -f <page> -l <page> -png -r 180 <pdf> <out-prefix>`
3. Inspect the rendered PNG visually.
   - Keep the rendered page as `source-page-XX.png` only in the workspace technical archive for later agent-side review.
   - If a page is dense, extract a structured study map manually from the visible page instead of relying on weak OCR.

## Output Files

Generate a full technical bundle under `<TECHNICAL_WORKSPACE>/output/`, but keep the Obsidian vault clean.

Obsidian reading output:

- `<page-title>.smm.md`: primary Simple Mind Map plugin reading file for one original PDF page.
- `<page-range>.md`: optional same-page reading entry only when the user wants multiple independent maps visible from one page. It must embed the independent `.smm.md` files in page order, must not contain a merged mind-map tree, and must not be released until every embedded `.smm.md` has non-empty `# svgdata` preview content.
- Do not create `<page-range>.smm.md` combined files unless the user explicitly confirms that multiple pages should be merged into one plugin file.

Do not create a same-topic `.md` sidecar for ordinary map pages. It adds clutter. Do not add feedback sections, fold-page notes, source-page review notes, or long explanatory text to ordinary map files. Create `.md` files only for daily reviews, weekly reviews, mistake cards, or AI learning documents.

Workspace technical archive only:

- `<page-title>.canvas`: secondary Canvas for compatibility, marking experiments, and layout debugging.
- `knowledge-graph-<subject>-page<page>.json`: agent-readable graph for matching and marking.
- `source-page-XX.png` / `source-page-XX.pdf`: original rendered page assets for agent-side校对.
- `ocr-raw*.md`, metadata, and generator scripts.

Do not put source page images, raw OCR, Canvas, JSON, metadata, or scripts into Obsidian by default. Add them to Obsidian only when the user explicitly asks for a debug bundle.

For the current run, the target folder is `<TARGET_VAULT>` or a user-selected subfolder beneath it. Resolve the actual location from the current user or integration before writing. Do not ship a default vault path.

## Combined Simple Mind Map Rules

- Default: no combined maps. Keep pages separate.
- If explicitly confirmed, combined maps must remain `.smm.md` files and open with the Simple Mind Map plugin.
- If explicitly confirmed, keep original pages as independent first-level branches, e.g. `第40页：...`, `第41页：...`.
- Preserve page order in the first-level branches.
- Do not use `.canvas` as the main combined result when the user asks for the plugin effect.
- Do not use screenshots/images as the main map.

## Canvas Rules

- Subject-level overview Canvas:
  - Canvas is secondary/debug unless the user explicitly asks for Canvas.
  - One subject can have one Canvas, e.g. `民诉-总览.canvas`, but this is not the primary plugin reading view.
  - Each original PDF page remains one separate group/region on that Canvas.
  - Combine the actual Canvas nodes/edges from each page into the subject Canvas so the maps are directly visible.
  - Stack page groups vertically in page order: page 40 above page 41, page 41 above page 42, etc.
  - When adding a new processed page, append it below the last existing page group in the same subject Canvas.
  - Do not merge page content into one semantic tree by default.
  - Keep per-page `.smm.md` files as secondary reading/source files, but the subject Canvas is the main visible map.
- Canvas nodes should contain enough text to study directly, not just labels.
- Keep node text compact but preserve exam distinctions, exceptions, and triggers.
- Avoid large empty boxes. Use compact node widths/heights and only expand a box when the text would otherwise be clipped.
- Use stable IDs that match the JSON graph IDs.
- Use parent-child edges matching the JSON `parents` relation.
- If several nodes are conditions, exceptions, classifications, effects, or decision rules for one concept, attach them under that concept instead of making them siblings of the concept.
- Omit `color` fields in base Canvas.
- Default layout should be two-sided:
  - root/topic near center
  - roughly half of major branches on the left, half on the right
  - deeper nodes expand outward from their parent
- All-right layout is optional only. Name it with `-右侧版.canvas` so it is not confused with the default.

## Simple Mind Map Rules

- Prefer `.smm.md` for dense exam maps; the tested user preference is that Simple mind map is visibly better than Canvas for reading.
- Store plugin-readable JSON under `# metadata`. Keep `# textdata` minimal for ordinary maps; do not duplicate the whole outline there unless the user explicitly asks.
- The metadata JSON may be plain JSON; the Simple mind map plugin first tries `JSON.parse` before attempting Base64 decompression.
- Preserve stable node `uid` values from the knowledge graph so later wrong-question marking can generate a separate marked map.
- Use `layout: "mindMap"` for a balanced mind-map reading view.
- For user-provided structured Markdown, do not OCR or reinterpret the material. Convert the Markdown hierarchy directly into Simple Mind Map nodes and audit source items against metadata nodes.
- If the user explicitly says they only want hierarchical Markdown in Obsidian, copy or lightly place the source `.md` as a normal Markdown note. Do not create `.smm.md`, Canvas, images, split maps, or plugin artifacts.
- If one structured Markdown file produces a very large map, keep the original single `.smm.md` but also create a non-overwriting split version by top-level natural blocks such as `专题01`, `专题02`, etc. This is a display/readability fix for Obsidian plugin limits, not a content rewrite.
- For split versions, preserve the user's original titles and numbering exactly, including skipped or duplicated numbers. Do not silently renumber source material.
- A split-version index may be created inside the split folder. Keep it short: links and node counts only, no long explanation or study notes.

## JSON Rules

Each node should include:

```json
{
  "id": "civil.general.page2.formation-right",
  "name": "形成权",
  "parents": ["civil.general.page2.civil-rights"],
  "keywords": ["形成权", "单方意思表示", "除斥期间"],
  "status": "normal"
}
```

Do not pre-store red/yellow/green status in the base graph. Use `status: "normal"` unless creating a separate marked result.

## Obsidian Move

After generating the files in a workspace temp folder:

1. Backup the target Obsidian folder first:
   - `zip -r "$BACKUP_DIR"/obsidian-fa-kao-before-<change>-<timestamp>.zip "$TARGET_VAULT"`
2. Copy only the clean reading files into the target folder:
   - Copy `.smm.md` files from `<TECHNICAL_WORKSPACE>/output/` to `$TARGET_VAULT`.
3. Validate the target files:
   - Obsidian folder should not contain `source-page-*`, `ocr-raw*`, `metadata.json`, `knowledge-graph-*.json`, generator scripts, or `.canvas` unless explicitly requested.
   - Parse `.smm.md` metadata and verify `layout: "mindMap"`.
   - Ordinary map folders should not contain same-topic `.md` sidecars.
   - Verify the technical workspace graph has not been accidentally flattened: inspect max parent-chain depth and representative paths.
4. Backup the target Obsidian folder after the write.

## Current Working Example

PDF: `<SOURCE_PDF>`

Page 2 output:

- `民法总则编一-第2页.canvas`
- `民法总则编一-第2页.md`
- `knowledge-graph-civil-general-page2.json`
- `source-page-02.png`

The first thin attempt with only a few cards was not sufficient. The useful version had 33 knowledge nodes and preserved second- and third-level points such as 支配权、请求权、抗辩权、形成权、胎儿利益保护、死亡顺序推定、监护撤销、宣告死亡条件、人未死的后果、财产代管人.
