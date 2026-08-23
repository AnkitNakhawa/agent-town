import type { AgentRegistry } from "../registry.js";

const PERMISSION_TIMEOUT_MS = 55_000;
const GATED_TOOLS = new Set(["Bash", "Write", "Edit", "MultiEdit"]);

const sessionAgents = new Map<string, string>();

interface ClaudeCodeHookPayload {
  hook_event_name: string;
  session_id: string;
  cwd?: string;
  user_message?: string;
  tool_name?: string;
  tool_input?: { command?: string; description?: string; file_path?: string };
  last_assistant_message?: string;
}

function shortName(cwd: string | undefined, sessionId: string): string {
  const parts = (cwd ?? "").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? `claude-code-${sessionId.slice(0, 8)}`;
}

function describeTool(payload: ClaudeCodeHookPayload): string {
  const input = payload.tool_input ?? {};
  return input.description ?? input.command ?? input.file_path ?? payload.tool_name ?? "working";
}

function ensureAgent(registry: AgentRegistry, payload: ClaudeCodeHookPayload): string {
  const existing = sessionAgents.get(payload.session_id);
  if (existing && registry.getAgent(existing)) return existing;

  const agent = registry.registerAgent({
    name: shortName(payload.cwd, payload.session_id),
    sourceType: "claude_code",
  });
  sessionAgents.set(payload.session_id, agent.id);
  return agent.id;
}

function waitForDecision(
  registry: AgentRegistry,
  approvalId: string,
): Promise<"allow" | "deny" | undefined> {
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      registry.off("approval_resolved", onResolved);
      resolve(undefined);
    }, PERMISSION_TIMEOUT_MS);

    function onResolved(resolvedId: string): void {
      if (resolvedId !== approvalId || settled) return;
      settled = true;
      clearTimeout(timer);
      registry.off("approval_resolved", onResolved);
      const response = registry.getResolution(approvalId);
      resolve(response?.approved ? "allow" : "deny");
    }

    registry.on("approval_resolved", onResolved);
  });
}

export async function handleClaudeCodeHookEvent(
  registry: AgentRegistry,
  payload: ClaudeCodeHookPayload,
): Promise<Record<string, unknown>> {
  if (!payload.session_id) return {};
  const agentId = ensureAgent(registry, payload);

  switch (payload.hook_event_name) {
    case "SessionStart":
      registry.updateStatus(agentId, "idle");
      return {};

    case "UserPromptSubmit":
      registry.updateStatus(agentId, "working", payload.user_message?.slice(0, 80));
      return {};

    case "PreToolUse": {
      if (!GATED_TOOLS.has(payload.tool_name ?? "")) {
        registry.updateStatus(agentId, "working", describeTool(payload));
        return {};
      }

      const approval = registry.createApproval({
        agentId,
        kind: "permission",
        prompt: describeTool(payload),
        options: ["allow", "deny"],
      });
      if (!approval) return {};

      const decision = await waitForDecision(registry, approval.id);
      if (!decision) return {};

      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: decision,
        },
      };
    }

    case "Stop":
      registry.updateStatus(agentId, "idle", payload.last_assistant_message?.slice(0, 80));
      return {};

    default:
      return {};
  }
}
