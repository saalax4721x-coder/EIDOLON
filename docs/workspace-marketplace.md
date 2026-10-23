# Workspace, Porcelain corrections and public marketplace — 23 October 2026

## What changed

The account-only page and default return to Launch left signed-in users without a workspace hub. `/workspace` now checks the actual session, loads owner companies and projects, links each company to its dashboard/workflows, and provides creation, marketplace and activity routes. `/account` redirects there. Default email-link return and signed-in visits to `/auth` go to `/workspace`; explicit safe return destinations are preserved. An empty account is shown honestly with creation actions. Session outages, record failures, loading and signed-out states are separate; failed requests never display an empty workspace as success.

The active CSS cascade no longer imports `legacy.css`. Reset, reference, product layout and product materials are separate layers. Launch, Graph, Company, Connect, discovery, dashboard, workflows, workspace and marketplace share the supplied Porcelain palette, Geist type, rounded glass and control treatment. The old SVG hero is replaced by the **actual reference WebGL shaders** and its four signed-distance shapes. Stage selection morphs them; drag/arrow keys rotate the object. Offscreen/hidden-page work is paused, reduced motion draws only on change, and failed/lost WebGL uses a static fallback. Shader/buffer/program resources are cleaned up. The supplied file's mocked fetch/auth/product runtime was not imported.

Connect now distinguishes a status outage from a disconnected GitHub account. Repository verification is entered through an owned project, which provides the required project ID. Company AI/MCP connections link to the existing encrypted/scoped configuration. Economy selections without a project are labelled preview; failed saves restore the previous selection.

## Public marketplace data and persistence

`lib/marketplace.ts` contains an initial **six** manually researched public profiles. `/api/marketplace` filters those reviewed records by text, profile type and region; it does not crawl the web on each visitor request. The page provides official-site and evidence links, a review date, profile categories, opportunity limitations, loading/error/retry/empty states and links to EIDOLON projects and the sponsorship exchange.

Evidence reviewed on 23 October 2026:

- [Y Combinator application information](https://www.ycombinator.com/apply)
- [Antler US residency and eligibility](https://www.antler.co/location/us)
- [Sequoia official portfolio](https://sequoiacap.com/our-companies)
- [KKR private equity strategies](https://www.kkr.com/invest/private-equity)
- [YC company profile: Supabase](https://www.ycombinator.com/companies/supabase)
- [YC company profile: Resend](https://www.ycombinator.com/companies/resend)

These profiles are not seeded into app companies or sponsorship tables and do not establish membership, endorsement, current fundraising, available capital or interest in a user's business. Published application routes are distinguished from firm/company profiles. No personal contact data, assets under management, funding totals or individual-investor claims are inferred. This is an initial reviewed directory, **not a continuously updating crawler or a transaction/investment platform**.

An authenticated owner may explicitly save a public profile as a private research lead in a selected company. This uses the existing owner-checked `/api/company/leads` write and its existing RLS; records retain the evidence URL/date, `public_directory` origin and unqualified status. No email/contact/offer is fabricated or sent. Success requires a confirmed saved record ID. Repeat saves are disabled for that profile/company during the current visit; this does not guarantee deduplication after refresh. No new database migration is needed: the directory is a versioned public catalog, and user research uses the existing protected lead schema.

`node scripts/check-marketplace-sources.mjs [report-path.json]` checks only the fixed catalog's public URLs, with timeouts and redirects rejected. It never accepts a destination URL, forwards credentials, scrapes private pages or automatically changes claims/review dates. All six returned HTTP 200 in the local check. Reachability is not a fresh editorial review; update records only after reviewing the supporting content.

## Verification and limits

- 36 automated tests pass, including existing PostgreSQL workflow/dashboard RLS and Auth regressions plus marketplace filtering, API input rejection, evidence fields and research payload semantics.
- TypeScript and production build pass.
- Playwright against the built app confirmed a real WebGL context, stage switching, workspace session gate/records, signed-in Auth redirect, node template creation/validation and marketplace filtering/empty states. Eleven populated desktop and ten mobile route checks had no page overflow or browser exceptions. Company/project/account responses were **local fixtures**, never inserted into Supabase. The final built-app pass also confirmed workspace outage/retry, signed-in Auth redirection and a confirmed research save with source/date and no invented contact. No fixture write reached Supabase.
- Exact-head GitHub CI, Vercel URL and deployed smoke results are recorded in PR #20. A successful deployment or fixture browser pass is not authenticated two-account acceptance.

Still required before a production-readiness claim: real two-account company isolation and workflow/task/provider/MCP/sponsorship acceptance; real provider credentials and permission for any charged execution; final legal operator/contact/jurisdiction details; SMTP or an eligible hosted email plan for applying branded Auth templates. The project currently rejects hosted template customization with its default email provider. Do not claim the templates are active. PR #20 remains open and unmerged.
