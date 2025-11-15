import { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { refreshToken, serverHost } from "../server/api";

export type CollaborationStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "synced";

export const useCollaboration = ({
  roomId,
  enabled = true,
  onStatusChange,
}: any) => {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<CollaborationStatus>("disconnected");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!roomId || !enabled) {
      setProvider(null);
      return;
    }

    if (retryCount > 1) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    let newProvider: HocuspocusProvider | null = null;

    (async () => {
      try {
        await refreshToken(); // Ensure auth is fresh

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const url = `${protocol}://${serverHost}`;

        console.log(`Connecting to ${url} (Attempt ${retryCount + 1})`);

        newProvider = new HocuspocusProvider({
          url,
          name: roomId,
          onSynced: () => {
            setStatus("synced");
            onStatusChange?.("synced");
            setRetryCount(0);
          },
          onClose: () => {
            setStatus("disconnected");
          },
          onAuthenticationFailed: () => {
            console.warn("Auth failed, retrying...");
            setRetryCount((prev) => prev + 1);
          },
        });

        setProvider(newProvider);
      } catch (err) {
        console.error("Failed to setup collaboration", err);
        setStatus("disconnected");
      }
    })();

    return () => {
      if (newProvider) {
        newProvider.destroy();
      }
    };
  }, [roomId, enabled, retryCount]);

  return { provider, status };
};
