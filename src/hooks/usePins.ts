import { useCallback, useEffect } from "react";
import { IPinnable } from "../../app/database/models/pin";
import useFetch from "./useFetch";
import { RecordId } from "surrealdb";
import { createPin, deletePin } from "../utils/pins";

type IUsePinsReturn = {
  pins: IPinnable[];
  pinThing: (thing: string | RecordId) => void;
  unpinThing: (thing: string | RecordId) => void;
};

export default function usePins(): IUsePinsReturn {
  const { data: pins, load: loadPins } = useFetch<undefined, IPinnable[]>({
    url: "/pins/things",
    method: "GET",
  });
  console.log("Data: ", pins);

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
    [pins],
  );

  const unpinThing = useCallback(
    async (thing: string | RecordId) => {
      try {
        if (!pins?.find((pin) => pin.id === thing)) {
          throw new Error("Thing not pinned");
        }
        await deletePin(thing);
      } catch (error) {
        console.error("Couldn't delete pin: ", error);
      } finally {
        loadStuff();
      }
    },
    [pins],
  );

  return {
    pins: pins ? pins : [],
    pinThing,
    unpinThing,
  };
}
