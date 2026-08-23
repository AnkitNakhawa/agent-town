import Phaser from "phaser";
import tinyTownUrl from "../assets/tiny-town.png";
import tinyDungeonUrl from "../assets/tiny-dungeon.png";

export const TILE_SIZE = 16;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    this.load.spritesheet("tiny-town", tinyTownUrl, {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
    this.load.spritesheet("tiny-dungeon", tinyDungeonUrl, {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
  }

  create(): void {
    this.scene.start("Town");
  }
}
