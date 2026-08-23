import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { PersistenceStore } from "./db.js";
import { AgentRegistry } from "./registry.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerHookRoutes } from "./routes/hooks.js";
import { registerWebSocket } from "./ws.js";
import { seedSessionAgents } from "./sources/claudeCodeSource.js";

const PORT = Number(process.env.PORT ?? 4317);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const DB_PATH = fileURLToPath(new URL("../data/agent-town.db", import.meta.url));

const app = Fastify({ logger: true });
const store = new PersistenceStore(DB_PATH);
const registry = new AgentRegistry(store);
registry.hydrate(store.loadAgents());
seedSessionAgents(store.loadSessionMap());

await app.register(cors, { origin: CLIENT_ORIGIN });
await app.register(websocketPlugin);

app.get("/health", async () => ({ ok: true }));

registerAgentRoutes(app, registry, store);
registerHookRoutes(app, registry);
registerWebSocket(app, registry);

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`agent-town server listening at ${address}`);
});
