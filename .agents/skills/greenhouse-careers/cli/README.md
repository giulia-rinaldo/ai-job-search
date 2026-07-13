# greenhouse-careers-cli

Zero-dependency CLI that searches jobs across company career sites hosted on
**Greenhouse** (Figma, Airbnb, Stripe, Anthropic, Reddit, Pinterest, Webflow, …) via the
public Greenhouse Job Board API. Runs on `bun`, no install beyond dev types.

```bash
cd .agents/skills/greenhouse-careers/cli
bun install          # dev types only; zero runtime deps
bun run typecheck    # tsc --noEmit
bun test             # flag validation + live smoke tests
```

## Usage

```bash
bun run src/cli.ts search -q "product designer" -l "New York" --jobage 45 --format table
bun run src/cli.ts search -q "designer" -c figma,airbnb,stripe -l "San Francisco" --format table
bun run src/cli.ts detail figma:6014530004 --format plain
```

See `../SKILL.md` for the full command reference and `../url-reference.md` for the API
contract and the default company list.

## Design

- **No runtime dependencies** — plain `bun` + `fetch` + client-side filtering.
- One Greenhouse board = one company; `--company` fans out across many (default: 16 curated
  design-forward / big-tech companies). Add any board token with `--company`.
- Detail parsing decodes Greenhouse's entity-encoded `content` before stripping tags.
- Best for big-tech/startup hiring (US-heavy + remote); pair with LinkedIn / country boards
  for specific European cities.
