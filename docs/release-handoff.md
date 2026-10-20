# EIDOLON — release verification and repository handoff

Updated 2026-10-20. This file records **verified** facts and explicit release gates. It is not a declaration that EIDOLON is production-complete. The dated live verification below supersedes earlier connection and migration blockers.

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

The GitHub Actions Verify workflow installs locked dependencies, runs tests and TypeScript typechecking, and builds Next.js. Functionality head `97ed21a5e3aa31400ab1258268186fbf4d9ef626` passed Verify runs `39157542566` and `39157538487`; its Vercel preview deployment `7159341368` succeeded. A successful build is not proof that authenticated flows, provider calls, email delivery, or MCP integrations work end to end.

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

- **Live migration applied October 18.** See the live verification below. Earlier Supabase authentication failures are resolved; owner execution and two-account E2E remain unverified.
- **Authenticated two-account E2E not performed.** No actual user/sponsor records or provider credentials were fabricated. Local test identities and mocked provider boundaries are not live account testing.
- **Browser smoke test incomplete.** The remote browser could not reach the local server; local Chrome then failed with insufficient machine resources. No full UI/browser pass is claimed.
- **Live provider/MCP/outbound integrations not reverified.** Real task execution requires a connected API key. Workflows only support provider-generated deliverables and owner review; they do not add outreach, financial transactions or automated business dispatch.
- **Publishing restored after GitHub sign-in.** Implementation commit `e3962374b324dcdcc7ad5e8f19e41dcc7fc91b65` was pushed to `feat/chromatic-surface-language`, PR #20. The earlier credential error is resolved. Exact-head GitHub CI and Vercel results are recorded in the PR description after remote verification; do not reuse a previous head's success. PR #20 remains open and unmerged. Publishing source does not apply the Supabase migration or establish authenticated E2E acceptance.

## October 18 live database verification

Authenticated the official Supabase CLI and linked the checkout to the active **EIDOLON** project, `bqpdjhcshjjfqcbcnotj`. The current Bun-based CLI crashed on this Windows machine because its paging file was exhausted; official Go-based releases were downloaded from Supabase's GitHub releases and their SHA-256 digests checked against the published asset metadata. No credentials or verification codes are stored in this repository.

Read-only inspection confirmed that the workflow-definition table already existed, while workflow runs, task/run correlation, and the dashboard RPC were missing. The general migration dry run refused to proceed because 16 older remote migration timestamps differ from the repository filenames, despite matching migration names. For example, live `20261016173425_company_workflows` corresponds to repository `20261016204000_company_workflows.sql`.

**No earlier migration history was repaired, deleted, or replayed.** Applied only `20261016204100_workflow_execution_dashboard.sql` in a transaction with an advisory lock and duplicate/schema guards, and inserted its version, name, and exact source statements into `supabase_migrations.schema_migrations` in that same transaction. The live receipt confirms version `20261016204100`, name `workflow_execution_dashboard`.

Confirmed on the live database:

- Run RLS is enabled; SELECT/INSERT/UPDATE require the existing company-owner helper and INSERT/UPDATE check `created_by = auth.uid()`.
- Composite workflow/company foreign keys, task/run company foreign key, and unique run/node task-attempt index exist.
- The run snapshot/state guard trigger is installed. Both new functions use invoker rights with an empty search path.
- Anonymous roles cannot SELECT/INSERT runs or execute the dashboard. Authenticated roles cannot DELETE runs and can invoke the owner-checked dashboard function.
- Four live role-denial checks passed: anonymous run SELECT, anonymous dashboard invocation, authenticated dashboard invocation with no owner subject, and existing MCP authentication with a missing token. These checks made no persistent test records.
- Security advisors reported **zero errors and two warnings**: the existing anonymous-callable `SECURITY DEFINER` MCP function (it deliberately uses its own hashed-token/revocation/scope gate; missing-token denial was tested), and disabled leaked-password protection in Supabase Auth. No protection settings or MCP access were changed merely to silence these warnings.

