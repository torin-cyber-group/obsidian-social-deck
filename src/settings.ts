import { App, Notice, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import type SocialDeckPlugin from "./main";

export interface SocialDeckSettings {
  webhookUrl: string;
  webhookTestUrl: string;
  webhookSecretId: string;
  accountLabel: string;
}

export const DEFAULT_SETTINGS: SocialDeckSettings = {
  webhookUrl: "",
  webhookTestUrl: "",
  webhookSecretId: "",
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
      .setName("n8n test webhook URL")
      .setDesc("Optional /webhook-test URL used only by Test connection while n8n is listening for a test event.")
      .addText((text) =>
        text
          .setPlaceholder("https://n8n.example.com/webhook-test/social-deck")
          .setValue(this.plugin.settings.webhookTestUrl)
          .onChange(async (value) => {
            this.plugin.settings.webhookTestUrl = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("n8n webhook secret")
      .setDesc("SecretStorage entry sent in the X-Social-Deck-Secret header. Store the secret value in Obsidian's secret store, not plugin data.")
      .addComponent((element) =>
        new SecretComponent(this.app, element)
          .setValue(this.plugin.settings.webhookSecretId)
          .onChange(async (value) => {
            this.plugin.settings.webhookSecretId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Test n8n connection")
      .setDesc("Sends a connection check to the configured webhook without publishing. Failed checks write details to the developer console.")
      .addButton((button) =>
        button.setButtonText("Test connection").onClick(async () => {
          button.setDisabled(true);
          button.setButtonText("Testing...");
          try {
            const result = await this.plugin.testN8nConnection();
            new Notice(`n8n connection ok: ${result.receivedAt}`);
          } catch (error) {
            new Notice(`n8n connection failed: ${error instanceof Error ? error.message : String(error)}`);
          } finally {
            button.setButtonText("Test connection");
            button.setDisabled(false);
          }
        })
      );

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
