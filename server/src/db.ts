import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Agent } from "@agent-town/shared";

// Uses Node's built-in node:sqlite (stable enough for a personal local dev
// tool as of Node 24) instead of a compiled dependency like better-sqlite3.
// If the built-in API ever breaks compatibility across Node versions,
// better-sqlite3 is a drop-in-shaped fallback.

export interface ActivityEvent {
  id: number;
  agentId: string;
  eventType: string;
  description: string | null;
  filePath: string | null;
  createdAt: string;
}

export interface RecordEventInput {
  agentId: string;
  eventType: string;
  description?: string;
  filePath?: string;
}

export class PersistenceStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        source_type TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        current_task TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activity_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        description TEXT,
        file_path TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_events(agent_id);
    `);
  }

  upsertAgent(agent: Agent, sessionId?: string): void {
    this.db
      .prepare(
        `INSERT INTO agents (id, session_id, source_type, name, status, current_task, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           session_id = COALESCE(excluded.session_id, agents.session_id),
           source_type = excluded.source_type,
           name = excluded.name,
           status = excluded.status,
           current_task = excluded.current_task,
           updated_at = excluded.updated_at`,
      )
      .run(
        agent.id,
        sessionId ?? null,
        agent.sourceType,
        agent.name,
        agent.status,
        agent.currentTask ?? null,
        agent.createdAt,
        agent.updatedAt,
      );
  }

  recordEvent(input: RecordEventInput): void {
    this.db
      .prepare(
        `INSERT INTO activity_events (agent_id, event_type, description, file_path, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.agentId,
        input.eventType,
        input.description ?? null,
        input.filePath ?? null,
        new Date().toISOString(),
      );
  }

  loadAgents(): Agent[] {
    const rows = this.db.prepare(`SELECT * FROM agents`).all() as Array<{
      id: string;
      source_type: Agent["sourceType"];
      name: string;
      status: Agent["status"];
      current_task: string | null;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sourceType: row.source_type,
      status: row.status,
      position: { x: 0, y: 0 },
      currentTask: row.current_task ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  loadSessionMap(): Map<string, string> {
    const rows = this.db
      .prepare(`SELECT id, session_id FROM agents WHERE session_id IS NOT NULL`)
      .all() as Array<{ id: string; session_id: string }>;

    return new Map(rows.map((row) => [row.session_id, row.id]));
  }

  getHistory(agentId: string, limit = 50): ActivityEvent[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM activity_events WHERE agent_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .all(agentId, limit) as Array<{
      id: number;
      agent_id: string;
      event_type: string;
      description: string | null;
      file_path: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      eventType: row.event_type,
      description: row.description,
      filePath: row.file_path,
      createdAt: row.created_at,
    }));
  }

  getFiles(agentId: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT file_path, MAX(created_at) as last_touched
         FROM activity_events
         WHERE agent_id = ? AND file_path IS NOT NULL
         GROUP BY file_path
         ORDER BY last_touched DESC`,
      )
      .all(agentId) as Array<{ file_path: string }>;

    return rows.map((row) => row.file_path);
  }
}
