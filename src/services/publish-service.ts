import { requestUrl } from "obsidian";

export interface BlueskyPublishRequest {
  fileName: string;
  filePath: string;
  text: string;
}

export interface BlueskyPublishResult {
  ok: true;
  platform: "bluesky";
  uri: string;
  cid: string;
  url: string;
}

export async function publishBlueskyPost(
  webhookUrl: string,
  webhookSecret: string,
  request: BlueskyPublishRequest
): Promise<BlueskyPublishResult> {
  if (!webhookUrl.trim()) {
    throw new Error("Configure the n8n webhook URL in Social Deck settings");
  }
  if (!webhookSecret.trim()) {
    throw new Error("Configure the n8n webhook secret in Social Deck settings");
  }

  const response = await requestUrl({
    url: webhookUrl.trim(),
    method: "POST",
    contentType: "application/json",
    headers: {
      "X-Social-Deck-Secret": webhookSecret.trim()
    },
    body: JSON.stringify({
      schemaVersion: 1,
      requestedAt: new Date().toISOString(),
      source: {
        fileName: request.fileName,
        filePath: request.filePath
      },
      platforms: {
        bluesky: {
          text: request.text
        }
      }
    }),
    throw: false
  });

  if (response.status < 200 || response.status >= 300) {
    const message = extractErrorMessage(response.json);
    throw new Error(message ?? `n8n returned HTTP ${response.status}`);
  }

  if (!isBlueskyResult(response.json)) {
    throw new Error("n8n returned an unexpected response");
  }

  return response.json;
}

function isBlueskyResult(value: unknown): value is BlueskyPublishResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const result = value as Record<string, unknown>;
  return (
    result.ok === true &&
    result.platform === "bluesky" &&
    typeof result.uri === "string" &&
    typeof result.cid === "string" &&
    typeof result.url === "string"
  );
}

function extractErrorMessage(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && error.trim() ? error.trim() : undefined;
}
