import type { FastifyInstance } from "fastify";
import type { AgentRegistry } from "../registry.js";
import type { PersistenceStore } from "../db.js";

interface RegisterAgentBody {
  name: string;
  sourceType: "sdk" | "claude_code";
  currentTask?: string;
  position?: { x: number; y: number };
}

interface PatchAgentBody {
  status?: "idle" | "working" | "needs_approval" | "needs_input" | "done" | "error";
  currentTask?: string;
}

interface CreateApprovalBody {
  kind: "permission" | "text_input";
  prompt: string;
  options?: string[];
}

interface RespondApprovalBody {
  approved?: boolean;
  text?: string;
}

export function registerAgentRoutes(
  app: FastifyInstance,
  registry: AgentRegistry,
  store: PersistenceStore,
): void {
  app.get("/api/agents", async () => registry.listAgents());

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/agents/:id/history",
    async (request) => {
      const limit = Number(request.query.limit ?? 50);
      return store.getHistory(request.params.id, limit);
    },
  );

  app.get<{ Params: { id: string } }>("/api/agents/:id/files", async (request) => {
    return store.getFiles(request.params.id);
  });

  app.post<{ Body: RegisterAgentBody }>("/api/agents", async (request, reply) => {
    const { name, sourceType, currentTask, position } = request.body;
    if (!name || !sourceType) {
      return reply.code(400).send({ error: "name and sourceType are required" });
    }
    const agent = registry.registerAgent({ name, sourceType, currentTask, position });
    return reply.code(201).send(agent);
  });

  app.patch<{ Params: { id: string }; Body: PatchAgentBody }>(
    "/api/agents/:id",
    async (request, reply) => {
      const { status, currentTask } = request.body;
      const agent = status
        ? registry.updateStatus(request.params.id, status, currentTask)
        : registry.getAgent(request.params.id);
      if (!agent) return reply.code(404).send({ error: "agent not found" });
      return agent;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/agents/:id", async (request, reply) => {
    const removed = registry.removeAgent(request.params.id);
    if (!removed) return reply.code(404).send({ error: "agent not found" });
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string }; Body: CreateApprovalBody }>(
    "/api/agents/:id/approval-requests",
    async (request, reply) => {
      const { kind, prompt, options } = request.body;
      if (!kind || !prompt) {
        return reply.code(400).send({ error: "kind and prompt are required" });
      }
      const approval = registry.createApproval({
        agentId: request.params.id,
        kind,
        prompt,
        options,
      });
      if (!approval) return reply.code(404).send({ error: "agent not found" });
      return reply.code(201).send(approval);
    },
  );

  app.get<{ Params: { id: string } }>("/api/approval-requests/:id", async (request, reply) => {
    const pending = registry.getApproval(request.params.id);
    if (pending) return { resolved: false };

    const response = registry.getResolution(request.params.id);
    if (!response) return reply.code(404).send({ error: "approval request not found" });
    return { resolved: true, response };
  });

  app.post<{ Params: { id: string }; Body: RespondApprovalBody }>(
    "/api/approval-requests/:id/respond",
    async (request, reply) => {
      const response = registry.resolveApproval(request.params.id, request.body);
      if (!response) return reply.code(404).send({ error: "approval request not found" });
      return response;
    },
  );
}
