---
name: checking-model-names
description: Checks AI model IDs against a current catalog and finds current models, prices and limits. Use before writing a Claude, GPT, Gemini, Grok, DeepSeek or Mistral model ID into code or config, when a model returns "not found", or when the user asks which model to use or what one costs.
---

# Checking model names

Model IDs from training data are often out of date, so check instead of relying on memory.

- **Before writing an ID:** call `models_check` with it.
- **Choosing a model, or asking about price or limits:** call `models_find`.
- **Auditing a project:** call `models_scan` with its path.

## Reading results
- `deprecated`: the provider is retiring it or has retired it, so use `try` if it fits.
- `unknown`: it isn't in the catalog. It may be retired, misspelled, new or private, so don't call it wrong without checking the provider's docs.
- `current` with `try`: it still works, and a newer model exists in the same family.

`try` is a suggestion based on family and release date. Newer models can differ in price and behavior, so tell the user before switching, and don't change a pinned model without asking.

If `data.source` is `snapshot`, the catalog couldn't be reached, so say how old the data is.
