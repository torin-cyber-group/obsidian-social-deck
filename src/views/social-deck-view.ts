import { ItemView, WorkspaceLeaf } from "obsidian";
import { PLATFORM_DEFINITIONS } from "../platforms/definitions";

export const SOCIAL_DECK_VIEW_TYPE = "social-deck-view";

export class SocialDeckView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return SOCIAL_DECK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Social Deck";
  }

  getIcon(): string {
    return "send";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("social-deck");

    container.createEl("h2", { text: "Social Deck" });
    container.createEl("p", {
      cls: "social-deck__intro",
      text: "Open a social post note to preview and prepare it for publishing."
    });

    const platformList = container.createDiv({ cls: "social-deck__platforms" });
    for (const platform of Object.values(PLATFORM_DEFINITIONS)) {
      const card = platformList.createDiv({ cls: "social-deck__platform-card" });
      card.createEl("strong", { text: platform.name });
      card.createEl("span", { text: `${platform.characterLimit.toLocaleString()} characters` });
    }

    const emptyState = container.createDiv({ cls: "social-deck__empty" });
    emptyState.createEl("p", { text: "No social post selected." });
    emptyState.createEl("small", {
      text: "Composer and note parsing arrive in the next checkpoint."
    });
  }
}

