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

interface N8nFailureDetails {
  mode: "publish" | "test";
  url: string;
  expectedPath: string;
  status: number;
  contentType: string;
  bodyPreview: string;
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

  const result = extractBlueskyResult(responseJson);

  if (!result) {
    console.error("Social Deck n8n returned unexpected publish payload", responseJson);
    throw new Error("n8n returned an unexpected JSON response");
  }

  return result;
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
    throwLoggedError(message ?? describeUnexpectedResponse(response, mode), response, webhookUrl, mode);
  }

  if (!responseJson) {
    throwLoggedError(describeUnexpectedResponse(response, mode), response, webhookUrl, mode);
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

function extractBlueskyResult(value: unknown): BlueskyPublishResult | undefined {
  if (isBlueskyResult(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(extractBlueskyResult).find((result) => result !== undefined);
  }

  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return (
    extractBlueskyResult(record.json) ??
    extractBlueskyResult(record.data) ??
    extractBlueskyResult(record.result)
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

function throwLoggedError(
  message: string,
  response: RequestUrlResponse,
  webhookUrl: string,
  mode: "publish" | "test"
): never {
  console.error("Social Deck n8n request failed", buildFailureDetails(response, webhookUrl, mode));
  throw new Error(message);
}

function buildFailureDetails(
  response: RequestUrlResponse,
  webhookUrl: string,
  mode: "publish" | "test"
): N8nFailureDetails {
  const expectedPath = mode === "test" ? "/webhook-test/social-deck" : "/webhook/social-deck";
  return {
    mode,
    url: webhookUrl.trim(),
    expectedPath,
    status: response.status,
    contentType: findHeader(response.headers, "content-type") ?? "unknown",
    bodyPreview: truncateBody(response.text.trim().replace(/\s+/g, " "))
  };
}

function findHeader(headers: Record<string, string>, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return entry?.[1];
}
