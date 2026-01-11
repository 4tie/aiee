import { MemoryStorage } from "./storage/memory";
import { PreferencesStorage } from "./storage/preferences";
import { UserIDStorage } from "./storage/user_id";
import { ProjectStorage } from "./storage/projects";
import { SettingsStorage } from "./storage/settings";
import { globalDb, getProjectDb } from "./sqlite";
import { 
  type FreqtradeConnection, type InsertFreqtradeConnection,
  type Project, type InsertProject,
  type Feedback, type InsertFeedback,
  type YoutubeVideo, type InsertYoutubeVideo,
  type Playlist, type InsertPlaylist,
  type PlaylistItem, type InsertPlaylistItem,
} from "@shared/schema";

export interface IStorage {
  // Freqtrade Connections
  getConnections(): Promise<FreqtradeConnection[]>;
  getConnection(id: number): Promise<FreqtradeConnection | undefined>;
  createConnection(connection: InsertFreqtradeConnection): Promise<FreqtradeConnection>;
  deleteConnection(id: number): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Feedback
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedback(): Promise<Feedback[]>;

  // YouTube
  getYoutubeVideo(youtubeId: string): Promise<YoutubeVideo | undefined>;
  createYoutubeVideo(video: InsertYoutubeVideo): Promise<YoutubeVideo>;
  updateVideoPlayback(youtubeId: string): Promise<void>;
  getRecentlyPlayed(limit: number): Promise<YoutubeVideo[]>;
  getPlaylists(): Promise<Playlist[]>;
  getPlaylist(id: number): Promise<Playlist | undefined>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  getPlaylistItems(playlistId: number): Promise<(PlaylistItem & { video: YoutubeVideo })[]>;
  addPlaylistItem(item: InsertPlaylistItem): Promise<PlaylistItem>;
  updateYoutubeAuth(auth: { userId: number; accessToken: string; refreshToken?: string }): Promise<void>;

  // Modular Storage
  settings: SettingsStorage;
  memory: MemoryStorage;
  preferences: PreferencesStorage;
  userId: UserIDStorage;
}

export class MemStorage implements IStorage {
  private connections: Map<number, FreqtradeConnection>;
  private feedbacks: Feedback[];
  private youtubeVideos: Map<string, YoutubeVideo>;
  private playlists: Map<number, Playlist>;
  private playlistItems: PlaylistItem[];
  private youtubeAuths: Map<number, any>;
  private currentId: number;

  settings = new SettingsStorage();
  memory = new MemoryStorage();
  preferences = new PreferencesStorage();
  userId = new UserIDStorage();
  projectStorage = new ProjectStorage();

  constructor() {
    this.connections = new Map(globalDb.get('connections') || []);
    this.feedbacks = globalDb.get('feedbacks') || [];
    this.youtubeVideos = new Map(globalDb.get('youtubeVideos') || []);
    this.playlists = new Map(globalDb.get('playlists') || []);
    this.playlistItems = globalDb.get('playlistItems') || [];
    this.youtubeAuths = new Map(globalDb.get('youtubeAuths') || []);
    this.currentId = globalDb.get('currentId') || 1;
  }

  private persist() {
    globalDb.set('connections', Array.from(this.connections.entries()));
    globalDb.set('feedbacks', this.feedbacks);
    globalDb.set('youtubeVideos', Array.from(this.youtubeVideos.entries()));
    globalDb.set('playlists', Array.from(this.playlists.entries()));
    globalDb.set('playlistItems', this.playlistItems);
    globalDb.set('youtubeAuths', Array.from(this.youtubeAuths.entries()));
    globalDb.set('currentId', this.currentId);
  }

  async getConnections(): Promise<FreqtradeConnection[]> {
    return Array.from(this.connections.values());
  }

  async getConnection(id: number): Promise<FreqtradeConnection | undefined> {
    return this.connections.get(id);
  }

  async createConnection(connection: InsertFreqtradeConnection): Promise<FreqtradeConnection> {
    const id = this.currentId++;
    const newConnection: FreqtradeConnection = { ...connection, id, isActive: connection.isActive ?? true };
    this.connections.set(id, newConnection);
    this.persist();
    return newConnection;
  }

  async deleteConnection(id: number): Promise<void> {
    this.connections.delete(id);
    this.persist();
  }

