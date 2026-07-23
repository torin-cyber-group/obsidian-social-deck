import type { SocialPlatform, SocialPostMetadata, SocialPostStatus } from "../types/social";

const SUPPORTED_PLATFORMS: SocialPlatform[] = ["x", "bluesky", "linkedin"];
const SUPPORTED_STATUSES: SocialPostStatus[] = [
  "draft",
  "ready",
  "scheduled",
  "publishing",
  "published",
  "failed"
];

export interface ParsedSocialNote {
  content: string;
  metadata: SocialPostMetadata;
}

export function parseSocialNote(raw: string, frontmatter?: Record<string, unknown>): ParsedSocialNote {
  return {
    content: stripFrontmatter(raw).trim(),
    metadata: {
      status: parseStatus(frontmatter?.["social-status"]),
      platforms: parsePlatforms(frontmatter?.["social-platforms"]),
      accounts: parseAccounts(frontmatter?.["social-accounts"]),
      scheduledAt: parseOptionalString(frontmatter?.["social-scheduled-at"]),
      media: parseStringArray(frontmatter?.["social-media"]),
      publishedUrls: parsePublishedUrls(frontmatter?.["social-published-urls"]),
      lastError: parseOptionalString(frontmatter?.["social-last-error"])
    }
  };
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) {
    return raw;
  }

  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/, "");
}

function parseStatus(value: unknown): SocialPostStatus {
  return typeof value === "string" && SUPPORTED_STATUSES.includes(value as SocialPostStatus)
    ? (value as SocialPostStatus)
    : "draft";
}

function parsePlatforms(value: unknown): SocialPlatform[] {
  if (value === undefined || value === null) {
    return [...SUPPORTED_PLATFORMS];
  }

  const requested = parseStringArray(value).filter((platform): platform is SocialPlatform =>
    SUPPORTED_PLATFORMS.includes(platform as SocialPlatform)
  );
  return [...new Set(requested)];
}

function parseAccounts(value: unknown): Partial<Record<SocialPlatform, string>> {
  if (!isRecord(value)) {
    return {};
  }

  const accounts: Partial<Record<SocialPlatform, string>> = {};
  for (const platform of SUPPORTED_PLATFORMS) {
    const account = value[platform];
    if (typeof account === "string" && account.trim()) {
      accounts[platform] = account.trim();
    }
  }
  return accounts;
}

function parsePublishedUrls(value: unknown): Partial<Record<SocialPlatform, string[]>> {
  if (!isRecord(value)) {
    return {};
  }

  const urls: Partial<Record<SocialPlatform, string[]>> = {};
  for (const platform of SUPPORTED_PLATFORMS) {
    const platformUrls = parseStringArray(value[platform]);
    if (platformUrls.length > 0) {
      urls[platform] = platformUrls;
    }
  }
  return urls;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
