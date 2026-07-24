# Social Deck n8n workflows

This directory contains importable n8n workflow JSON files and setup guidance.

The Obsidian plugin sends approved post content to one authenticated n8n webhook.
n8n owns social-network credentials, scheduling, retries and platform API calls.
Credentials must never be committed to this repository or returned to the
Obsidian vault.

## Recommended router workflow

Use one public Social Deck webhook workflow as a router, then call platform
sub-workflows from it.

Import these workflows into n8n:

1. [`workflows/bluesky-publisher-subworkflow.json`](workflows/bluesky-publisher-subworkflow.json)
2. [`workflows/linkedin-publisher-subworkflow.json`](workflows/linkedin-publisher-subworkflow.json)
3. [`workflows/social-deck-router.json`](workflows/social-deck-router.json)

The router workflow keeps the public webhook stable at `/webhook/social-deck`.
It handles **Test connection**, decides which platform workflow is needed and
calls the platform-specific sub-workflow.

The Bluesky sub-workflow owns Bluesky credentials, creates a session, creates a
text post with URL link facets and returns the public Bluesky URL to the router.

The LinkedIn sub-workflow owns LinkedIn OAuth2 credentials, creates a text post
with the current LinkedIn Posts API and returns the LinkedIn post ID to the
router.

Each platform sub-workflow must keep its **When executed by another workflow**
trigger node. The router uses that trigger when it calls the sub-workflow.

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

5. Open **Create Bluesky session** in the imported **Social Deck - Bluesky
   publisher sub-workflow**.
6. In **Authentication**, select **Generic Credential Type**.
7. In **Generic Auth Type**, select **Custom Auth**.
8. Select the `Bluesky app password` credential.

### 2. Configure the LinkedIn credential

LinkedIn publishing uses n8n's native **LinkedIn** node:

- Node: **LinkedIn**
- Resource: **Post**
- Operation: **Create**

In n8n:

1. Create or select a LinkedIn Community Management OAuth2 credential with
   permission to create posts for the target member or organisation.
2. Open **Create LinkedIn post** in **Social Deck - LinkedIn publisher
   sub-workflow**.
3. In **Authentication**, select **Community Management**.
4. Select the LinkedIn Community Management OAuth2 credential.
5. Keep **Resource** set to **Post** and **Operation** set to **Create**.
6. Set **Post As** to either **Person** or **Organization**.
7. Select the target person or organisation in the node. Do not use an
   expression for this field.

### 3. Connect the router to the platform sub-workflows

1. Save the **Social Deck - Bluesky publisher sub-workflow**.
2. Save the **Social Deck - LinkedIn publisher sub-workflow**.
3. Copy each sub-workflow's n8n workflow ID from its workflow URL. It is the
   value after `/workflow/`.
4. Open **Social Deck - router**.
5. Open **Call Bluesky workflow** and replace
   `REPLACE_WITH_N8N_BLUESKY_SUB_WORKFLOW_ID` with the Bluesky sub-workflow ID.
6. Open **Call LinkedIn workflow** and replace
   `REPLACE_WITH_N8N_LINKEDIN_SUB_WORKFLOW_ID` with the LinkedIn sub-workflow
   ID.
7. Save the router workflow.

### 4. X/Twitter workflow

X/Twitter should be split into its own workflow when that plugin feature is
implemented. Keeping each platform in its own workflow avoids activation
problems caused by missing credentials for platforms you are not using yet.

The router workflow is the only workflow to activate. Platform workflows should
stay inactive because the router calls them directly.

### 5. Secure the webhook

1. Create an n8n **Header Auth** credential.
2. Set the header name to `X-Social-Deck-Secret`.
3. Set its value to a long random secret.
4. Open the **Social Deck webhook** node in **Social Deck - router** and select
   that credential.
5. Save and activate the router workflow.

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

### 6. Configure Social Deck

Copy the production URL from the webhook node into Social Deck's **n8n webhook URL** setting. It normally ends with `/webhook/social-deck`. Use the production URL, not the test URL, and make sure the workflow is active.

In Obsidian:

1. Open **Settings → Community plugins → Social Deck**.
2. Paste the n8n production webhook URL into **n8n webhook URL**.
3. If testing from n8n's **Listening for test event** screen, paste the test URL
   ending in `/webhook-test/social-deck` into **n8n test webhook URL**.
4. In **n8n webhook secret**, create or select an Obsidian SecretStorage entry
   containing the random secret.
5. Enable **Bluesky**, **LinkedIn** or both under **Enabled platforms**.
6. Select **Test connection**.
7. Open **Social Deck** from the command palette or ribbon.
8. Paste text into **Quick post**.
9. Select **Publish**.

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
    },
    "linkedin": {
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
      },
      "linkedin": {
        "text": "Manual Social Deck n8n connection test"
      }
    }
  }'
```

Remove any platform block you do not want to publish during the smoke test.

A successful Obsidian publish shows a notice and displays the returned Bluesky
URL or LinkedIn post ID in the Social Deck sidebar.

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
- **Call Bluesky workflow** still contains
  `REPLACE_WITH_N8N_BLUESKY_SUB_WORKFLOW_ID`.
- **Call LinkedIn workflow** still contains
  `REPLACE_WITH_N8N_LINKEDIN_SUB_WORKFLOW_ID`.
- **Create Bluesky session** in the Bluesky sub-workflow is missing the
  `Bluesky app password` credential.
- **Create LinkedIn post** in the LinkedIn sub-workflow is missing the LinkedIn
  Community Management OAuth2 credential.
- **Create LinkedIn post** does not have **Post As** and the target person or
  organisation selected in n8n.
- Another workflow is active on the same `/social-deck` webhook path as the
  router.
- The Header Auth name or value does not match Obsidian. The header name must be
  `X-Social-Deck-Secret`, and the value must be the same random secret selected
  in Social Deck's **n8n webhook secret** setting.

Run the `curl` smoke test above against the exact URL configured in Obsidian. A
working webhook returns JSON, not HTML.

For more detail from Obsidian, open the developer console with
`Ctrl+Shift+I` on Windows/Linux or `Cmd+Option+I` on macOS, select **Console**,
then run **Test connection** again. Failed n8n requests log the mode, URL, HTTP
status, response content type and a short response preview. The webhook secret is
not logged.

The current Bluesky sub-workflow supports text-only posts and creates Bluesky URL
link facets. The current LinkedIn sub-workflow supports text-only posts. Social
Deck does not yet create link preview cards, upload images or publish threads.
