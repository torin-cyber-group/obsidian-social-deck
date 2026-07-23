import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { RAVEN_ICON } from "../icons";
import { PLATFORM_DEFINITIONS } from "../platforms/definitions";
import type SocialDeckPlugin from "../main";
import type { SocialPlatform } from "../types/social";

export const SOCIAL_DECK_VIEW_TYPE = "social-deck-view";

interface PublishFeedback {
  platformName: string;
  publishedAt: string;
  url?: string;
  id?: string;
}

export class SocialDeckView extends ItemView {
  private postText = "";
  private publishFeedback: PublishFeedback[] = [];

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
    const count = header.createEl("span", { cls: "social-deck__character-count" });

    if (this.publishFeedback.length > 0) {
      this.renderPublishFeedback(section, this.publishFeedback);
    }

    const textarea = section.createEl("textarea", {
      cls: "social-deck__editor",
      attr: {
        "aria-label": "Post text",
        autocapitalize: "sentences",
        autocomplete: "on",
        rows: "10",
        spellcheck: "true",
        placeholder: "Paste a post here"
      }
    });
    textarea.lang = navigator.language || "en";
    textarea.value = this.postText;

    const footer = section.createDiv({ cls: "social-deck__platform-footer" });
    const footerStatus = footer.createEl("small");
    const actions = footer.createDiv({ cls: "social-deck__platform-actions" });
    const clearButton = actions.createEl("button", { text: "Clear" });
    const publishButton = actions.createEl("button", {
      cls: "mod-cta",
      text: "Publish"
    });

    const updateCount = (): void => {
      const enabledPlatforms = this.getEnabledPublishPlatforms();
      const characterLimit = this.getCharacterLimit(enabledPlatforms);
      const length = [...textarea.value].length;
      const overLimit = length > characterLimit;
      const missingConfiguration =
        !this.plugin.settings.webhookUrl || !this.plugin.getWebhookSecret();
      const missingLinkedInAuthor =
        this.plugin.settings.enabledPlatforms.linkedin && !this.plugin.settings.linkedinAuthorUrn;
      const platformNames = enabledPlatforms.map((platform) => PLATFORM_DEFINITIONS[platform].name);
      footerStatus.textContent =
        platformNames.length > 0
          ? `Text-only publishing to ${platformNames.join(" and ")} is available`
          : "Enable a platform in Social Deck settings to publish";
      count.textContent = `${length.toLocaleString()} / ${characterLimit.toLocaleString()}`;
      count.toggleClass("social-deck__character-count--over", overLimit);
      textarea.toggleClass("social-deck__editor--over", overLimit);
      publishButton.textContent =
        platformNames.length > 0 ? `Publish to ${platformNames.join(" and ")}` : "Publish";
      publishButton.disabled =
        length === 0 ||
        overLimit ||
        missingConfiguration ||
        missingLinkedInAuthor ||
        enabledPlatforms.length === 0;
      publishButton.title = missingConfiguration
        ? "Configure the n8n webhook URL and SecretStorage entry in Social Deck settings"
        : missingLinkedInAuthor
          ? "Configure the LinkedIn author URN in Social Deck settings"
          : enabledPlatforms.length === 0
          ? "Enable a platform in Social Deck settings"
          : overLimit
            ? `Enabled platform posts must be ${characterLimit} characters or fewer`
            : "Publish this text";
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
        const results = await this.plugin.publishSocialText(textarea.value);
        this.publishFeedback = results.map((result) => ({
          platformName: PLATFORM_DEFINITIONS[result.platform].name,
          publishedAt: new Date().toLocaleString(),
          url: result.url,
          id: result.platform === "linkedin" ? result.id : result.uri
        }));
        new Notice(`Published to ${this.publishFeedback.map((feedback) => feedback.platformName).join(" and ")}`);
        this.postText = "";
        await this.refresh();
      } catch (error) {
        new Notice(`Publishing failed: ${error instanceof Error ? error.message : String(error)}`);
        textarea.disabled = false;
        publishButton.textContent = "Publish";
        updateCount();
      }
    });

    updateCount();
  }

  private renderPublishFeedback(container: Element, feedbackItems: PublishFeedback[]): void {
    for (const feedback of feedbackItems) {
      const status = container.createDiv({ cls: "social-deck__publish-feedback" });
      const message = status.createDiv();
      message.createEl("strong", { text: `Posted to ${feedback.platformName}` });
      message.createEl("small", { text: feedback.publishedAt });

      const actions = status.createDiv({ cls: "social-deck__publish-feedback-actions" });
      if (feedback.url) {
        actions.createEl("a", {
          text: "View post",
          href: feedback.url,
          attr: {
            target: "_blank",
            rel: "noopener noreferrer"
          }
        });
      }
      const copyButton = actions.createEl("button", { text: feedback.url ? "Copy URL" : "Copy ID" });
      copyButton.addEventListener("click", async () => {
        await navigator.clipboard.writeText(feedback.url ?? feedback.id ?? "");
        new Notice(`${feedback.platformName} ${feedback.url ? "URL" : "ID"} copied`);
      });
    }
  }

  private getEnabledPublishPlatforms(): SocialPlatform[] {
    return (["bluesky", "linkedin"] as SocialPlatform[]).filter(
      (platform) => this.plugin.settings.enabledPlatforms[platform]
    );
  }

  private getCharacterLimit(platforms: SocialPlatform[]): number {
    if (platforms.length === 0) {
      return PLATFORM_DEFINITIONS.bluesky.characterLimit;
    }
    return Math.min(...platforms.map((platform) => PLATFORM_DEFINITIONS[platform].characterLimit));
  }
}
