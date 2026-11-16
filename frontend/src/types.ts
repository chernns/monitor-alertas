export type Severity = "INFO" | "WARNING" | "CRITICAL";

export type EventItem = {
  id: string;
  externalId: string;
  type: string;
  severity: Severity;
  payload: Record<string, unknown>;
  publishedAt: string;
  createdAt: string;
  device: { id: string; name: string };
  notifications?: { status: "PENDING" | "SENT" | "FAILED" }[];
};

export type FeedItem = EventItem & { latencyMs?: number };

export type Metrics = { total: number; critical: number; sent: number; failed: number };