import { parseArgs } from "node:util";
import { loadCatalog, PROVIDERS } from "./catalog.ts";
import { checkModel, findModels } from "./check.ts";
import type { CheckResult } from "./check.ts";
import { scanPath } from "./scan.ts";
import { serve } from "./server.ts";

const USAGE = `Usage:
  stalemodel check <model-id>...     Is this model ID current?
  stalemodel scan [path]             Find outdated model IDs in files. Exits 1 on findings.
  stalemodel find [--provider p] [--query text] [--limit n]
  stalemodel serve                   Run as an MCP server over stdio

Options: --offline uses the bundled snapshot. --json prints JSON.
Providers: ${PROVIDERS.join(", ")}`;

const LABEL = { current: "current", preview: "preview", deprecated: "deprecated", unknown: "not in catalog" };

function describe(result: CheckResult): string {
  const next = result.try ? `  try ${result.try}` : "";
  return `${result.id}  ${LABEL[result.status]}${next}`;
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      offline: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      provider: { type: "string" },
      query: { type: "string" },
      limit: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const [command, ...args] = positionals;

  if (command === "serve") {
    serve(values.offline);
    return -1;
  }
  if (values.help || !["check", "scan", "find"].includes(command) || (command === "check" && args.length === 0)) {
    console.log(USAGE);
    return values.help ? 0 : 2;
  }

  const catalog = await loadCatalog(values.offline);
  if (catalog.source === "snapshot") {
    console.error(`Using the bundled snapshot from ${catalog.fetchedAt.slice(0, 10)}.`);
  }

  if (command === "check") {
    const results = args.map((id) => checkModel(catalog, id));
    console.log(values.json ? JSON.stringify(results, null, 2) : results.map(describe).join("\n"));
    return 0;
  }
  if (command === "find") {
    const models = findModels(catalog, { provider: values.provider, query: values.query, limit: values.limit ? Number(values.limit) : undefined });
    if (values.json) {
      console.log(JSON.stringify(models, null, 2));
    } else {
      for (const m of models) {
        const price = m.input_price === undefined ? "no price" : `$${m.input_price}/$${m.output_price} per MTok`;
        console.log(`${m.id}  ${m.provider}  ${m.release_date ?? "no date"}  ${price}  ${m.context ?? "?"} context`);
      }
    }
    return 0;
  }

  const result = scanPath(catalog, args[0] ?? ".");
  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const finding of result.findings) console.log(`${finding.file}:${finding.line}  ${describe(finding)}`);
    console.log(`${result.findings.length} findings in ${result.filesScanned} files`);
  }
  return result.findings.length > 0 ? 1 : 0;
}

main().then(
  (code) => {
    if (code >= 0) process.exitCode = code;
  },
  (error) => {
    console.error(`stalemodel: ${error.message}`);
    process.exitCode = 2;
  },
);
