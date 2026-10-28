# Spec: Coolify Log Ingestion & Heuristic Telegram Monitoring Alerting System

**Triage Label:** `ready-for-agent`

---

## Problem Statement

The system runs mission-critical multi-tenant services inside Coolify and Docker containers (NestJS backend API, Next.js frontend, WAHA WhatsApp gateway, and PostgreSQL with pgvector). In a production environment, containers generate continuous streams of high-volume logs containing routine health checks, internal framework polling, and static asset requests mixed with critical operational failures.

Directly streaming raw logs to Telegram leads to catastrophic failure modes:
1. Telegram enforces strict message limits (1 message/second per chat and maximum 4096 characters per message). Any cascading failure or unhandled rejection emits hundreds of duplicate log lines in seconds, instantly causing `HTTP 429 Too Many Requests` penalties and stalling the bot.
2. System operators experience acute alert fatigue from routine noise (HTTP 200 checks, WAHA keepalives, periodic sync heartbeats).
3. Critical runtime crashes (such as database connection dropouts, WAHA WhatsApp session logouts, OpenAI quota exhaustion, or unhandled exceptions) get buried or missed due to log clutter and message truncations.
4. Raw logs frequently contain sensitive environment tokens, customer phone numbers, and secrets that must never be posted into chat threads.

---

## Solution

Build an intelligent, heuristic-driven Log Ingestion & Alerting Engine that mediates between Coolify container log outputs and Telegram. 

The engine ingests logs, passes them through a deterministic multi-stage heuristic filter pipeline (Noise Stripping, Secret Masking, Pattern Normalization, Severity Scoring, Sliding-Window Deduplication, and Burst Rate Limiting), and dispatches structured, actionable incident summaries to an operations Telegram channel.

Instead of forwarding 200 identical error messages when a downstream service becomes unreachable, the heuristic engine identifies the error fingerprint, captures the first occurrence immediately, increments a sliding counter over an aggregation window (e.g., 2 minutes), and summarizes subsequent occurrences into a single alert update (e.g., *"Error DB_TIMEOUT recurred 148 times across 2m"*). Non-critical noise is discarded, while critical service disconnects (WAHA, DB, OpenAI) trigger prioritized, formatted alerts with diagnostic metadata.

---

## User Stories

1. As a system administrator, I want Coolify application and container logs to be automatically ingested into a monitoring service, so that I do not need to manually SSH into the server or inspect the Coolify web console during incidents.
2. As a platform superadmin, I want routine operational noise (such as HTTP 200 health checks, favicon requests, static assets, and heartbeat polls) to be silently dropped by a heuristic filter, so that the Telegram channel remains clear of distraction.
3. As an on-call engineer, I want incoming logs to be categorized into discrete severity levels (FATAL, ERROR, WARN, INFO, DEBUG), so that urgent platform disruptions are highlighted over minor informational warnings.
4. As an on-call engineer, I want duplicate occurrences of identical error messages within an active time window (e.g., 120 seconds) to be aggregated into a single alert with a frequency counter, so that cascading loops do not spam or crash the Telegram bot.
5. As an on-call engineer, I want variable elements (such as UUIDs, timestamps, IP addresses, memory addresses, and request IDs) to be normalized before fingerprinting, so that structurally identical errors with different dynamic IDs are recognized as the same issue.
6. As a platform superadmin, I want the bot dispatcher to enforce Telegram's rate-limiting rules (maximum 1 msg/sec burst, queued batching), so that the bot never receives `HTTP 429 Too Many Requests` bans from Telegram.
7. As an on-call engineer, I want incident alerts on Telegram to contain key contextual metadata (service name, environment, first-seen timestamp, error summary, normalized stack snippet, and occurrence velocity), so that I can diagnose root causes directly from my phone.
8. As a security officer, I want sensitive tokens (such as Bearer JWTs, database connection strings, passwords, OpenAI API keys, and WAHA API keys) to be automatically masked/redacted before alert dispatch, so that credentials are never leaked into Telegram history.
9. As a platform engineer, I want stack traces exceeding Telegram's 4096-character limit to be cleanly truncated to the most relevant top frames and wrapped in code blocks, so that messages are always delivered and readable.
10. As a platform operator, I want immediate high-priority alerts when the WAHA WhatsApp gateway session disconnects, fails QR authentication, or encounters a socket crash, so that customer-facing AI chatbots do not experience silent downtime.
11. As a platform superadmin, I want an alert when OpenAI API calls return rate limits (HTTP 429) or insufficient quota errors, so that AI conversation fallbacks or token top-ups can be handled immediately.
12. As a system administrator, I want an alert when PostgreSQL database pool exhaustion or query timeouts occur, so that backend crashes can be addressed before tenant data corruption happens.
13. As a developer, I want to define custom whitelist and blacklist heuristic regex patterns via environment configuration without modifying core code, so that we can adapt monitoring behavior as new features launch.
14. As an administrator, I want a periodic heartbeat message (e.g., every 12 hours) confirming system uptime, memory status, and count of suppressed noise logs, so that I have positive proof the monitoring agent remains operational.
15. As an on-call engineer, I want an automatic "Recovery / Flurry Resolved" message when an error flurry ceases for more than a configured duration, so that the team knows the incident has stabilized.
16. As an on-call engineer, I want interactive inline action buttons on Telegram alerts to quickly snooze/mute specific error fingerprints for 30, 60, or 120 minutes during active maintenance, so that known issues do not interrupt ongoing resolution work.
17. As an auditor, I want all evaluated log fingerprints and alert dispatch history to be retained in an in-memory or database audit log, so that post-mortem analysis can review event timelines accurately.

