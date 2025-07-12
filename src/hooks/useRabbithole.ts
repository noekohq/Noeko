import { RecordId } from "surrealdb";
import { useLandscape } from "../contexts/LandscapeContext";
import {
  includeThingInRabbithole,
  unIncludeThingInRabbithole,
} from "../utils/rabbitholes";
import { useState } from "react";

interface IUseRabbitholeReturn {
  includeThing: (thingId: string | RecordId) => Promise<boolean>;
  unIncludeThing: (thingId: string | RecordId) => Promise<boolean>;
  exitRabbithole: () => void;
  loading: boolean;
  isDownRabbithole: boolean;
}

export default function useRabbithole(): IUseRabbitholeReturn {
  const {
    rabbitholes: {
      entered: { get: currentlyEntered, set: setCurrentlyEntered },
    },
  } = useLandscape();

  const isDownRabbithole = !!currentlyEntered;

  const [loadingSomething, setLoadingSomething] = useState(false);

  const exitRabbithole = () => {
    setCurrentlyEntered(null);
  };

  const includeThing = async (thingId: string | RecordId): Promise<boolean> => {
    try {
      if (!isDownRabbithole) {
        console.error(
          "Not including thing in non-existent rabbithole. Rabbithole must be entered before including thing.",
        );
        return false;
      }
      await includeThingInRabbithole(
        currentlyEntered.id.toString(),
        thingId.toString(),
      );
      return true;
    } catch (error) {
      console.error(
        "Something went wrong including something in the current rabbithole: ",
        error,
        currentlyEntered,
        thingId,
      );
      return false;
    }
  };

  const unIncludeThing = async (
    thingId: string | RecordId,
  ): Promise<boolean> => {
    try {
      if (!isDownRabbithole) {
        console.error(
          "Not removing thing from non-existent rabbithole. Rabbithole must be entered before unincluding thing.",
        );
        return false;
      }
      await unIncludeThingInRabbithole(
        currentlyEntered.id.toString(),
        thingId.toString(),
      );
      return true;
    } catch (error) {
      console.error(
        "Something went wrong unincluding something in the current rabbithole: ",
        error,
        currentlyEntered,
        thingId,
      );
      return false;
    }
  };

  return {
    includeThing,
    unIncludeThing,
    exitRabbithole,
    loading: loadingSomething,
    isDownRabbithole,
  };
}
