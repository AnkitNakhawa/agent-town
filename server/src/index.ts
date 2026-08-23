import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";

const PORT = Number(process.env.PORT ?? 4317);

const app = Fastify({ logger: true });

await app.register(websocketPlugin);

app.get("/health", async () => ({ ok: true }));

app.register(async (instance) => {
  instance.get("/ws", { websocket: true }, (socket) => {
    socket.send(JSON.stringify({ type: "hello", message: "agent-town server" }));
    socket.on("message", (raw: Buffer) => {
      socket.send(raw.toString());
    });
  });
});

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`agent-town server listening at ${address}`);
});
