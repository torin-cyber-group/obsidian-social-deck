# Obsidian Social Deck

Social Deck is an Obsidian plugin for composing, previewing, scheduling and publishing social media posts through a self-hosted n8n workflow.

## Planned platforms

- X
- Bluesky
- LinkedIn personal profiles and organisation pages

## Architecture

Obsidian remains the source of truth for content and publication status. The plugin sends approved posts to an authenticated n8n webhook. n8n stores platform credentials and handles scheduling, retries and publishing. Publication results and public post URLs are written back to the originating note.

## Current status

The initial scaffold provides a buildable Obsidian plugin, a Social Deck sidebar placeholder, platform definitions, settings and an example post schema. Publishing is not implemented yet.

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

Reload Obsidian, enable **Social Deck** under Community plugins, then select **Open Social Deck** from the command palette or ribbon.

## Security

Do not place social-platform API credentials in the Obsidian vault. See [SECURITY.md](SECURITY.md) for the credential boundary.

## Licence

MIT
