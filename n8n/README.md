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
3. In **n8n webhook secret**, create or select an Obsidian SecretStorage entry
   containing the random secret.
4. Open a Markdown note with `bluesky` in `social-platforms`.
5. Open **Social Deck** from the command palette or ribbon.
6. Select **Publish to Bluesky**.

The plugin sends this request shape to n8n:

```json
{
  "schemaVersion": 1,
  "requestedAt": "2026-07-23T00:00:00.000Z",
  "source": {
    "fileName": "example-post",
    "filePath": "examples/example-post.md"
  },
  "platforms": {
    "bluesky": {
      "text": "Post text from the Social Deck preview"
    }
  }
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

A successful Obsidian publish writes the returned Bluesky URL to
`social-published-urls.bluesky` in the note frontmatter.

This first workflow supports text-only posts. It does not yet create rich link
facets, upload images or publish threads.
