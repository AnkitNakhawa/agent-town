# Assets

`tiny-town.png` and `tiny-dungeon.png` are the packed 16×16 tilesheets from
Kenney's [Tiny Town](https://kenney.nl/assets/tiny-town) and
[Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) packs — CC0 (public
domain), no attribution required, credited here anyway.

Both are loaded as Phaser spritesheets with 16×16 frames, no spacing
(`frameWidth: 16, frameHeight: 16`). Frame index = `row * 12 + col` (12
columns per sheet).

## `tiny-dungeon.png` frames used

- `84, 85, 86, 87, 88, 96, 98, 99, 100` — humanoid character sprites, one
  assigned per agent (hashed from `agent.id`) in `entities/AgentSprite.ts`.
- `103, 104, 105, 106, 107, 117, 118, 119` — tool icons (dagger, sword x2,
  pickaxe, gem-sword, hammer, axe x2), one assigned per agent (hashed from
  `agent.id` with a different seed than the character) and shown bobbing
  next to it while `working`.

## `tiny-town.png` frames used

- `0` — plain grass, tiled as the scene's ground in `scenes/TownScene.ts`.
- `13` — dirt patch, marks each workstation slot and the path to the desk.
- `4, 5, 16, 17` — tree variants, used for border/scenery decoration.
- `30` — mushroom cluster, scattered near the bottom of the scene.
- `81` — fence segment, tiled along the top border.
- `82` — sign post, planted in front of the desk platform.
- `109` — plain floor tile, used for the desk platform.
