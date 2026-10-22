# Porcelain product surfaces — October 22, 2026

The user supplied `EIDOLON Porcelain (1).html` and explicitly authorized applying the design, superseding the earlier functionality-only/no-redesign constraint. Its CSS informs `app/porcelain-reference.css`; the existing functional layout CSS is preserved in a lower cascade layer in `app/legacy.css`, with product adaptations in `app/porcelain.css`.

The supplied file's bundled demo JavaScript overrides `fetch` and invents projects, sign-ins and account connections. **None of that runtime or demo data was copied.** The landing page's lightweight SVG chrome sculpture and stage buttons explain features and navigate to the real product. Typography is locally hosted Geist with its OFL licence; there is no Google Fonts request in the app.

## Added and retained

- Porcelain landing page, responsive shared navigation, existing command dialog, global footer, skip link, and branded missing/loading/error pages.
- Expanded FAQ, step-by-step guide, and a separate how-it-works page linked to actual functionality.
- Activity/notifications derived from existing owner-protected work history and workflow-run APIs. Review, ready, failed and completed states are filtered from loaded records; no unread/push delivery or fabricated messages are claimed. Loading/error/retry/empty states and cancellation of stale company requests are included. Current source limits are stated (50 tasks, 25 runs).
- Branded sign-in instructions/errors and an active-session-expiry notice. Anonymous page visits do not produce an expired-session notice; only a previously recognized session losing access does. Existing PKCE, protected cookies and safe redirect validation remain in use. `/signin`, `/signup` and `/connections` route to the actual supported flows; no unsupported Google sign-in button was copied.
- Twelve versioned authentication/security email templates, a manifest and a reproducible renderer. Hosted application still uses the project's existing default email provider until the blocked customization can be applied.
- Company, dashboard, workflows, provider credentials, tasks, MCP, leads, quotes/jobs, sponsorship exchange and database policies remain on their existing infrastructure. No schema migration or live business test fixtures were added for the design.

## Legal and social pages

Terms, privacy, cookies, acceptable use and a legal index are prepared as **launch drafts**, with an explicit operator/contact/jurisdiction setup state. The user asked to link official social accounts later, so X is a non-clickable pending label. No nonexistent profile URL, company registration, support mailbox or legal jurisdiction is invented. `lib/site.ts` holds the future operator-approved values.

The privacy text describes the code's current data categories, provider calls, cookies and incomplete deletion/export/retention procedures. It does not claim universal legal compliance, an established request inbox or a completed legal review. The official [European Commission privacy information](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en) and [ICO storage guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/) informed the disclosure checklist. Applicable markets, controller/processor roles, retention periods, contracts and consumer rules still require operator details and jurisdiction-specific review.

## Verification boundaries

All **32** automated checks pass. Existing PostgreSQL RLS, workflow/task and auth regression checks still pass, along with two activity-behavior checks and four additional Auth checks for transient outages preserving cookies, rejected refresh credentials clearing them, malformed responses, and session rotation. Standalone typecheck and the final production build pass. Local browser checks use the actual built application: fifteen desktop routes returned 200 with one footer and no horizontal overflow; eleven routes had no page overflow at 390px. FAQ keyboard expansion and command-dialog focus restoration passed, with no page errors. A mocked rate-limit response tested the sign-in error UI without sending mail. These are not authenticated two-account E2E or real provider execution.

Local visual inspection found an inherited dark sign-in-header background and an oversized verification-mark background; the product layer now corrects them. Reviewing the session notice exposed an existing Auth bug: temporary upstream failures could be treated as expired credentials. Refresh and session inspection now bound upstream requests, return 503 without clearing cookies on outages/malformed replies, and reserve credential removal for rejected sign-in credentials. Final build/check and exact-head deployment evidence are recorded in the PR description after publishing.

The final built-app fixture browser pass also confirmed record-derived activity, clearing the displayed activity after a company switch, authenticated navigation, session-expiry messaging and dismissal. Those mocked account/company/task responses were local UI fixtures, never inserted into Supabase. Eight built-app HTTP checks still pass, including anonymous denial for company dashboard/workflow reads and workflow/run/generation writes.

Still blocked: hosted email subject/body/sender changes need custom SMTP or an eligible Supabase plan; real two-account application acceptance and provider/MCP/sponsorship E2E are not complete; operator/legal/social details are intentionally pending. PR #20 must remain open and unmerged.
