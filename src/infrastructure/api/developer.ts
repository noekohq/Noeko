import { api } from "./client";

export const apiScopes = [
  "profile:read",
  "ideas:read",
  "ideas:write",
  "webhooks:read",
  "webhooks:write",
] as const;

export type ApiScope = (typeof apiScopes)[number];

export type ApiCredential = {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  revoked_at?: string;
};

export type WebhookEventType =
  | "idea.created"
  | "idea.updated"
  | "idea.deleted"
  | "idea.processing.completed"
  | "idea.processing.failed"
  | "*";

export type Webhook = {
  id: string;
  url: string;
  events: WebhookEventType[];
  enabled: boolean;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
};

export type WebhookDelivery = {
  id: string;
  event_id: string;
  status: "pending" | "delivering" | "succeeded" | "failed";
  attempt: number;
  next_attempt_at: string;
  delivered_at?: string;
  response_status?: number;
  error?: string;
  created_at: string;
};

type Envelope<T> = { data: T };

export const developerApi = {
  async listCredentials() {
    return (await api.get<Envelope<ApiCredential[]>>("/v1/credentials")).data.data;
  },

  async createCredential(input: { name: string; scopes: ApiScope[]; expires_at?: string }) {
    return (await api.post<Envelope<ApiCredential & { secret: string }>>("/v1/credentials", input))
      .data.data;
  },

  async revokeCredential(id: string) {
    await api.delete(`/v1/credentials/${id}`);
  },

  async listWebhooks() {
    return (await api.get<Envelope<Webhook[]>>("/v1/webhooks")).data.data;
  },

  async createWebhook(input: { url: string; events: WebhookEventType[] }) {
    return (await api.post<Envelope<Webhook & { secret: string }>>("/v1/webhooks", input)).data
      .data;
  },

  async updateWebhook(id: string, input: Partial<Pick<Webhook, "url" | "events" | "enabled">>) {
    return (await api.patch<Envelope<Webhook>>(`/v1/webhooks/${id}`, input)).data.data;
  },

  async deleteWebhook(id: string) {
    await api.delete(`/v1/webhooks/${id}`);
  },

  async testWebhook(id: string) {
    return (await api.post<Envelope<{ id: string }>>(`/v1/webhooks/${id}/test`)).data.data;
  },

  async listWebhookDeliveries(id: string) {
    return (await api.get<Envelope<WebhookDelivery[]>>(`/v1/webhooks/${id}/deliveries`)).data.data;
  },
};
