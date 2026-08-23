import Phaser from "phaser";
import type { ApprovalRequest } from "@agent-town/shared";

export type DialogueChoiceHandler = (optionIndex: number, label: string) => void;

export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private promptText: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = scene.scale.width;
    const height = scene.scale.height;
    const boxY = height - 90;

    const bg = scene.add
      .rectangle(width / 2, boxY, width - 40, 140, 0x11111b, 0.95)
      .setStrokeStyle(2, 0xcdd6f4);

    this.nameText = scene.add.text(40, boxY - 55, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#fab387",
    });

    this.promptText = scene.add.text(40, boxY - 30, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cdd6f4",
      wordWrap: { width: width - 260 },
    });

    this.container = scene.add.container(0, 0, [bg, this.nameText, this.promptText]);
    this.container.setDepth(1000);
    this.container.setVisible(false);
  }

  show(agentName: string, approval: ApprovalRequest, onChoice: DialogueChoiceHandler): void {
    this.clearButtons();
    this.nameText.setText(agentName);
    this.promptText.setText(approval.prompt);

    const options = approval.options ?? [];
    const height = this.scene.scale.height;
    const startX = this.scene.scale.width - 170;
    const startY = height - 130;

    options.forEach((label, index) => {
      const button = this.scene.add
        .text(startX, startY + index * 32, `[ ${label} ]`, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#a6e3a1",
        })
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => button.setColor("#f9e2af"))
        .on("pointerout", () => button.setColor("#a6e3a1"))
        .on("pointerdown", () => onChoice(index, label));
      button.setDepth(1001);
      this.container.add(button);
      this.buttons.push(button);
    });

    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
    this.clearButtons();
  }

  private clearButtons(): void {
    for (const button of this.buttons) button.destroy();
    this.buttons = [];
  }
}
