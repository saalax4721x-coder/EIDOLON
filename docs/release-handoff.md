# EIDOLON — release verification and repository handoff

Updated 2026-10-16. This file records **verified** facts and explicit release gates. It is not a declaration that EIDOLON is production-complete. The October 16 workflow continuation below supersedes older candidate/check statements for the new changes.

## Scope already implemented

- EIDOLON network: authenticated project creation, source-backed discovery, project detail, relationships, graph, optional economy.
- Company Foundry: company creation and ownership, provider connections, encrypted credentials, AI workforce lifecycle, tasks and saved artifacts.
- Remote company MCP connector with scoped revocable access.
- Customer lead pipeline, next actions and stages.
- Customer-linked quotations, jobs and appointments; persisted status tracking.
- CSV export for currently loaded leads, quotations and jobs (100-record limit per resource). These are not full backups.
- Company workspace navigation, dashboard, and stale-response protection.
- Sponsorship Exchange: opted-in company offers, authenticated founder applications, sponsor review inbox, status tracking, applicant withdrawal, and optional publicly listed sponsor contact email. This is an internal marketplace, not automated outreach or a funding commitment.

## Confirmed automated checks

The GitHub Actions Verify workflow installs dependencies, runs TypeScript typechecking, and builds Next.js. The head `f6cec98a9ab3d12c13506750b6f0f560d09cb212` passed workflow `38764098266`. A successful build is not proof that authenticated flows, provider calls, email delivery, or MCP integrations work end to end.

## Release gates requiring a real account and browser

1. Sign up through the real email magic-link flow; verify email redirect and session refresh, logout, expired link and unauthorized route behavior.
2. Create a company and verify its owner membership. Refresh, switch companies, verify isolation and persistence.
3. Connect a valid **test** provider API key; create an employee, activate it, run a real low-cost task, confirm archived output. Test invalid/revoked key and failed task.
4. Create lead, update stage and follow-up, refresh. Create quote, link job, update statuses, refresh, export CSV. Test unauthorized access from a different signed-in user.
5. With two separate real company accounts, publish a sponsor offer, discover it from the other account, submit a pitch, review it from the sponsor account, and verify unauthorized decisions are blocked. Confirm a third account cannot read private pitches.
6. Connect an external MCP client, exercise each allowed operation, revoke the token and confirm subsequent calls are denied.
7. Verify the Supabase Auth redirect allow-list, required production environment variables, security advisories, and network timeouts.
8. Verify the actual production domain deployment. Do not assume a successful GitHub build means Vercel deployed.
9. Review UX on desktop/mobile, accessibility, error states and empty states before the visual redesign.

## Boundaries

- Company records are **not** government registration or proof of a legal company.
- Quote status changes do not send quotes; job status changes do not dispatch staff; leads are not proof of outreach.
- No production payment processing, wallet transaction, on-chain settlement, outbound messaging or automated dispatch should be advertised without separately verified integration.
- Consumer ChatGPT/Claude subscriptions do not replace API credentials for EIDOLON-hosted AI employees.
- Do not store real credentials, tokens, exported customer data or secrets in the repository or handoff ZIP.

## Packaging for redesign

Use the GitHub branch `feat/chromatic-surface-language` (PR #20) as the current functionality-first candidate, not `main` unless merged after acceptance. Export the source using GitHub's **Code → Download ZIP** for that branch, or `git archive` locally. Include migrations and documentation; exclude `.env*`, `node_modules`, `.next`, generated exports and secrets. Preserve `app/api`, `lib`, and `supabase/migrations` during the frontend redesign.

**Merge policy:** PR #20 stays open until the above authenticated release gates are passed or explicitly accepted as known risks.

## October 16 security audit

Reviewed live sponsorship RLS policies and found an ambiguous SQL column reference in the published-offer validation. Corrected it with an explicit outer-table correlation in `20261016001000_sponsor_offer_correlation.sql`; applied and confirmed the live policy definition. Previous `80b1dfa` passed GitHub Verify and Vercel status succeeded. The new security-fix commit requires its own CI/deployment confirmation. No multi-user end-to-end run has yet been completed.

## October 16 identity hardening

`20261016023000_sponsorship_identity_guards.sql` installs invoker-rights database triggers. They derive sponsor/applicant display names from owner-controlled company records on insert, prevent reassignment and pitch/content tampering through direct Data API access, and block reopening withdrawn applications. Migration applied; trigger existence verified. These are structural security checks, **not** substitutes for multi-account authenticated E2E tests. GitHub Verify for commit `65b2f1b` succeeded; Vercel reported build-rate-limit failure for that commit. Latest security migration needs its own CI/deployment confirmation.

## October 16 workflow continuation

The starting branch head in this workspace was `93cdcdf0ca45b98aae6da66e860a452109526c64`, newer than the supplied `8a95c21`. GitHub Verify runs `38940900246` and `38940891435` succeeded for that starting head, and GitHub reports a successful Vercel preview deployment (`7125519445`). Those checks do not apply to later commits.

Implemented actual workflow execution through the existing provider/task/artifact infrastructure, graph validation, owner review gates, persisted immutable run snapshots and logs, concurrent-step claims, duplicate-task protection, failure/interruption handling, workflow deletion/archival, template, and editor movement/instructions. Dashboard aggregation now includes status breakdowns and separately grouped quoted amounts/currencies without REST pagination truncation. Added navigation and company context links, loading/empty/error handling, a committed dependency lockfile, and test execution in CI. Fixed agent-only task invocation and unconfirmed task completion reporting. See [workflows.md](workflows.md) for behavior, APIs, limits and migration order.

Local automated evidence: all **20** graph/route/task-runner and PostgreSQL migration/RLS checks pass, including workflow task uniqueness. Standalone TypeScript and diff whitespace checks pass. The final production build passes with `node --max-old-space-size=256 node_modules/next/dist/bin/next build`. An unrestricted-heap attempt exhausted machine memory; limiting the heap resolved it. A separate sandbox-only build had failed writing generated page files and passed outside that sandbox. Remote exact-head checks must be verified independently.

Built-app HTTP smoke checks also passed: `/dashboard` and `/workflows` returned 200; dashboard/workflow/run reads and workflow/run/generation writes returned 401 without a session (eight assertions total). This verifies the actual built Next.js runtime's public pages and anonymous API denial, not authenticated behavior or browser interactions.

Explicitly blocked/unverified:

- **Live migration not applied in this session.** Supabase CLI returned `AccessTokenRequiredError`; no connected project credentials were available. The new dashboard RPC and run tables require the migration before use. No live database advisors or live authenticated query has been run.
- **Authenticated two-account E2E not performed.** No actual user/sponsor records or provider credentials were fabricated. Local test identities and mocked provider boundaries are not live account testing.
- **Browser smoke test incomplete.** The remote browser could not reach the local server; local Chrome then failed with insufficient machine resources. No full UI/browser pass is claimed.
- **Live provider/MCP/outbound integrations not reverified.** Real task execution requires a connected API key. Workflows only support provider-generated deliverables and owner review; they do not add outreach, financial transactions or automated business dispatch.
- **Publishing restored after GitHub sign-in.** Implementation commit `e3962374b324dcdcc7ad5e8f19e41dcc7fc91b65` was pushed to `feat/chromatic-surface-language`, PR #20. The earlier credential error is resolved. Exact-head GitHub CI and Vercel results are recorded in the PR description after remote verification; do not reuse a previous head's success. PR #20 remains open and unmerged. Publishing source does not apply the Supabase migration or establish authenticated E2E acceptance.
