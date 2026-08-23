import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { TownScene } from "./scenes/TownScene.js";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 640,
  backgroundColor: "#1e1e2e",
  pixelArt: true,
  scene: [BootScene, TownScene],
});
