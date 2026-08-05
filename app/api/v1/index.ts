import { Router } from "express";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { ISafeUser } from "../../../shared/types/user";
import { checkV1Auth, requireScope } from "../../middleware/api_auth";
import { getFromReq } from "../../utils/requests";
import credentialRouter from "./credentials";
import ideaRouter from "./ideas";
import webhookRouter from "./webhooks";

const router = Router();
const openApiPath = fileURLToPath(new URL("./openapi.yaml", import.meta.url));

router.use((req, res, next) => {
  const requestId = req.headers["x-request-id"]?.toString() ?? `req_${randomUUID()}`;
  res.setHeader("X-Request-Id", requestId);
  next();
});

router.use("/credentials", credentialRouter);
router.get("/openapi.yaml", (_req, res) => {
  res.type("application/yaml").sendFile(openApiPath);
});
router.use(checkV1Auth);

router.get("/", async (_req, res) => {
  res.send({
    message: "You've reached the Noeko Developer API :)",
  });
});

router.get("/me", requireScope("profile:read"), async (req, res) => {
  const user = await getFromReq<ISafeUser>(req, "user");
  const credential = await getFromReq<{ scopes: string[] }>(req, "apiCredential");
  if (!user) return res.status(401).json({ error: { code: "unauthenticated" } });
  res.json({
    data: {
      id: user.id.toString(),
      object: "user",
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      scopes: credential?.scopes ?? ["browser_session"],
    },
  });
});

router.use("/ideas", ideaRouter);
router.use("/webhooks", webhookRouter);

export default router;
