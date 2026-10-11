# Monitoring Demo

A small Node.js (Express) app built to explore the Prometheus + Grafana + Loki observability stack. It exposes a couple of endpoints that behave like a real production service — variable latency, random error rates — so there's something meaningful to monitor. The whole stack runs via Docker Compose.

## Architecture

```
┌─────────────┐   scrapes /metrics    ┌────────────┐
│  Node app   │◄──────────────────────│ Prometheus │
│  (Express)  │                       └────────────┘
│             │   pushes logs (HTTP)         │
│             │──────────────────────►┌───────▼────┐
└─────────────┘                       │    Loki    │
                                       └─────┬──────┘
                                             │ datasource
                                       ┌─────▼──────┐
                                       │  Grafana   │
                                       │ (Prom+Loki)│
                                       └────────────┘
```

- **node-app** — Express server. Instruments itself with `prom-client` and ships logs directly to Loki via `winston-loki`.
- **prometheus** — scrapes `node-app:3000/metrics` every 4s.
- **loki** — log storage, receives structured JSON logs pushed directly from the app.
- **grafana** — Prometheus + Loki datasources and a starter dashboard are auto-provisioned on startup.

All services run on a shared Docker network and talk to each other by service name.

## Project structure

```
Monitoring/
├── app/
│   ├── src/
│   │   ├── index.js      # Express app bootstrap, /metrics endpoint
│   │   ├── routes.js     # /health, /slow, /fetch-data
│   │   ├── metrics.js    # prom-client setup (default + custom metrics)
│   │   └── logger.js     # winston + Loki transport
│   ├── package.json
│   └── Dockerfile
├── prometheus/
│   └── prometheus.yml
├── loki/
│   └── loki-config.yml
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/datasources.yml
│   │   └── dashboards/dashboards.yml
│   └── dashboards/
│       └── node-app-dashboard.json
└── docker-compose.yml
```

## Endpoints

| Route | Description |
|---|---|
| `GET /health` | Always returns `200 { status: "ok" }`. |
| `GET /slow` | Random delay between 100ms–3000ms before responding — simulates a slow endpoint. |
| `GET /fetch-data` | Returns a random status (weighted: mostly `200`, some `400`/`404`/`500`/`503`) — simulates real-world error rates. |
| `GET /metrics` | Prometheus exposition format for scraping. |

## Running it

```bash
docker compose up --build -d
```

This starts all four containers:

| Service | URL |
|---|---|
| Node app | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (login: `admin` / `admin`) |
| Loki | http://localhost:3100 |

Generate some traffic to see data flow through the stack:

```bash
for i in $(seq 1 20); do curl -s -o /dev/null http://localhost:3000/fetch-data; done
curl http://localhost:3000/slow
```

Tear down:

```bash
docker compose down        # keep Grafana data volume
docker compose down -v     # also wipe Grafana data volume
```

## Verifying the stack

1. **Prometheus is scraping** — [localhost:9090/targets](http://localhost:9090/targets) should show `node-app` as `UP`.
2. **Metrics are populated** — `curl http://localhost:3000/metrics` should show `http_requests_total` and `http_request_duration_seconds` with request counts per route/status.
3. **Grafana datasources** — open Grafana, confirm Prometheus and Loki are listed under Connections → Data sources (both are pre-provisioned, no manual setup needed).
4. **Dashboard** — the "Node App Monitoring" dashboard should already exist with panels for request rate, p95 latency, status code breakdown, and live logs.
5. **Logs reach Loki** — the logs panel on the dashboard (or Grafana Explore with query `{app="node-monitoring-demo"}`) should show structured log lines as you hit the endpoints.

## Metrics exposed

- Default Node.js process metrics (CPU, memory, event loop lag, GC) via `prom-client`'s `collectDefaultMetrics()`.
- `http_requests_total` — counter, labeled by `method`, `route`, `status_code`.
- `http_request_duration_seconds` — histogram of request latency, same labels, used for the p95 latency panel.

See [app/src/metrics.js](app/src/metrics.js) for the instrumentation middleware.
