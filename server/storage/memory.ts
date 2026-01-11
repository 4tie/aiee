import { type Memory, type InsertMemory } from "@shared/schema";
import { getProjectDb, globalDb } from "../sqlite";

export class MemoryStorage {
  async get(type?: string, projectId?: number): Promise<Memory[]> {
    if (projectId) {
      const project = (globalDb.get('projects') || []).find(([id, p]: [number, any]) => id === projectId)?.[1];
      if (project) {
        const projectDb = getProjectDb(project.path);
        const items = projectDb.get('memory') || [];
        return type ? items.filter((m: any) => m.type === type) : items;
      }
    }
    const items = globalDb.get('memory') || [];
    return type ? items.filter((m: any) => m.type === type) : items;
  }

  async create(item: InsertMemory): Promise<Memory> {
    const projectId = item.metadata && typeof item.metadata === 'object' && 'projectId' in item.metadata 
      ? (item.metadata as any).projectId 
      : null;

    if (projectId) {
      const project = (globalDb.get('projects') || []).find(([id, p]: [number, any]) => id === projectId)?.[1];
      if (project) {
        const projectDb = getProjectDb(project.path);
        const items = projectDb.get('memory') || [];
        const newMemory: Memory = { 
          id: Date.now(), 
          type: item.type,
          content: item.content,
          metadata: item.metadata ?? null,
          createdAt: new Date()
        };
        items.push(newMemory);
        projectDb.set('memory', items);
        return newMemory;
      }
    }

    const items = globalDb.get('memory') || [];
    const newMemory: Memory = { 
      id: Date.now(), 
      type: item.type,
      content: item.content,
      metadata: item.metadata ?? null,
      createdAt: new Date()
    };
    items.push(newMemory);
    globalDb.set('memory', items);
    return newMemory;
  }

  async delete(id: number, projectId?: number): Promise<void> {
    if (projectId) {
      const project = (globalDb.get('projects') || []).find(([pid, p]: [number, any]) => pid === projectId)?.[1];
      if (project) {
        const projectDb = getProjectDb(project.path);
        const items = (projectDb.get('memory') || []).filter((m: any) => m.id !== id);
        projectDb.set('memory', items);
        return;
      }
    }
    const items = (globalDb.get('memory') || []).filter((m: any) => m.id !== id);
    globalDb.set('memory', items);
  }
}
