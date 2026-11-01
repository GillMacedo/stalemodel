# stalemodel

Catches outdated AI model IDs and looks up current models. It's an MCP server, a CLI and a Claude Code plugin.

## Architecture
- `src/catalog.ts`: loads models.dev, falling back to `data/models.json`.
- `src/check.ts`: status, suggestions and search.
- `src/scan.ts`: finds quoted IDs in files.
- `src/server.ts`: MCP tools. `src/main.ts`: CLI.
- `plugin/`: plugin wrapper. `plugin/dist/stalemodel.js` is the committed bundle, with no runtime dependencies.

## Commands

    make test    # typecheck and tests
    make build   # rebuild the bundle; commit the result
    make lint    # plugin validation and MCP Inspector
    make demo    # README examples

## Rules
- Never write to stdout in server code, because it corrupts JSON-RPC.
- Tools stay read-only, and `models_scan` never returns file contents.
- Don't pass third-party catalog text such as descriptions to agents. `trim` keeps only the fields we use.
- Tool descriptions state what a tool does. They never try to persuade an agent to prefer this tool.
- "Unknown" never means "wrong": keep that distinction in output and docs.

## Definition of done
Tests pass, the bundle is rebuilt, README examples match, and `ROADMAP.md` is updated if relevant. Only the maintainer merges to `main`.
