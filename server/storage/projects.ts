import { type Project, type InsertProject } from "@shared/schema";
import { globalDb } from "../sqlite";
import fs from "fs/promises";
import path from "path";

export class ProjectStorage {
  private projects: Map<number, Project>;
  private currentId: number;
  private USERDATA_DIR = path.join(process.cwd(), "userdata");

  constructor() {
    const saved = globalDb.get('projects_map') || [];
    this.projects = new Map(saved);
    this.currentId = globalDb.get('projects_current_id') || 1;
  }

  private persist() {
    globalDb.set('projects_map', Array.from(this.projects.entries()));
    globalDb.set('projects_current_id', this.currentId);
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt || 0).getTime();
      const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.currentId++;
    const newProject: Project = { 
      id, 
      name: project.name,
      path: project.path,
      files: project.files ?? [],
      messages: project.messages ?? [],
      memory: project.memory ?? {},
      activeTask: project.activeTask ?? null,
      downloads: project.downloads ?? [],
      musicPreferences: project.musicPreferences ?? {
        genres: [],
        artists: [],
        analysis: "",
        lastUpdated: null
      },
      updatedAt: new Date()
    };
    this.projects.set(id, newProject);
    this.persist();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error("Project not found");
    
    const updatedProject: Project = { 
      ...existing, 
      ...project, 
      updatedAt: new Date() 
    };
    this.projects.set(id, updatedProject);
    this.persist();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    this.projects.delete(id);
    this.persist();
  }
}
