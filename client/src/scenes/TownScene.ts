import Phaser from "phaser";

export class TownScene extends Phaser.Scene {
  constructor() {
    super("Town");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1e1e2e");

    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "AGENT TOWN", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#f5e0dc",
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 40, "phaser bootstrap ok", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#a6adc8",
      })
      .setOrigin(0.5);
  }
}
