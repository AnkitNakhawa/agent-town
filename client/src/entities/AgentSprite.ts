import Phaser from "phaser";
import type { Agent, AgentStatus } from "@agent-town/shared";

const STATUS_COLOR: Record<AgentStatus, number> = {
  idle: 0x6c7086,
  working: 0x89b4fa,
  needs_approval: 0xfab387,
  needs_input: 0xfab387,
  done: 0xa6e3a1,
  error: 0xf38ba8,
};

export class AgentSprite {
  readonly id: string;
  readonly container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Arc;
  private nameLabel: Phaser.GameObjects.Text;
  private taskLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, agent: Agent, x: number, y: number) {
    this.id = agent.id;

    this.body = scene.add.circle(0, 0, 18, STATUS_COLOR[agent.status]);
    this.nameLabel = scene.add
      .text(0, -34, agent.name, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cdd6f4",
      })
      .setOrigin(0.5);
    this.taskLabel = scene.add
      .text(0, 28, agent.currentTask ?? "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#a6adc8",
        wordWrap: { width: 110 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.container = scene.add.container(x, y, [this.body, this.nameLabel, this.taskLabel]);
  }

  update(agent: Agent): void {
    this.body.setFillStyle(STATUS_COLOR[agent.status]);
    this.taskLabel.setText(agent.currentTask ?? "");
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  destroy(): void {
    this.container.destroy();
  }
}
