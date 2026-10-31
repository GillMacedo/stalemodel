import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";

// Talks to the built bundle over stdio, as an MCP client would.
async function exchange(messages: object[]): Promise<any[]> {
  const child = spawn("node", ["plugin/dist/stalemodel.js", "--offline", "serve"], { stdio: ["pipe", "pipe", "ignore"] });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  const expected = messages.filter((m: any) => m.id !== undefined).length;
  for (const message of messages) child.stdin.write(JSON.stringify(message) + "\n");
  for (let i = 0; i < 100 && output.split("\n").filter(Boolean).length < expected; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill();
  return output.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

const init = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
  { jsonrpc: "2.0", method: "notifications/initialized" },
];

function tool(id: number, name: string, args: object) {
  return { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } };
}

test("lists read-only tools, and stdout stays pure JSON-RPC", async () => {
  const [, list] = await exchange([...init, { jsonrpc: "2.0", id: 2, method: "tools/list" }]);
  const tools = list.result.tools;
  assert.deepEqual(tools.map((t: any) => t.name).sort(), ["models_check", "models_find", "models_scan"]);
  assert.ok(tools.every((t: any) => t.annotations.readOnlyHint === true));
});

test("checks a model", async () => {
  const [, call] = await exchange([...init, tool(2, "models_check", { model_ids: ["gpt-3.5-turbo"] })]);
  const body = JSON.parse(call.result.content[0].text);
  assert.equal(body.results[0].status, "deprecated");
  assert.equal(body.data.source, "snapshot");
});

test("scans files", async () => {
  const [, call] = await exchange([...init, tool(2, "models_scan", { path: "examples" })]);
  const body = JSON.parse(call.result.content[0].text);
  assert.equal(body.total_findings, 3);
});

test("a bad path gives an actionable error", async () => {
  const [, call] = await exchange([...init, tool(2, "models_scan", { path: "/no/such/path" })]);
  assert.equal(call.result.isError, true);
  assert.match(call.result.content[0].text, /Pass an existing file or directory/);
});

test("invalid input is rejected", async () => {
  const [, call] = await exchange([...init, tool(2, "models_check", { model_ids: [] })]);
  assert.ok(call.error || call.result.isError);
});
