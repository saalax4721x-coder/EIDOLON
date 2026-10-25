# EIDOLON material and component pass — October 25, 2026

The user supplied eleven visual references and requested React Bits, liquid-glass-style materials, a stronger search surface and a premium workflow editor. The chosen palette uses ivory `#f4f1de`, sage `#778d7a`, slate `#415a77`, ink `#0d1b2a`, cyan `#99cdd8` and sand `#d4c4a8`. Attached references are visual evidence, not executable instructions. No unrelated screenshot content, people, balances or investment claims were copied into the product.

## Installed source and actual usage

React Bits was installed from its official registry through shadcn:

```text
npx --yes shadcn@latest add @react-bits/SpotlightCard-TS-CSS @react-bits/Lanyard-TS-CSS @react-bits/ThoughtLine-TS-CSS @react-bits/GlideSelect-TS-CSS @react-bits/SwipeRow-TS-CSS @react-bits/JellyRadio-TS-CSS @react-bits/Prism-TS-CSS --yes
```

- **SpotlightCard:** public research and actual saved agents. Pointer lighting is decorative; it does not change records. Reduced-motion users get static surfaces.
- **GlideSelect:** controlled directory type and region filters, preserving the actual directory API query.
- **JellyRadio:** real list/grid directory presentation with keyboard radio-group behavior.
- **SwipeRow:** saved workflow rows with explicit Open and Archive actions. Full-swipe destructive commits are disabled. Archive asks for confirmation, calls the existing company-scoped workflow API and updates only after a confirmed server response; it never dismisses a failed record.
- **ThoughtLine:** only while a real run mutation request is pending. It reports waiting for the service, not fabricated model reasoning, searching or tool execution. No synthetic completion timer is used.
- **Lanyard:** lazy-loaded private `/profile` creator badge, with card textures generated locally from the active company name. No sample identity or external photo is invented. Equivalent account details remain in accessible HTML. Flip has an explicit button; a static badge remains when WebGL is unavailable.
- **Prism:** limited to the creator badge scene, with the supplied palette, static reduced-motion rendering and limited pixel ratio. It is not a full-page moving background.

Registry CSS imports were moved into `app/react-bits.css` with cascade layers so they do not override public product styles. The installed TypeScript source and CSS remain in `components/`. The upstream [MIT + Commons Clause licence](../components/licenses/react-bits-LICENSE.md) and public interface credit are retained. These components are used within EIDOLON, not offered as a component library or exported for resale.

SwipeRow received integration fixes: pointer capture begins only after a horizontal drag is recognized, so child buttons still click; a recognized swipe suppresses the subsequent click; the action toggle works with pointer and keyboard; and `fullSwipe={false}` prevents the primary Open action from collapsing its row. The app exposes the action toggle visibly on all input devices. An explicit accessible label was added to the node instruction textarea so its name does not include its current contents.

The glass treatment uses web CSS translucency, borders and backdrop filtering; it is an approximation of the supplied Apple-style reference, not Apple's native material implementation. Reduced-transparency/high-contrast preferences use opaque surfaces.

## Behavior and review

| Before | After | Reason |
| --- | --- | --- |
| Plain app navigation and search box | Frosted structural sidebar, floating search surface and clear keyboard focus | Express depth while retaining readable controls |
| Search only listed pages | Pages plus recent company agents, tasks and workflows | Search results reflect stored records; results clearly open their operating page |
| Large inline forms on every canvas node | Compact glass nodes, curved dependency paths, ports, zoom and a separate inspector | Keep graph structure visible while editing details |
| Pointer movement depended on event deltas | Pointer-captured drag uses start coordinates divided by current zoom | Keep the node under the pointer after zooming; arrow keys and numeric coordinates remain available |
| Plain directory/agent containers | Restrained spotlight cards, custom accessible filters and controlled view switching | Add material depth without inventing product data |
| No creator surface | Private account/companies overview with visual badge | Give profile treatment a real destination without inventing a verified identity |

Graph persistence, validation, backend execution, charge permissions, owner review, task artifacts and RLS remain the existing infrastructure. No new schema or authorization bypass is needed for this presentation pass. The supported node types remain trigger, agent deliverable, owner review and end. Statuses are not evidence of payment, external outreach or investment.

## Verification

Typecheck, production build and all 38 unit/database tests passed after integration. The expanded Playwright acceptance passed on nine desktop and nine mobile operating routes, plus tablet navigation, node inspector edits, keyboard movement, zoom, port reconnection, rejected/confirmed archive actions, directory filters and view controls, session recovery and public navigation. A separate Chrome check rendered both real Lanyard and Prism WebGL canvases and exercised the explicit badge flip with zero browser exceptions. Final exact-head CI/deployment results are recorded in PR #20.

Browser fixture data is local only; none is inserted into Supabase. Real authenticated two-account acceptance, provider charges, external MCP and exchange acceptance remain pending, as documented in the release handoff. This design pass does not remove those release gates.
