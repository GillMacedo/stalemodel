.PHONY: test build lint demo snapshot

INSPECTOR = npx -y @modelcontextprotocol/inspector@2.13.0 --cli node plugin/dist/stalemodel.js --offline serve

test:
	npm run -s typecheck
	npm test

build:
	npm run -s build

lint:
	claude plugin validate ./plugin --strict
	claude plugin validate . --strict
	$(INSPECTOR) --protocol-era modern --method tools/list --strict
	$(INSPECTOR) --protocol-era legacy --method tools/list --strict

# scan exits 1 on findings, and the example has findings on purpose.
demo:
	node plugin/dist/stalemodel.js --offline scan examples || test $$? -eq 1
	node plugin/dist/stalemodel.js --offline check gpt-4o claude-opus-5-5
	node plugin/dist/stalemodel.js --offline find --provider anthropic --limit 2

snapshot:
	npm run -s snapshot
	npm run -s build
