# Social Deck n8n workflows

This directory will contain importable n8n workflow JSON files and setup guidance.

The Obsidian plugin will send approved post content to one authenticated n8n webhook. n8n will own social-network credentials, scheduling, retries and platform API calls. Credentials must never be committed to this repository or returned to the Obsidian vault.

## Bluesky text posting

Import [`workflows/bluesky-text-post.json`](workflows/bluesky-text-post.json) into n8n.

### 1. Configure n8n environment variables

Add these variables to the n8n container or service, then restart n8n:

```text
BLUESKY_HANDLE=your-handle.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Use a dedicated Bluesky app password, not the account's primary password. Do not put either value into the workflow JSON.

If n8n has `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, the HTTP Request node expressions cannot read these variables. Set it to `false` for this workflow or replace the expressions with another secret-management approach appropriate to your n8n deployment.

### 2. Secure the webhook

1. Create an n8n **Header Auth** credential.
2. Set the header name to `Authorization`.
3. Set its value to `Bearer ` followed by a long random secret.
4. Open the **Social Deck webhook** node and select that credential.
5. Save and activate the workflow.

Enter the same random secret—without the `Bearer ` prefix—in Social Deck's **n8n webhook secret** setting.

### 3. Configure Social Deck

Copy the production URL from the webhook node into Social Deck's **n8n webhook URL** setting. It normally ends with `/webhook/social-deck`.

Open a note with Bluesky enabled and no more than 300 characters in its Bluesky preview. Select **Publish to Bluesky**. A successful response is written to `social-published-urls.bluesky` in the note frontmatter.

This first workflow supports English text-only posts. It does not yet create rich link facets, upload images or publish threads.
