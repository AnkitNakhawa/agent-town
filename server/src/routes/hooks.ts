import type { FastifyInstance } from "fastify";
import type { AgentRegistry } from "../registry.js";
import { handleClaudeCodeHookEvent } from "../sources/claudeCodeSource.js";

export function registerHookRoutes(app: FastifyInstance, registry: AgentRegistry): void {
  app.post("/api/hooks/claude-code", async (request, reply) => {
    const result = await handleClaudeCodeHookEvent(
      registry,
      request.body as Parameters<typeof handleClaudeCodeHookEvent>[1],
    );
    return reply.send(result);
  });
}
