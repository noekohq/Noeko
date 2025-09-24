import Express, { Router } from "express";
import { checkToken, disallowDisabled } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { ISafeUser, IUser, User } from "../../database/models/user";
import {
  Idea,
  IIdea,
  IIdeaAsRelation,
  IIdeaDerivedMap,
  IIdeaForm,
  ISafeIdea,
} from "../../database/models/ideas";
import { Tag } from "../../database/models/tag";
import shareRouter from "./share";
import { max_idea_size } from "../../settings";
import { getLM } from "../../ai/lms/lm";

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
router.use(shareRouter);

router.get("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const ideas = await Idea.getUserIdeas(user.id);
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

router.put("/:ideaId", checkToken, disallowDisabled, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const hasAccess = await Idea.checkUserOwnership(ideaId, user.id);
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
    const exists = !!(await Idea.get(ideaId));
    if (!exists) {
      res.status(404).json({ message: "Idea not found" });
      return;
    }
    const isOwner = await User.checkOwns(user.id, ideaId);
    if (!isOwner) {
      res.status(403).json({
        message: "Unauthorized.",
      });
      return;
    }
    const idea = await Idea.get(ideaId);
    if (!idea) {
      res.status(404).json({ message: "Idea not found" });
      return;
    }
    Idea.update(ideaId, {
      viewedAt: new Date(),
    });
    const withDerived = req.query.withDerived === "true";
    const toSend: ISafeIdea & {
      connections?: IIdea[];
      relatedIdeas?: IIdeaAsRelation[];
      derived?: IIdeaDerivedMap;
    } = { ...idea };
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
    const hasAccess = await Idea.checkUserOwnership(ideaId, user.id);
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

router.get(
  "/:ideaId/connections",
  checkToken,
  disallowDisabled,
  async (req, res) => {
    try {
      const { ideaId } = req.params;
      const user = await getFromReq<IUser>(req, "user");
      if (!user) {
        res.status(500).json({ message: "Internal Server Error" });
        return;
      }
      const isOwner = await Idea.checkUserOwnership(ideaId, user.id);
      const isSuperuser = await User.checkUserHasRole(
        user.id,
        "role:superuser",
      );
      if (!isOwner) {
        if (!isSuperuser) {
          res.status(403).json({
            message: "Unauthorized.",
          });
          return;
        }
      }
      const i = await Idea.getConnections(ideaId);
      res.send({ message: "Successfully retrieved idea.", data: i });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

router.get(
  "/:ideaId/related",
  checkToken,
  disallowDisabled,
  async (req, res) => {
    try {
      const { ideaId } = req.params;
      const user = await getFromReq<IUser>(req, "user");
      if (!user) {
        res.status(500).json({ message: "Internal Server Error" });
        return;
      }
      const isOwner = await Idea.checkUserOwnership(ideaId, user.id);
      const isSuperuser = await User.checkUserHasRole(
        user.id,
        "role:superuser",
      );
      if (!isOwner) {
        if (!isSuperuser) {
          res.status(403).json({
            message: "Unauthorized.",
          });
          return;
        }
      }
      const r = await Idea.findSimilar(user.id, ideaId);
      res.send({ message: "Successfully retrieved idea.", data: r });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

router.get("/:ideaId/tags", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const ideaId = req.params.ideaId;
    const tags = await Tag.getTagsForIdea(ideaId);
    if (!tags) {
      res.status(404).json({ error: "Tags not found" });
      return;
    }
    res.send({ message: "Successfully retrieved idea tags", data: tags });
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
      const hasAccess = await Idea.checkUserOwnership(ideaId, user.id);
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
      const hasAccess = await Idea.checkUserOwnership(ideaId, user.id);
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
      const hasAccess = await Idea.checkUserOwnership(ideaId, user.id);
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
      const hasAccess = await Idea.checkUserOwnership(ideaId, user.id);
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
