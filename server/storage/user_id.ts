import { type UserId, type InsertUserId } from "@shared/schema";

export class UserIDStorage {
  private userIds: Map<number, UserId>;
  private currentId: number;

  constructor() {
    this.userIds = new Map();
    this.currentId = 1;
  }

  async get(): Promise<UserId[]> {
    return Array.from(this.userIds.values());
  }

  async add(externalId: string): Promise<UserId> {
    const id = this.currentId++;
    const created: UserId = { 
      id, 
      externalId,
      createdAt: new Date()
    };
    this.userIds.set(id, created);
    return created;
  }
}
