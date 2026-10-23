# Company workflows and operational dashboard

Functionality-first changes for PR #20. The existing visual language is retained.

## Dashboard

`/dashboard` selects an owned company and loads `/api/company/dashboard`. PostgreSQL's invoker-rights `company_dashboard` function returns exact record counts and breakdowns for agents, tasks, leads, quotes, jobs, workflow definitions/runs, sponsorship offers, applications sent and applications received. Aggregation happens before REST pagination; missing tables/RPCs are errors, never zero counts. Quote amounts are grouped by currency and status, returned as decimal strings, and labeled quoted value rather than revenue. Refresh is manual and its timestamp is displayed. These are recorded states, not proof of outreach, funding, payment or service delivery.

## Editor and execution

`/workflows` supports company-scoped lists, an agent/review template, graph creation/editing/deletion, connections/disconnections, agent instructions, labels, drag/keyboard/coordinate movement, and persisted positions. Save incomplete drafts; validate before execution. Switching company or definition warns about unsaved edits. The command menu links to dashboard, workflows, and sponsorships.

Execution requires a DAG with exactly one start, one finish, at least one agent, no disconnected nodes/cycles/duplicate connections, and assigned active provider agents. A snapshot of the saved graph is persisted at start. Later graph edits do not change an existing run. The owner must explicitly authorize provider usage charges.

Runs execute **one step per Continue request**, in topological order. This is a resumable, owner-operated executor; there is no background worker, scheduler, automatic trigger, parallel provider execution or unattended continuation. A branch executes every connected action; connections are dependencies, not conditions. A join waits for all its parents. Ancestor outputs become bounded reference context for downstream instructions; outputs from unrelated branches do not.

Supported actions:

- Start and finish record actual control-flow progression.
- Agent invokes the existing provider task runner with the assigned agent's instructions, connection and model. Supported providers remain OpenAI, Anthropic, and OpenRouter. Real results and artifacts go into existing company work history. Prompts do not grant tools, send messages, create quotes/jobs, transfer funds, or contact leads.
- Review pauses the run until the owner inspects prior results and explicitly approves. Cancelling drops remaining work; it does not undo completed provider calls.

`GET /api/company/workflows/runs?companyId=…` returns the latest 25 runs. `POST` accepts `action: start` with `workflowId` and `confirmProviderCharges: true`, or `advance`, `approve`, `cancel`, `interrupt` with `runId`. Each request also supplies `companyId`. Definitions use GET/POST/PATCH/DELETE at `/api/company/workflows`. Lists currently show the latest 100 definitions; older records remain stored.

Run status and per-step logs include task identities, errors and bounded output previews. Full deliverables remain in company task/artifact history. Task titles include the run's first eight ID characters for investigation. Database task columns also retain full run/node IDs, with a unique constraint allowing only one task attempt per run/node. Provider-backed steps are never silently retried.

## Permissions and failure recovery

Every workflow/run API verifies the session and company ownership. Data access uses the caller's token; no service key or user-editable JWT metadata is used. Workflow/run RLS requires company ownership, and composite foreign keys prevent cross-company links. Run snapshots/identity are immutable, transitions are checked, terminal states cannot be reopened, and optimistic version claims prevent two requests from executing the same step. Existing provider encryption and company/task/MCP policies remain in place.

If a process or network request ends after a model call, its outcome can be unknown. Refresh runs and inspect company work history before doing anything else. A claimed run stays running until the server records the outcome. After four minutes, the owner may mark it failed/interrupted; the operation never repeats the provider call. Failed runs require investigation and a deliberately started new run. Database owners still control their own records; logs are operational records, not a tamper-proof audit ledger.

Definitions with run history cannot be deleted; archive them instead. Runs have no delete permission. This protects their saved graph context.

## Installation and checks

Use Node 22+ and `pnpm@11.25.0`. `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, and `pnpm build` are the CI commands. The lockfile fixes dependency resolutions.

Apply existing migrations in order, including `20261016204000_company_workflows.sql`, then `20261016204100_workflow_execution_dashboard.sql`. The new file was generated with the Supabase CLI and ordered after the already-existing workflow schema. It adds run persistence/RLS, snapshot/state guards, workflow-task correlation, and the dashboard RPC. No application build command applies migrations automatically. Dashboard/runs report unavailable when their migration has not been installed.

The tests compile the actual route modules and inject external I/O boundaries. Provider responses in tests are explicit mocks, not evidence of live provider execution. Database tests execute the actual company/workflow/dashboard migrations in PGlite PostgreSQL with distinct authenticated roles/claims, verify cross-account denial and anonymous denial, immutable snapshots, terminal transitions, one step claim/one task attempt, and counts above the REST row limit with separate currencies. Their local fixtures never enter a connected production database. This is not a full Supabase Auth/PostgREST integration test.

## Remaining acceptance gates

- Apply the new migration to the intended Supabase project, inspect live policies/functions/advisors, and query the dashboard as both owner and non-owner.
- With two real signed-in accounts, create companies/agents/workflows, save and reload, switch companies, attempt cross-company HTTP and Data API access, and verify denial.
- With a valid test API connection, run start → agent → review → finish. Verify the saved task/artifact, approval gate, reload persistence, provider failure, concurrent Continue requests, cancellation, and interrupted-step handling. Review usage charges.
- Repeat existing company creation, encrypted connections, task queue, leads/quotes/jobs, sponsorship exchange, session refresh/logout and external MCP/revocation tests. No changes here establish that those integrations passed.
- Check desktop/mobile keyboard and pointer interactions in the deployed app and verify exact-commit GitHub CI/Vercel results. A successful build or Vercel status alone is not authenticated E2E acceptance.
