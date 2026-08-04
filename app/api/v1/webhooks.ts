import { Router } from "express";
import { z } from "zod";
import type { ActorContext, Webhook } from "../../../shared/types/automation";
import { DomainEventModel } from "../../database/models/domain_event";
import { WebhookDeliveryModel, WebhookModel } from "../../database/models/webhook";
import { requireScope } from "../../middleware/api_auth";
import { domainEventDispatcher, validateWebhookUrl } from "../../services/Automation";
import { getFromReq } from "../../utils/requests";

const router = Router();
const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);
const publicEvents = [
  "idea.created",
  "idea.updated",
  "idea.deleted",
  "idea.processing.completed",
  "idea.processing.failed",
  "*",
] as const;

const createSchema = z.object({
  url: z.url(),
  events: z.array(z.enum(publicEvents)).min(1),
});
const updateSchema = z
  .object({
    url: z.url().optional(),
    events: z.array(z.enum(publicEvents)).min(1).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

const serialize = (webhook: Webhook) => ({
  id: webhook.id.toString(),
  object: "webhook",
  url: webhook.url,
  events: webhook.events,
  enabled: webhook.enabled,
  consecutive_failures: webhook.consecutiveFailures,
  created_at: webhook.createdAt,
  updated_at: webhook.updatedAt,
});

router.post("/", requireScope("webhooks:write"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { type: "invalid_request", code: "invalid_body" } });
  }
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  try {
    const url = await validateWebhookUrl(parsed.data.url);
    const { webhook, secret } = await WebhookModel.create(actor.userId, url, parsed.data.events);
    res.status(201).json({ data: { ...serialize(webhook), secret } });
  } catch (error) {
    res.status(400).json({
      error: {
        type: "invalid_request",
        code: "invalid_webhook_url",
        message: error instanceof Error ? error.message : "Invalid webhook URL",
      },
    });
  }
});

router.get("/", requireScope("webhooks:read"), async (req, res) => {
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  const webhooks = await WebhookModel.listForUser(actor.userId);
  res.json({ data: webhooks.map(serialize) });
});

router.get("/:webhookId", requireScope("webhooks:read"), async (req, res) => {
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  const webhook = await WebhookModel.getOwned(param(req.params.webhookId), actor.userId);
  if (!webhook) return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  res.json({ data: serialize(webhook) });
});

router.patch("/:webhookId", requireScope("webhooks:write"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { type: "invalid_request", code: "invalid_body" } });
  }
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  const update = { ...parsed.data };
  if (update.url) update.url = await validateWebhookUrl(update.url);
  const webhook = await WebhookModel.updateOwned(param(req.params.webhookId), actor.userId, update);
  if (!webhook) return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  res.json({ data: serialize(webhook) });
});

router.delete("/:webhookId", requireScope("webhooks:write"), async (req, res) => {
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  if (!(await WebhookModel.deleteOwned(param(req.params.webhookId), actor.userId))) {
    return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  }
  res.status(204).end();
});

router.post("/:webhookId/test", requireScope("webhooks:write"), async (req, res) => {
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  const webhook = await WebhookModel.getOwned(param(req.params.webhookId), actor.userId);
  if (!webhook) return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  const event = await DomainEventModel.create({
    type: "webhook.test",
    actor,
    resourceType: "webhook",
    resourceId: webhook.id.toString(),
  });
  await WebhookDeliveryModel.create(webhook.id.toString(), event.id.toString());
  domainEventDispatcher.dispatch(event.id.toString());
  res.status(202).json({ data: { id: event.id.toString(), object: "event" } });
});

router.get("/:webhookId/deliveries", requireScope("webhooks:read"), async (req, res) => {
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  const webhook = await WebhookModel.getOwned(param(req.params.webhookId), actor.userId);
  if (!webhook) return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  const deliveries = await WebhookDeliveryModel.listForWebhook(webhook.id.toString());
  res.json({
    data: deliveries.map((delivery) => ({
      id: delivery.id.toString(),
      object: "webhook_delivery",
      event_id: delivery.eventId.toString(),
      status: delivery.status,
      attempt: delivery.attempt,
      next_attempt_at: delivery.nextAttemptAt,
      delivered_at: delivery.deliveredAt,
      response_status: delivery.responseStatus,
      error: delivery.error,
      created_at: delivery.createdAt,
    })),
  });
});

export default router;
