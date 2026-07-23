import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { RAVEN_ICON } from "../icons";
import { PLATFORM_DEFINITIONS } from "../platforms/definitions";
import { parseSocialNote } from "../services/note-parser";
import type SocialDeckPlugin from "../main";
import type { ParsedSocialNote } from "../services/note-parser";
import type { SocialPlatform } from "../types/social";

export const SOCIAL_DECK_VIEW_TYPE = "social-deck-view";

export class SocialDeckView extends ItemView {
  private activeFile: TFile | null = null;
  private drafts: Partial<Record<SocialPlatform, string>> = {};

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
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.extension !== "md") {
      this.activeFile = null;
      this.drafts = {};
      this.renderEmptyState();
      return;
    }

    const changedFile = this.activeFile?.path !== file.path;
    this.activeFile = file;
    const raw = await this.app.vault.cachedRead(file);
    const cache = this.app.metadataCache.getFileCache(file);
    const note = parseSocialNote(raw, cache?.frontmatter);

    if (changedFile) {
      this.drafts = Object.fromEntries(
        note.metadata.platforms.map((platform) => [platform, note.content])
      ) as Partial<Record<SocialPlatform, string>>;
    }

    this.renderNote(file, note);
  }

  private renderEmptyState(): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("social-deck");

    container.createEl("h2", { text: "Social Deck" });
    container.createEl("p", {
      cls: "social-deck__intro",
      text: "Open a social post note to preview and prepare it for publishing."
    });

    const emptyState = container.createDiv({ cls: "social-deck__empty" });
    emptyState.createEl("p", { text: "No Markdown note selected." });
    emptyState.createEl("small", {
      text: "Open a note containing a social post to begin."
    });
  }

  private renderNote(file: TFile, note: ParsedSocialNote): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("social-deck");

    const header = container.createDiv({ cls: "social-deck__header" });
    const heading = header.createDiv();
    heading.createEl("h2", { text: "Social Deck" });
    heading.createEl("small", { text: file.basename, title: file.path });
    const refreshButton = header.createEl("button", {
      cls: "clickable-icon social-deck__refresh",
      attr: { "aria-label": "Reload active note" }
    });
    this.plugin.setIcon(refreshButton, "refresh-cw");
    refreshButton.addEventListener("click", () => {
      this.drafts = {};
      void this.refresh();
    });

    const summary = container.createDiv({ cls: "social-deck__summary" });
    summary.createEl("span", {
      cls: `social-deck__status social-deck__status--${note.metadata.status}`,
      text: note.metadata.status
    });
    summary.createEl("span", {
      text: `${note.metadata.platforms.length} platform${note.metadata.platforms.length === 1 ? "" : "s"}`
    });
    if (note.metadata.media.length > 0) {
      summary.createEl("span", {
        text: `${note.metadata.media.length} media attachment${note.metadata.media.length === 1 ? "" : "s"}`
      });
    }

    this.renderPlatformToggles(container, file, note);

    if (!note.content) {
      const emptyState = container.createDiv({ cls: "social-deck__empty" });
      emptyState.createEl("p", { text: "This note has no post content." });
      return;
    }

    if (note.metadata.platforms.length === 0) {
      const emptyState = container.createDiv({ cls: "social-deck__empty" });
      emptyState.createEl("p", { text: "No platforms selected." });
      emptyState.createEl("small", { text: "Enable at least one platform above to create a preview." });
      return;
    }

    const platformList = container.createDiv({ cls: "social-deck__platforms" });
    for (const platformId of note.metadata.platforms) {
      const definition = PLATFORM_DEFINITIONS[platformId];
      const account = note.metadata.accounts[platformId] ?? this.plugin.settings.accountLabel;
      const card = platformList.createDiv({ cls: "social-deck__platform-card" });
      const cardHeader = card.createDiv({ cls: "social-deck__platform-header" });
      const identity = cardHeader.createDiv();
      identity.createEl("strong", { text: definition.name });
      identity.createEl("small", { text: account });
      const count = cardHeader.createEl("span", { cls: "social-deck__character-count" });

      const textarea = card.createEl("textarea", {
        cls: "social-deck__editor",
        attr: {
          "aria-label": `${definition.name} post preview`,
          rows: "8",
          spellcheck: "true"
        }
      });
      textarea.value = this.drafts[platformId] ?? note.content;

      const footer = card.createDiv({ cls: "social-deck__platform-footer" });
      if (definition.supportsThreads) {
        footer.createEl("small", { text: "Thread support planned" });
      }
      const actions = footer.createDiv({ cls: "social-deck__platform-actions" });
      const resetButton = actions.createEl("button", { text: "Reset from note" });
      let publishButton: HTMLButtonElement | undefined;
      if (platformId === "bluesky") {
        publishButton = actions.createEl("button", {
          cls: "mod-cta",
          text: "Publish to Bluesky"
        });
        publishButton.addEventListener("click", async () => {
          if (!publishButton) {
            return;
          }
          publishButton.disabled = true;
          publishButton.textContent = "Publishing…";
          textarea.disabled = true;
          try {
            const result = await this.plugin.publishBluesky(file, textarea.value);
            new Notice("Published to Bluesky");
            window.open(result.url, "_blank", "noopener,noreferrer");
            await this.refresh();
          } catch (error) {
            new Notice(`Bluesky publishing failed: ${error instanceof Error ? error.message : String(error)}`);
            textarea.disabled = false;
            publishButton.textContent = "Publish to Bluesky";
            updateCount();
          }
        });
      }

      const updateCount = (): void => {
        const length = [...textarea.value].length;
        const overLimit = length > definition.characterLimit;
        count.textContent = `${length.toLocaleString()} / ${definition.characterLimit.toLocaleString()}`;
        count.toggleClass("social-deck__character-count--over", overLimit);
        textarea.toggleClass("social-deck__editor--over", overLimit);
        if (publishButton) {
          const missingConfiguration =
            !this.plugin.settings.webhookUrl || !this.plugin.getWebhookSecret();
          publishButton.disabled = length === 0 || overLimit || missingConfiguration;
          publishButton.title = missingConfiguration
            ? "Configure the n8n webhook URL and SecretStorage entry in Social Deck settings"
            : overLimit
              ? `Bluesky posts must be ${definition.characterLimit} characters or fewer`
              : "Publish this text to Bluesky";
        }
      };

      textarea.addEventListener("input", () => {
        this.drafts[platformId] = textarea.value;
        updateCount();
      });
      updateCount();

      resetButton.addEventListener("click", () => {
        textarea.value = note.content;
        this.drafts[platformId] = note.content;
        updateCount();
        new Notice(`${definition.name} preview reset`);
      });
    }
  }

  private renderPlatformToggles(
    container: Element,
    file: TFile,
    note: ParsedSocialNote
  ): void {
    const section = container.createDiv({ cls: "social-deck__platform-selector" });
    section.createEl("span", { cls: "social-deck__section-label", text: "Publish to" });
    const controls = section.createDiv({ cls: "social-deck__platform-toggles" });

    for (const definition of Object.values(PLATFORM_DEFINITIONS)) {
      const label = controls.createEl("label", { cls: "social-deck__platform-toggle" });
      const checkbox = label.createEl("input", {
        type: "checkbox",
        attr: { "aria-label": `Enable ${definition.name}` }
      });
      checkbox.checked = note.metadata.platforms.includes(definition.id);
      label.createEl("span", { text: definition.name });

      checkbox.addEventListener("change", async () => {
        const inputs = Array.from(controls.querySelectorAll<HTMLInputElement>("input"));
        inputs.forEach((input) => (input.disabled = true));

        const next = Object.values(PLATFORM_DEFINITIONS)
          .filter((platform) => {
            const input = controls.querySelector<HTMLInputElement>(
              `input[aria-label="Enable ${platform.name}"]`
            );
            return input?.checked;
          })
          .map((platform) => platform.id);

        try {
          await this.plugin.savePlatforms(file, next);
          await this.refresh();
        } catch (error) {
          new Notice(`Could not update platforms: ${error instanceof Error ? error.message : String(error)}`);
          await this.refresh();
        }
      });
    }
  }
}
