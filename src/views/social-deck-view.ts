import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { RAVEN_ICON } from "../icons";
import { PLATFORM_DEFINITIONS } from "../platforms/definitions";
import type SocialDeckPlugin from "../main";

export const SOCIAL_DECK_VIEW_TYPE = "social-deck-view";

interface PublishFeedback {
  platformName: string;
  publishedAt: string;
  url: string;
}

export class SocialDeckView extends ItemView {
  private postText = "";
  private publishFeedback: PublishFeedback | undefined;

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

    const content = container.createDiv({ cls: "social-deck__content" });
    content.createEl("h2", { text: "Social Deck" });
    this.renderComposer(content);
  }

  private renderComposer(container: Element): void {
    const section = container.createDiv({ cls: "social-deck__composer" });
    const header = section.createDiv({ cls: "social-deck__platform-header" });
    const identity = header.createDiv();
    identity.createEl("strong", { text: "Quick post" });
    identity.createEl("small", { text: "Paste text here to publish" });
    const blueskyDefinition = PLATFORM_DEFINITIONS.bluesky;
    const count = header.createEl("span", { cls: "social-deck__character-count" });

    if (this.publishFeedback) {
      this.renderPublishFeedback(section, this.publishFeedback);
    }

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

    const footer = section.createDiv({ cls: "social-deck__platform-footer" });
    const footerStatus = footer.createEl("small");
    const actions = footer.createDiv({ cls: "social-deck__platform-actions" });
    const clearButton = actions.createEl("button", { text: "Clear" });
    const publishButton = actions.createEl("button", {
      cls: "mod-cta",
      text: "Publish to Bluesky"
    });

    const updateCount = (): void => {
      const length = [...textarea.value].length;
      const overLimit = length > blueskyDefinition.characterLimit;
      const blueskyEnabled = this.plugin.settings.enabledPlatforms.bluesky;
      const missingConfiguration =
        !this.plugin.settings.webhookUrl || !this.plugin.getWebhookSecret();
      footerStatus.textContent = blueskyEnabled
        ? "Text-only Bluesky publishing is available"
        : "Enable Bluesky in Social Deck settings to publish";
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
        this.publishFeedback = {
          platformName: "Bluesky",
          publishedAt: new Date().toLocaleString(),
          url: result.url
        };
        new Notice("Published to Bluesky");
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

  private renderPublishFeedback(container: Element, feedback: PublishFeedback): void {
    const status = container.createDiv({ cls: "social-deck__publish-feedback" });
    const message = status.createDiv();
    message.createEl("strong", { text: `Posted to ${feedback.platformName}` });
    message.createEl("small", { text: feedback.publishedAt });

    const actions = status.createDiv({ cls: "social-deck__publish-feedback-actions" });
    actions.createEl("a", {
      text: "View post",
      href: feedback.url,
      attr: {
        target: "_blank",
        rel: "noopener noreferrer"
      }
    });
    const copyButton = actions.createEl("button", { text: "Copy URL" });
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(feedback.url);
      new Notice("Bluesky URL copied");
    });
  }
}