  async getProjects(): Promise<Project[]> {
    return this.projectStorage.getProjects();
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projectStorage.getProject(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const newProject = await this.projectStorage.createProject(project);
    const projectDb = getProjectDb(newProject.path);
    projectDb.set('metadata', { id: newProject.id, name: newProject.name });
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const updated = await this.projectStorage.updateProject(id, project);
    const projectDb = getProjectDb(updated.path);
    projectDb.set('metadata', { id: updated.id, name: updated.name });
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    return this.projectStorage.deleteProject(id);
  }

  async createFeedback(fb: InsertFeedback): Promise<Feedback> {
    const id = this.currentId++;
    const newFeedback: Feedback = { 
      id, 
      rating: fb.rating,
      comment: fb.comment ?? null,
      messageIndex: fb.messageIndex ?? 0,
      projectId: fb.projectId ?? 0,
      createdAt: new Date() 
    };
    this.feedbacks.push(newFeedback);
    this.persist();
    return newFeedback;
  }

  async getFeedback(): Promise<Feedback[]> {
    return this.feedbacks.sort((a, b) => {
      const dateA = a.createdAt?.getTime() ?? 0;
      const dateB = b.createdAt?.getTime() ?? 0;
      return dateB - dateA;
    });
  }

  async getYoutubeVideo(youtubeId: string): Promise<YoutubeVideo | undefined> {
    return Array.from(this.youtubeVideos.values()).find(v => v.youtubeId === youtubeId);
  }

  async createYoutubeVideo(video: InsertYoutubeVideo): Promise<YoutubeVideo> {
    const existing = await this.getYoutubeVideo(video.youtubeId);
    if (existing) {
      const updated = { ...existing, ...video };
      this.youtubeVideos.set(existing.id.toString(), updated);
      this.persist();
      return updated;
    }
    const id = this.currentId++;
    const newVideo: YoutubeVideo = { 
      id,
      youtubeId: video.youtubeId,
      title: video.title,
      description: video.description ?? null,
      thumbnailUrl: video.thumbnailUrl ?? null,
      channelTitle: video.channelTitle ?? null,
      playCount: video.playCount ?? 0,
      lastPlayedAt: video.lastPlayedAt ?? null,
      publishedAt: video.publishedAt ?? null,
      createdAt: new Date()
    };
    this.youtubeVideos.set(id.toString(), newVideo);
    this.persist();
    return newVideo;
  }

  async updateVideoPlayback(youtubeId: string): Promise<void> {
    const video = await this.getYoutubeVideo(youtubeId);
    if (video) {
      video.lastPlayedAt = new Date();
      video.playCount = (video.playCount || 0) + 1;
      this.persist();
    }
  }

  async getRecentlyPlayed(limit: number = 10): Promise<YoutubeVideo[]> {
    return Array.from(this.youtubeVideos.values())
      .filter(v => v.lastPlayedAt !== null)
      .sort((a, b) => {
        const dateA = a.lastPlayedAt?.getTime() ?? 0;
        const dateB = b.lastPlayedAt?.getTime() ?? 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async getPlaylists(): Promise<Playlist[]> {
    return Array.from(this.playlists.values()).sort((a, b) => {
      const dateA = a.createdAt?.getTime() ?? 0;
      const dateB = b.createdAt?.getTime() ?? 0;
      return dateB - dateA;
    });
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    return this.playlists.get(id);
  }

  async createPlaylist(playlist: InsertPlaylist): Promise<Playlist> {
    const id = this.currentId++;
    const newPlaylist: Playlist = { 
      id, 
      name: playlist.name,
      description: playlist.description ?? null,
      createdAt: new Date() 
    };
    this.playlists.set(id, newPlaylist);
    this.persist();
    return newPlaylist;
  }

  async getPlaylistItems(playlistId: number): Promise<(PlaylistItem & { video: YoutubeVideo })[]> {
    return this.playlistItems
      .filter(item => item.playlistId === playlistId)
      .map(item => ({
        ...item,
        video: Array.from(this.youtubeVideos.values()).find(v => v.id === item.videoId)!
      }))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  async addPlaylistItem(item: InsertPlaylistItem): Promise<PlaylistItem> {
    const id = this.currentId++;
    const newItem: PlaylistItem = { 
      id,
      playlistId: item.playlistId ?? 0,
      videoId: item.videoId ?? 0,
      position: item.position ?? 0,
      createdAt: new Date()
    };
    this.playlistItems.push(newItem);
    this.persist();
    return newItem;
  }

  async updateYoutubeAuth(auth: { userId: number; accessToken: string; refreshToken?: string }): Promise<void> {
    this.youtubeAuths.set(auth.userId, {
      ...auth,
      updatedAt: new Date()
    });
    this.persist();
  }
}

export const storage = new MemStorage();
