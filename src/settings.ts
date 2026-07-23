import { App, PluginSettingTab, Setting } from "obsidian";
import type SocialDeckPlugin from "./main";

export interface SocialDeckSettings {
  webhookUrl: string;
  webhookSecret: string;
  accountLabel: string;
}

export const DEFAULT_SETTINGS: SocialDeckSettings = {
  webhookUrl: "",
  webhookSecret: "",
  accountLabel: "Default"
};

export class SocialDeckSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: SocialDeckPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Social Deck" });

    new Setting(containerEl)
      .setName("n8n webhook URL")
      .setDesc("The HTTPS webhook that receives approved posts. Leave blank while designing drafts.")
      .addText((text) =>
        text
          .setPlaceholder("https://n8n.example.com/webhook/social-deck")
          .setValue(this.plugin.settings.webhookUrl)
          .onChange(async (value) => {
            this.plugin.settings.webhookUrl = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("n8n webhook secret")
      .setDesc("Bearer token required by the n8n webhook. This is not a social-network password.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("A long random value")
          .setValue(this.plugin.settings.webhookSecret)
          .onChange(async (value) => {
            this.plugin.settings.webhookSecret = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Default account label")
      .setDesc("A display label only. Social network credentials remain in n8n.")
      .addText((text) =>
        text.setValue(this.plugin.settings.accountLabel).onChange(async (value) => {
          this.plugin.settings.accountLabel = value.trim() || "Default";
          await this.plugin.saveSettings();
        })
      );
  }
}
