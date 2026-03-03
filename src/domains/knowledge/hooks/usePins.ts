import { useCallback, useEffect, useMemo, useState } from "react";
import { IPinnable } from "../../../../app/database/models/pin";
import useFetch from "@core/hooks/useFetch";
import { RecordId } from "surrealdb";
import { createPin, deletePin } from "@domains/knowledge/utils/pins";
import { useApiQuery } from "@/core/hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";

type IUsePinsReturn = {
  pins: IPinnable[];
  loadingPins: boolean;
  pinThing: (thing: string | RecordId) => Promise<void>;
  unpinThing: (thing: string | RecordId) => Promise<void>;
  togglePin: (thing: string | RecordId) => Promise<void>;
  thingIsPinned: (thing: string | RecordId) => boolean;
  pinMap: Record<string, IPinnable>;
  refresh: () => void;
};

export const pinKeys = {
  all: () => ["pins"],
};

export default function usePins(): IUsePinsReturn {
  const qc = useQueryClient();

  const { data: pins, isLoading: loadingPins } = useApiQuery<IPinnable[]>({
    url: "/pins/things",
    queryKey: pinKeys.all(),
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({
      queryKey: pinKeys.all(),
    });
  }, [qc]);

  const pinMap = useMemo(() => {
    if (!pins?.length) {
      return {};
    }
    return pins.reduce(
      (map, pin) => {
        map[pin.id.toString()] = pin;
        return map;
      },
      {} as Record<string, IPinnable>
    );
  }, [pins]);

  const pinThing = useCallback(
    async (thing: string | RecordId) => {
      try {
        if (pins?.find((pin) => pin.id === thing)) {
          throw new Error("Thing already pinned");
        }
        await createPin(thing);
      } catch (error) {
        console.error("Couldn't create pin: ", error);
      } finally {
        invalidate();
      }
    },
    [pins, invalidate]
  );

  const unpinThing = useCallback(
    async (thing: string | RecordId) => {
      try {
        if (!pinMap[thing.toString()]) {
          throw new Error("Thing not pinned");
        }
        await deletePin(thing);
      } catch (error) {
        console.error("Couldn't delete pin: ", error);
      } finally {
        invalidate();
      }
    },
    [pinMap, invalidate]
  );

  const thingIsPinned = useCallback(
    (thing: string | RecordId) => {
      return pinMap[thing.toString()] !== undefined;
    },
    [pinMap]
  );

  const togglePin = useCallback(
    async (thing: string | RecordId) => {
      try {
        if (pinMap[thing.toString()]) {
          await unpinThing(thing);
        } else {
          await pinThing(thing);
        }
      } catch (error) {
        console.error("Couldn't toggle pin: ", error);
      } finally {
        invalidate();
      }
    },
    [pinMap, invalidate, pinThing, unpinThing]
  );

  return {
    pins: pins ? pins : [],
    loadingPins,
    pinThing,
    unpinThing,
    togglePin,
    thingIsPinned,
    pinMap,
    refresh: () => invalidate(),
  };
}
