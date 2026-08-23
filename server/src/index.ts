import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { AgentRegistry } from "./registry.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerWebSocket } from "./ws.js";

const PORT = Number(process.env.PORT ?? 4317);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = Fastify({ logger: true });
const registry = new AgentRegistry();

await app.register(cors, { origin: CLIENT_ORIGIN });
await app.register(websocketPlugin);

app.get("/health", async () => ({ ok: true }));

registerAgentRoutes(app, registry);
registerWebSocket(app, registry);

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`agent-town server listening at ${address}`);
});
