import Phaser from "phaser";
import type { Agent } from "@agent-town/shared";
import { WsClient } from "../net/wsClient.js";
import { respondToApproval } from "../net/api.js";
import { AgentSprite } from "../entities/AgentSprite.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { TILE_SIZE } from "./BootScene.js";

const WS_URL = "ws://localhost:4317/ws";
const GRID_COLS = 4;
const GRID_ORIGIN = { x: 140, y: 140 };
const GRID_SPACING = { x: 180, y: 140 };
const MAX_WORKSTATION_SLOTS = 8;

const GRASS_FRAME = 0;
const DIRT_FRAME = 13;
const GROUND_SCALE = 3;

const NEEDS_HUMAN: Agent["status"][] = ["needs_approval", "needs_input"];

function isApproveLabel(label: string): boolean {
  return ["allow", "approve", "yes"].includes(label.toLowerCase());
}

export class TownScene extends Phaser.Scene {
  private sprites = new Map<string, AgentSprite>();
  private homePositions = new Map<string, { x: number; y: number }>();
  private order: string[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private dialogueBox!: DialogueBox;
  private deskPosition!: { x: number; y: number };

  private approvalQueue: string[] = [];
  private activeApprovalAgentId: string | null = null;

  constructor() {
    super("Town");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1e1e2e");
    this.paintGround();
    this.paintWorkstationTiles();
    this.deskPosition = { x: this.scale.width / 2, y: this.scale.height - 220 };

    this.add
      .rectangle(this.deskPosition.x, this.deskPosition.y, 100, 60, 0x313244)
      .setStrokeStyle(2, 0xcdd6f4);
    this.add
      .text(this.deskPosition.x, this.deskPosition.y - 44, "YOUR DESK", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#a6adc8",
      })
      .setOrigin(0.5);

    this.statusText = this.add.text(16, 16, "connecting...", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#a6adc8",
    });

    this.dialogueBox = new DialogueBox(this);

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

  private paintGround(): void {
    const tileSize = TILE_SIZE * GROUND_SCALE;
    const cols = Math.ceil(this.scale.width / tileSize) + 1;
    const rows = Math.ceil(this.scale.height / tileSize) + 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.add
          .sprite(col * tileSize, row * tileSize, "tiny-town", GRASS_FRAME)
          .setOrigin(0)
          .setScale(GROUND_SCALE);
      }
    }
  }

  private paintWorkstationTiles(): void {
    for (let i = 0; i < MAX_WORKSTATION_SLOTS; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = GRID_ORIGIN.x + col * GRID_SPACING.x;
      const y = GRID_ORIGIN.y + row * GRID_SPACING.y;
      this.add.sprite(x, y, "tiny-town", DIRT_FRAME).setScale(GROUND_SCALE * 0.7);
    }
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
    let sprite = this.sprites.get(agent.id);
    if (!sprite) {
      const home = this.slotFor(agent.id);
      this.homePositions.set(agent.id, home);
      sprite = new AgentSprite(this, agent, home.x, home.y);
      this.sprites.set(agent.id, sprite);
    } else {
      sprite.update(agent);
    }

    const needsHuman = NEEDS_HUMAN.includes(agent.status) && Boolean(agent.pendingApproval);

    if (needsHuman) {
      this.enqueueApproval(agent.id);
    } else if (agent.id === this.activeApprovalAgentId) {
      this.resolveActiveApproval(agent.id);
    } else {
      this.approvalQueue = this.approvalQueue.filter((id) => id !== agent.id);
    }
  }

  private enqueueApproval(agentId: string): void {
    const alreadyQueued = this.approvalQueue.includes(agentId);
    const alreadyActive = this.activeApprovalAgentId === agentId;
    if (!alreadyQueued && !alreadyActive) {
      this.approvalQueue.push(agentId);
    }
    if (!this.activeApprovalAgentId) {
      this.processNextApproval();
    }
  }

  private processNextApproval(): void {
    const nextId = this.approvalQueue.shift();
    if (!nextId) return;

    const sprite = this.sprites.get(nextId);
    if (!sprite) {
      this.processNextApproval();
      return;
    }

    this.activeApprovalAgentId = nextId;
    sprite.walkTo(this.deskPosition.x, this.deskPosition.y - 40, () => {
      this.showDialogueFor(nextId);
    });
  }

  private showDialogueFor(agentId: string): void {
    const agent = this.latestAgentSnapshot(agentId);
    if (!agent || !agent.pendingApproval) {
      this.finishActiveApproval();
      return;
    }

    this.dialogueBox.show(agent.name, agent.pendingApproval, (_index, label) => {
      const approved = isApproveLabel(label);
      void respondToApproval(agent.pendingApproval!.id, { approved });
    });
  }

  private latestAgentSnapshot(agentId: string): Agent | undefined {
    const sprite = this.sprites.get(agentId);
    if (!sprite) return undefined;
    return sprite.lastKnownAgent;
  }

  private resolveActiveApproval(agentId: string): void {
    if (this.activeApprovalAgentId !== agentId) return;
    this.finishActiveApproval();
  }

  private finishActiveApproval(): void {
    const agentId = this.activeApprovalAgentId;
    this.activeApprovalAgentId = null;
    this.dialogueBox.hide();

    if (agentId) {
      const sprite = this.sprites.get(agentId);
      const home = this.homePositions.get(agentId);
      if (sprite && home) sprite.walkTo(home.x, home.y);
    }

    this.processNextApproval();
  }

  private removeAgent(agentId: string): void {
    const sprite = this.sprites.get(agentId);
    if (!sprite) return;
    sprite.destroy();
    this.sprites.delete(agentId);
    this.homePositions.delete(agentId);
    this.order = this.order.filter((id) => id !== agentId);
    this.approvalQueue = this.approvalQueue.filter((id) => id !== agentId);
    if (this.activeApprovalAgentId === agentId) this.finishActiveApproval();
  }
}
