import { addIcon, Plugin, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import { RAVEN_ICON, RAVEN_ICON_SVG } from "./icons";
import { DEFAULT_SETTINGS, SocialDeckSettingTab, type SocialDeckSettings } from "./settings";
import { publishBlueskyPost, type BlueskyPublishResult } from "./services/publish-service";
import type { SocialPlatform } from "./types/social";
import { SOCIAL_DECK_VIEW_TYPE, SocialDeckView } from "./views/social-deck-view";

interface LegacySocialDeckSettings extends Partial<SocialDeckSettings> {
  webhookSecret?: string;
}

export default class SocialDeckPlugin extends Plugin {
  settings: SocialDeckSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    addIcon(RAVEN_ICON, RAVEN_ICON_SVG);
    this.registerView(SOCIAL_DECK_VIEW_TYPE, (leaf) => new SocialDeckView(leaf, this));
    this.addRibbonIcon(RAVEN_ICON, "Open Social Deck", () => this.activateView());
    this.addCommand({
      id: "open-social-deck",
      name: "Open Social Deck",
      callback: () => this.activateView()
    });
    this.addSettingTab(new SocialDeckSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        void this.refreshViews();
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file === this.app.workspace.getActiveFile()) {
          void this.refreshViews();
        }
      })
    );
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(SOCIAL_DECK_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    const savedData = (await this.loadData()) as LegacySocialDeckSettings | null;
    const savedSettings = Object.assign({}, DEFAULT_SETTINGS, savedData);

    if (!savedSettings.webhookSecretId && savedData?.webhookSecret) {
      const migratedSecretId = "social-deck-n8n-webhook-secret";
      this.app.secretStorage.setSecret(migratedSecretId, savedData.webhookSecret);
      savedSettings.webhookSecretId = migratedSecretId;
    }

    this.settings = {
      webhookUrl: savedSettings.webhookUrl,
      webhookSecretId: savedSettings.webhookSecretId,
      accountLabel: savedSettings.accountLabel
    };

    if (savedData?.webhookSecret) {
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async savePlatforms(file: TFile, platforms: SocialPlatform[]): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter["social-platforms"] = platforms;
    });
  }

  async publishBluesky(file: TFile, text: string): Promise<BlueskyPublishResult> {
    const result = await publishBlueskyPost(
      this.settings.webhookUrl,
      this.getWebhookSecret(),
      { fileName: file.basename, filePath: file.path, text }
    );

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter["social-status"] = "published";
      const existing = frontmatter["social-published-urls"];
      const publishedUrls =
        typeof existing === "object" && existing !== null && !Array.isArray(existing)
          ? (existing as Record<string, unknown>)
          : {};
      const existingBluesky = Array.isArray(publishedUrls.bluesky)
        ? publishedUrls.bluesky.filter((url): url is string => typeof url === "string")
        : [];
      publishedUrls.bluesky = [...new Set([...existingBluesky, result.url])];
      frontmatter["social-published-urls"] = publishedUrls;
      delete frontmatter["social-last-error"];
    });

    return result;
  }

  getWebhookSecret(): string {
    return this.settings.webhookSecretId
      ? this.app.secretStorage.getSecret(this.settings.webhookSecretId) ?? ""
      : "";
  }

  setIcon(element: HTMLElement, icon: string): void {
    setIcon(element, icon);
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(SOCIAL_DECK_VIEW_TYPE)[0];
    let leaf: WorkspaceLeaf;

    if (existing) {
      leaf = existing;
    } else {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: SOCIAL_DECK_VIEW_TYPE, active: true });
    }

    await this.app.workspace.revealLeaf(leaf);
    await this.refreshViews();
  }

  private async refreshViews(): Promise<void> {
    const views = this.app.workspace
      .getLeavesOfType(SOCIAL_DECK_VIEW_TYPE)
      .map((leaf) => leaf.view)
      .filter((view): view is SocialDeckView => view instanceof SocialDeckView);
    await Promise.all(views.map((view) => view.refresh()));
  }
}
