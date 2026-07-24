import { App, Notice, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import type SocialDeckPlugin from "./main";
import { PLATFORM_DEFINITIONS } from "./platforms/definitions";
import type { SocialPlatform } from "./types/social";

export interface SocialDeckSettings {
  webhookUrl: string;
  webhookTestUrl: string;
  webhookSecretId: string;
  enabledPlatforms: Record<SocialPlatform, boolean>;
}

export const DEFAULT_SETTINGS: SocialDeckSettings = {
  webhookUrl: "",
  webhookTestUrl: "",
  webhookSecretId: "",
  enabledPlatforms: {
    x: false,
    bluesky: true,
    linkedin: false
  }
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

    new Setting(containerEl).setName("Enabled platforms").setHeading();

    for (const definition of Object.values(PLATFORM_DEFINITIONS)) {
      const isAvailable = definition.id === "bluesky" || definition.id === "linkedin";
      new Setting(containerEl)
        .setName(isAvailable ? definition.name : `${definition.name} planned`)
        .setDesc(
          definition.id === "bluesky"
            ? "Show Bluesky publishing in the composer."
            : definition.id === "linkedin"
            ? "Show LinkedIn publishing in the composer."
            : "This platform is included in the n8n workflow, but Obsidian publishing controls are not enabled yet."
        )
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.enabledPlatforms[definition.id])
            .setDisabled(!isAvailable)
            .onChange(async (value) => {
              this.plugin.settings.enabledPlatforms[definition.id] = value;
              await this.plugin.saveSettings();
            })
        );
    }

  }
}
