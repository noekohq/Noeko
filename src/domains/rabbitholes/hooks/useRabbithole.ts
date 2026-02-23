import { RecordId } from "surrealdb";
import { useLandscape } from '@/contexts/LandscapeContext';
import { includeThingInRabbithole, unIncludeThingInRabbithole } from '@domains/rabbitholes/utils/rabbitholes';
import { useCallback, useState } from "react";
import { IRabbithole } from '../../../../app/database/models/rabbithole';

interface IUseRabbitholeReturn {
  currentRabbithole: IRabbithole | null;
  includeThing: (thingId: string | RecordId) => Promise<boolean>;
  unIncludeThing: (thingId: string | RecordId) => Promise<boolean>;
  isIncludedThing: (thingId: string | RecordId) => boolean;
  exitRabbithole: () => void;
  loading: boolean;
  isDownRabbithole: boolean;
}

export default function useRabbithole(): IUseRabbitholeReturn {
  const {
    rabbitholes: {
      entered: { get: currentlyEntered, set: setCurrentlyEntered, reload },
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
          "Not including thing in non-existent rabbithole. Rabbithole must be entered before including thing."
        );
        return false;
      }
      setLoadingSomething(true);
      await includeThingInRabbithole(currentlyEntered.id.toString(), thingId.toString());
      reload();
      return true;
    } catch (error) {
      console.error(
        "Something went wrong including something in the current rabbithole: ",
        error,
        currentlyEntered,
        thingId
      );
      return false;
    } finally {
      setLoadingSomething(false);
    }
  };

  const unIncludeThing = async (thingId: string | RecordId): Promise<boolean> => {
    try {
      if (!isDownRabbithole) {
        console.error(
          "Not removing thing from non-existent rabbithole. Rabbithole must be entered before unincluding thing."
        );
        return false;
      }
      await unIncludeThingInRabbithole(currentlyEntered.id.toString(), thingId.toString());
      reload();
      return true;
    } catch (error) {
      console.error(
        "Something went wrong unincluding something in the current rabbithole: ",
        error,
        currentlyEntered,
        thingId
      );
      return false;
    } finally {
      setLoadingSomething(false);
    }
  };

  const isIncludedThing = (thingId: string | RecordId) => {
    if (!currentlyEntered) {
      return false;
    }
    const found = currentlyEntered.includes?.find((entry) => {
      const same = entry.id.toString() === thingId.toString();
      return same;
    });
    return !!found;
  };

  return {
    currentRabbithole: currentlyEntered,
    includeThing,
    unIncludeThing,
    isIncludedThing,
    exitRabbithole,
    loading: loadingSomething,
    isDownRabbithole,
  };
}
