import Phaser from "phaser";
import type { Agent } from "@agent-town/shared";
import { WsClient } from "../net/wsClient.js";
import { AgentSprite } from "../entities/AgentSprite.js";

const WS_URL = "ws://localhost:4317/ws";
const GRID_COLS = 4;
const GRID_ORIGIN = { x: 140, y: 140 };
const GRID_SPACING = { x: 180, y: 140 };

export class TownScene extends Phaser.Scene {
  private sprites = new Map<string, AgentSprite>();
  private order: string[] = [];
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super("Town");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1e1e2e");

    this.statusText = this.add.text(16, 16, "connecting...", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#a6adc8",
    });

    const ws = new WsClient(WS_URL);
    ws.on((event) => {
      switch (event.type) {
        case "snapshot":
          this.statusText.setText(`connected — ${event.agents.length} agent(s)`);
          for (const agent of event.agents) this.upsertAgent(agent);
          break;
        case "agent_updated":
          this.upsertAgent(event.agent);
          break;
        case "agent_removed":
          this.removeAgent(event.agentId);
          break;
        default:
          break;
      }
    });
  }

  private slotFor(id: string): { x: number; y: number } {
    let index = this.order.indexOf(id);
    if (index === -1) {
      this.order.push(id);
      index = this.order.length - 1;
    }
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    return {
      x: GRID_ORIGIN.x + col * GRID_SPACING.x,
      y: GRID_ORIGIN.y + row * GRID_SPACING.y,
    };
  }

  private upsertAgent(agent: Agent): void {
    const existing = this.sprites.get(agent.id);
    if (existing) {
      existing.update(agent);
      return;
    }
    const { x, y } = this.slotFor(agent.id);
    const sprite = new AgentSprite(this, agent, x, y);
    this.sprites.set(agent.id, sprite);
  }

  private removeAgent(agentId: string): void {
    const sprite = this.sprites.get(agentId);
    if (!sprite) return;
    sprite.destroy();
    this.sprites.delete(agentId);
    this.order = this.order.filter((id) => id !== agentId);
  }
}
