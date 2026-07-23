# Security policy

## Credential boundary

Social Deck does not store X, Bluesky or LinkedIn credentials in an Obsidian vault. Platform credentials belong in n8n's encrypted credential store.

The plugin configuration may contain an n8n webhook URL. Treat webhook URLs as secrets: do not commit `.obsidian/plugins/social-deck/data.json`, publish screenshots containing the URL, or include production URLs in bug reports.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to Torin Cyber Group rather than opening a public issue containing exploit details or credentials.

