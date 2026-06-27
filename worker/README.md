# Brain Nutrient Map API

Cloudflare Worker for the AI report feature.

Do not put API keys in frontend code, GitHub Pages, README files, or committed config.

## Deploy

```bash
cd worker
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put IMAGE_API_KEY
wrangler deploy
```

## Open beta and report codes

Current beta mode uses `REPORT_MODE=open`, so detailed reports can be generated without an access code while the product experience is being tested.

When the flow is stable, remove `REPORT_MODE=open` from `wrangler.toml` and create one-time paid report codes in KV.

Create a paid report code:

```bash
wrangler kv key put code:BRAIN-XXXX "{\"createdAt\":\"2026-06-27T00:00:00Z\",\"source\":\"aivora-card\"}" --binding BRAIN_REPORT_CODES --remote
```

Put the same code into the Aivora card/inventory system. After a detailed report is generated successfully, the Worker marks the code as used.

The frontend calls:

```text
POST /api/report
POST /api/image
```

The one-click frontend flow calls `/api/report` first, then sends the returned Markdown report into `/api/image`. When `report` is present, the Worker asks the text model to extract poster copy and an English image prompt before calling the image model.

Modes:

- `preview`: free short AI summary.
- `paid`: detailed report. In beta with `REPORT_MODE=open`, no report access code is required.

Optional KV bindings:

- `BRAIN_REPORT_LIMITS`: per-IP daily preview limit.
- `BRAIN_REPORT_CODES`: paid one-time report codes.

Optional secrets:

- `ANTHROPIC_API_KEY`: required model API key.
- `IMAGE_API_KEY`: required image generation API key.
- `AUTHOR_ACCESS_CODES`: comma-separated reusable author/test codes. These codes are checked before one-time KV codes and are never marked as used.
