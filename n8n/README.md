# Social Deck n8n workflows

This directory will contain importable n8n workflow JSON files and setup guidance.

The Obsidian plugin will send approved post content to one authenticated n8n webhook. n8n will own social-network credentials, scheduling, retries and platform API calls. Credentials must never be committed to this repository or returned to the Obsidian vault.

## Social post publishing

Import [`workflows/social-post-publisher.json`](workflows/social-post-publisher.json) into n8n.

The workflow accepts `platforms.bluesky`, `platforms.x` and
`platforms.linkedin` in the Social Deck webhook payload. A platform is skipped
when its key is absent from the payload.

### 1. Configure the Bluesky credential

Use a dedicated Bluesky app password, not the account's primary password. Do not
put the handle or app password into the workflow JSON.

1. In n8n, create a new **HTTP Request** credential.
2. Select **Custom Auth** as the generic credential type.
3. Name it `Bluesky app password`.
4. Set the credential JSON to:

```json
{
  "body": {
    "identifier": "your-handle.bsky.social",
    "password": "xxxx-xxxx-xxxx-xxxx"
  }
}
```

5. Open the imported **Create Bluesky session** HTTP Request node.
6. In **Authentication**, select **Generic Credential Type**.
7. In **Generic Auth Type**, select **Custom Auth**.
8. Select the `Bluesky app password` credential.

### 2. Configure X and LinkedIn credentials

The X and LinkedIn nodes are included but only run when their platform payloads
are present.

For X, open **Create X post** and select an OAuth2 credential with permission to
create posts for the target account.

For LinkedIn, open **Create LinkedIn post** and select an OAuth2 credential with
permission to create UGC posts. The workflow expects
`platforms.linkedin.authorUrn` in the payload, or you must replace the placeholder
`urn:li:person:REPLACE_WITH_LINKEDIN_PERSON_ID` in the **Validate request** node.

### 3. Secure the webhook

1. Create an n8n **Header Auth** credential.
2. Set the header name to `X-Social-Deck-Secret`.
3. Set its value to a long random secret.
4. Open the **Social Deck webhook** node and select that credential.
5. Save and activate the workflow.

Enter the same random secret in an Obsidian SecretStorage entry selected from
Social Deck's **n8n webhook secret** setting.

To create a random secret in PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

To create one on Linux or macOS:

```bash
openssl rand -base64 32
```

### 4. Configure Social Deck

Copy the production URL from the webhook node into Social Deck's **n8n webhook URL** setting. It normally ends with `/webhook/social-deck`. Use the production URL, not the test URL, and make sure the workflow is active.

In Obsidian:

1. Open **Settings → Community plugins → Social Deck**.
2. Paste the n8n production webhook URL into **n8n webhook URL**.
3. If testing from n8n's **Listening for test event** screen, paste the test URL
   ending in `/webhook-test/social-deck` into **n8n test webhook URL**.
4. In **n8n webhook secret**, create or select an Obsidian SecretStorage entry
   containing the random secret.
5. Select **Test connection**.
6. Open **Social Deck** from the command palette or ribbon.
7. Paste text into **Quick post**.
8. Leave **Bluesky** enabled and select **Publish to Bluesky**.

The **Test connection** button uses **n8n test webhook URL** when it is set, and
falls back to **n8n webhook URL** when it is blank. Publishing always uses
**n8n webhook URL**.

The plugin sends this request shape to n8n:

```json
{
  "schemaVersion": 1,
  "requestedAt": "2026-07-23T00:00:00.000Z",
  "source": {
    "fileName": "Quick post",
    "filePath": "social-deck"
  },
  "platforms": {
    "bluesky": {
      "text": "Post text from the Social Deck preview"
    }
  }
}
```

The **Test connection** button sends this lighter request shape:

```json
{
  "schemaVersion": 1,
  "requestedAt": "2026-07-23T00:00:00.000Z",
  "source": {
    "fileName": "Connection test",
    "filePath": "social-deck"
  },
  "testConnection": true
}
```

The workflow returns:

```json
{
  "ok": true,
  "type": "connection-test",
  "source": "n8n",
  "receivedAt": "2026-07-23T00:00:00.000Z"
}
```

You can smoke-test the n8n side before using Obsidian:

```bash
curl -X POST "https://n8n.example.com/webhook/social-deck" \
  -H "X-Social-Deck-Secret: replace-with-a-long-random-value" \
  -H "Content-Type: application/json" \
  -d '{
    "schemaVersion": 1,
    "requestedAt": "2026-07-23T00:00:00.000Z",
    "source": {
      "fileName": "manual-test",
      "filePath": "manual-test.md"
    },
    "platforms": {
      "bluesky": {
        "text": "Manual Social Deck n8n connection test"
      }
    }
  }'
```

A successful Obsidian publish shows a notice and opens the returned Bluesky URL.

### Troubleshooting

If Obsidian shows `Unexpected token '<'` or says n8n returned HTML instead of
JSON, the webhook URL is returning a web page instead of the workflow response.
The most common causes are:

- Social Deck is using the test webhook URL instead of the production URL.
- The n8n workflow is not active.
- The test URL is configured, but n8n is not currently showing **Listening for
  test event**.
- The webhook URL points to the n8n editor, login page or another proxy page.
- The **Social Deck webhook** node is missing the Header Auth credential.
- The Header Auth name or value does not match Obsidian. The header name must be
  `X-Social-Deck-Secret`, and the value must be the same random secret selected
  in Social Deck's **n8n webhook secret** setting.

Run the `curl` smoke test above against the exact URL configured in Obsidian. A
working webhook returns JSON, not HTML.

This first workflow supports text-only posts. It does not yet create rich link
facets, upload images or publish threads.
