# Agent Town

An 8-bit game dashboard for your Claude agents. Each agent is a sprite that
idles at its own workstation while working, and walks over to your desk
whenever it needs a decision from you (a permission approval, or a text
reply) — shown as a Zelda/Stardew-style dialogue box.

Status: early scaffold, work in progress.

## Structure

- `shared/` — wire-protocol TypeScript types shared by server and client
- `server/` — Fastify + WebSocket API, in-memory agent registry
- `client/` — Phaser 3 + Vite game frontend
- `scripts/` — mock agent generator, opt-in Claude Code hook installer
- `examples/sdk-agent/` — a real Claude Agent SDK example agent

## Setup

```bash
npm install
npm run build
```
