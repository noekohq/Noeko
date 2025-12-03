import { useEffect, useState, useRef } from "react";
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

  // Keep track of the current room so we don't overwrite a newer request
  // with an older async result
  const activeRoomRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Guard Clauses
    if (!roomId || !enabled) {
      setProvider(null);
      setStatus("disconnected");
      return;
    }

    // 2. Update Ref to current intention
    activeRoomRef.current = roomId;

    // 3. Set Loading State & Clear old provider to prevent "Zombie" usage
    // This ensures DreamWriter reverts to read-only/local while connecting
    // rather than trying to use a destroyed provider.
    setProvider(null);
    setStatus("connecting");

    let newProvider: HocuspocusProvider | null = null;

    const initProvider = async () => {
      try {
        // 4. Refresh Token
        await refreshToken();

        // Check if we are still trying to connect to the same room
        // (User might have navigated away while we were awaiting)
        if (activeRoomRef.current !== roomId) return;

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const url = `${protocol}://${serverHost}`;

        newProvider = new HocuspocusProvider({
          url,
          name: roomId,
          // Optional: Force WebSocketPolyfill if using in non-browser env
          // WebSocketPolyfill: WebSocket,
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
              // Hocuspocus doesn't automatically retry immediately after this callback
              // usually, but the next connection attempt will use the new cookie.
              // We can force a granular reconnect if needed, but usually
              // the provider retry strategy handles this.
            } catch (e) {
              console.error("Token refresh failed", e);
              setStatus("disconnected");
            }
          },
        });

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

    // 5. Cleanup
    return () => {
      activeRoomRef.current = null; // Cancel any pending async setups
      if (newProvider) {
        newProvider.destroy();
      }
    };
  }, [roomId, enabled]); // Removed 'version' dependency

  return { provider, status };
};
