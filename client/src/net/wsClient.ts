import type { ServerEvent } from "@agent-town/shared";

export type ServerEventHandler = (event: ServerEvent) => void;

export class WsClient {
  private socket: WebSocket | undefined;
  private handlers = new Set<ServerEventHandler>();
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect(): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("message", (event) => {
      const parsed = JSON.parse(event.data as string) as ServerEvent;
      for (const handler of this.handlers) handler(parsed);
    });

    socket.addEventListener("close", () => {
      setTimeout(() => this.connect(), 1000);
    });
  }

  on(handler: ServerEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
