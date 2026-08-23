import type { Agent, ApprovalRequest } from "@agent-town/shared";

const BASE_URL = process.env.AGENT_TOWN_URL ?? "http://localhost:4317";

const TASKS = [
  "refactoring the parser",
  "writing unit tests",
  "reviewing a diff",
  "chasing a flaky test",
  "summarizing the changelog",
];

const APPROVAL_PROMPTS = [
  { prompt: "Delete the stale cache directory?", options: ["allow", "deny"] },
  { prompt: "Push the branch to origin?", options: ["allow", "deny"] },
  { prompt: "Overwrite config.yaml with the new version?", options: ["allow", "deny"] },
];

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerAgent(name: string): Promise<Agent> {
  const res = await fetch(`${BASE_URL}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, sourceType: "sdk", currentTask: randomOf(TASKS) }),
  });
  if (!res.ok) throw new Error(`register failed: ${res.status}`);
  return res.json();
}

async function patchAgent(id: string, status: Agent["status"], currentTask?: string): Promise<void> {
  await fetch(`${BASE_URL}/api/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, currentTask }),
  });
}

async function createApproval(agentId: string): Promise<ApprovalRequest> {
  const { prompt, options } = randomOf(APPROVAL_PROMPTS);
  const res = await fetch(`${BASE_URL}/api/agents/${agentId}/approval-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "permission", prompt, options }),
  });
  if (!res.ok) throw new Error(`create approval failed: ${res.status}`);
  return res.json();
}

async function pollApproval(id: string): Promise<{ resolved: boolean; response?: unknown }> {
  const res = await fetch(`${BASE_URL}/api/approval-requests/${id}`);
  return res.json();
}

async function waitForApproval(id: string, agentName: string): Promise<void> {
  for (;;) {
    const { resolved, response } = await pollApproval(id);
    if (resolved) {
      console.log(`[${agentName}] approval ${id} resolved:`, response);
      return;
    }
    await sleep(1000);
  }
}

async function runAgentLoop(name: string): Promise<void> {
  const agent = await registerAgent(name);
  console.log(`[${name}] registered as ${agent.id}`);

  for (;;) {
    await patchAgent(agent.id, "working", randomOf(TASKS));
    await sleep(3000 + Math.random() * 4000);

    if (Math.random() < 0.5) {
      const approval = await createApproval(agent.id);
      console.log(`[${name}] needs approval: "${approval.prompt}"`);
      await waitForApproval(approval.id, name);
    }

    await patchAgent(agent.id, "done");
    await sleep(1500);
  }
}

async function main(): Promise<void> {
  const countArg = process.argv.find((arg) => arg.startsWith("--count"));
  const count = countArg ? Number(countArg.split("=")[1] ?? process.argv[process.argv.indexOf(countArg) + 1]) : 3;

  const names = ["Ada", "Grace", "Alan", "Margaret", "Katherine", "Radia"].slice(0, count);
  console.log(`starting ${names.length} fake agents against ${BASE_URL}`);

  await Promise.all(names.map((name) => runAgentLoop(name)));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
