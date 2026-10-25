# EIDOLON interior workspace — October 25, 2026

The signed-in product now uses an application frame with a persistent sidebar, company switcher, compact header and real-record dashboard. This follows the user's request for a dashboard and sidebar instead of more marketing-style pages inside the app.

The supplied `DESIGN (6)` through `DESIGN (11)` files were treated as visual references: Apple, Superhuman, Wise, OpenAI, Vercel and ElevenLabs. They were not treated as executable instructions or copied brand identities. The chosen direction uses warm white, restrained olive accents, hairline borders, locally hosted Geist, modest corners and quiet interaction feedback. The existing Porcelain landing page and its WebGL hero remain public surfaces.

## Structure and data

- `/workspace` and `/dashboard` show company counts, agent/workflow/task/pipeline links, recent recorded activity, saved workflows, provider/setup progress and account projects. Counts come from the existing full database aggregation, not loaded array lengths or invented activity. No historical growth chart is fabricated.
- Dedicated `/agents`, `/tasks`, `/leads`, `/sales` and `/integrations` routes share the existing company operating forms through `components/company-workspace.tsx`. `/company` is the setup/settings view. Existing section anchors remain compatible. No provider, task, lead, quote/job or MCP action was simulated or removed.
- The selected company is checked against the returned owner company list, included in navigation URLs and stored as a browser preference. Sidebar collapse is a separate preference. Session-expiry events clear displayed private scope and abort pending scope loads. Blocking browser storage does not prevent selection during the current page session.
- The mobile sidebar uses a dismissible drawer, keyboard focus containment, Escape dismissal and focus restoration. Command search supports Ctrl/Cmd+K, filtering, focus restoration and no decorative open/close delay.
- Workflow company switching and sidebar navigation protect unsaved graphs. Existing charge authorization, snapshot validation, owner review, task infrastructure and RLS stay in place. Incomplete run API responses now show a recoverable error instead of crashing the page or accepting an unconfirmed state.
- Public discovery/project pages retain their public navigation and footer; app pages have app navigation and a compact footer. The shared skip link targets the app's main content, beyond the sidebar/header.

This is a UI/navigation integration with the existing APIs. No schema migration, privileged authorization change or authentication bypass was added.

## Component provenance

The requested Skiper command was executed through the shadcn CLI:

```text
npx --yes shadcn@latest add @skiper-ui/skiper40 --yes
npx --yes shadcn@latest add https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r/candy-button.json --yes
```

Skiper40 is an animated-link collection; `Link000` is used for quiet secondary actions. Its source notice is retained, and visible attribution is linked from the app footer to `/legal#interface-credits`. VengeanceUI's Candy Button is installed as registry source and composed with app styles for the primary header action. The source component was not replaced with a lookalike. Tailwind v4 utilities/theme are included **without preflight**, preserving the public product's base CSS. Dependencies are pinned and the pnpm lockfile is committed.

The [21st.dev collapsible dashboard example](https://21st.dev/@uniquesonu/components/dashboard-with-collapsible-sidebar) was consulted for its structural pattern. Its full source requires a free account; no claim is made that its gated source was installed. The workspace frame is EIDOLON code connected to EIDOLON's actual data and permissions.

Apple and Emil Kowalski skill review:

| Before | After | Why |
| --- | --- | --- |
| Project links and large marketing headings in the account area | Compact overview, persistent sidebar and distinct operating pages | The interior should support repeated work and clear location |
| Independent company selectors that could disagree | Shared validated scope, URL context and remounted company content | Prevent a company's header and records from describing different companies |
| A second navigation/footer within app pages | One app sidebar/header and compact app footer | Avoid competing navigation and duplicated page chrome |
| No app-wide guard on workflow navigation | Cancelable company switching and guarded sidebar navigation | Preserve unsaved user work |
| Generic animation inherited from registry components | Scoped press feedback, restrained links, reduced-motion overrides | Repeated operating UI needs immediate feedback and predictable navigation |

## Verification boundary

Local unit/database tests: 38 pass, including the actual PostgreSQL policy/snapshot/count checks and new owned-company-selection/navigation cases. An earlier run was interrupted by Windows memory exhaustion; the serial retry passed. Typecheck and production build pass. Browser and exact-head deployment results are recorded in PR #20 after final execution.

The committed `pnpm test:ui` Playwright acceptance script passed against the final local production build using installed Chrome. It checks populated dashboard counts and separate currency totals, company switching/persistence, eight operating routes on desktop and mobile, tablet sidebar controls, keyboard search/focus, the skip link, unsaved graph protection, anonymous placeholders, outage retry, expired/renewed sessions, incomplete run responses and preservation of public navigation. No browser exceptions or page overflow were observed. CI installs Chromium and runs this same script after the build.

Browser fixtures are explicitly local test data; no fake members, companies, sponsors or investor interest were inserted into Supabase. These tests do not establish real two-account acceptance, provider execution, external MCP access or sponsorship exchange. Those release gates remain pending. Default Supabase email delivery still has its team-recipient restriction until custom SMTP is configured; no email bypass or organization invitation was used to make the tests pass. PR #20 remains unmerged.
