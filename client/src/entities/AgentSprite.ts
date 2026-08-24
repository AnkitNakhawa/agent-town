import Phaser from "phaser";
import type { Agent, AgentStatus } from "@agent-town/shared";

// Frame indices into the tiny-dungeon spritesheet (Kenney, CC0) — see
// client/src/assets/README for how these were identified.
const CHARACTER_FRAMES = [84, 85, 86, 87, 88, 96, 98, 99, 100];
// dagger, sword, sword, pickaxe, gem-sword, hammer, axe, axe
const TOOL_FRAMES = [103, 104, 105, 106, 107, 117, 118, 119];
const SPRITE_SCALE = 2.5;

const STATUS_BADGE_COLOR: Record<AgentStatus, number> = {
  idle: 0x6c7086,
  working: 0x89b4fa,
  needs_approval: 0xfab387,
  needs_input: 0xfab387,
  done: 0xa6e3a1,
  error: 0xf38ba8,
};

function hashString(id: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

function frameForAgent(id: string): number {
  return CHARACTER_FRAMES[hashString(id, 0) % CHARACTER_FRAMES.length];
}

function toolForAgent(id: string): number {
  // Different seed so tool choice doesn't move in lockstep with character choice.
  return TOOL_FRAMES[hashString(id, 7) % TOOL_FRAMES.length];
}

export class AgentSprite {
  readonly id: string;
  readonly container: Phaser.GameObjects.Container;
  lastKnownAgent: Agent;
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Sprite;
  private badge: Phaser.GameObjects.Arc;
  private tool: Phaser.GameObjects.Sprite;
  private toolTween?: Phaser.Tweens.Tween;
  private nameLabel: Phaser.GameObjects.Text;
  private taskLabel: Phaser.GameObjects.Text;
  private tooltip: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, agent: Agent, x: number, y: number) {
    this.id = agent.id;
    this.scene = scene;
    this.lastKnownAgent = agent;

    this.body = scene.add
      .sprite(0, 0, "tiny-dungeon", frameForAgent(agent.id))
      .setScale(SPRITE_SCALE)
      .setInteractive({ useHandCursor: true });

    this.badge = scene.add
      .circle(14, 14, 5, STATUS_BADGE_COLOR[agent.status])
      .setStrokeStyle(1, 0x11111b);

    this.tool = scene.add
      .sprite(-18, 2, "tiny-dungeon", toolForAgent(agent.id))
      .setScale(SPRITE_SCALE * 0.7)
      .setOrigin(0.8, 0.8)
      .setVisible(false);

    this.tooltip = scene.add
      .text(0, -52, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#11111b",
        backgroundColor: "#f9e2af",
        padding: { x: 6, y: 3 },
        wordWrap: { width: 160 },
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.nameLabel = scene.add
      .text(0, -36, agent.name, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cdd6f4",
        stroke: "#11111b",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.taskLabel = scene.add
      .text(0, 30, agent.currentTask ?? "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f2f2f7",
        stroke: "#11111b",
        strokeThickness: 3,
        wordWrap: { width: 110 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.container = scene.add.container(x, y, [
      this.body,
      this.tool,
      this.badge,
      this.nameLabel,
      this.taskLabel,
      this.tooltip,
    ]);

    this.body.on("pointerover", () => this.showTooltip());
    this.body.on("pointerout", () => this.tooltip.setVisible(false));

    this.setWorking(agent.status === "working");
  }

  update(agent: Agent): void {
    this.lastKnownAgent = agent;
    this.badge.setFillStyle(STATUS_BADGE_COLOR[agent.status]);
    this.taskLabel.setText(agent.currentTask ?? "");
    this.setWorking(agent.status === "working");
    if (this.tooltip.visible) this.showTooltip();
  }

  private showTooltip(): void {
    const agent = this.lastKnownAgent;
    const text = agent.pendingApproval?.prompt ?? agent.currentTask ?? `(${agent.status})`;
    this.tooltip.setText(text);
    this.tooltip.setVisible(true);
  }

  private setWorking(working: boolean): void {
    this.tool.setVisible(working);
    if (working && !this.toolTween) {
      this.toolTween = this.scene.tweens.add({
        targets: this.tool,
        angle: { from: -20, to: 20 },
        duration: 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else if (!working && this.toolTween) {
      this.toolTween.stop();
      this.toolTween = undefined;
      this.tool.setAngle(0);
    }
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  walkTo(x: number, y: number, onArrive?: () => void): void {
    this.scene.tweens.add({
      targets: this.container,
      x,
      y,
      duration: 500,
      ease: "Sine.easeInOut",
      onComplete: onArrive,
    });
  }

  destroy(): void {
    this.toolTween?.stop();
    this.container.destroy();
  }
}
