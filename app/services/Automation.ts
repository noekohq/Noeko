import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import type { DomainEvent, DomainEventType } from "../../shared/types/automation";
import { DomainEventModel } from "../database/models/domain_event";
import {
  decryptWebhookSecret,
  WebhookDeliveryModel,
  WebhookModel,
} from "../database/models/webhook";
import { Idea } from "../database/models/ideas";
import { logger } from "./Logger";

type EventHandler = (event: DomainEvent) => Promise<void>;

const privateIpv4 = (address: string) => {
  const parts = address.split(".").map(Number);
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  );
};

const privateAddress = (address: string) => {
  if (isIP(address) === 4) return privateIpv4(address);
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
};

export const validateWebhookUrl = async (value: string) => {
  const url = new URL(value);
  const allowPrivate = process.env.WEBHOOK_ALLOW_PRIVATE_NETWORK === "true";
  if (url.protocol !== "https:" && !(allowPrivate && url.protocol === "http:")) {
    throw new Error("Webhook URLs must use HTTPS");
  }
  if (url.username || url.password) throw new Error("Webhook URLs cannot contain credentials");
  if (!allowPrivate) {
    const addresses = await lookup(url.hostname, { all: true });
    if (addresses.length === 0 || addresses.some(({ address }) => privateAddress(address))) {
      throw new Error("Webhook URL resolves to a private or reserved address");
    }
  }
  return url.toString();
};

export class DomainEventDispatcher {
  private readonly workerId = `event-worker-${process.pid}-${randomUUID()}`;
  private readonly handlers = new Map<DomainEventType, EventHandler[]>();
  private readonly active = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;

  on(type: DomainEventType, handler: EventHandler) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }

  start() {
    if (this.timer) return;
    void this.recover();
    this.timer = setInterval(() => void this.recover(), 1_000);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  dispatch(id: string) {
    if (this.active.has(id)) return;
    this.active.add(id);
    void this.process(id).finally(() => this.active.delete(id));
  }

  private async recover() {
    try {
      for (const event of await DomainEventModel.findClaimable())
        this.dispatch(event.id.toString());
    } catch (error) {
      await logger.error("Unable to recover domain events", { error }, "Automation");
    }
  }

  private async process(id: string) {
    const event = await DomainEventModel.claim(
      id,
      this.workerId,
      new Date(Date.now() + 5 * 60_000)
    );
    if (!event) return;
    try {
      for (const handler of this.handlers.get(event.type) ?? []) await handler(event);
      for (const webhook of await WebhookModel.findMatching(event)) {
        await WebhookDeliveryModel.create(webhook.id.toString(), event.id.toString());
      }
      await DomainEventModel.markDispatched(event.id.toString());
    } catch (error) {
      await logger.error(
        "Unable to dispatch domain event",
        { eventId: event.id.toString(), error },
        "Automation"
      );
      await DomainEventModel.release(event.id.toString());
    }
  }
}

export class WebhookDeliveryWorker {
  private readonly workerId = `webhook-worker-${process.pid}-${randomUUID()}`;
  private readonly active = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;

  start() {
    if (this.timer) return;
    void this.recover();
    this.timer = setInterval(() => void this.recover(), 1_000);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async recover() {
    try {
      for (const delivery of await WebhookDeliveryModel.findClaimable()) {
        const id = delivery.id.toString();
        if (this.active.has(id)) continue;
        this.active.add(id);
        void this.process(id).finally(() => this.active.delete(id));
      }
    } catch (error) {
      await logger.error("Unable to recover webhook deliveries", { error }, "Automation");
    }
  }

  private async process(id: string) {
    const delivery = await WebhookDeliveryModel.claim(
      id,
      this.workerId,
      new Date(Date.now() + 30_000)
    );
    if (!delivery) return;
    const { webhook, event } = await WebhookDeliveryModel.getDependencies(delivery);
    if (!webhook || !event || !webhook.enabled) {
      await WebhookDeliveryModel.retry(id, "Webhook or event is unavailable", undefined, 10);
      return;
    }

    const payload = JSON.stringify({
      id: event.id.toString(),
      object: "event",
      type: event.type,
      version: event.version,
      occurred_at: new Date(event.createdAt).toISOString(),
      user_id: event.userId.toString(),
      actor: { type: event.actorType, ...(event.actorId ? { id: event.actorId } : {}) },
      data: {
        resource: { id: event.resourceId, object: event.resourceType },
        ...event.data,
      },
    });
    const timestamp = Math.floor(Date.now() / 1_000).toString();
    const signature = createHmac("sha256", decryptWebhookSecret(webhook.encryptedSecret))
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    let responseStatus: number | undefined;
    try {
      await validateWebhookUrl(webhook.url);
      const response = await fetch(webhook.url, {
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "content-type": "application/json",
          "user-agent": "Noeko-Webhooks/1.0",
          "webhook-id": webhook.id.toString(),
          "webhook-event-id": event.id.toString(),
          "webhook-timestamp": timestamp,
          "webhook-signature": `v1=${signature}`,
        },
        body: payload,
      });
      responseStatus = response.status;
      if (response.ok) {
        await WebhookDeliveryModel.succeed(id, response.status);
        await WebhookModel.recordSuccess(webhook.id.toString());
        return;
      }
      throw new Error(`Webhook returned HTTP ${response.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await WebhookDeliveryModel.retry(id, message, responseStatus, delivery.attempt);
      await WebhookModel.recordFailure(webhook.id.toString());
    }
  }
}

export const domainEventDispatcher = new DomainEventDispatcher();
export const webhookDeliveryWorker = new WebhookDeliveryWorker();
let automationInitialized = false;

const processIdea = async (event: DomainEvent) => {
  try {
    const embedded = await Idea.loadEmbeddings(event.resourceId);
    if (embedded === undefined) throw new Error("Embedding generation failed");
    await Idea.runDerivedCascade(event.resourceId);
    await DomainEventModel.create({
      type: "idea.processing.completed",
      actor: { userId: event.userId.toString(), type: "system" },
      resourceType: "idea",
      resourceId: event.resourceId,
    });
  } catch (error) {
    await DomainEventModel.create({
      type: "idea.processing.failed",
      actor: { userId: event.userId.toString(), type: "system" },
      resourceType: "idea",
      resourceId: event.resourceId,
      data: { message: error instanceof Error ? error.message : "Processing failed" },
    });
  }
};

export const initAutomation = async () => {
  if (automationInitialized) return;
  automationInitialized = true;
  domainEventDispatcher.on("idea.created", processIdea);
  domainEventDispatcher.on("idea.updated", processIdea);
  domainEventDispatcher.start();
  webhookDeliveryWorker.start();
};
