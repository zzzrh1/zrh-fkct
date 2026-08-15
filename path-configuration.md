# Path Configuration

This package does not assume a particular operating system, username, desktop folder, Obsidian vault, or project directory. Resolve paths for each user and each run.

## Logical Path Roles

| Role | Required | Purpose |
| --- | --- | --- |
| `REVIEW_VAULT` | For durable review writes | Root folder containing `00-index`, `01-daily`, `03-maps`, `04-mistakes`, and `05-learning-docs`. |
| `TECHNICAL_WORKSPACE` | For conversion or reports | Temporary and technical artifacts that should not clutter the learner-facing vault. |
| `SOURCE_MATERIALS` | When source files are used | User-provided wrong-question images, OCR text, PDFs, or question-bank exports. |
| `SOURCE_XMIND` | When marking a mind map | User-provided XMind mind map; the file must use the `.xmind` extension and format. |
| `GRAPH_FILE` | Optional | User-supplied graph JSON. Use the bundled graph only when it is the relevant fallback. |
| `SKILL_CONFIG` | After vault initialization | `REVIEW_VAULT/00-index/skill-config.json`, containing user-confirmed subject and weekly-review settings. |
| `QUESTION_BANK` | Optional | Trusted question metadata. Do not claim exact matching without it. |
| `BACKUP_DIR` | Before durable changes | User-selected location for backups of the target vault or files. |
| `TARGET_VAULT` | When moving Obsidian files | The exact vault or subfolder selected by the user for clean reading files. |

## Resolution Order

Resolve each role in this order:

1. An explicit path in the user's request.
2. A path supplied by the host integration or local configuration.
3. A path already established in the current conversation for the same user and task.
4. A temporary workspace for preview-only operations.
5. Ask for the missing durable path before writing persistent files.

Never copy a path from a sample, previous user's run, generated metadata, or an unrelated conversation.

## Script Contract

The scripts accept paths as arguments. Keep the path values outside the skill package:

```sh
REVIEW_VAULT="<REVIEW_VAULT>"
TECHNICAL_WORKSPACE="<TECHNICAL_WORKSPACE>"
SOURCE_MATERIALS="<SOURCE_MATERIALS>"
SOURCE_XMIND="<SOURCE_XMIND>"
GRAPH_FILE="<GRAPH_FILE>"
BACKUP_DIR="<BACKUP_DIR>"
```

Typical commands:

```sh
node scripts/init-review-vault.js "$REVIEW_VAULT"
node scripts/configure-automation.js "$REVIEW_VAULT" on_ingest
node scripts/prepare-confirmation.js "$TECHNICAL_WORKSPACE/recognized-mistakes.json" "$TECHNICAL_WORKSPACE/confirmation.md"
node scripts/ingest-mistakes.js "$REVIEW_VAULT" "$TECHNICAL_WORKSPACE/confirmed-mistakes.json"
node scripts/generate-weekly-review.js "$REVIEW_VAULT"
node scripts/mark-graph.js "$GRAPH_FILE" "<KNOWLEDGE_POINT>"
node scripts/render-graph-view.js "$GRAPH_FILE" "$TECHNICAL_WORKSPACE/graph-view.html" "<KNOWLEDGE_POINT>"
node scripts/metrics-dashboard.js "$REVIEW_VAULT" "$TECHNICAL_WORKSPACE/metrics-dashboard.md"
```

If `GRAPH_FILE` is omitted, the graph scripts may use the bundled reference graph. That fallback is package-relative and contains no user filesystem path. For a different subject, pass the user's graph explicitly.

## XMind Input Rules

- A user-uploaded mind map must be an XMind `.xmind` file before the marking workflow can run.
- Do not pass OPML, PDF, or image files to `scripts/mark-xmind.js` as if they were XMind files.
- The bundled mind-map example currently covers 民诉 only; additional subjects will be added in later updates.

## Obsidian Initialization

- `scripts/init-review-vault.js` creates only the core folders and seed indexes by default.
- Create `03-maps/<科目>/00-source`, `01-base`, `02-marked`, and the subject mistake page when that subject is first used.
- `00-index/skill-config.json` records `subject_mode: "on_demand"` and the selected weekly-review method.
- Initialization uses a write-if-missing rule; it does not overwrite existing Vault files.

## Weekly Review Automation

- `on_ingest`: `ingest-mistakes.js` and `update-retest.js` refresh the current and previous ISO week files after durable changes. This is the portable default.
- `launchd`: macOS-only optional scheduling. Generate a plist with `scripts/configure-automation.js`; install it only after the user explicitly selects the method and installation.
- `manual`: no automatic refresh; run `scripts/generate-weekly-review.js` when the user requests a weekly review.
- The generated section is delimited by `AUTO-GENERATED` markers so manual notes outside that section remain intact.

## PDF And Obsidian Rules

- Treat a supplied PDF as `SOURCE_PDF`, never as a fixed example path.
- Treat the selected Obsidian destination as `TARGET_VAULT`, never as a fixed vault path.
- Put technical conversion output under `TECHNICAL_WORKSPACE`; put clean reading files under `TARGET_VAULT` only after the user selects that destination.
- Use `BACKUP_DIR` for backups. Do not write backups into the skill package unless the user explicitly selects it.
- Preserve user-provided source paths only as input metadata when needed; do not turn them into defaults or documentation examples.

## Configuration Example

An integration may provide equivalent values in a local configuration file. The values below are placeholders and must be replaced at runtime:

```yaml
paths:
  review_vault: <REVIEW_VAULT>
  technical_workspace: <TECHNICAL_WORKSPACE>
  source_materials: <SOURCE_MATERIALS>
  graph_file: <GRAPH_FILE>
  question_bank: <QUESTION_BANK>
  backup_dir: <BACKUP_DIR>
  target_vault: <TARGET_VAULT>
```
