import { Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, SocialDeckSettingTab, type SocialDeckSettings } from "./settings";
import { SOCIAL_DECK_VIEW_TYPE, SocialDeckView } from "./views/social-deck-view";

export default class SocialDeckPlugin extends Plugin {
  settings: SocialDeckSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(SOCIAL_DECK_VIEW_TYPE, (leaf) => new SocialDeckView(leaf));
    this.addRibbonIcon("send", "Open Social Deck", () => this.activateView());
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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
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
  }
}

