# Security policy

## Credential boundary

Social Deck does not store X, Bluesky or LinkedIn credentials in an Obsidian vault. Platform credentials belong in n8n's encrypted credential store.

The plugin configuration stores the n8n webhook URL and selected SecretStorage ID in Obsidian plugin data at `.obsidian/plugins/social-deck/data.json`. The n8n webhook secret value is stored through Obsidian SecretStorage, not in Social Deck's plugin data.

Older development builds may have written the webhook secret to `.obsidian/plugins/social-deck/data.json`. Loading a newer build migrates that value into SecretStorage under `social-deck-n8n-webhook-secret` and clears the persisted value from plugin data. Treat both the webhook URL and any previously saved webhook secret as sensitive: do not commit plugin data, publish screenshots containing either value, or include production values in bug reports. Anyone holding a valid webhook URL and secret may be able to publish through the connected workflow.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to Torin Cyber Group rather than opening a public issue containing exploit details or credentials.
