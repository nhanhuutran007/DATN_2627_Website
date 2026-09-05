# Quality Gates

Read this reference when planning broad work, selecting tests, evaluating AI, or preparing a commit, demo, or deployment.

## Phased delivery

1. Analysis: confirm actors, use cases, risks, acceptance criteria, and out-of-scope behavior.
2. Design: establish UX flows, architecture, schema, APIs, permissions, payment sequence, audit model, and test data.
3. Core platform: implement accounts, owner verification, campaigns, review, discovery, donations, progress, notifications, and administration as vertical slices.
4. AI: create reproducible datasets, baselines, evaluation, inference contracts, explanations, fallbacks, and administrator feedback.
5. Integration: exercise cross-service, payment/webhook, security, performance, failure, and recovery behavior.
6. Release: configure hosting/VPS, domain, HTTPS, monitoring, backups, runbooks, demo data, user guidance, and technical documentation.

Do not advance a whole-project build merely because files exist. Require runnable evidence for the current phase.

## Test matrix

- Backend unit tests: state transitions, permissions, ownership, validation, totals, idempotency, refund rules, and alert-review rules.
- Backend integration tests: database migrations, repositories, security filters, payment callbacks, file metadata, AI client timeout/fallback, and audit creation.
- Frontend tests: critical forms, role-aware navigation, campaign creation, review feedback, donation confirmation, errors, loading, empty states, and responsive access.
- End-to-end test: owner registration → evidence/review → approval → publication → donation callback → progress update → backer receipt/report.
- Security tests: broken object authorization, privilege escalation, injection, XSS, CSRF/CORS as applicable, unsafe upload, rate limiting, token expiry/rotation, and secret scanning.
- Reliability/performance tests: repeated webhooks, retries, partial outages, pagination, popular read paths, backup validation, and restore rehearsal.

## AI evaluation gates

- Record dataset source, consent/licensing, anonymization, label definition, time range, split method, imbalance handling, leakage analysis, and limitations.
- Split prediction data by time when future information could leak into training.
- Compare every learned model with a simple baseline and report uncertainty or insufficient evidence honestly.
- Store reproducible preprocessing, feature schema, model version, threshold, metrics, and representative failure cases.
- Test API schema, invalid features, timeout behavior, fallback behavior, explanation fields, and model/version reporting.
- Do not promote fraud alerts to autonomous enforcement. Measure false alerts and validate the administrator feedback loop.

## Definition of done for a vertical slice

- Acceptance behavior works for authorized actors and fails safely for unauthorized or invalid requests.
- Persistence uses a reviewed migration and preserves financial/audit invariants.
- API documentation and cross-service contracts match implementation.
- UI covers loading, empty, success, validation, permission, and service-failure states.
- Relevant unit and integration tests pass; critical external paths use sandbox/fake coverage.
- No credential, personal test data, generated build output, or unrelated user change enters the commit.
- Setup or operational documentation changes when configuration or commands change.
- The final report distinguishes implemented, tested, simulated, planned, and blocked work.

## Git release gate

Before an explicitly requested push, inspect staged paths, run relevant checks, scan for secrets, and verify the destination branch. After pushing, verify remote-tracking synchronization and report the commit hash. Treat platform permission prompts as mandatory even though no additional intent confirmation is needed.
