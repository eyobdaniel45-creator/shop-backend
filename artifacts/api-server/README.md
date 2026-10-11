# Node.js Express API

A small TypeScript Express starter for building API-backed applications.

## Run locally

From the workspace root:

```bash
pnpm --filter @workspace/api-server run dev
```

The server listens on the `PORT` environment variable.

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/` | Returns basic API information |
| `GET` | `/api/healthz` | Returns `{ "status": "ok" }` |
| `GET` | `/api/products` | Lists mock products, including a sofa and table |
| `POST` | `/api/products` | Adds a product to the in-memory catalog |
| `POST` | `/api/shops/register` | Registers a mock shop |
| `POST` | `/api/checkout/pay` | Simulates checkout without charging a payment method |

Product and shop changes are in memory and reset when the server restarts. Checkout responses are simulations only; no payment is processed. The API contract lives in `lib/api-spec/openapi.yaml`.