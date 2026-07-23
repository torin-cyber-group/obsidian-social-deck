# Obsidian Social Deck

Social Deck is an Obsidian plugin for composing, previewing, scheduling and publishing social media posts through a self-hosted n8n workflow.

## Planned platforms

- X
- Bluesky
- LinkedIn personal profiles and organisation pages

## Architecture

Obsidian remains the source of truth for content and publication status. The plugin sends approved posts to an authenticated n8n webhook. n8n stores platform credentials and handles scheduling, retries and publishing. Publication results and public post URLs are written back to the originating note.

## Current status

The plugin can read the active Markdown note, parse its `social-*` frontmatter and show separate editable previews for X, Bluesky and LinkedIn. Each platform can be enabled or disabled from the sidebar; the selection is saved to the note's `social-platforms` frontmatter. Each preview has a live platform-specific character count and over-limit warning. Preview edits remain in memory and are not written back to the note yet.

Text-only Bluesky publishing is available from the plugin today. The included n8n
workflow has conditional branches for Bluesky, X and LinkedIn, and only publishes
platforms present in the Social Deck webhook payload. The plugin currently sends
Bluesky posts only; X and LinkedIn plugin publishing, images, rich links and
threads are not implemented yet.

## Bluesky credentials

The text-posting workflow does not require a Bluesky developer account, API key or client secret. It uses:

- Your full Bluesky handle, such as `example.bsky.social` or a custom-domain handle.
- A dedicated Bluesky app password.

Do not use your primary Bluesky account password.

### Create an app password

1. Sign in to [Bluesky](https://bsky.app/) in a web browser.
2. Open the direct [App Passwords](https://bsky.app/settings/app-passwords) page.
3. If using the settings menu, look under **Settings → Privacy and Security → App Passwords**. Some Bluesky versions place it under **Settings → Advanced → App Passwords**.
4. Select **Add App Password**.
5. Give it a recognisable name, such as `Social Deck n8n`.
6. Leave direct-message access disabled. Social Deck does not need it.
7. Create the password and copy it immediately. Bluesky displays an app password only once.
8. Store it in your password manager until n8n is configured.

If the password is lost or exposed, delete it from the same App Passwords page and create a replacement. Revoking this password does not change the primary account password.

### Add the credentials to n8n

Import [`n8n/workflows/social-post-publisher.json`](n8n/workflows/social-post-publisher.json).
In n8n, create an **HTTP Request → Custom Auth** credential named
`Bluesky app password` with this JSON:

```json
{
  "body": {
    "identifier": "example.bsky.social",
    "password": "xxxx-xxxx-xxxx-xxxx"
  }
}
```

Open the imported **Create Bluesky session** node and select that credential. Do
not place the handle or app password in Obsidian settings, Markdown frontmatter or
this repository.

Follow the remaining webhook-security instructions in the [n8n setup guide](n8n/README.md).

The current self-hosted workflow uses an app password for a single account. A future multi-user or hosted Social Deck service should use [AT Protocol OAuth](https://docs.bsky.app/blog/oauth-atproto) instead.

## Connect Obsidian to n8n

After importing and configuring the n8n workflow:

1. In n8n, create a **Header Auth** credential for the **Social Deck webhook**
   node.
2. Set the header name to `Authorization`.
3. Set the credential value to `Bearer ` followed by a long random secret, for
   example `Bearer replace-with-a-long-random-value`.
4. Save and activate the workflow.
5. Copy the production webhook URL from the **Social Deck webhook** node. It
   normally ends with `/webhook/social-deck`.
6. In Obsidian, open **Settings → Community plugins → Social Deck**.
7. Paste the production URL into **n8n webhook URL**.
8. Paste only the random secret into **n8n webhook secret**. Do not include the
   `Bearer ` prefix; the plugin adds it when sending the request.

Use the production webhook URL, not the test URL. n8n only accepts production
webhook requests while the workflow is active.

### Post frontmatter

```yaml
---
social-status: draft
social-platforms:
  - x
  - bluesky
  - linkedin
social-accounts:
  x: torin-x
  bluesky: torin-bluesky
  linkedin: torin-linkedin
social-scheduled-at:
social-media:
  - "[[incident-preparedness.png]]"
social-published-urls: {}
---
```

## Development

Requirements:

- Node.js 20 or newer
- npm
- Obsidian 1.7.2 or newer

Install dependencies and create a production build:

```bash
npm install
npm run build
```

For local testing, copy or link `main.js`, `manifest.json` and `styles.css` into:

```text
<vault>/.obsidian/plugins/social-deck/
```

Reload Obsidian, enable **Social Deck** under Community plugins, then select **Open Social Deck** from the command palette or the raven ribbon icon.

### Development builds

Every successful GitHub Actions build on `main` produces an installable `social-deck.zip` artifact. See [Installing a development build](docs/installing-development-builds.md) for Windows and Obsidian instructions.

Tags matching `v*` also create a GitHub release containing the installable ZIP.

### Continuing development with Codex

See the [Codex project hand-off](docs/CODEX_HANDOFF.md) for the implemented architecture, current limitations, security constraints and recommended next work.

## Security

Do not place social-platform API credentials in the Obsidian vault. See [SECURITY.md](SECURITY.md) for the credential boundary.

## Licence

MIT
