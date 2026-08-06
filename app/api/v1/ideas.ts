import { Router } from "express";
import { z } from "zod";
import type { ActorContext } from "../../../shared/types/automation";
import type { ISafeIdea } from "../../../shared/types/idea";
import { requireScope } from "../../middleware/api_auth";
import { IdeaService } from "../../services/IdeaService";
import { getFromReq } from "../../utils/requests";

const router = Router();
const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

const serialize = (idea: ISafeIdea) => ({
  id: idea.id.toString(),
  object: "idea",
  title: idea.title,
  content: idea.content,
  content_format: "html",
  visibility: idea.visibility,
  created_at: idea.createdAt,
  updated_at: idea.updatedAt,
  content_updated_at: idea.contentUpdatedAt,
  processing: { status: idea.embeddingsStatus === "ready" ? "completed" : "pending" },
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(500),
  content: z.string().default(""),
});

const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0);

router.post("/", requireScope("ideas:write"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { type: "invalid_request", code: "invalid_body", message: "Invalid idea" },
    });
    return;
  }
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  try {
    const idea = await IdeaService.create(actor, parsed.data);
    res
      .status(201)
      .location(`/api/v1/ideas/${idea.id}`)
      .json({ data: serialize(idea) });
  } catch (error) {
    res.status(500).json({
      error: {
        type: "internal_error",
        code: "create_failed",
        message: error instanceof Error ? error.message : "Idea creation failed",
      },
    });
  }
});

router.get("/", requireScope("ideas:read"), async (req, res) => {
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const start = Math.max(Number(req.query.start) || 0, 0);
  const ideas = await IdeaService.list(actor, {
    limit,
    start,
    sort: { field: "updatedAt", direction: "desc" },
  });
  res.json({
    data: ideas.map((idea) => serialize(idea)),
    page: { has_more: ideas.length === limit },
  });
});

router.get("/:ideaId", requireScope("ideas:read"), async (req, res) => {
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  const idea = await IdeaService.get(actor, param(req.params.ideaId));
  if (!idea) return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  res.json({ data: serialize(idea) });
});

router.patch("/:ideaId", requireScope("ideas:write"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { type: "invalid_request", code: "invalid_body", message: "Invalid idea update" },
    });
  }
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  const idea = await IdeaService.update(actor, param(req.params.ideaId), parsed.data);
  if (!idea) return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  res.json({ data: serialize(idea) });
});

router.delete("/:ideaId", requireScope("ideas:write"), async (req, res) => {
  const actor = await getFromReq<ActorContext>(req, "actor");
  if (!actor) return res.status(401).json({ error: { code: "unauthenticated" } });
  if (!(await IdeaService.delete(actor, param(req.params.ideaId)))) {
    return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  }
  res.status(204).end();
});

export default router;
