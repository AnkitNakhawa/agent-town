import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type {
  Agent,
  AgentStatus,
  ApprovalRequest,
  ApprovalResponse,
} from "@agent-town/shared";
import type { PersistenceStore } from "./db.js";

export interface RegisterAgentInput {
  name: string;
  sourceType: Agent["sourceType"];
  currentTask?: string;
  position?: Agent["position"];
  sessionId?: string;
}

export interface CreateApprovalInput {
  agentId: string;
  kind: ApprovalRequest["kind"];
  prompt: string;
  options?: string[];
}

export class AgentRegistry extends EventEmitter {
  private agents = new Map<string, Agent>();
  private approvals = new Map<string, ApprovalRequest>();
  private resolutions = new Map<string, ApprovalResponse>();
  private store?: PersistenceStore;

  constructor(store?: PersistenceStore) {
    super();
    this.store = store;
  }

  hydrate(agents: Agent[]): void {
    for (const agent of agents) this.agents.set(agent.id, agent);
  }

  registerAgent(input: RegisterAgentInput): Agent {
    const now = new Date().toISOString();
    const agent: Agent = {
      id: randomUUID(),
      name: input.name,
      sourceType: input.sourceType,
      status: "idle",
      position: input.position ?? { x: 0, y: 0 },
      currentTask: input.currentTask,
      createdAt: now,
      updatedAt: now,
    };
    this.agents.set(agent.id, agent);
    this.store?.upsertAgent(agent, input.sessionId);
    this.store?.recordEvent({ agentId: agent.id, eventType: "registered" });
    this.emit("agent_updated", agent);
    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  listAgents(): Agent[] {
    return [...this.agents.values()];
  }

  updateStatus(
    id: string,
    status: AgentStatus,
    currentTask?: string,
    filePath?: string,
  ): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    agent.status = status;
    if (currentTask !== undefined) agent.currentTask = currentTask;
    agent.updatedAt = new Date().toISOString();
    this.store?.upsertAgent(agent);
    this.store?.recordEvent({ agentId: id, eventType: "status", description: currentTask, filePath });
    this.emit("agent_updated", agent);
    return agent;
  }

  removeAgent(id: string): boolean {
    const existed = this.agents.delete(id);
    if (existed) this.emit("agent_removed", id);
    return existed;
  }

  createApproval(input: CreateApprovalInput): ApprovalRequest | undefined {
    const agent = this.agents.get(input.agentId);
    if (!agent) return undefined;

    if (agent.pendingApproval) {
      this.resolveApproval(agent.pendingApproval.id, { approved: false });
    }

    const approval: ApprovalRequest = {
      id: randomUUID(),
      agentId: input.agentId,
      kind: input.kind,
      prompt: input.prompt,
      options: input.options,
      createdAt: new Date().toISOString(),
    };
    this.approvals.set(approval.id, approval);

    agent.pendingApproval = approval;
    agent.status = input.kind === "text_input" ? "needs_input" : "needs_approval";
    agent.updatedAt = new Date().toISOString();

    this.store?.upsertAgent(agent);
    this.store?.recordEvent({
      agentId: agent.id,
      eventType: "approval_requested",
      description: approval.prompt,
    });

    this.emit("agent_updated", agent);
    this.emit("approval_requested", approval);
    return approval;
  }

  getApproval(id: string): ApprovalRequest | undefined {
    return this.approvals.get(id);
  }

  getResolution(id: string): ApprovalResponse | undefined {
    return this.resolutions.get(id);
  }

  resolveApproval(
    id: string,
    response: Pick<ApprovalResponse, "approved" | "text">,
  ): ApprovalResponse | undefined {
    const approval = this.approvals.get(id);
    if (!approval) return undefined;

    const resolved: ApprovalResponse = {
      requestId: id,
      approved: response.approved,
      text: response.text,
      respondedAt: new Date().toISOString(),
    };
    this.resolutions.set(id, resolved);

    const agent = this.agents.get(approval.agentId);
    if (agent && agent.pendingApproval?.id === id) {
      agent.pendingApproval = undefined;
      agent.status = "working";
      agent.updatedAt = new Date().toISOString();
      this.store?.upsertAgent(agent);
      this.emit("agent_updated", agent);
    }

    this.store?.recordEvent({
      agentId: approval.agentId,
      eventType: "approval_resolved",
      description: `${response.approved ? "approved" : "denied"}: ${approval.prompt}`,
    });

    this.approvals.delete(id);
    this.emit("approval_resolved", id);
    return resolved;
  }
}
