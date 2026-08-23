import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { ServerEvent } from "@agent-town/shared";
import type { AgentRegistry } from "./registry.js";

export function registerWebSocket(app: FastifyInstance, registry: AgentRegistry): void {
  const clients = new Set<WebSocket>();

  function broadcast(event: ServerEvent): void {
    const payload = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  }

  registry.on("agent_updated", (agent) => broadcast({ type: "agent_updated", agent }));
  registry.on("agent_removed", (agentId: string) =>
    broadcast({ type: "agent_removed", agentId }),
  );
  registry.on("approval_requested", (approval) =>
    broadcast({ type: "approval_requested", approval }),
  );
  registry.on("approval_resolved", (requestId: string) =>
    broadcast({ type: "approval_resolved", requestId }),
  );

  app.register(async (instance) => {
    instance.get("/ws", { websocket: true }, (socket) => {
      clients.add(socket);

      const snapshot: ServerEvent = { type: "snapshot", agents: registry.listAgents() };
      socket.send(JSON.stringify(snapshot));

      socket.on("close", () => clients.delete(socket));
    });
  });
}
