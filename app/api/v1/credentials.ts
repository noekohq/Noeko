import { Router } from "express";
import { z } from "zod";
import { apiScopes } from "../../../shared/types/automation";
import type { ISafeUser } from "../../../shared/types/user";
import { ApiCredentialModel } from "../../database/models/api_credential";
import { checkToken, disallowDisabled } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";

const router = Router();
router.use(checkToken, disallowDisabled);

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(z.enum(apiScopes)).min(1),
  expires_at: z.iso.datetime().optional(),
});

router.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { type: "invalid_request", code: "invalid_body", message: "Invalid credential" },
    });
    return;
  }
  const user = await getFromReq<ISafeUser>(req, "user");
  if (!user) return res.status(401).json({ error: { code: "unauthenticated" } });
  const result = await ApiCredentialModel.create(
    user.id.toString(),
    parsed.data.name,
    parsed.data.scopes,
    parsed.data.expires_at ? new Date(parsed.data.expires_at) : undefined
  );
  res.status(201).json({
    data: {
      id: result.credential.id.toString(),
      object: "api_credential",
      name: result.credential.name,
      prefix: result.credential.prefix,
      scopes: result.credential.scopes,
      created_at: result.credential.createdAt,
      secret: result.secret,
    },
  });
});

router.get("/", async (req, res) => {
  const user = await getFromReq<ISafeUser>(req, "user");
  if (!user) return res.status(401).json({ error: { code: "unauthenticated" } });
  const credentials = await ApiCredentialModel.listForUser(user.id.toString());
  res.json({
    data: credentials.map((credential) => ({
      ...credential,
      id: credential.id.toString(),
      userId: undefined,
      created_at: credential.createdAt,
      last_used_at: credential.lastUsedAt,
      expires_at: credential.expiresAt,
      revoked_at: credential.revokedAt,
      createdAt: undefined,
      lastUsedAt: undefined,
      expiresAt: undefined,
      revokedAt: undefined,
    })),
  });
});

router.delete("/:credentialId", async (req, res) => {
  const user = await getFromReq<ISafeUser>(req, "user");
  if (!user) return res.status(401).json({ error: { code: "unauthenticated" } });
  if (!(await ApiCredentialModel.revoke(req.params.credentialId, user.id.toString()))) {
    return res.status(404).json({ error: { type: "not_found", code: "not_found" } });
  }
  res.status(204).end();
});

export default router;
