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
- `117` — pickaxe icon, shown bobbing next to an agent while `working`.

## `tiny-town.png` frames used

- `0` — plain grass, tiled as the scene's ground in `scenes/TownScene.ts`.
- `13` — dirt patch, marks each workstation slot.
