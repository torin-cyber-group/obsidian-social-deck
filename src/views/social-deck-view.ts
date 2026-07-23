import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { RAVEN_ICON } from "../icons";
import { PLATFORM_DEFINITIONS } from "../platforms/definitions";
import type SocialDeckPlugin from "../main";
import type { SocialPlatform } from "../types/social";

export const SOCIAL_DECK_VIEW_TYPE = "social-deck-view";

export class SocialDeckView extends ItemView {
  private postText = "";
  private platforms: SocialPlatform[] = ["bluesky"];

  constructor(leaf: WorkspaceLeaf, private readonly plugin: SocialDeckPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return SOCIAL_DECK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Social Deck";
  }

  getIcon(): string {
    return RAVEN_ICON;
  }

  async onOpen(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("social-deck");

    container.createEl("h2", { text: "Social Deck" });
    this.renderComposer(container);
  }

  private renderComposer(container: Element): void {
    const section = container.createDiv({ cls: "social-deck__composer" });
    const header = section.createDiv({ cls: "social-deck__platform-header" });
    const identity = header.createDiv();
    identity.createEl("strong", { text: "Quick post" });
    identity.createEl("small", { text: "Paste text here to publish" });
    const blueskyDefinition = PLATFORM_DEFINITIONS.bluesky;
    const count = header.createEl("span", { cls: "social-deck__character-count" });

    const textarea = section.createEl("textarea", {
      cls: "social-deck__editor",
      attr: {
        "aria-label": "Post text",
        rows: "10",
        spellcheck: "true",
        placeholder: "Paste a post here"
      }
    });
    textarea.value = this.postText;

    const selector = section.createDiv({ cls: "social-deck__platform-selector" });
    selector.createEl("span", { cls: "social-deck__section-label", text: "Publish to" });
    const controls = selector.createDiv({ cls: "social-deck__platform-toggles" });

    for (const definition of Object.values(PLATFORM_DEFINITIONS)) {
      const label = controls.createEl("label", { cls: "social-deck__platform-toggle" });
      const checkbox = label.createEl("input", {
        type: "checkbox",
        attr: { "aria-label": `Publish to ${definition.name}` }
      });
      checkbox.checked = this.platforms.includes(definition.id);
      checkbox.disabled = definition.id !== "bluesky";
      label.createEl("span", {
        text: definition.id === "bluesky" ? definition.name : `${definition.name} planned`
      });

      checkbox.addEventListener("change", () => {
        this.platforms = Object.values(PLATFORM_DEFINITIONS)
          .filter((platform) => {
            const input = controls.querySelector<HTMLInputElement>(
              `input[aria-label="Publish to ${platform.name}"]`
            );
            return input?.checked;
          })
          .map((platform) => platform.id);
        updateCount();
      });
    }

    const footer = section.createDiv({ cls: "social-deck__platform-footer" });
    footer.createEl("small", { text: "Text-only Bluesky publishing is available" });
    const actions = footer.createDiv({ cls: "social-deck__platform-actions" });
    const clearButton = actions.createEl("button", { text: "Clear" });
    const publishButton = actions.createEl("button", {
      cls: "mod-cta",
      text: "Publish to Bluesky"
    });

    const updateCount = (): void => {
      const length = [...textarea.value].length;
      const overLimit = length > blueskyDefinition.characterLimit;
      const blueskyEnabled = this.platforms.includes("bluesky");
      const missingConfiguration =
        !this.plugin.settings.webhookUrl || !this.plugin.getWebhookSecret();
      count.textContent = `${length.toLocaleString()} / ${blueskyDefinition.characterLimit.toLocaleString()}`;
      count.toggleClass("social-deck__character-count--over", overLimit);
      textarea.toggleClass("social-deck__editor--over", overLimit);
      publishButton.disabled = length === 0 || overLimit || missingConfiguration || !blueskyEnabled;
      publishButton.title = missingConfiguration
        ? "Configure the n8n webhook URL and SecretStorage entry in Social Deck settings"
        : !blueskyEnabled
          ? "Enable Bluesky to publish"
          : overLimit
            ? `Bluesky posts must be ${blueskyDefinition.characterLimit} characters or fewer`
            : "Publish this text to Bluesky";
    };

    textarea.addEventListener("input", () => {
      this.postText = textarea.value;
      updateCount();
    });

    clearButton.addEventListener("click", () => {
      this.postText = "";
      textarea.value = "";
      updateCount();
    });

    publishButton.addEventListener("click", async () => {
      publishButton.disabled = true;
      publishButton.textContent = "Publishing...";
      textarea.disabled = true;
      try {
        const result = await this.plugin.publishBlueskyText(textarea.value);
        new Notice("Published to Bluesky");
        window.open(result.url, "_blank", "noopener,noreferrer");
        this.postText = "";
        await this.refresh();
      } catch (error) {
        new Notice(`Bluesky publishing failed: ${error instanceof Error ? error.message : String(error)}`);
        textarea.disabled = false;
        publishButton.textContent = "Publish to Bluesky";
        updateCount();
      }
    });

    updateCount();
  }
}
