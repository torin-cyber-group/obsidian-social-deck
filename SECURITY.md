# Security policy

## Credential boundary

Social Deck does not store X, Bluesky or LinkedIn credentials in an Obsidian vault. Platform credentials belong in n8n's encrypted credential store.

The plugin configuration may contain an n8n webhook URL and bearer secret. Treat both as secrets: do not commit `.obsidian/plugins/social-deck/data.json`, publish screenshots containing either value, or include production values in bug reports. Anyone holding a valid webhook URL and bearer secret may be able to publish through the connected workflow.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to Torin Cyber Group rather than opening a public issue containing exploit details or credentials.
