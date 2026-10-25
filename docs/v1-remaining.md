# EIDOLON V1 — remaining work

Status reviewed October 25, 2026. PR #20 remains open and unmerged. This is the current checklist; older dated handoff entries are historical evidence.

## Already implemented and verified

The company dashboard/sidebar, company-scoped workflow studio, agent/task forms, lead pipeline, quotes/jobs, encrypted connections, MCP configuration, sponsorship forms, public marketplace, help/legal drafts and React Bits/glass presentation are implemented. Implementation head `6ce5c7d50b9ba4c9a5cb59d5c52ef7cee40d357e` passed both GitHub Verify runs ([40206694839](https://github.com/saalax4721x-coder/EIDOLON/actions/runs/40206694839), [40206690733](https://github.com/saalax4721x-coder/EIDOLON/actions/runs/40206690733)) and deployed successfully to Vercel preview. There are 38 passing unit/database tests. Browser acceptance covers nine populated desktop/mobile operating routes using local fixtures; separate graphics checks rendered Lanyard and Prism. Deployed anonymous checks cover 19 pages, five denied private API reads, three mobile routes, the actual public WebGL hero and six sourced profiles, with no browser exceptions.

These results do not establish a real signed-in owner workflow or a production-ready release. See [premium workspace evidence](premium-workspace.md).

## Release gates, in order

| Gate | What is still required | Current dependency |
| --- | --- | --- |
| 1. Reliable branded email | Configure a verified sending domain/provider; apply and read back branded hosted templates; receive fresh signup/returning-user emails and finish their matching callbacks | Domain and sending-provider setup. Read-only October 25 check confirms custom SMTP remains absent; test account B is not a team member |
| 2. Real two-account acceptance | Sign in both real accounts; create/reload/switch verification companies; persist workflows and customer/sales records; verify cross-company HTTP and Data API reads/writes are denied; exercise refresh/logout/expired links | Working email delivery and real sessions. Do not substitute fixture users, privileged sessions or disabled confirmation |
| 3. Actual AI run | Connect a valid test provider; activate an agent; run start → agent → owner review → finish; inspect saved outputs, error/cancellation/interruption behavior and duplicate-call protection | Test API connection and explicit owner permission for usage charges |
| 4. External MCP acceptance | Connect an actual supported external client, check permitted operations and denied scopes, revoke the token and verify denial afterward | Real owner session and external client setup |
| 5. Sponsorship acceptance | Publish from one verification company, apply from the other, review/withdraw and check private pitch/decision access from unrelated identities | Real separate account sessions; no fabricated sponsors or investment claims |
| 6. Legal and public identity | Supply operator/business name, country/jurisdiction, working public support/privacy contact and official social links; review launch drafts for the intended market | User's actual business details. Social links are deliberately pending |
| 7. Database maintenance | Back up and reconcile the 16 older migration-version/name mappings before a general migration push; inspect policies/advisors afterward | Reviewed migration mapping and safe maintenance execution. The additive workflow/dashboard migration already applied October 18 must not be replayed |
| 8. Public release | Choose/verify the production domain, environment and Auth callbacks; complete the above acceptance; then deliberately merge/promote when authorized | Release acceptance and explicit publishing decision. Current verified deployment is a protected preview |

## Product limits that remain visible

- Marketplace is an initial six-profile directory with dated official sources, not a continuously refreshed web feed. Broader coverage and recurring source review/ingestion remain product work before advertising a live marketplace feed. Public entries are not app users, sponsors or confirmed investment interest.
- Workflows execute supported provider deliverables and owner review, one Continue request per step. Background schedules, condition nodes, outbound email, payments and external business dispatch are not currently implemented integrations.
- Activity is derived from saved task/run records. Push/email notification delivery is not implemented merely by showing activity or preparing email templates.
- Legal pages remain drafts until the actual operator details and review are complete.

The first actionable dependency is the sending domain/provider. The [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp) explains the default mailer's team-recipient restriction. Repeating sign-in requests does not resolve that restriction. No organization access grants or authentication bypasses were used.
