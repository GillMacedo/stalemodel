import type { Catalog, Model } from "./catalog.ts";
import { PROVIDERS } from "./catalog.ts";

export type Status = "current" | "preview" | "deprecated" | "unknown";

export interface CheckResult {
  id: string;
  status: Status;
  provider?: string;
  released?: string;
  try?: string;
}

const PREFIXES: [RegExp, string][] = [
  [/^claude-/, "anthropic"],
  [/^(gpt-|chatgpt-|o[134]($|-))/, "openai"],
  [/^gemini-/, "google"],
  [/^grok-/, "xai"],
  [/^deepseek-/, "deepseek"],
  [/^(mistral-|codestral-)/, "mistral"],
];

export function stripProvider(id: string): string {
  const [first, ...rest] = id.split("/");
  return rest.length > 0 && PROVIDERS.includes(first) ? rest.join("/") : id;
}

export function providerFor(id: string): string | undefined {
  return PREFIXES.find(([pattern]) => pattern.test(id))?.[1];
}

// Only general chat models are suggested, so an old text model never gets a
// voice, image or embedding model as its replacement.
function isSuggestable(model: Model): boolean {
  return model.chat === true && !model.status && !/preview|latest|embedding/.test(model.id);
}

function isNewer(a: Model, b: Model | undefined): boolean {
  return !b || (a.release_date ?? "") > (b.release_date ?? "");
}

function newestInFamily(models: Model[], provider: string, family: string): Model | undefined {
  let newest: Model | undefined;
  for (const model of models) {
    if (model.provider === provider && model.family === family && isSuggestable(model) && isNewer(model, newest)) {
      newest = model;
    }
  }
  return newest;
}

// A retired ID has no catalog entry, so its family comes from its name:
// claude-3-5-sonnet-20241022 contains every part of claude-sonnet.
function guessFamily(models: Model[], provider: string, id: string): string | undefined {
  const parts = new Set(id.split(/[-.:_]/));
  let best: string | undefined;
  for (const model of models) {
    const family = model.family;
    if (model.provider !== provider || !family) continue;
    if (family.split("-").every((part) => parts.has(part)) && family.length > (best?.length ?? 0)) {
      best = family;
    }
  }
  return best;
}

export function checkModel(catalog: Catalog, rawId: string): CheckResult {
  const id = stripProvider(rawId);
  const provider = providerFor(id);
  const model = catalog.models.find((m) => m.id === id && (!provider || m.provider === provider));
  const familyProvider = model?.provider ?? provider;
  const family = model?.family ?? (familyProvider ? guessFamily(catalog.models, familyProvider, id) : undefined);
  const newest = familyProvider && family ? newestInFamily(catalog.models, familyProvider, family) : undefined;
  const suggestion = newest && newest.id !== id && !id.includes("latest") ? newest.id : undefined;

  if (!model) return { id, status: "unknown", provider, try: suggestion };
  const status: Status = model.status === "deprecated" ? "deprecated" : model.status ? "preview" : "current";
  return { id, status, provider: model.provider, released: model.release_date, try: suggestion };
}

export interface FindOptions {
  provider?: string;
  query?: string;
  requires_tools?: boolean;
  max_input_price?: number;
  min_context?: number;
  limit?: number;
}

export function findModels(catalog: Catalog, options: FindOptions): Model[] {
  const query = options.query?.toLowerCase();
  return catalog.models
    .filter((m) => m.status !== "deprecated")
    .filter((m) => !options.provider || m.provider === options.provider)
    .filter((m) => !query || m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query))
    .filter((m) => !options.requires_tools || m.tool_call)
    .filter((m) => options.max_input_price === undefined || (m.input_price !== undefined && m.input_price <= options.max_input_price))
    .filter((m) => options.min_context === undefined || (m.context ?? 0) >= options.min_context)
    .sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "") || a.id.localeCompare(b.id))
    .slice(0, options.limit ?? 20);
}
