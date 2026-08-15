#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const METHODS = ["on_ingest", "launchd", "manual"];
const LAUNCHD_LABEL = "com.wrong-question-review.weekly";

function usage() {
  console.error("Usage: configure-automation.js <review-vault-dir> <on_ingest|launchd|manual> [technical-workspace] [--install]");
  process.exit(2);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function configFile(root) {
  return path.join(root, "00-index", "skill-config.json");
}

function readConfig(root) {
  return readJson(configFile(root), {});
}

function shouldRefreshOnIngest(root) {
  const config = readConfig(root);
  const method = config.weekly_review?.method;
  if (method) return method === "on_ingest";
  return process.platform !== "darwin";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function launchdPlist(root, technicalWorkspace) {
  const outputRoot = path.resolve(technicalWorkspace || path.join(root, "00-index"));
  const logFile = path.join(outputRoot, "weekly-review-launchd.log");
  const script = path.join(__dirname, "generate-weekly-review.js");
  const argumentsXml = [process.execPath, script, path.resolve(root)]
    .map((value) => `      <string>${escapeXml(value)}</string>`)
    .join("\n");
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">",
    "<plist version=\"1.0\">",
    "<dict>",
    "  <key>Label</key>",
    `  <string>${LAUNCHD_LABEL}</string>`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    argumentsXml,
    "  </array>",
    "  <key>StartCalendarInterval</key>",
    "  <dict>",
    "    <key>Weekday</key>",
    "    <integer>1</integer>",
    "    <key>Hour</key>",
    "    <integer>9</integer>",
    "    <key>Minute</key>",
    "    <integer>0</integer>",
    "  </dict>",
    "  <key>StandardOutPath</key>",
    `  <string>${escapeXml(logFile)}</string>`,
    "  <key>StandardErrorPath</key>",
    `  <string>${escapeXml(logFile)}</string>`,
    "</dict>",
    "</plist>",
    ""
  ].join("\n");
}

function installLaunchd(plistFile) {
  const uid = typeof process.getuid === "function" ? process.getuid() : "";
  if (!uid) throw new Error("当前环境没有可用的 macOS 用户会话，先生成 plist 后手动加载。");
  const target = `gui/${uid}/${LAUNCHD_LABEL}`;
  try {
    execFileSync("launchctl", ["bootout", target], { stdio: "ignore" });
  } catch (error) {
    void error;
  }
  execFileSync("launchctl", ["bootstrap", `gui/${uid}`, plistFile], { stdio: "inherit" });
}

function main() {
  const root = process.argv[2];
  const method = process.argv[3];
  const install = process.argv.includes("--install");
  const positional = process.argv.slice(4).filter((value) => value !== "--install");
  const technicalWorkspace = positional[0] || "";
  if (!root || !METHODS.includes(method)) usage();
  if (method === "launchd" && process.platform !== "darwin") {
    throw new Error("launchd 配置仅适用于 macOS；当前系统请选择 on_ingest 或 manual。");
  }

  const resolvedRoot = path.resolve(root);
  const current = readConfig(resolvedRoot);
  const config = {
    ...current,
    schema: "wrong-question.skill-config.v1",
    version: 1,
    review_vault: resolvedRoot,
    subject_mode: current.subject_mode || "on_demand",
    bundled_subjects: current.bundled_subjects || ["民诉"],
    weekly_review: {
      ...(current.weekly_review || {}),
      method,
      configured: true,
      configured_at: new Date().toISOString()
    }
  };
  fs.mkdirSync(path.dirname(configFile(resolvedRoot)), { recursive: true });
  fs.writeFileSync(configFile(resolvedRoot), `${JSON.stringify(config, null, 2)}\n`);

  const result = { config: configFile(resolvedRoot), method };
  if (method === "launchd") {
    const outputRoot = path.resolve(technicalWorkspace || path.join(resolvedRoot, "00-index"));
    fs.mkdirSync(outputRoot, { recursive: true });
    const generatedPlist = path.join(outputRoot, `${LAUNCHD_LABEL}.plist`);
    fs.writeFileSync(generatedPlist, launchdPlist(resolvedRoot, outputRoot));
    result.plist = generatedPlist;
    if (install) {
      const launchAgentDir = path.join(os.homedir(), "Library", "LaunchAgents");
      const installedPlist = path.join(launchAgentDir, `${LAUNCHD_LABEL}.plist`);
      fs.mkdirSync(launchAgentDir, { recursive: true });
      fs.copyFileSync(generatedPlist, installedPlist);
      installLaunchd(installedPlist);
      result.installed = installedPlist;
    }
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main();

module.exports = { readConfig, shouldRefreshOnIngest };
