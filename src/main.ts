import { addIcon, Plugin, setIcon, WorkspaceLeaf } from "obsidian";
import { RAVEN_ICON, RAVEN_ICON_SVG } from "./icons";
import { DEFAULT_SETTINGS, SocialDeckSettingTab, type SocialDeckSettings } from "./settings";
import {
  publishSocialPost,
  testN8nConnection,
  type N8nConnectionTestResult,
  type SocialPublishResult
} from "./services/publish-service";
import { SOCIAL_DECK_VIEW_TYPE, SocialDeckView } from "./views/social-deck-view";

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
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(SOCIAL_DECK_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    const savedData = (await this.loadData()) as Partial<SocialDeckSettings> | null;
    const savedSettings = Object.assign({}, DEFAULT_SETTINGS, savedData);

    this.settings = {
      webhookUrl: savedSettings.webhookUrl,
      webhookTestUrl: savedSettings.webhookTestUrl,
      webhookSecretId: savedSettings.webhookSecretId,
      enabledPlatforms: {
        ...DEFAULT_SETTINGS.enabledPlatforms,
        ...savedSettings.enabledPlatforms
      },
      linkedinAuthorUrn: savedSettings.linkedinAuthorUrn,
      accountLabel: savedSettings.accountLabel
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    await this.refreshViews();
  }

  async publishSocialText(text: string): Promise<SocialPublishResult[]> {
    return publishSocialPost(this.settings.webhookUrl, this.getWebhookSecret(), {
      text,
      platforms: {
        bluesky: this.settings.enabledPlatforms.bluesky,
        linkedin: this.settings.enabledPlatforms.linkedin
          ? { authorUrn: this.settings.linkedinAuthorUrn }
          : undefined
      }
    });
  }

  async testN8nConnection(): Promise<N8nConnectionTestResult> {
    return testN8nConnection(
      this.settings.webhookTestUrl || this.settings.webhookUrl,
      this.getWebhookSecret()
    );
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
