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

Run the server, the mock agent generator, and the client:

```bash
npm run dev:server
npm run fake-agent -- --count 4
npm run dev:client
```

Open http://localhost:5173/.

## Wrapping your real Claude Code sessions (opt-in)

Agent Town can visualize your actual local Claude Code sessions, not just
mock/SDK agents, via Claude Code's [hooks](https://code.claude.com/docs/en/hooks).
This is entirely opt-in and project-scoped — it never touches your global
`~/.claude/settings.json`, and no API key is required (it observes Claude
Code's own lifecycle events; it doesn't call Claude itself).

```bash
./scripts/install-claude-code-hooks.sh
```

Run with no flags to just print the hook config for you to review and paste
in yourself. Pass `--apply` to merge it into `.claude/settings.local.json`
in the current project (asks for confirmation, preserves any hooks you
already have configured):

```bash
./scripts/install-claude-code-hooks.sh --apply
```

Every `Bash`, `Write`, `Edit`, and `MultiEdit` tool call in that Claude Code
session will then walk over to your desk in the game and wait for you to
click Approve/Deny — **including calls your existing permission settings
would otherwise auto-allow**, since the gate runs before Claude Code's own
allowlist check. It falls back to Claude Code's normal prompt after ~55s if
nothing responds (e.g. the server isn't running).

Note: Claude Code's `PermissionRequest` hook event looks like the more
surgical fit (it only fires when a decision is actually needed), but in
testing (Claude Code 2.1.241) its `permissionDecision` response was
silently ignored — the session stayed blocked waiting on its own prompt
even after the game resolved it. `PreToolUse` is the one hook event the
[docs](https://code.claude.com/docs/en/hooks) explicitly confirm honors a
`permissionDecision` response, hence the broader (allowlist-overriding)
scope here. Worth re-testing `PermissionRequest` on future Claude Code
versions.
