# EIDOLON — release verification and repository handoff

Updated 2026-10-15. This file records **verified** facts and explicit release gates. It is not a declaration that EIDOLON is production-complete.

## Scope already implemented

- EIDOLON network: authenticated project creation, source-backed discovery, project detail, relationships, graph, optional economy.
- Company Foundry: company creation and ownership, provider connections, encrypted credentials, AI workforce lifecycle, tasks and saved artifacts.
- Remote company MCP connector with scoped revocable access.
- Customer lead pipeline, next actions and stages.
- Customer-linked quotations, jobs and appointments; persisted status tracking.
- CSV export for currently loaded leads, quotations and jobs (100-record limit per resource). These are not full backups.
- Company workspace navigation, dashboard, and stale-response protection.
- Sponsorship Exchange: opted-in company offers, authenticated founder applications, sponsor review inbox, status tracking, and company name on offers. This is an internal marketplace, not automated outreach or a funding commitment.

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
