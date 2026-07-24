## Find your LinkedIn person URN

LinkedIn requires a person URN when publishing to a personal profile:

```text
urn:li:person:<person-id>
```

The person ID is scoped to the LinkedIn developer application. Retrieve it using the same LinkedIn application used by your production integration.

### Prerequisites

Your LinkedIn application must have the **Sign In with LinkedIn using OpenID Connect** product enabled. Its available OAuth scopes should include:

```text
openid
profile
```

### 1. Generate a temporary access token

1. Open the [LinkedIn OAuth Token Generator](https://www.linkedin.com/developers/tools/oauth/token-generator).

2. Select the LinkedIn application used by your integration.

3. Select **Member authorization code (3-legged)**.

4. Select these scopes:

   ```text
   openid
   profile
   ```

5. Generate the token and approve the LinkedIn consent screen.

6. Copy the temporary access token.

Treat the token as a secret. Do not commit it to Git, include it in screenshots or paste it into support requests.

### 2. Retrieve the person ID with n8n

Create a temporary **HTTP Request** node with the following configuration:

| Setting        | Value                                  |
| -------------- | -------------------------------------- |
| Method         | `GET`                                  |
| URL            | `https://api.linkedin.com/v2/userinfo` |
| Authentication | `None`                                 |
| Send headers   | Enabled                                |

Add this header:

| Name            | Value                             |
| --------------- | --------------------------------- |
| `Authorization` | `Bearer <temporary-access-token>` |

The value must contain the word `Bearer`, followed by one space and the complete token:

```text
Bearer AQV...
```

Do not add `LinkedIn-Version` or `X-Restli-Protocol-Version` headers to this request.

Execute the node. A successful response will resemble:

```json
{
  "sub": "AbCdEf123",
  "name": "Example Person",
  "given_name": "Example",
  "family_name": "Person"
}
```

### 3. Construct the person URN

Prefix the returned `sub` value with `urn:li:person:`:

```text
urn:li:person:AbCdEf123
```

In an n8n expression:

```javascript
{{ 'urn:li:person:' + $json.sub }}
```

The person URN is an identifier, not an access token. It can be stored as configuration, for example:

```text
LINKEDIN_PERSON_URN=urn:li:person:AbCdEf123
```

Do not store the temporary access token alongside it.

### 4. Clean up

After recording the person URN:

1. Delete the temporary HTTP Request node.
2. Delete any n8n execution records containing the token.
3. Revoke or discard the temporary token.
4. Continue using the permanent n8n OAuth credential for publishing.

### Troubleshooting

#### `Empty oauth2 access token`

Ensure the Authorization header starts with `Bearer` followed by a space:

```text
Bearer AQV...
```

#### `403 Forbidden` from `/v2/userinfo`

Confirm that:

* The temporary token was generated with both `openid` and `profile`.
* The token was generated for the same LinkedIn application used by the integration.
* The application has **Sign In with LinkedIn using OpenID Connect** enabled.

#### `me.GET.NO_VERSION`

This indicates that the request is still using the legacy profile endpoint:

```text
https://api.linkedin.com/v2/me
```

Use the OpenID Connect endpoint instead:

```text
https://api.linkedin.com/v2/userinfo
```

For additional information, see LinkedIn’s [OpenID Connect documentation](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2).
