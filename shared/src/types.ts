export type AgentStatus =
  | "idle"
  | "working"
  | "needs_approval"
  | "needs_input"
  | "done"
  | "error";

export type AgentSourceType = "sdk" | "claude_code";

export interface Vec2 {
  x: number;
  y: number;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  kind: "permission" | "text_input";
  prompt: string;
  options?: string[];
  createdAt: string;
}

export interface ApprovalResponse {
  requestId: string;
  approved?: boolean;
  text?: string;
  respondedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  sourceType: AgentSourceType;
  status: AgentStatus;
  position: Vec2;
  workstationId?: string;
  currentTask?: string;
  pendingApproval?: ApprovalRequest;
  createdAt: string;
  updatedAt: string;
}

export type AgentSourceEvent =
  | { kind: "register"; agent: Agent }
  | { kind: "status"; agentId: string; status: AgentStatus; currentTask?: string }
  | { kind: "approval_request"; approval: ApprovalRequest }
  | { kind: "approval_resolved"; requestId: string }
  | { kind: "remove"; agentId: string };

export type ServerEvent =
  | { type: "snapshot"; agents: Agent[] }
  | { type: "agent_updated"; agent: Agent }
  | { type: "agent_removed"; agentId: string }
  | { type: "approval_requested"; approval: ApprovalRequest }
  | { type: "approval_resolved"; requestId: string };

export interface SubmitApprovalPayload {
  requestId: string;
  approved?: boolean;
  text?: string;
}