The live company and distinct company-owner counts are both **zero**. Consequently, a successful real-owner dashboard call, saved workflow/provider run, and two-account isolation test are still blocked on real user/company setup. No users, companies, sponsors, provider connections, tasks, or workflow runs were fabricated for live testing.

`a8d78b51ef8cd6578e91527c728ba8b2db9de548` passed GitHub Verify runs `38951147133` and `38951140428`, and Vercel preview deployment `7127079747` succeeded. Direct preview GETs reached Vercel SSO; this establishes a successful deployment, not authenticated application acceptance. The PR description carries the verification for its latest head after subsequent documentation commits.

Remaining release gates: reconcile the historical migration filename/version drift before a general `supabase db push`; complete actual owner/provider execution and authenticated two-account browser E2E; verify deployed application behavior behind Vercel protection; complete existing email/session, sponsorship, and external MCP/revocation acceptance tests. PR #20 stays open and unmerged.

## October 18 magic-link sign-in repair

The account-setup audit found that `/api/auth/request-link` sent `code_challenge` and `code_challenge_method` inside a supabase-js-style `options` object to the raw Supabase Auth endpoint. Supabase's [Auth request definition](https://github.com/supabase/auth/blob/master/internal/api/otp.go) and [official client implementation](https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts) place the challenge fields at the top level of the body, and pass the email callback through the `redirect_to` query parameter. The old request could therefore initiate a flow without the PKCE authorization code required by EIDOLON's callback.

Corrected the raw request format and callback destination, shared the internal-return-path validation, and added bounded requests and useful provider/network errors. The callback now validates the verifier and session response, clears temporary sign-in cookies on success or failure, and returns expired/invalid links to the sign-in page with a useful error while preserving the safe destination. Session cookies are installed only after a valid token exchange. No website redesign or new user/provider records were introduced.

All **26** automated checks pass, including six new sign-in regression checks for challenge/verifier matching, request/callback destinations, invalid inputs, expired links, rejected or malformed token exchanges, outages, and HttpOnly session cookies. Standalone TypeScript, full production build, and the existing eight built-app HTTP smoke checks also pass. External Auth calls in these tests are explicit mocks; actual email delivery, Supabase redirect allow-list, real browser callback and two-account E2E remain unverified until the user supplies real account/company details. The browser-control connection also failed during this attempt, so no new browser acceptance pass is claimed. No sign-in emails were sent without those details.

## October 20 protected-preview and real sign-in checks

The user supplied two real email addresses and authorized Playwright for the acceptance test. Vercel device authorization completed and the CLI identity matched the existing EIDOLON team. Linked this checkout to the existing `eidolon` project; no deployment protection settings were changed. Local `.vercel` metadata, environment files, and acceptance-test session files are ignored.

The exact `97ed21a` preview, `https://eidolon-69cv0usb3-saalaxxasan4721-4419.vercel.app`, returned HTTP 200 through authenticated Vercel access. Playwright reached and read the actual sign-in page using an origin-scoped short-lived development identity. The first account's form submission returned HTTP 200 with `{ok:true}` and displayed the link-sent state. The second account's request initially returned the application's HTTP 503 sign-in-service error; a subsequent request through Playwright's request client returned HTTP 200. A refresh for the first account returned HTTP 429 with the expected rate-limit message. These are real deployed requests, not mocked responses; HTTP 200 only confirms the Auth service accepted the email request, not delivery or account ownership.

Full account authentication remains pending the inbox links and their matching unexpired PKCE sessions. The first account's sign-in needs refreshing after the rate limit permits it. Browser automation also encountered local timeouts and resource exhaustion; only the observations above are confirmed. No company, sponsor offer, task, or workflow run was created during these checks. The real two-account isolation, provider execution, sponsorship exchange, and external MCP/revocation release gates remain open. PR #20 remains unmerged.
