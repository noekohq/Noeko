import type { ActorContext } from "../../shared/types/automation";
import type { IIdeaForm, IIdeaQuery } from "../../shared/types/idea";
import { DomainEventModel } from "../database/models/domain_event";
import { Idea } from "../database/models/ideas";
import { User } from "../database/models/user";
import Authorization from "./Authorization";
import { domainEventDispatcher } from "./Automation";

const emit = async (
  type: "idea.created" | "idea.updated" | "idea.deleted",
  actor: ActorContext,
  ideaId: string,
  data: Record<string, unknown> = {}
) => {
  const event = await DomainEventModel.create({
    type,
    actor,
    resourceType: "idea",
    resourceId: ideaId,
    data,
  });
  domainEventDispatcher.dispatch(event.id.toString());
};

export class IdeaService {
  static async create(actor: ActorContext, form: Pick<IIdeaForm, "title" | "content">) {
    const idea = await Idea.create(
      {
        ...form,
        visibility: "private",
        embeddings: null,
      } as IIdeaForm,
      actor.userId,
      { omitEmbeddings: true, omitDerived: true }
    );
    if (!idea) throw new Error("Idea could not be created");
    await emit("idea.created", actor, idea.id.toString());
    return idea;
  }

  static async list(actor: ActorContext, options: IIdeaQuery) {
    return (await Idea.getUserIdeas(actor.userId, options)) ?? [];
  }

  static async get(actor: ActorContext, ideaId: string) {
    const access = await Authorization.getAccessLevel(actor.userId, ideaId);
    if (!access) return null;
    return (await Idea.get(ideaId)) ?? null;
  }

  static async update(
    actor: ActorContext,
    ideaId: string,
    update: Partial<Pick<IIdeaForm, "title" | "content">>
  ) {
    const auth = new Authorization(actor.userId);
    if (!(await auth.hasAccess(ideaId, "editor"))) return null;
    const idea = await Idea.update(ideaId, update, false);
    if (!idea) throw new Error("Idea could not be updated");
    await emit("idea.updated", actor, ideaId, { changed: Object.keys(update) });
    return idea;
  }

  static async delete(actor: ActorContext, ideaId: string) {
    if (!(await User.checkOwns(actor.userId, ideaId))) return false;
    const idea = await Idea.delete(ideaId);
    if (!idea) throw new Error("Idea could not be deleted");
    await emit("idea.deleted", actor, ideaId, { title: idea.title });
    return true;
  }
}
