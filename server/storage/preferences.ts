import { type Preferences, type InsertPreferences } from "@shared/schema";
import { getProjectDb, globalDb } from "../sqlite";

export class PreferencesStorage {
  async get(projectId?: number): Promise<Preferences[]> {
    if (projectId) {
      const project = (globalDb.get('projects') || []).find(([id, p]: [number, any]) => id === projectId)?.[1];
      if (project) {
        const projectDb = getProjectDb(project.path);
        return projectDb.get('preferences') || [];
      }
    }
    return globalDb.get('preferences') || [];
  }

  async set(key: string, value: any, projectId?: number): Promise<Preferences> {
    if (projectId) {
      const project = (globalDb.get('projects') || []).find(([id, p]: [number, any]) => id === projectId)?.[1];
      if (project) {
        const projectDb = getProjectDb(project.path);
        const prefs = projectDb.get('preferences') || [];
        const existingIndex = prefs.findIndex((p: any) => p.key === key);
        
        let updated;
        if (existingIndex >= 0) {
          updated = { ...prefs[existingIndex], value, updatedAt: new Date() };
          prefs[existingIndex] = updated;
        } else {
          updated = { 
            id: Date.now(), 
            key, 
            value, 
            projectId,
            updatedAt: new Date()
          };
          prefs.push(updated);
        }
        projectDb.set('preferences', prefs);
        return updated;
      }
    }

    const prefs = globalDb.get('preferences') || [];
    const existingIndex = prefs.findIndex((p: any) => p.key === key && !p.projectId);
    
    let updated;
    if (existingIndex >= 0) {
      updated = { ...prefs[existingIndex], value, updatedAt: new Date() };
      prefs[existingIndex] = updated;
    } else {
      updated = { 
        id: Date.now(), 
        key, 
        value, 
        projectId: 0,
        updatedAt: new Date()
      };
      prefs.push(updated);
    }
    globalDb.set('preferences', prefs);
    return updated;
  }
}
