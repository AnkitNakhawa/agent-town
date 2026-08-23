import Phaser from "phaser";
import type { Agent, AgentStatus } from "@agent-town/shared";

// Frame indices into the tiny-dungeon spritesheet (Kenney, CC0) — see
// client/src/assets/README for how these were identified.
const CHARACTER_FRAMES = [84, 85, 86, 87, 88, 96, 98, 99, 100];
const PICKAXE_FRAME = 117;
const SPRITE_SCALE = 2.5;

const STATUS_BADGE_COLOR: Record<AgentStatus, number> = {
  idle: 0x6c7086,
  working: 0x89b4fa,
  needs_approval: 0xfab387,
  needs_input: 0xfab387,
  done: 0xa6e3a1,
  error: 0xf38ba8,
};

function frameForAgent(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CHARACTER_FRAMES[hash % CHARACTER_FRAMES.length];
}

export class AgentSprite {
  readonly id: string;
  readonly container: Phaser.GameObjects.Container;
  lastKnownAgent: Agent;
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Sprite;
  private badge: Phaser.GameObjects.Arc;
  private pickaxe: Phaser.GameObjects.Sprite;
  private pickaxeTween?: Phaser.Tweens.Tween;
  private nameLabel: Phaser.GameObjects.Text;
  private taskLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, agent: Agent, x: number, y: number) {
    this.id = agent.id;
    this.scene = scene;
    this.lastKnownAgent = agent;

    this.body = scene.add
      .sprite(0, 0, "tiny-dungeon", frameForAgent(agent.id))
      .setScale(SPRITE_SCALE);

    this.badge = scene.add
      .circle(14, 14, 5, STATUS_BADGE_COLOR[agent.status])
      .setStrokeStyle(1, 0x11111b);

    this.pickaxe = scene.add
      .sprite(-18, 2, "tiny-dungeon", PICKAXE_FRAME)
      .setScale(SPRITE_SCALE * 0.7)
      .setOrigin(0.8, 0.8)
      .setVisible(false);

    this.nameLabel = scene.add
      .text(0, -36, agent.name, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cdd6f4",
      })
      .setOrigin(0.5);
    this.taskLabel = scene.add
      .text(0, 30, agent.currentTask ?? "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#a6adc8",
        wordWrap: { width: 110 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.container = scene.add.container(x, y, [
      this.body,
      this.pickaxe,
      this.badge,
      this.nameLabel,
      this.taskLabel,
    ]);

    this.setWorking(agent.status === "working");
  }

  update(agent: Agent): void {
    this.lastKnownAgent = agent;
    this.badge.setFillStyle(STATUS_BADGE_COLOR[agent.status]);
    this.taskLabel.setText(agent.currentTask ?? "");
    this.setWorking(agent.status === "working");
  }

  private setWorking(working: boolean): void {
    this.pickaxe.setVisible(working);
    if (working && !this.pickaxeTween) {
      this.pickaxeTween = this.scene.tweens.add({
        targets: this.pickaxe,
        angle: { from: -20, to: 20 },
        duration: 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else if (!working && this.pickaxeTween) {
      this.pickaxeTween.stop();
      this.pickaxeTween = undefined;
      this.pickaxe.setAngle(0);
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
    this.pickaxeTween?.stop();
    this.container.destroy();
  }
}
