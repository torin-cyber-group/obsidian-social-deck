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
  private selectedPlatforms = new Set<SocialPlatform>();
  private availablePlatformsSnapshot = "";

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
    const availablePlatforms = this.getEnabledPublishPlatforms();
    this.syncSelectedPlatforms(availablePlatforms);

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

    const selector = section.createDiv({ cls: "social-deck__platform-selector" });
    selector.createEl("span", { text: "Publish to" });
    const selectorOptions = selector.createDiv({ cls: "social-deck__platform-options" });

    const footer = section.createDiv({ cls: "social-deck__platform-footer" });
    const footerStatus = footer.createEl("small");
    const actions = footer.createDiv({ cls: "social-deck__platform-actions" });
    const clearButton = actions.createEl("button", { text: "Clear" });
    const publishButton = actions.createEl("button", {
      cls: "mod-cta",
      text: "Publish"
    });

    const updateCount = (): void => {
      const selectedPlatforms = this.getSelectedPublishPlatforms();
      const characterLimit = this.getCharacterLimit(selectedPlatforms);
      const length = [...textarea.value].length;
      const overLimit = length > characterLimit;
      const missingConfiguration =
        !this.plugin.settings.webhookUrl || !this.plugin.getWebhookSecret();
      const platformNames = selectedPlatforms.map((platform) => PLATFORM_DEFINITIONS[platform].name);
      footerStatus.textContent =
        availablePlatforms.length === 0
          ? "Enable a platform in Social Deck settings to publish"
          : platformNames.length > 0
          ? `Text-only publishing to ${platformNames.join(" and ")} is available`
          : "Select at least one platform for this post";
      count.textContent = `${length.toLocaleString()} / ${characterLimit.toLocaleString()}`;
      count.toggleClass("social-deck__character-count--over", overLimit);
      textarea.toggleClass("social-deck__editor--over", overLimit);
      publishButton.textContent =
        platformNames.length > 0 ? `Publish to ${platformNames.join(" and ")}` : "Publish";
      publishButton.disabled =
        length === 0 ||
        overLimit ||
        missingConfiguration ||
        selectedPlatforms.length === 0;
      publishButton.title = missingConfiguration
        ? "Configure the n8n webhook URL and SecretStorage entry in Social Deck settings"
        : selectedPlatforms.length === 0
          ? availablePlatforms.length === 0
            ? "Enable a platform in Social Deck settings"
            : "Select at least one platform for this post"
          : overLimit
            ? `Enabled platform posts must be ${characterLimit} characters or fewer`
            : "Publish this text";
    };

    if (availablePlatforms.length === 0) {
      selectorOptions.createEl("small", { text: "No enabled platforms" });
    }

    for (const platform of availablePlatforms) {
      const definition = PLATFORM_DEFINITIONS[platform];
      const option = selectorOptions.createEl("label", {
        cls: "social-deck__platform-option"
      });
      const checkbox = option.createEl("input", {
        attr: {
          type: "checkbox",
          value: platform
        }
      });
      checkbox.checked = this.selectedPlatforms.has(platform);
      option.createSpan({ text: definition.name });
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          this.selectedPlatforms.add(platform);
        } else {
          this.selectedPlatforms.delete(platform);
        }
        updateCount();
      });
    }

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
        const results = await this.plugin.publishSocialText(textarea.value, this.getSelectedPublishPlatforms());
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

  private getSelectedPublishPlatforms(): SocialPlatform[] {
    return this.getEnabledPublishPlatforms().filter((platform) => this.selectedPlatforms.has(platform));
  }

  private syncSelectedPlatforms(availablePlatforms: SocialPlatform[]): void {
    const available = new Set(availablePlatforms);
    const snapshot = availablePlatforms.join(",");
    const availableChanged = snapshot !== this.availablePlatformsSnapshot;
    this.availablePlatformsSnapshot = snapshot;

    for (const platform of [...this.selectedPlatforms]) {
      if (!available.has(platform)) {
        this.selectedPlatforms.delete(platform);
      }
    }
    if (availableChanged || this.selectedPlatforms.size === 0) {
      for (const platform of availablePlatforms) {
        this.selectedPlatforms.add(platform);
      }
    }
  }

  private getCharacterLimit(platforms: SocialPlatform[]): number {
    if (platforms.length === 0) {
      return PLATFORM_DEFINITIONS.bluesky.characterLimit;
    }
    return Math.min(...platforms.map((platform) => PLATFORM_DEFINITIONS[platform].characterLimit));
  }
}
