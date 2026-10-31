import snapshot from "../data/models.json" with { type: "json" };

export const PROVIDERS = ["anthropic", "openai", "google", "xai", "deepseek", "mistral"];
const SOURCE = "https://models.dev/api.json";
const FETCH_TIMEOUT_MS = 5000;

export interface Model {
  id: string;
  provider: string;
  name: string;
  family?: string;
  status?: string;
  release_date?: string;
  knowledge?: string;
  context?: number;
  input_price?: number;
  output_price?: number;
  tool_call?: boolean;
  chat?: boolean;
}

export interface Catalog {
  source: "live" | "snapshot";
  fetchedAt: string;
  models: Model[];
}

// Keeps only the fields we use. Descriptions are dropped so that third-party
// text never reaches an agent through this tool.
export function trim(api: Record<string, any>): Model[] {
  const models: Model[] = [];
  for (const provider of PROVIDERS) {
    for (const raw of Object.values<any>(api[provider]?.models ?? {})) {
      models.push({
        id: String(raw.id),
        provider,
        name: String(raw.name),
        family: raw.family,
        status: raw.status,
        release_date: raw.release_date,
        knowledge: raw.knowledge,
        context: raw.limit?.context,
        input_price: raw.cost?.input,
        output_price: raw.cost?.output,
        tool_call: raw.tool_call,
        chat: raw.tool_call === true && raw.modalities?.output?.length === 1 && raw.modalities.output[0] === "text",
      });
    }
  }
  return models.sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
}

export function snapshotCatalog(): Catalog {
  return { source: "snapshot", fetchedAt: snapshot.fetchedAt, models: snapshot.models as Model[] };
}

export async function fetchModels(): Promise<Model[]> {
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`models.dev returned HTTP ${response.status}`);
  const models = trim((await response.json()) as Record<string, any>);
  if (models.length === 0) throw new Error("models.dev returned no models");
  return models;
}

// Uses live data when it can and falls back to the bundled snapshot, so the
// tool still works offline. Output says which one it used.
export async function loadCatalog(offline = false): Promise<Catalog> {
  if (offline) return snapshotCatalog();
  try {
    return { source: "live", fetchedAt: new Date().toISOString(), models: await fetchModels() };
  } catch {
    return snapshotCatalog();
  }
}
