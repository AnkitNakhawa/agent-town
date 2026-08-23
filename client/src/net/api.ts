const API_BASE = "http://localhost:4317";

export async function respondToApproval(
  requestId: string,
  payload: { approved?: boolean; text?: string },
): Promise<void> {
  await fetch(`${API_BASE}/api/approval-requests/${requestId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
