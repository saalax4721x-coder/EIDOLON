# EIDOLON Company Foundry and external AI assistants

## What this feature does

- Creates a persisted company workspace and owner membership.
- Stores human/AI workforce role profiles.
- Connects OpenAI, Anthropic, or OpenRouter through server-side API keys.
- Runs real provider requests for planning, research, content, marketing, product, coding, and operations deliverables.
- Exposes company-scoped EIDOLON tools over a stateless MCP HTTP endpoint so a supported ChatGPT or Claude connector can read the company, review saved artifacts, queue work, and save assistant-generated content to the company archive.

An MCP connection exposes EIDOLON's company tools to an external assistant. It does **not** import a private Custom GPT or Claude Project as a background agent inside EIDOLON. For AI employees executing inside EIDOLON, use a supported provider API connection. Never collect consumer-account passwords or automate private browser sessions.

## Required setup

1. Apply migrations in order:
   - `20261013120000_digital_companies_ai_workforce.sql`
   - `20261013140000_company_mcp_access.sql`
2. Configure `EIDOLON_AI_ENCRYPTION_KEY` in Vercel Preview and Production as a fresh 32-byte key encoded in Base64. Generate one with `openssl rand -base64 32`. Keep it in your secret manager; never commit it, paste it into source, or reuse the GitHub-token encryption key. Changing it later without a credential re-encryption migration makes existing saved AI credentials unreadable.
3. Deploy the application after migrations and the environment variable are configured.
4. Sign in, launch a company, then connect a provider API key if you want EIDOLON-hosted employees to execute model calls.

## Connect ChatGPT or Claude

1. In the company workspace, create an MCP connection. EIDOLON shows the raw bearer token once only; copy it into the external assistant's secure connector settings.
2. Configure the remote MCP URL as `https://<your-eidolon-domain>/api/mcp/company`.
3. Configure bearer-token authentication using the generated company token, where the external client supports it.
4. The available tools are:
   - `get_company_overview`
   - `list_company_artifacts`
   - `create_company_task`
   - `save_company_artifact`
5. Test by asking the external assistant to read the company overview, create a short plan, and save the plan to the EIDOLON archive. Verify the artifact appears in the company workspace.

Exact connector availability and authentication UI vary by ChatGPT/Claude plan and current product support. If a client only permits OAuth-managed connectors, do not paste account credentials or try to bypass that requirement; use the provider API connection or wait until an official supported OAuth flow is configured.

## Security model

- Raw provider API keys are encrypted with AES-256-GCM and are never returned by list endpoints.
- MCP tokens are high-entropy random values. Only SHA-256 hashes are stored.
- Each MCP token is scoped to one company, and can be revoked by its owner.
- The MCP server only exposes explicitly allowlisted read/task/artifact operations.
- Queued work is reported as queued, never as completed. Saving an artifact records that the external assistant supplied content; it does not independently verify the content's claims.
- No API key, bearer token, consumer account password, or session cookie should be committed to Git.
