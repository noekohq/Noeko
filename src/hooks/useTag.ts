import { RecordId } from "surrealdb";
import { applyTagToThing, removeTagFromThing } from '@/utils/tags';
import { IConnectable } from "../../app/services/Graph";

interface IUseTagArgs {
  tagId: string | RecordId;
}

interface IUseTagReturn {
  applyTo: (thingId: string | RecordId) => void;
  removeFrom: (thingId: string | RecordId) => void;
}

export default function useTag({ tagId }: IUseTagArgs): IUseTagReturn {
  const applyTo = async (thingId: string | RecordId) => {
    await applyTagToThing(tagId, thingId);
  };

  const removeFrom = async (thingId: string | RecordId) => {
    await removeTagFromThing(tagId, thingId);
  };

  return {
    applyTo,
    removeFrom,
  };
}
