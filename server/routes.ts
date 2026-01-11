import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { downloadYoutubeMusic } from "./utils/youtube";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import ytSearch from 'yt-search';
import memoizee from "memoizee";

const memoizedYoutubeSearch = memoizee(async (query: string) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    try {
      const r = await ytSearch(query);
      return r.videos.slice(0, 10).map((v: any) => ({
        id: v.videoId,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.image || v.thumbnail,
        channelTitle: v.author.name,
        publishedAt: v.ago
      }));
    } catch (err) {
      console.error("yt-search fallback failed:", err);
      throw new Error("YouTube search failed");
    }
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "YouTube API request failed");
  }

  const data = await response.json();
  return data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt
  }));
}, { promise: true, maxAge: 1000 * 60 * 60 }); // Cache for 1 hour

async function searchYoutube(query: string) {
  return memoizedYoutubeSearch(query);
}

const execAsync = promisify(exec);

async function syncProjectsFromFilesystem() {
  const userdataDir = path.join(process.cwd(), "userdata");
  try {
    const entries = await fs.readdir(userdataDir, { withFileTypes: true });
    const currentProjects = await storage.getProjects();
    const currentPaths = new Set(currentProjects.map(p => p.path));

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== "settings") {
        const projectPath = `userdata/${entry.name}`;
        if (!currentPaths.has(projectPath)) {
          // Add missing project from filesystem to DB
          await storage.createProject({
            name: entry.name,
            path: projectPath,
            files: [
              {
                name: "main.py",
                content: "# Main strategy file\n\nclass Strategy:\n    pass",
                path: "/main.py",
                type: 'file'
              }
            ]
          });
          console.log(`Synced project from filesystem: ${entry.name}`);
        }
      }
    }
  } catch (err) {
    console.error("Failed to sync projects from filesystem:", err);
  }
}

const USERDATA_PATH = path.join(process.cwd(), "userdata", "settings.json");
const CONNECTIONS_PATH = path.join(process.cwd(), "userdata", "connections.json");

async function syncConnectionsFromFilesystem() {
  try {
    await fs.mkdir(path.dirname(CONNECTIONS_PATH), { recursive: true });
    let fileConnections: any[] = [];
    try {
      const data = await fs.readFile(CONNECTIONS_PATH, "utf-8");
      fileConnections = JSON.parse(data);
    } catch (e) {
      // File doesn't exist or is invalid, sync from DB to file
      const dbConnections = await storage.getConnections();
      await fs.writeFile(CONNECTIONS_PATH, JSON.stringify(dbConnections, null, 2));
      return;
    }

    const dbConnections = await storage.getConnections();
    const dbNames = new Set(dbConnections.map(c => c.name));

    for (const conn of fileConnections) {
      if (!dbNames.has(conn.name)) {
        await storage.createConnection({
          name: conn.name,
          apiUrl: conn.apiUrl,
          username: conn.username,
          password: conn.password,
          isActive: conn.isActive ?? true
        });
        console.log(`Synced connection from filesystem: ${conn.name}`);
      }
    }
    
    // Update file with latest from DB (including IDs)
    const latestDbConnections = await storage.getConnections();
    await fs.writeFile(CONNECTIONS_PATH, JSON.stringify(latestDbConnections, null, 2));
  } catch (err) {
    console.error("Failed to sync connections from filesystem:", err);
  }
}

async function saveConnectionsToFilesystem() {
  try {
    const connections = await storage.getConnections();
    await fs.writeFile(CONNECTIONS_PATH, JSON.stringify(connections, null, 2));
  } catch (err) {
    console.error("Failed to save connections to filesystem:", err);
  }
}

async function ensureUserData() {
  try {
    await fs.access(USERDATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(USERDATA_PATH), { recursive: true });
    await fs.writeFile(USERDATA_PATH, JSON.stringify({
      messages: [],
      apiKey: "",
      selectedModel: "xiaomi/mimo-v2-flash:free"
    }));
  }
}

class FreqtradeClient {
  private baseUrl: string;
  private auth: string;

