---
name: build-crowdfunding-platform
description: Implement, extend, diagnose, review, test, document, and ship the DATN crowdfunding platform for social and startup projects. Use whenever Codex works in this repository on the Next.js frontend, Spring Boot backend, FastAPI AI services, MySQL/Redis/storage/payment integrations, campaign and donation workflows, administration, security, AI evaluation, deployment, or Git delivery.
---

# Build Crowdfunding Platform

## Establish project context

1. Locate the repository root containing `README.md` and `main.pdf`.
2. Read `README.md` before planning or changing the system. Consult `main.pdf` when a requirement is missing or ambiguous.
3. Run `python .codex/skills/build-crowdfunding-platform/scripts/inspect_workspace.py .` to identify implemented components and Git state.
4. Inspect applicable `AGENTS.md` files, existing code, migrations, API contracts, tests, and configuration before editing.
5. Read only the references needed for the task:
   - Read [domain-rules.md](references/domain-rules.md) for actors, campaign states, permissions, payments, transparency, administration, or AI behavior.
   - Read [architecture.md](references/architecture.md) for service boundaries, repository layout, APIs, persistence, integrations, security, or deployment.
   - Read [quality-gates.md](references/quality-gates.md) for implementation sequencing, tests, AI evaluation, release readiness, or completion criteria.

Treat the current user request as the immediate objective. Preserve compatible committed behavior. When code and project documentation disagree, identify the conflict and avoid silently changing business meaning.

## Choose the work scope

- For a focused feature, deliver the smallest complete vertical slice rather than unrelated scaffolding.
- For a whole-project request, execute the phased delivery sequence in [quality-gates.md](references/quality-gates.md), verifying each phase before continuing.
- For diagnosis or review, inspect and report evidence without modifying code unless the user also asks for a fix.
- For an empty or partial repository, create only the components required by the current phase. Do not claim planned capabilities are implemented.

Prefer the existing repository structure and conventions. When none exist, use the layout in [architecture.md](references/architecture.md).

## Deliver a vertical slice

1. Define observable acceptance criteria and affected actors.
2. Identify the owning service and the minimum data/API contracts.
3. Add a database migration before relying on new persisted fields.
4. Implement backend rules, authorization, validation, error handling, and audit behavior.
5. Integrate AI or external providers through explicit interfaces with deterministic fallback behavior.
6. Implement frontend loading, empty, success, validation, authorization, and failure states.
7. Add tests at the lowest useful layer and an integration test for critical cross-service behavior.
8. Update OpenAPI and project documentation when behavior or setup changes.
9. Run relevant checks and inspect the final diff for unrelated or sensitive content.

Do not invent provider credentials, production URLs, model results, or commands unsupported by repository files.

## Enforce project guardrails

- Keep payment processing in sandbox or simulation until the user explicitly supplies an approved production integration and its legal/security requirements.
- Never store card data. Verify signed payment callbacks and make webhook processing idempotent.
- Enforce least privilege, ownership checks, input validation, rate limits, secret isolation, HTTPS assumptions, and audit logs for sensitive actions.
- Require administrator review before suspending, rejecting, or accusing a user based on an AI risk result.
- Return explanations and model/version metadata with AI scores where the contract permits.
- Minimize and normalize data sent to the AI service; avoid unrestricted database access and unnecessary sensitive features.
- Derive raised amounts and other financial totals from verified transactions, not user-editable counters.
- Preserve timestamps, actor identity, and version history for important campaign, plan, report, and moderation changes.
- Provide a non-AI fallback for user-facing recommendations and graceful degradation when optional services fail.

## Handle Git delivery

Interpret an explicit user instruction to “push”, “đẩy lên Git”, “đẩy lên GitHub”, or equivalent as authorization to complete the normal Git delivery flow for the requested work. Do not ask the user to confirm the same intent again.

1. Inspect the current branch, upstream, remotes, and working tree.
2. Stage only files created or changed for the requested task. Include required linked artifacts, migrations, tests, and documentation; preserve unrelated user changes.
3. Run applicable validation before committing.
4. Create a concise conventional commit message if the user did not provide one.
5. Push to the configured upstream or the clearly intended remote branch.
6. Verify that local HEAD and the remote-tracking branch match, then report the commit hash and remote branch.

If no explicit push instruction exists, stop after local changes and report that they are uncommitted. Never force-push, rewrite history, delete branches, or include unrelated files unless the user explicitly requests that exact operation. Follow mandatory tool or platform permission prompts; they are security controls, not requests for repeated business confirmation. If authentication, branch protection, or a remote conflict blocks the push, preserve the commit and report the exact blocker.

## Finish with evidence

- Summarize completed behavior, not just edited files.
- List validation commands and their outcomes.
- State any unimplemented requirement, assumption, sandbox limitation, or AI data limitation.
- When Git delivery was requested, include the commit hash, branch, remote, and synchronization result.
