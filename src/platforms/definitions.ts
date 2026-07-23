import type { PlatformDefinition, SocialPlatform } from "../types/social";

export const PLATFORM_DEFINITIONS: Record<SocialPlatform, PlatformDefinition> = {
  x: {
    id: "x",
    name: "X",
    characterLimit: 280,
    supportsThreads: true,
    supportsImages: true
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    characterLimit: 300,
    supportsThreads: true,
    supportsImages: true
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    characterLimit: 3000,
    supportsThreads: false,
    supportsImages: true
  }
};

