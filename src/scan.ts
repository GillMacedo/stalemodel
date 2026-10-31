import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import type { Catalog } from "./catalog.ts";
import { checkModel } from "./check.ts";
import type { CheckResult } from "./check.ts";

export interface Finding extends CheckResult {
  file: string;
  line: number;
}

export interface ScanResult {
  filesScanned: number;
  truncated: boolean;
  findings: Finding[];
}

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "vendor", "target", ".venv", "venv", "__pycache__", ".next", "coverage"]);
const EXTENSIONS = new Set([
  ".py", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".mts", ".cts", ".tsx", ".go", ".rb", ".rs", ".java", ".kt", ".cs", ".php",
  ".swift", ".sh", ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env", ".md", ".mdx", ".ipynb",
]);
const MAX_FILE_BYTES = 1_000_000;
const MAX_FILES = 20_000;

// Only quoted strings count, which keeps prose and identifiers out. The digit
// check below drops names such as "claude-code" and "gemini-cli".
const MODEL_STRING = /["'`](?:(?:anthropic|openai|google|xai|deepseek|mistral)\/)?((?:claude|gpt|chatgpt|gemini|grok|deepseek|mistral|codestral)-[A-Za-z0-9.:_-]+|o[134](?:-[A-Za-z0-9.:_-]+)?)["'`]/g;

export function modelStrings(line: string): string[] {
  return [...new Set([...line.matchAll(MODEL_STRING)].map((match) => match[1]))];
}

export function scanText(catalog: Catalog, text: string, file: string): Finding[] {
  const findings: Finding[] = [];
  text.split("\n").forEach((line, index) => {
    for (const id of modelStrings(line)) {
      const result = checkModel(catalog, id);
      const reportable = result.status === "deprecated" || (result.status === "unknown" && /\d/.test(id));
      if (reportable) findings.push({ ...result, file, line: index + 1 });
    }
  });
  return findings;
}

export function scanPath(catalog: Catalog, root: string): ScanResult {
  const result: ScanResult = { filesScanned: 0, truncated: false, findings: [] };
  const rootStat = lstatSync(root);

  const visitFile = (path: string, size: number) => {
    if (size > MAX_FILE_BYTES) return;
    result.filesScanned++;
    const file = relative(process.cwd(), path) || path;
    result.findings.push(...scanText(catalog, readFileSync(path, "utf8"), file));
  };

  if (rootStat.isFile()) {
    visitFile(root, rootStat.size);
    return result;
  }

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (result.filesScanned >= MAX_FILES) {
        result.truncated = true;
        return;
      }
      const path = join(dir, entry.name);
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
        walk(path);
      } else if (entry.isFile() && (EXTENSIONS.has(extname(entry.name)) || entry.name.startsWith(".env"))) {
        visitFile(path, lstatSync(path).size);
      }
    }
  };
  walk(root);
  return result;
}
