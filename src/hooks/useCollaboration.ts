import { useEffect, useState, useRef } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { refreshToken, serverHost } from "../server/api";

export type ICollaborationStatus =
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
  const [status, setStatus] = useState<ICollaborationStatus>("disconnected");

  const activeRoomRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId || !enabled) {
      setProvider(null);
      setStatus("disconnected");
      return;
    }

    activeRoomRef.current = roomId;

    setProvider(null);
    setStatus("connecting");

    let newProvider: HocuspocusProvider | null = null;

    const initProvider = async () => {
      try {
        await refreshToken();

        if (activeRoomRef.current !== roomId) return;

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const url = `${protocol}://${serverHost}`;

        newProvider = new HocuspocusProvider({
          url,
          name: roomId,
          onSynced: () => {
            if (activeRoomRef.current === roomId) {
              setStatus("synced");
              onStatusChange?.("synced");
            }
          },
          onClose: () => {
            if (activeRoomRef.current === roomId) {
              setStatus("disconnected");
            }
          },
          onAuthenticationFailed: async () => {
            console.warn("Auth failed. Attempting token refresh...");
            try {
              await refreshToken();
            } catch (e) {
              console.error("Token refresh failed", e);
              setStatus("disconnected");
            }
          },
        });

        newProvider.on(
          "status",
          ({ status: providerStatus }: { status: ICollaborationStatus }) => {
            if (activeRoomRef.current === roomId) {
              setStatus((currentStatus) => {
                if (
                  currentStatus === "synced" &&
                  providerStatus === "connected"
                ) {
                  return "synced";
                }
                return providerStatus;
              });
            }
          },
        );

        if (activeRoomRef.current === roomId) {
          setProvider(newProvider);
        } else {
          // We navigated away during setup
          newProvider.destroy();
        }
      } catch (err) {
        console.error("Failed to setup collaboration", err);
        if (activeRoomRef.current === roomId) {
          setStatus("disconnected");
        }
      }
    };

    initProvider();

    return () => {
      activeRoomRef.current = null;
      if (newProvider) {
        newProvider.destroy();
      }
    };
  }, [roomId, enabled]);

  return { provider, status };
};
