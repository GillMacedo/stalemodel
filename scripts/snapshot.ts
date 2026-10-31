// Refreshes data/models.json, the catalog used when models.dev can't be reached.
import { writeFileSync } from "node:fs";
import { fetchModels } from "../src/catalog.ts";

const models = await fetchModels();
writeFileSync("data/models.json", JSON.stringify({ fetchedAt: new Date().toISOString(), models }, null, 1) + "\n");
console.log(`${models.length} models`);
