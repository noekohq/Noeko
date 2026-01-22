import { Router } from "express";
import { checkToken, disallowDisabled } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { User } from "../../database/models/user";
import { ISafeUser, IUser } from "../../../shared/types/user";
import { Idea } from "../../database/models/ideas";
import {
  IIdea,
  IIdeaAsRelation,
  IIdeaDerivedMap,
  IIdeaForm,
  IIdeaQuery,
  ISafeIdea,
} from "../../../shared/types/idea";
import { getLM } from "../../ai/lms/lm";
import { first } from "../../templates/onboarding";
import Authorization from "../../services/Authorization";
import { IShareAccess } from "../../database/models/share";

const router = Router();

router.get("/:ideaId/public", async (req, res) => {
  try {
    const ideaId = req.params.ideaId;
    const isPublic = await Idea.checkIsPublic(ideaId);
    if (isPublic) {
      const idea = await Idea.get(ideaId);
      const owner = await Idea.getIdeaOwners(ideaId, "public");
      res.json({
        message: "Got public idea",
        data: {
          idea,
          owner,
        },
      });
      return;
    }
    res.status(403).json({ message: "Unauthorized" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.use(checkToken);
router.use(disallowDisabled);

router.get("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const sortField = req.query.sortField as string;
    const sortDirection = req.query.sortDirection as string;
    const limit = req.query.limit as string;
    const start = req.query.start as string;

    if (
      sortField &&
      !["createdAt", "updatedAt", "viewedAt"].includes(sortField)
    ) {
      res.status(400).send({
        message: "Sort field must be createdAt, updatedAt, or viewedAt",
      });
      return;
    }
    if (sortDirection && !["asc", "desc"].includes(sortDirection)) {
      res.status(400).send({
        message: "Sort direction must be asc or desc",
      });
      return;
    }
    if (limit && isNaN(Number(limit))) {
      res.status(400).send({
        message: "Limit must be a number",
      });
      return;
    }
    if (start && isNaN(Number(start))) {
      res.status(400).send({
        message: "Start must be a number",
      });
      return;
    }

    const parsedLimit = limit ? Number(limit) : undefined;
    const parsedStart = start ? Number(start) : undefined;

    const options: IIdeaQuery = {
      sort:
        sortField && sortDirection
          ? ({
              field: sortField,
              direction: sortDirection,
            } as IIdeaQuery["sort"])
          : undefined,
      limit: parsedLimit,
      start: parsedStart,
    };
    const ideas = await Idea.getUserIdeas(user.id, options);
    if (!ideas) {
      res.status(404).json({ error: "User ideas not found" });
      return;
    }
    res.send({ message: "Successfully retrieved user ideas.", data: ideas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/page", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize) ?? 10;
    if (page === undefined || page === null) {
      res.status(400).send({
        message: "Page must be provided",
      });
      return;
    }
    if (page < 0) {
      res.status(400).send({
        message: "Page must be 0 or greater",
      });
      return;
    }
    if (pageSize < 1) {
      res.status(400).send({
        message: "Page Size cannot be less than 1",
      });
      return;
    }
    const ideas = await Idea.getUserIdeasPaginated(user.id, page, pageSize);
    if (!ideas) {
      res.status(404).json({ error: "User ideas not found" });
      return;
    }
    res.send({ message: "Successfully retrieved user ideas.", data: ideas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const body = req.body;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const form = { ...body };
    if (body.generateTitle) {
      const lm = getLM();
      form.title = await lm.utils.entitle(
        form.content,
        "short and concise, fewly worded",
      );
    }
    const i = await Idea.create(
      {
        ...form,
      },
      user.id,
    );
    if (!i) {
      res.status(404).json({ error: "Idea not created" });
      return;
    }
    res.send({ message: "Successfully created idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/new", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const i = await Idea.create(
      {
        title: "Untitled Idea",
        content: "",
        embeddings: null,
        visibility: "private",
      },
      user.id,
      { omitEmbeddings: true, omitDerived: true },
    );
    if (!i) {
      res.status(404).json({ error: "Idea not created" });
      return;
    }
    res.send({ message: "Successfully created idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/first", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const i = await Idea.create(first, user.id, {
      omitEmbeddings: true,
      omitDerived: true,
    });
    if (!i) {
      res.status(404).json({ error: "Idea not created" });
      return;
    }
    res.send({ message: "Successfully created idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:ideaId", checkToken, disallowDisabled, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const auth = new Authorization(user.id);
    const hasAccess = await auth.hasAccess(ideaId, "editor");
    if (!hasAccess) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const { title, content, withComputations } = req.body;
    const updater: Partial<IIdeaForm> = {};
    if (title !== undefined) {
      updater.title = title;
    }
    if (content !== undefined) {
      updater.content = content;
    }
    const i = await Idea.update(ideaId, updater, withComputations === true);
    if (!i) {
      res.status(404).json({ error: "Idea not updated" });
      return;
    }
    res.send({ message: "Successfully updated idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:ideaId", checkToken, disallowDisabled, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    const idea = await Idea.get(ideaId);
    if (!idea) {
      res.status(404).json({ message: "Idea not found" });
      return;
    }
    const accessLevel = await Authorization.getAccessLevel(user.id, ideaId);

    if (!accessLevel) {
      res.status(403).json({
        message: "Unauthorized.",
      });
      return;
    }
    if (accessLevel === "owner") {
      Idea.update(ideaId, {
        viewedAt: new Date(),
      });
    }
    const withDerived = req.query.withDerived === "true";
    const toSend: ISafeIdea & {
      connections?: IIdea[];
      relatedIdeas?: IIdeaAsRelation[];
      derived?: IIdeaDerivedMap;
      accessLevel?: "owner" | IShareAccess | null;
    } = { ...idea, accessLevel };
    if (withDerived) {
      const derived = await Idea.getDerivedMap(ideaId);
      toSend.derived = derived;
    }
    res.send({ message: "Successfully retrieved idea.", data: toSend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:ideaId", checkToken, disallowDisabled, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const hasAccess = await User.checkOwns(user.id, ideaId);
    if (!hasAccess) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const i = await Idea.delete(ideaId);
    if (!i) {
      res.status(404).json({ error: "Idea not deleted" });
      return;
    }
    res.send({ message: "Successfully deleted idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/:ideaId/derive",
  checkToken,
  disallowDisabled,
  async (req, res) => {
    try {
      const user = await getFromReq<ISafeUser>(req, "user");
      if (!user) {
        res.status(401).json({
          message: "Unauthorized.",
        });
        return;
      }
      const { ideaId } = req.params;
      const hasAccess = await Authorization.checkHasAccess(ideaId, user.id);
      if (!hasAccess) {
        res.status(403).json({
          message: "Unauthorized.",
        });
        return;
      }
      const { type } = req.body;
      const derivedResponse = await Idea.derive(ideaId, type);
      if (!derivedResponse) {
        res.status(500).json({
          message: "Internal Server Error.",
        });
        return;
      }
      res.json({
        message: `Successfully derived ${type} from idea`,
        data: derivedResponse,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal Server Error",
      });
    }
  },
);

router.post(
  "/:ideaId/entitle",
  checkToken,
  disallowDisabled,
  async (req, res) => {
    try {
      const user = await getFromReq<ISafeUser>(req, "user");
      if (!user) {
        res.status(401).json({
          message: "Unauthorized.",
        });
        return;
      }
      const { ideaId } = req.params;
      const hasAccess = await Authorization.checkHasAccess(
        user.id,
        ideaId,
        "editor",
      );
      if (!hasAccess) {
        res.status(403).json({
          message: "Unauthorized.",
        });
        return;
      }
      const entitledIdea = await Idea.giveGenerativeTitle(ideaId);
      if (!entitledIdea) {
        res.status(500).json({
          message: "Internal Server Error.",
        });
        return;
      }
      res.json({
        message: `Successfully entitled from idea`,
        data: entitledIdea,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal Server Error",
      });
    }
  },
);

router.post(
  "/:ideaId/cascade",
  checkToken,
  disallowDisabled,
  async (req, res) => {
    try {
      const { ideaId } = req.params;
      const user = await getFromReq<IUser>(req, "user");
      if (!user) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
      const hasAccess = await User.checkHasAccess(user.id, ideaId);
      if (!hasAccess) {
        res.status(403).json({
          message: "Unauthorized",
        });
        return;
      }
      await Idea.runDerivedCascade(ideaId);
      res.send({ message: "Successfully loaded embeddings.", data: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

router.post(
  "/:ideaId/embed",
  checkToken,
  disallowDisabled,
  async (req, res) => {
    try {
      const { ideaId } = req.params;
      const user = await getFromReq<IUser>(req, "user");
      if (!user) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
      const hasAccess = await User.checkHasAccess(user.id, ideaId);
      if (!hasAccess) {
        res.status(403).json({
          message: "Unauthorized",
        });
        return;
      }
      const embedded = await Idea.loadEmbeddings(ideaId);
      if (embedded === undefined) {
        res.status(400).json({ error: "Could not embed idea." });
        return;
      }
      res.send({ message: "Successfully loaded embeddings.", data: embedded });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
