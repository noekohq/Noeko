import { useCallback, useEffect, useMemo } from "react";
import { IPinnable } from "../../app/database/models/pin";
import useFetch from "./useFetch";
import { RecordId } from "surrealdb";
import { createPin, deletePin } from "../utils/pins";

type IUsePinsReturn = {
  pins: IPinnable[];
  pinThing: (thing: string | RecordId) => Promise<void>;
  unpinThing: (thing: string | RecordId) => Promise<void>;
  togglePin: (thing: string | RecordId) => Promise<void>;
  thingIsPinned: (thing: string | RecordId) => boolean;
  pinMap: Record<string, IPinnable>;
};

export default function usePins(): IUsePinsReturn {
  const { data: pins, load: loadPins } = useFetch<undefined, IPinnable[]>({
    url: "/pins/things",
    method: "GET",
  });

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

  const loadStuff = () => {
    loadPins();
  };

  useEffect(() => {
    loadStuff();
  }, []);

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
        loadStuff();
      }
    },
    [pins]
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
        loadStuff();
      }
    },
    [pins]
  );

  const thingIsPinned = useCallback(
    (thing: string | RecordId) => {
      return pinMap[thing.toString()] !== undefined;
    },
    [pins]
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
        loadStuff();
      }
    },
    [pins]
  );

  return {
    pins: pins ? pins : [],
    pinThing,
    unpinThing,
    togglePin,
    thingIsPinned,
    pinMap,
  };
}
