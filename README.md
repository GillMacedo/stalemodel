# stalemodel: find deprecated AI model names in your code

[![npm](https://img.shields.io/npm/v/stalemodel)](https://www.npmjs.com/package/stalemodel) [![CI](https://github.com/GillMacedo/stalemodel/actions/workflows/ci.yml/badge.svg)](https://github.com/GillMacedo/stalemodel/actions/workflows/ci.yml) [![MIT license](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-green)](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.GillMacedo/stalemodel)

**Catch outdated OpenAI, Claude and Gemini model IDs before your coding agent ships them, and look up current LLM prices and context limits.**

Coding agents write model IDs from old training data, so new code often calls models that are deprecated or gone, and fails with errors like "model not found". `stalemodel` checks IDs against a live catalog, suggests the newest model in the same family, and gives agents current LLM pricing and limits. It's an MCP server and a CLI. It needs no API key or account, sends no code anywhere, and falls back to a bundled snapshot when offline.

It covers Anthropic Claude, OpenAI GPT, Google Gemini, xAI Grok, DeepSeek and Mistral.

## What you can ask your agent

- "Which Claude model ID should I use, and what does it cost?"
- "Why do I get 'model not found' for claude-3-5-sonnet-20241022?"
- "Check this repo for deprecated model names."
- "What's the cheapest current model with tool calling and a 1M context window?"

## Install

As a Claude Code plugin, which adds the MCP server and a skill that tells Claude when to use it:

    claude plugin marketplace add GillMacedo/stalemodel
    claude plugin install stalemodel@stalemodel-marketplace

For other MCP clients, run it from npm. You need Node 22.19 or newer. It's also in the [official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.GillMacedo/stalemodel) as `io.github.GillMacedo/stalemodel`.

```json
{
  "mcpServers": {
    "stalemodel": {
      "command": "npx",
      "args": ["-y", "stalemodel", "serve"]
    }
  }
}
```

## Usage

Without installing anything, run `npx stalemodel scan .`. The examples below run from a clone of this repo.

**Scan a project.** Only quoted strings count, and `scan` exits 1 on findings, so it can run in CI.

    $ node plugin/dist/stalemodel.js scan examples
    examples/app.py:2  claude-3-5-sonnet-20241022  not in catalog  try claude-sonnet-5-5
    examples/app.py:3  gpt-3.5-turbo  deprecated  try gpt-5.5
    examples/app.py:4  gemini-1.5-pro  not in catalog  try gemini-2.5-pro
    3 findings in 1 files

**Check an ID.**

    $ node plugin/dist/stalemodel.js check gpt-4o claude-opus-5-5
    gpt-4o  current  try gpt-5.5
    claude-opus-5-5  current

**Find current models,** newest first, with prices per million tokens.

    $ node plugin/dist/stalemodel.js find --provider anthropic --limit 2
    claude-haiku-5-5  anthropic  2026-10-07  $0.1/$0.5 per MTok  1000000 context
    claude-sonnet-5-5  anthropic  2026-09-28  $2/$10 per MTok  1000000 context

Add `--json` for machine-readable output, or `--offline` to use only the bundled snapshot. These examples use the snapshot from 2026-10-31, so live results will change.

## MCP tools

| Tool | What it does |
|---|---|
| `models_check` | Says whether IDs are current, deprecated or unknown, and suggests a newer model |
| `models_find` | Lists models by provider, name, price, context size or tool support |
| `models_scan` | Finds outdated IDs in a file or folder, returning locations only |

All three are read-only.

## Limits

- Data comes from [models.dev](https://models.dev), so it can lag behind providers or contain errors.
- "Not in catalog" can also mean a new, private or misspelled model.
- `try` is a suggestion based on family and release date. Check price and behavior before switching.
- `scan` only sees quoted IDs, so it misses IDs built at runtime. It also doesn't flag bare `gpt-4o`-style IDs that are old but still current.

## FAQ

**How do I find deprecated LLM models in my code?** Run `npx stalemodel scan .`. It exits 1 on findings, so it also works as a CI check.

**Where does the pricing data come from?** From [models.dev](https://models.dev), fetched live, with a snapshot bundled for offline use.

**Does it work outside Claude Code?** It's a standard MCP server, so it should work in any MCP client. So far it has only been tested in Claude Code.

## Contributing

Contributions are welcome, from people and from people working with AI agents. See [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues:

- Add a GitHub Action that runs `scan` on pull requests
- Add an option to flag current models that have a newer version
- Support Bedrock and Vertex model ID formats
- Add a `--fix` option that shows a diff of suggested replacements
- Add a plugin icon

### How pull requests work

1. **Open a PR.** Fork the repo, work on a branch, and keep it to one change. Write a title that says what changes for users, because it becomes the changelog line: `feat:` goes under Added and `fix:` under Fixed.
2. **Automatic check.** Code changes need tests, and `make test` must pass. Changes over 30 lines need a linked open issue (`Closes #<number>`), and a PR can have at most 800 changed lines. If something is missing, a comment tells you what to fix.
3. **Review.** Claude reviews each PR automatically. Code PRs also get a security review and are tested in a sandbox. The review then merges the PR or asks for changes. PRs that change CI, agent settings, dependencies or build files go to the maintainer, as does anything the security review doesn't clear.
4. **Release.** A merge that changes what users install becomes a new version within about 20 minutes, with a GitHub Release and, if the project has one, its npm package. Docs and CI changes wait for the next release.

## AI disclosure

This project was largely generated with Claude Code and reviewed by its maintainer.

## About me

I'm Giulliano Macedo, and I build developer tools at GoTech Solutions. Follow along or get in touch:

- GitHub: [GillMacedo](https://github.com/GillMacedo)
- LinkedIn: [giulliano](https://www.linkedin.com/in/giulliano/)
- X: [@giumacedo](https://x.com/giumacedo)

If `stalemodel` helped you, a star helps others find it.

---

MIT licensed. Model data from [models.dev](https://models.dev) (MIT).

Built by [Giulliano Macedo](https://github.com/GillMacedo), GoTech Solutions · [LinkedIn](https://www.linkedin.com/in/giulliano/) · [X](https://x.com/giumacedo)
