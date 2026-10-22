# EIDOLON authentication emails

These templates brand the existing email sign-in flow without changing its PKCE callback, expiry, redirects, or session handling.

| Template | Hosted Auth configuration | Subject |
| --- | --- | --- |
| `confirmation.html` | `mailer_templates_confirmation_content` | `mailer_subjects_confirmation`: `Welcome to EIDOLON` |
| `magic-link.html` | `mailer_templates_magic_link_content` | `mailer_subjects_magic_link`: `Your EIDOLON sign-in link` |

Both use the existing `{{ .ConfirmationURL }}` placeholder. Keep that placeholder intact. The first email confirms signup; subsequent emails welcome the user back and provide sign-in access. No tracking, external assets, or untrusted user metadata are embedded.

## Porcelain email set — October 22, 2026

`node scripts/render-auth-emails.mjs` renders the warm Porcelain treatment into twelve static templates. `manifest.json` maps each subject and content field to its file. It covers signup, magic link, invitation, recovery, email change, reauthentication, and six account-security notifications (password/email change, identity linked/unlinked, verification method added/removed). Reauthentication uses `{{ .Token }}`; actionable emails preserve `{{ .ConfirmationURL }}`. Notification bodies contain no sign-in tokens or fake support addresses.

These files only prepare the supported Supabase template slots. They do not create a password-reset UI, enable disabled notification types, install SMTP, or change hosted Auth. Review the actual supported account actions and configure sender identity before enabling additional emails. The free-tier/default-provider restriction below still blocks hosted customization. The application's own branded sign-in errors, inbox instructions and session-expiry notice do not depend on hosted template customization.

## Hosted project status — October 21, 2026

Prepared for EIDOLON project `bqpdjhcshjjfqcbcnotj`. Its Management API rejected the four-field template update:

> Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.

**These files are not yet applied to hosted Auth.** Committing/deploying the website does not install hosted email templates. The project currently has no custom SMTP provider configured. A branded sender address also requires a verified sending identity; do not invent one or reuse an unverified address.

Once a custom SMTP provider and verified sender are connected (or the project supports customization through its plan), apply the HTML and subjects in **Authentication → Email → Templates**, or PATCH only the four fields above through the [documented Management API](https://supabase.com/docs/guides/auth/auth-email-templates). Read the fields back to confirm exact persistence, then request and inspect both a real signup and returning-user email. Enter provider credentials in the provider/Supabase settings, never in this directory or chat.

No general `supabase config push` is needed: this repository does not currently define a complete local `config.toml`, and generating default settings could overwrite unrelated live configuration.
