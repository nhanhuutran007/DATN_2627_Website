# Architecture

Read this reference when creating components, APIs, schemas, integrations, security controls, or deployment configuration.

## Default repository layout

Use this layout only when the repository has no established alternative:

```text
frontend/      Next.js and TypeScript user/admin interfaces
backend/       Spring Boot business API and integration orchestration
ai-service/    FastAPI inference, data preparation, and model evaluation
infra/         Local orchestration, reverse proxy, and deployment configuration
docs/          API, data, architecture, operations, and testing documentation
```

Keep database migrations with the backend migration tool. Keep model metadata and reproducible evaluation artifacts with the AI service; do not commit secrets or uncontrolled raw personal data.

## Service ownership

- Frontend: rendering, accessibility, form/user state, dashboards, charts, and calls to documented backend APIs. Do not duplicate authorization or financial truth in the browser.
- Backend: identity, authorization, campaign workflow, transaction ledger, payment verification, progress, notifications, moderation, audit logs, and orchestration of AI calls.
- AI service: validated feature transformation, model loading/inference, explanation data, version metadata, offline training/evaluation entry points, and health endpoints.
- MySQL: structured business source of truth for users, projects, reviews, transactions, milestones, notifications, complaints, alerts, and audit data.
- Redis: optional cache, session, rate-limit, or short background-job support; never the sole durable source for business records.
- Object storage: campaign media and evidence through a replaceable storage interface with metadata and authorization retained by the backend.

## Contracts and integration

- Expose backend and AI interfaces through versioned REST contracts and document backend APIs with OpenAPI.
- Use explicit DTOs at trust boundaries. Validate size, type, ranges, state, ownership, and allowed fields.
- Return stable machine-readable error codes plus safe user messages. Avoid leaking stack traces or sensitive existence checks.
- Propagate correlation IDs across frontend, backend, AI, jobs, payment callbacks, and logs.
- Use UTC instants for storage and define display timezone behavior explicitly.
- Isolate payment, email/notification, and object storage providers behind interfaces so sandbox/fake implementations remain testable.
- Separate slow training, email, and aggregate-report work from request/response paths. Add retry with bounded attempts and idempotent handlers.

## Security baseline

- Use Spring Security with short-lived JWT access tokens and rotated/revocable refresh tokens if the repository adopts token authentication.
- Hash passwords with an established adaptive password hasher. Require reauthentication or 2FA for sensitive actions.
- Apply authorization server-side to every protected object and administrator operation.
- Configure strict CORS/CSRF behavior for the selected token transport, safe headers, input/output encoding, file validation, and rate limits.
- Load secrets from environment or an approved secret store. Commit only documented examples with non-secret placeholders.
- Keep immutable or append-oriented audit records for reviews, state changes, payment events, refunds, alerts, and administrative actions.

## AI boundary

Send only normalized or pseudonymized fields needed for a documented feature contract. Prevent the AI service from unrestricted access to the entire business database. Version the schema, feature set, preprocessing, model, threshold, and evaluation record together.

Design inference timeouts and circuit breaking so recommendations can fall back and core donations do not depend on nonessential AI availability.

## Deployment baseline

Use HTTPS and optionally Nginx as a reverse proxy for Next.js, Spring Boot, and FastAPI. Provide health checks, structured logs, database backups, file backup/retention, restore procedures, and migration/rollback planning. Keep payment in sandbox until production authority and provider requirements are explicit.
