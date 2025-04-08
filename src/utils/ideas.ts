import { IIdea, IIdeaDerived } from "../../app/database/models/ideas";

export const getDerivedMap = (idea: IIdea & { derived: IIdeaDerived }) => {
  const tableToNode: Record<string, IIdeaDerived> = {};
};