  constructor(url: string, username: string, password: string) {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    this.auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': this.auth,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, { 
          ...options, 
          headers,
          signal: AbortSignal.timeout(10000) // 10s timeout
        });
        
        if (response.status === 401) {
          throw new Error("Freqtrade Authentication Failed: Invalid credentials");
        }

        if (!response.ok) {
          throw new Error(`Freqtrade API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
      } catch (error: any) {
        attempts++;
        if (attempts === maxAttempts || error.message.includes("Authentication Failed")) {
          console.error(`Freqtrade Request Failed after ${attempts} attempts: ${endpoint}`, error);
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
      }
    }
  }

  async ping() {
    return this.request('/api/v1/ping');
  }

  async getTrades() {
    return this.request('/api/v1/trades');
  }

  async getOpenTrades() {
    return this.request('/api/v1/status');
  }

  async getOpenTradesDetailed() {
    const status = await this.getOpenTrades();
    return status;
  }

  async getProfit(days: number = 30) {
    return this.request(`/api/v1/profit?days=${days}`);
  }

  async getDailyProfit(days: number = 7) {
    return this.request(`/api/v1/daily?days=${days}`);
  }

  async getStats() {
    const stats = await this.request('/api/v1/stats');
    return stats;
  }

  async getBalance() {
    return this.request('/api/v1/balance');
  }

  async getPerformance() {
    return this.request('/api/v1/performance');
  }

  async getCount() {
    return this.request('/api/v1/count');
  }

  async backtest(config: any) {
    return this.request('/api/v1/backtest', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Authentication integrated via passport configuration above


  // YouTube OAuth Routes
  app.get("/api/auth/google", passport.authenticate("google", {
    accessType: "offline",
    prompt: "consent",
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
      "https://www.googleapis.com/auth/yt-analytics-monetary.readonly"
    ]
  } as any));

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/youtube");
    }
  );

  // Freqtrade Connections
  app.get(api.freqtrade.listConnections.path, async (req, res) => {
    const connections = await storage.getConnections();
    res.json(connections);
  });

  app.post(api.freqtrade.createConnection.path, async (req, res) => {
    try {
      const input = api.freqtrade.createConnection.input.parse(req.body);
      const connection = await storage.createConnection(input);
      await saveConnectionsToFilesystem();
      res.status(201).json(connection);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json(err);
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get(api.freqtrade.getConnection.path, async (req, res) => {
    const connection = await storage.getConnection(Number(req.params.id));
    if (!connection) return res.status(404).json({ message: "Connection not found" });
    res.json(connection);
  });

  app.delete(api.freqtrade.deleteConnection.path, async (req, res) => {
    await storage.deleteConnection(Number(req.params.id));
    await saveConnectionsToFilesystem();
    res.status(204).send();
  });

  // Freqtrade Proxy
  const getClient = async (id: number) => {
    const connection = await storage.getConnection(id);
    if (!connection) throw new Error("Connection not found");
    return new FreqtradeClient(connection.apiUrl, connection.username, connection.password);
  };

  app.get(api.freqtrade.ping.path, async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const result = await client.ping();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to connect" });
    }
  });

  app.get(api.freqtrade.trades.path, async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const result = await client.getTrades();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch trades" });
    }
  });

  app.get("/api/freqtrade/:id/open-trades", async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const result = await client.getOpenTrades();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch open trades" });
    }
  });

  app.get("/api/freqtrade/:id/stats", async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const result = await client.getStats();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch stats" });
    }
  });

  app.get("/api/freqtrade/:id/daily-profit", async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const days = req.query.days ? Number(req.query.days) : 7;
      const result = await client.getDailyProfit(days);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch daily profit" });
    }
  });

  app.get("/api/freqtrade/:id/count", async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const result = await client.getCount();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch count" });
    }
  });

  app.get("/api/freqtrade/:id/profit", async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const result = await client.getProfit();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch profit" });
    }
  });

  app.get("/api/freqtrade/:id/balance", async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const result = await client.getBalance();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch balance" });
    }
  });

  app.get("/api/freqtrade/:id/performance", async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const result = await client.getPerformance();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch performance" });
    }
  });

  app.post(api.freqtrade.backtest.path, async (req, res) => {
    try {
      const client = await getClient(Number(req.params.id));
      const input = api.freqtrade.backtest.input.parse(req.body);
      const result = await client.backtest(input);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Backtest failed" });
    }
  });

  // Projects
  app.get(api.projects.list.path, async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.post(api.projects.create.path, async (req, res) => {
    try {
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject(input);
      
      // Build venv in project folder
      const projectPath = path.resolve(process.cwd(), project.path.startsWith('/') ? project.path.slice(1) : project.path);
      try {
        await fs.mkdir(projectPath, { recursive: true });
        
        // Create .ai directory and its files
        const aiDir = path.join(projectPath, ".ai");
        await fs.mkdir(aiDir, { recursive: true });
        
        // Detailed AI structure
        await fs.mkdir(path.join(aiDir, "memory"), { recursive: true });
        await fs.writeFile(path.join(aiDir, "chat.json"), JSON.stringify([], null, 2));
        await fs.writeFile(path.join(aiDir, "memory", "alarms.json"), JSON.stringify([], null, 2));
        await fs.writeFile(path.join(aiDir, "memory", "facts.json"), JSON.stringify([], null, 2));
        await fs.writeFile(path.join(aiDir, "memory", "long.json"), JSON.stringify([], null, 2));
        await fs.writeFile(path.join(aiDir, "memory", "temp.json"), JSON.stringify([], null, 2));
        await fs.writeFile(path.join(aiDir, "preferences.json"), JSON.stringify({
          music: {
            genres: [],
            artists: [],
            analysis: "New profile initialized."
          }
        }, null, 2));
        await fs.writeFile(path.join(aiDir, "id.txt"), "");
        
        await execAsync("python -m venv 4t", { cwd: projectPath });
      } catch (venvErr) {
        console.error("Failed to initialize project directories:", venvErr);
      }

      res.status(201).json(project);
    } catch (err) {
      res.status(400).json(err);
    }
  });

  app.patch(api.projects.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.projects.update.input.parse(req.body);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const updatedProject = await storage.updateProject(id, input);
      
      // Batch sync to filesystem if files were updated
      if (input.files) {
        const projectPath = path.resolve(process.cwd(), project.path.startsWith('/') ? project.path.slice(1) : project.path);
        const newFiles = input.files as any[];

        // Helper to get all paths in a file tree
        const getAllPaths = (files: any[], currentPath: string): Set<string> => {
          const paths = new Set<string>();
          for (const file of files) {
            const fullPath = path.join(currentPath, file.name);
            paths.add(fullPath);
            if (file.type === 'folder' && file.children) {
              const childPaths = getAllPaths(file.children, fullPath);
              childPaths.forEach(p => paths.add(p));
            }
          }
          return paths;
        };

        const newPaths = getAllPaths(newFiles, projectPath);

        // Optimized deletion with path checking
        const syncDeletionToDisk = async (currentPath: string) => {
          try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            const deletions = entries.map(async (entry) => {
              const fullPath = path.join(currentPath, entry.name);
              if (entry.name === '.ai' || entry.name === '4t') return;

              if (!newPaths.has(fullPath)) {
                await fs.rm(fullPath, { recursive: true, force: true });
              } else if (entry.isDirectory()) {
                await syncDeletionToDisk(fullPath);
              }
            });
            await Promise.all(deletions);
          } catch (err) {
            // Directory might not exist or other error
          }
        };

        // Batch writing files using Promise.all
        const syncFilesToDisk = async (files: any[], currentPath: string) => {
          const writes = files.map(async (file) => {
            const fullPath = path.join(currentPath, file.name);
            if (file.type === 'folder') {
              await fs.mkdir(fullPath, { recursive: true });
              if (file.children) {
                await syncFilesToDisk(file.children, fullPath);
              }
            } else {
              await fs.mkdir(path.dirname(fullPath), { recursive: true });
              await fs.writeFile(fullPath, file.content || "");
            }
          });
          await Promise.all(writes);
        };

        try {
          await Promise.all([
            syncDeletionToDisk(projectPath),
            syncFilesToDisk(newFiles, projectPath)
          ]);
        } catch (syncErr) {
          console.error(`Failed to sync project ${id} to disk:`, syncErr);
        }
      }

      res.json(updatedProject);
    } catch (err) {
      res.status(400).json(err);
    }
  });

  app.get(api.projects.get.path, async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const project = await storage.getProject(id);
      if (project) {
        const projectPath = path.resolve(process.cwd(), project.path.startsWith('/') ? project.path.slice(1) : project.path);
        try {
          await fs.rm(projectPath, { recursive: true, force: true });
        } catch (err) {
          console.error(`Failed to delete project directory: ${projectPath}`, err);
        }
      }
      await storage.deleteProject(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      console.log("[Settings] GET /api/settings");
      const settingsList = await storage.settings.get();
      if (settingsList.length > 0) {
        console.log("[Settings] Found in storage");
        res.json(settingsList[0].config);
      } else {
        console.log("[Settings] Not found in storage, checking filesystem");
        // Ensure file exists first
        await ensureUserData();
        const data = await fs.readFile(USERDATA_PATH, "utf-8");
        const parsed = JSON.parse(data);
        // Seed DB
        await storage.settings.update(parsed);
        console.log("[Settings] Synced from filesystem to storage");
        res.json(parsed);
      }
    } catch (error) {
      console.error("[Settings] GET error:", error);
      // Return a valid default rather than 500 if everything fails
      res.json({
        messages: [],
        apiKey: "",
        selectedModel: "xiaomi/mimo-v2-flash:free"
      });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      console.log("[Settings] POST /api/settings", req.body);
      const settings = await storage.settings.update(req.body);
      // Also update file for backward compatibility/fallback
      await ensureUserData();
      await fs.writeFile(USERDATA_PATH, JSON.stringify(req.body, null, 2));
      console.log("[Settings] Saved successfully");
      res.json({ success: true, settings });
    } catch (error) {
      console.error("[Settings] POST error:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.post("/api/test-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      console.log("[Test Key] Testing API key with OpenRouter...");
      
      // Use the 'auth/key' endpoint which is specifically for testing keys
      const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "",
          "X-Title": "4tiee",
        }
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Test Key] API Error (${response.status}):`, text);
        let errorMsg = "Invalid API key";
        try {
          const errorJson = JSON.parse(text);
          errorMsg = errorJson.error?.message || errorMsg;
        } catch (e) {
          errorMsg = `API Error (${response.status})`;
        }
        return res.status(401).json({ error: errorMsg });
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        console.log("[Test Key] Success:", data);
        res.json(data);
      } catch (e) {
        console.error("[Test Key] JSON Parse Error:", e, "Raw text:", text);
        res.status(500).json({ error: "Received invalid response format from OpenRouter" });
      }
    } catch (error) {
      console.error("[Test Key] Exception:", error);
      res.status(500).json({ error: "Failed to connect to OpenRouter test service" });
    }
  });

  // Chat
  app.post("/api/chat", async (req, res) => {
    try {
      console.log("[Chat] POST /api/chat - Started");
      const { message, model, apiKey, contextFiles, useWebSearch } = req.body;
      
      if (!message) {
        console.warn("[Chat] Missing message");
        return res.status(400).json({ error: "Message is required" });
      }

      console.log(`[Chat] Message received: "${message.substring(0, 50)}..."`);
      
      // Load current settings to get API key if not provided
      const settingsList = await storage.settings.get();
      const settings = (settingsList.length > 0 ? settingsList[0].config : {}) as any;
      const effectiveApiKey = apiKey || settings.apiKey;
      const effectiveModel = model || settings.selectedModel || "xiaomi/mimo-v2-flash:free";

      if (!effectiveModel.endsWith(":free")) {
        console.warn(`[Chat] Attempted to use non-free model: ${effectiveModel}`);
        return res.status(403).json({ error: "Only free models are allowed." });
      }

      console.log(`[Chat] Options - Model: ${effectiveModel}, Context: ${contextFiles?.length || 0} files, WebSearch: ${!!useWebSearch}`);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

        if (!openRouterKey) {
          console.error("[Chat] OpenRouter API Key missing");
          return res.status(401).json({ 
            error: "OpenRouter API Key is missing. Please provide one in Settings." 
          });
        }

        const client = new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: openRouterKey,
          defaultHeaders: {
            "HTTP-Referer": "",
            "X-Title": "4tiee",
          }
        });

        const messages = [
          { role: "system", content: "You are 4tiee assistant, an expert in cryptocurrency trading strategies and Freqtrade. Help the user analyze their projects and develop trading bots. Respond in a friendly and professional manner." },
          ...req.body.messages || [],
          { role: "user", content: message }
        ];

        console.log(`[Chat] Sending request to OpenRouter with ${messages.length} messages`);

        const stream = await client.chat.completions.create({
          model: effectiveModel,
          messages: messages as any,
          stream: true,
          temperature: 0.7,
          max_tokens: 2000,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
          }
        }

        res.write(`data: [DONE]\n\n`);
        res.end();
        console.log("[Chat] Stream finished successfully via OpenRouter");
      } catch (aiError: any) {
        console.error("[Chat] AI Service Error:", aiError);
        const errorMsg = aiError.message || "AI service error";
        res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("[Chat] Error in chat endpoint:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
        res.end();
      }
    }
  });

  // Memory
  app.get("/api/memory", async (req, res) => {
    const type = req.query.type as string;
    const items = await storage.memory.get(type);
    res.json(items);
  });

  app.post("/api/memory", async (req, res) => {
    try {
      const item = await storage.memory.create(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json(err);
    }
  });

  app.delete("/api/memory/:id", async (req, res) => {
    await storage.memory.delete(Number(req.params.id));
    res.status(204).send();
  });

  // Preferences
  app.get("/api/preferences", async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const prefs = await storage.preferences.get(projectId);
    res.json(prefs);
  });

  app.post("/api/preferences", async (req, res) => {
    const { key, value, projectId } = req.body;
    const pref = await storage.preferences.set(key, value, projectId ? Number(projectId) : undefined);
    res.json(pref);
  });

  // YouTube search
  app.get("/api/youtube/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) return res.status(400).json({ message: "Query is required" });
      const results = await searchYoutube(query);
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Search failed" });
    }
  });

  app.get("/api/youtube/library", async (req, res) => {
    try {
      // Stub for now or fetch from storage if implemented
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch library" });
    }
  });

  app.get("/api/youtube/recent", async (req, res) => {
    try {
      const recent = await storage.getRecentlyPlayed(20);
      res.json(recent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent plays" });
    }
  });

  app.get("/api/youtube/playlists", async (req, res) => {
    try {
      const playlists = await storage.getPlaylists();
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.post("/api/youtube/playlists", async (req, res) => {
    try {
      const { name } = req.body;
      const playlist = await storage.createPlaylist({ name });
      res.status(201).json(playlist);
    } catch (error) {
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

  app.post("/api/youtube/playlists/:id/items", async (req, res) => {
    try {
      const playlistId = Number(req.params.id);
      const video = await storage.createYoutubeVideo(req.body);
      const item = await storage.addPlaylistItem({
        playlistId,
        videoId: video.id,
        position: req.body.position || 0
      });
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to playlist" });
    }
  });

  app.get("/api/youtube/playlists/:id/items", async (req, res) => {
    try {
      const items = await storage.getPlaylistItems(Number(req.params.id));
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playlist items" });
    }
  });

  // YouTube Download
  app.post("/api/download-youtube", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      // Run download in background to not block the request
      downloadYoutubeMusic(url)
        .then(title => console.log(`Successfully downloaded: ${title}`))
        .catch(err => console.error("Background download failed:", err));

      res.json({ success: true, message: "Download started in background" });
    } catch (error) {
      console.error("Download trigger failed:", error);
      res.status(500).json({ message: "Failed to start download" });
    }
  });

  // User IDs
  app.get("/api/user-ids", async (req, res) => {
    const ids = await storage.userId.get();
    res.json(ids);
  });

  // Sync projects and connections on startup
  await Promise.all([
    syncProjectsFromFilesystem(),
    syncConnectionsFromFilesystem()
  ]);

  app.get("/api/models", async (req, res) => {
    try {
      res.json([
        { id: "xiaomi/mimo-v2-flash:free", name: "Mimo V2 Flash (Free)" },
        { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)" },
        { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
        { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
        { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)" },
        { id: "deepseek/deepseek-chat:free", name: "DeepSeek Chat (Free)" }
      ]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  return createServer(app);
}
