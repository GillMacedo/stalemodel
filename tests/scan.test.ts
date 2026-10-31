import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Catalog } from "../src/catalog.ts";
import { modelStrings, scanPath, scanText } from "../src/scan.ts";

const catalog: Catalog = {
  source: "snapshot",
  fetchedAt: "2026-10-31",
  models: [
    { id: "gpt-old", provider: "openai", name: "old", family: "gpt", release_date: "2023-01-01", status: "deprecated" },
    { id: "gpt-5", provider: "openai", name: "new", family: "gpt", release_date: "2026-01-01" },
    { id: "deepseek-chat", provider: "deepseek", name: "chat", family: "deepseek", release_date: "2026-01-01" },
  ],
};

test("finds quoted IDs only", () => {
  assert.deepEqual(modelStrings(`model = "gpt-5", other='o1', tick=\`gemini-2\``), ["gpt-5", "o1", "gemini-2"]);
  assert.deepEqual(modelStrings("use gpt-5 in prose"), []);
  assert.deepEqual(modelStrings(`"openai/gpt-5"`), ["gpt-5"]);
  assert.deepEqual(modelStrings(`"orange" "o12"`), []);
});

test("reports deprecated and retired IDs with line numbers", () => {
  const findings = scanText(catalog, `a = "gpt-5"\nb = "gpt-old"\n\nc = "gpt-4-32k"\n`, "app.py");
  assert.deepEqual(findings.map((f) => [f.id, f.line, f.status]), [["gpt-old", 2, "deprecated"], ["gpt-4-32k", 4, "unknown"]]);
});

test("ignores tool names without a version", () => {
  assert.deepEqual(scanText(catalog, `"claude-code" "gemini-cli" "gpt-engineer" "deepseek-chat"`, "x"), []);
});

test("walks folders, skips dependencies, and doesn't follow symlinks", () => {
  const root = mkdtempSync(join(tmpdir(), "stalemodel-"));
  mkdirSync(join(root, "node_modules"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "node_modules", "a.js"), `"gpt-old"`);
  writeFileSync(join(root, "src", "a.py"), `"gpt-old"`);
  writeFileSync(join(root, "src", "b.png"), `"gpt-old"`);
  writeFileSync(join(root, ".env.local"), `MODEL="gpt-old"`);
  writeFileSync(join(root, "large.py"), `"gpt-old"` + " ".repeat(1_000_001));
  const outside = mkdtempSync(join(tmpdir(), "stalemodel-outside-"));
  writeFileSync(join(outside, "secret.py"), `"gpt-old"`);
  symlinkSync(outside, join(root, "link"));
  symlinkSync(join(outside, "secret.py"), join(root, "link.py"));

  const result = scanPath(catalog, root);
  assert.equal(result.filesScanned, 2);
  assert.equal(result.findings.length, 2);
  assert.ok(result.findings.every((f) => !f.file.includes("secret") && !f.file.includes("node_modules")));
});

test("scans a single file", () => {
  const root = mkdtempSync(join(tmpdir(), "stalemodel-"));
  const file = join(root, "a.py");
  writeFileSync(file, `"gpt-old"`);
  assert.equal(scanPath(catalog, file).findings.length, 1);
});

test("a missing path throws", () => {
  assert.throws(() => scanPath(catalog, "/no/such/path"));
});