---

## Implementation Decisions

### 1. Architectural Pipeline & Modules
The monitoring system consists of four isolated logical modules:
- **LogIngestionModule**: Exposes an internal ingestion endpoint or log socket receiver receiving raw log streams from Coolify Docker logs or HTTP log drains.
- **HeuristicFilterEngine**: A pure evaluation pipeline with sequential stages:
  - *Stage 1: Sanitizer & Masker* - Scans and redacts credentials, Authorization headers, and sensitive keys.
  - *Stage 2: Noise Drop Gate* - Evaluates against noise patterns (e.g., `GET /health 200`, `GET /favicon.ico`, `socket.io ping/pong`, `waha session ping`). Matching entries are discarded immediately.
  - *Stage 3: Normalizer & Fingerprinter* - Replaces dynamic tokens (UUIDv4, timestamps, numeric IDs, IP addresses) with placeholder tokens `<UUID>`, `<IP>`, `<ID>`, and computes an MD5/SHA256 fingerprint from `[service]:[severity]:[normalized_message]`.
  - *Stage 4: Severity Classifier* - Maps logs to `CRITICAL`, `ERROR`, `WARN`, or `INFO` based on explicit keywords (`FATAL`, `EXCEPTION`, `ECONNREFUSED`, `UNHANDLED`, `429`, `TIMEOUT`) and service context.
  - *Stage 5: Sliding-Window Aggregator* - Maintains an in-memory sliding window cache. If a fingerprint was already dispatched recently, increments its local occurrence counter and suppresses immediate re-dispatch until the window ends or velocity exceeds burst thresholds.
- **TelegramDispatchQueue**: Manages outbound rate limiting, message chunking (<4000 characters), MarkdownV2 escaping, and retry backoff.
- **MonitoringConfigProvider**: Centralized configuration specifying:
  - Noise regex patterns
  - Alert trigger keywords
  - Sliding aggregation window duration (e.g., 120 seconds)
  - Telegram Bot Token and Chat/Topic ID

### 2. Fingerprint & Heuristic Data Structure
```typescript
interface LogItem {
  timestamp: Date;
  service: string;       // e.g. "backend", "web", "waha", "postgres"
  rawMessage: string;
}

interface HeuristicResult {
  action: 'DROP' | 'ALERT_IMMEDIATE' | 'AGGREGATE';
  severity: 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO';
  fingerprint: string;
  normalizedMessage: string;
  maskedMessage: string;
  count: number;
}
```

### 3. Telegram Formatting Decision
All outgoing messages use standard HTML or Markdown with explicit sanitization:
- Header: Severity emoji (`🚨 CRITICAL`, `⚠️ ERROR`, `ℹ️ NOTICE`), service badge, and environment.
- Body: Normalized summary and sanitized stack snippet inside a code block.
- Footer: First seen timestamp, current recurrence count within window, and incident velocity (e.g., `42 occurrences in last 120s`).

---

## Testing Decisions

- **What makes a good test:** Tests must evaluate external behavior rather than internal object states. The primary testing seam is feeding varied raw log strings into the ingestion boundary and verifying the exact emitted alert decisions, suppression counters, and sanitized message shapes.
- **Modules to be tested:**
  1. `HeuristicFilterEngine`:
     - Test that standard HTTP 200 and health check logs evaluate to `DROP`.
     - Test that database connection dropouts evaluate to `CRITICAL` and `ALERT_IMMEDIATE`.
     - Test that 100 identical exception logs within a 10-second period result in exactly 1 initial alert followed by 1 summary update with count 100, instead of 100 separate alerts.
     - Test that logs with different dynamic UUIDs produce identical fingerprints.
     - Test that API keys and Bearer tokens are redacted before output.
  2. `TelegramDispatchQueue`:
     - Test that messages longer than 4000 characters are safely split or truncated without formatting corruption.
     - Test that outbound dispatch rate never exceeds 1 request per second even under a 50-message burst.
- **Prior art in codebase:**
  - Follows established NestJS unit testing conventions seen in `apps/backend/src/features/web-dashboard/tenant/tenant.service.spec.ts` and `apps/backend/src/modules/waha/waha.service.spec.ts`.

---

## Out of Scope

- Full-featured ELK / OpenSearch distributed cluster management (this is a lightweight heuristic alert engine, not a replacement for long-term cold log storage).
- Interactive full-stack web log visualizer (logs will be delivered via Telegram alerts and queried directly via existing Coolify UI).
- Autonomous container restart or remediation execution directly from Telegram commands (remediation remains manual or handled by Coolify health check policies).

---

## Further Notes

- The service can either run as a lightweight module inside `apps/backend` or as a standalone lightweight sidecar container inside the same Docker `coolify-network`.
- Coolify supports HTTP Webhooks for notifications and Docker daemon log draining via standard syslog or Fluentd/Vector drivers if native streaming is desired.
