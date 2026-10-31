import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { loadCatalog, PROVIDERS } from "./catalog.ts";
import type { Catalog } from "./catalog.ts";
import { checkModel, findModels } from "./check.ts";
import { scanPath } from "./scan.ts";
import { VERSION } from "./version.ts";

const MAX_FINDINGS = 100;
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true };

function reply(catalog: Catalog, body: object) {
  const text = JSON.stringify({ ...body, data: { source: catalog.source, as_of: catalog.fetchedAt } });
  return { content: [{ type: "text" as const, text }] };
}

export function createServer(offline: boolean): McpServer {
  let cached: Promise<Catalog> | undefined;
  const catalog = () => (cached ??= loadCatalog(offline));

  const server = new McpServer({ name: "stalemodel", version: VERSION }, { capabilities: { tools: {} } });

  server.registerTool(
    "models_check",
    {
      title: "Check model names",
      description:
        "Checks whether AI model IDs are current, deprecated or missing from the catalog, and suggests the newest model in the same family. Use before writing a model ID into code or config, because IDs from training data are often out of date. Status unknown can also mean a new or private model.",
      inputSchema: z.object({
        model_ids: z.array(z.string().min(1)).min(1).max(50).describe('Model IDs, such as "claude-3-5-sonnet-20241022" or "openai/gpt-4o"'),
      }),
      annotations: READ_ONLY,
    },
    async ({ model_ids }) => {
      const data = await catalog();
      return reply(data, { results: model_ids.map((id) => checkModel(data, id)) });
    },
  );

  server.registerTool(
    "models_find",
    {
      title: "Find current models",
      description:
        "Lists non-deprecated AI models, newest first, with price per million tokens and context size. Use to choose a model or get a current ID, price or limit.",
      inputSchema: z.object({
        provider: z.enum(PROVIDERS as [string, ...string[]]).optional(),
        query: z.string().optional().describe('Text to match in the model ID or name, such as "sonnet"'),
        requires_tools: z.boolean().optional().describe("Only models that support tool calling"),
        max_input_price: z.number().min(0).optional().describe("Highest input price in USD per million tokens"),
        min_context: z.number().int().min(0).optional().describe("Smallest context window in tokens"),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      annotations: READ_ONLY,
    },
    async (options) => {
      const data = await catalog();
      return reply(data, { models: findModels(data, options) });
    },
  );

  server.registerTool(
    "models_scan",
    {
      title: "Scan files for outdated model names",
      description:
        "Scans a file or directory for quoted AI model IDs that are deprecated or missing from the catalog. Read-only. Skips dependency and build folders, and returns locations and IDs, not file contents.",
      inputSchema: z.object({
        path: z.string().min(1).describe("File or directory to scan"),
      }),
      annotations: READ_ONLY,
    },
    async ({ path }) => {
      const data = await catalog();
      try {
        const result = scanPath(data, path);
        return reply(data, {
          files_scanned: result.filesScanned,
          truncated: result.truncated || result.findings.length > MAX_FINDINGS,
          total_findings: result.findings.length,
          findings: result.findings.slice(0, MAX_FINDINGS),
        });
      } catch (error) {
        const text = `Can't scan ${path}: ${(error as Error).message}. Pass an existing file or directory.`;
        return { content: [{ type: "text" as const, text }], isError: true };
      }
    },
  );

  return server;
}

export function serve(offline: boolean): void {
  serveStdio(() => createServer(offline));
}
