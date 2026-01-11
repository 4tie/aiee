import { type Settings, type InsertSettings } from "@shared/schema";
import { globalDb } from "../sqlite";

export class SettingsStorage {
  private settingsItem: Settings | null = null;
  private currentId: number = 1;

  constructor() {
    const saved = globalDb.get('settings');
    if (saved) {
      this.settingsItem = saved;
      this.currentId = saved.id + 1;
    }
  }

  private persist() {
    globalDb.set('settings', this.settingsItem);
  }

  async get(): Promise<Settings[]> {
    return this.settingsItem ? [this.settingsItem] : [];
  }

  async update(config: any): Promise<Settings> {
    if (this.settingsItem) {
      this.settingsItem = { 
        ...this.settingsItem, 
        config, 
        updatedAt: new Date() 
      };
    } else {
      this.settingsItem = { 
        id: this.currentId++, 
        config, 
        updatedAt: new Date() 
      };
    }
    this.persist();
    return this.settingsItem;
  }
}
