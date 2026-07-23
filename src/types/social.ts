export type SocialPlatform = "x" | "bluesky" | "linkedin";

export interface PlatformDefinition {
  id: SocialPlatform;
  name: string;
  characterLimit: number;
  supportsThreads: boolean;
  supportsImages: boolean;
}
