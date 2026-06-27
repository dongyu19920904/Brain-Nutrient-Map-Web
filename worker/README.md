# Brain Nutrient Map API

Cloudflare Worker for the AI report feature.

Do not put API keys in frontend code, GitHub Pages, README files, or committed config.

## Deploy

```bash
cd worker
wrangler secret put ANTHROPIC_API_KEY
wrangler deploy
```

## Create report codes

Create one-time paid report codes in KV:

```bash
wrangler kv key put code:BRAIN-XXXX "{\"createdAt\":\"2026-06-27T00:00:00Z\",\"source\":\"aivora-card\"}" --binding BRAIN_REPORT_CODES --remote
```

Put the same code into the Aivora card/inventory system. After a detailed report is generated successfully, the Worker marks the code as used.

The frontend calls:

```text
POST /api/report
```

Modes:

- `preview`: free short AI summary.
- `paid`: detailed report, requiring a report access code unless `REPORT_MODE=open` is configured for testing.

Optional KV bindings:

- `BRAIN_REPORT_LIMITS`: per-IP daily preview limit.
- `BRAIN_REPORT_CODES`: paid one-time report codes.

Optional secrets:

- `ANTHROPIC_API_KEY`: required model API key.
- `AUTHOR_ACCESS_CODES`: comma-separated reusable author/test codes. These codes are checked before one-time KV codes and are never marked as used.
