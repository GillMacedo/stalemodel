# Architecture

    models.dev (live) ─┐
                       ├─> catalog ─> check ─> scan ─> CLI and MCP tools
    data/models.json ──┘

**Catalog:** each run fetches models.dev with a 5-second timeout, then falls back to the snapshot bundled at build time. Only needed fields are kept, for six providers. Results report which source was used. The MCP server caches the catalog for its lifetime.

**Status:** an ID in the catalog is `deprecated`, `preview` or `current`, from the catalog's `status`. An ID not in the catalog is `unknown`, which isn't a verdict that it's wrong.

**Suggestions:** the newest stable chat model in the same family. Chat means text output and tool support, which keeps voice, image and embedding models out. A retired ID's family is guessed from its name.

**Scanning:** only quoted strings on known provider prefixes count. Unknown IDs need a digit, which drops names such as `claude-code`. Symlinks aren't followed, and dependency folders and files over 1 MB are skipped.

**Packaging:** esbuild bundles everything into one committed file, so the plugin works without an install step. CI checks that the bundle matches the source.

See `docs/decisions/`.
