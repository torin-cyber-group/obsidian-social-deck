# Obsidian Social Deck

Social Deck is an Obsidian plugin for composing, previewing, scheduling and publishing social media posts through a self-hosted n8n workflow.

## Planned platforms

- X
- Bluesky
- LinkedIn personal profiles and organisation pages

## Architecture

Obsidian remains the source of truth for content and publication status. The plugin sends approved posts to an authenticated n8n webhook. n8n stores platform credentials and handles scheduling, retries and publishing. Publication results and public post URLs are written back to the originating note.

## Current status

The plugin can read the active Markdown note, parse its `social-*` frontmatter and show separate editable previews for X, Bluesky and LinkedIn. Each preview has a live platform-specific character count and over-limit warning. Preview edits remain in memory and are not written back to the note yet. Publishing is not implemented.

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

## Security

Do not place social-platform API credentials in the Obsidian vault. See [SECURITY.md](SECURITY.md) for the credential boundary.

## Licence

MIT
