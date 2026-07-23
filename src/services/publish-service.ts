import { requestUrl, type RequestUrlResponse } from "obsidian";

export interface BlueskyPublishRequest {
  fileName?: string;
  filePath?: string;
  text: string;
}

export interface BlueskyPublishResult {
  ok: true;
  platform: "bluesky";
  uri: string;
  cid: string;
  url: string;
}

export interface N8nConnectionTestResult {
  ok: true;
  type: "connection-test";
  receivedAt: string;
  source: "n8n";
}

export async function publishBlueskyPost(
  webhookUrl: string,
  webhookSecret: string,
  request: BlueskyPublishRequest
): Promise<BlueskyPublishResult> {
  const responseJson = await sendSocialDeckRequest(
    webhookUrl,
    webhookSecret,
    {
      schemaVersion: 1,
      requestedAt: new Date().toISOString(),
      source: {
        fileName: request.fileName ?? "Quick post",
        filePath: request.filePath ?? "social-deck"
      },
      platforms: {
        bluesky: {
          text: request.text
        }
      }
    },
    "publish"
  );

  if (!isBlueskyResult(responseJson)) {
    throw new Error("n8n returned an unexpected JSON response");
  }

  return responseJson;
}

export async function testN8nConnection(
  webhookUrl: string,
  webhookSecret: string
): Promise<N8nConnectionTestResult> {
  const responseJson = await sendSocialDeckRequest(
    webhookUrl,
    webhookSecret,
    {
      schemaVersion: 1,
      requestedAt: new Date().toISOString(),
      source: {
        fileName: "Connection test",
        filePath: "social-deck"
      },
      testConnection: true
    },
    "test"
  );

  if (!isConnectionTestResult(responseJson)) {
    throw new Error("n8n returned an unexpected JSON response");
  }

  return responseJson;
}

async function sendSocialDeckRequest(
  webhookUrl: string,
  webhookSecret: string,
  body: Record<string, unknown>,
  mode: "publish" | "test"
): Promise<unknown> {
  if (!webhookUrl.trim()) {
    throw new Error(
      mode === "test"
        ? "Configure the n8n test webhook URL or n8n webhook URL in Social Deck settings"
        : "Configure the n8n webhook URL in Social Deck settings"
    );
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
    body: JSON.stringify(body),
    throw: false
  });

  const responseJson = parseJsonResponse(response);

  if (response.status < 200 || response.status >= 300) {
    const message = extractErrorMessage(responseJson);
    throw new Error(message ?? describeUnexpectedResponse(response, mode));
  }

  if (!responseJson) {
    throw new Error(describeUnexpectedResponse(response, mode));
  }

  return responseJson;
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

function isConnectionTestResult(value: unknown): value is N8nConnectionTestResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const result = value as Record<string, unknown>;
  return (
    result.ok === true &&
    result.type === "connection-test" &&
    result.source === "n8n" &&
    typeof result.receivedAt === "string"
  );
}

function extractErrorMessage(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && error.trim() ? error.trim() : undefined;
}

function parseJsonResponse(response: RequestUrlResponse): unknown | undefined {
  const body = response.text.trim();
  if (!body) {
    return undefined;
  }

  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function describeUnexpectedResponse(response: RequestUrlResponse, mode: "publish" | "test"): string {
  const body = response.text.trim();

  if (!body) {
    return `n8n returned HTTP ${response.status} with an empty response`;
  }

  if (body.startsWith("<")) {
    return mode === "test"
      ? `n8n returned HTML instead of JSON. Check that the n8n test webhook URL ends with /webhook-test/social-deck, n8n is listening for a test event, and the webhook Header Auth is configured. HTTP ${response.status}.`
      : `n8n returned HTML instead of JSON. Check that the n8n webhook URL ends with /webhook/social-deck, the workflow is active, and the webhook Header Auth is configured. HTTP ${response.status}.`;
  }

  return `n8n returned HTTP ${response.status}: ${truncateBody(body)}`;
}

function truncateBody(body: string): string {
  return body.length > 180 ? `${body.slice(0, 180)}...` : body;
}
