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
2. Set the header name to `Authorization`.
3. Set its value to `Bearer ` followed by a long random secret.
4. Open the **Social Deck webhook** node and select that credential.
5. Save and activate the workflow.

Enter the same random secret—without the `Bearer ` prefix—in Social Deck's **n8n webhook secret** setting.

### 4. Configure Social Deck

Copy the production URL from the webhook node into Social Deck's **n8n webhook URL** setting. It normally ends with `/webhook/social-deck`.

Open a note with Bluesky enabled and no more than 300 characters in its Bluesky preview. Select **Publish to Bluesky**. A successful response is written to `social-published-urls.bluesky` in the note frontmatter.

This first workflow supports text-only posts. It does not yet create rich link
facets, upload images or publish threads.
