export type SocialPlatform = "x" | "bluesky" | "linkedin";

export type SocialPostStatus =
  | "draft"
  | "ready"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export interface PlatformDefinition {
  id: SocialPlatform;
  name: string;
  characterLimit: number;
  supportsThreads: boolean;
  supportsImages: boolean;
}

export interface SocialPostMetadata {
  status: SocialPostStatus;
  platforms: SocialPlatform[];
  accounts: Partial<Record<SocialPlatform, string>>;
  scheduledAt?: string;
  media: string[];
  publishedUrls: Partial<Record<SocialPlatform, string[]>>;
  lastError?: string;
}

