import { useEffect, useRef } from "react";
import { api } from "../server/api"; // Assuming you might need the base URL

// Define the properties for the hook
export interface UseBeaconOnHideProps<T> {
  /** The API endpoint URL to send the beacon to. */
  url: string;
  /**
   * A function that returns the data payload to send.
   * This function is called ONLY when the event fires, ensuring the latest data is used.
   * Return null or undefined to prevent sending the beacon.
   */
  getData: () => T | null | undefined;
  /**
   * Set to false to disable the beacon functionality temporarily.
   * @default true
   */
  isEnabled?: boolean;
  /**
   * The event to listen for.
   * 'pagehide' is generally best for unload/close.
   * 'visibilitychange' will fire when the tab becomes hidden (e.g., switching tabs).
   * @default 'pagehide'
   */
  event?: "pagehide" | "visibilitychange";
}

/**
 * React hook to send data using navigator.sendBeacon when the page visibility changes
 * to hidden or when the page is about to be unloaded.
 *
 * NOTE: This uses navigator.sendBeacon directly and WILL NOT use Axios interceptors
 * (e.g., for adding Authorization headers). Ensure your endpoint can handle
 * beacon requests, potentially relying on session cookies if auth is needed.
 *
 * @template T The type of the data payload object returned by getData.
 * @param {UseBeaconOnHideProps<T>} props - Hook configuration.
 */
function useBeaconOnHide<T>({
  url,
  getData,
  isEnabled = true,
  event = "pagehide",
}: UseBeaconOnHideProps<T>) {
  // Use refs to store the latest versions of props/callbacks
  // This prevents the effect from re-running excessively and avoids stale closures
  const urlRef = useRef(url);
  const getDataRef = useRef(getData);
  const isEnabledRef = useRef(isEnabled);
  const eventRef = useRef(event);

  // Update refs whenever props change
  useEffect(() => {
    urlRef.current = url;
    getDataRef.current = getData;
    isEnabledRef.current = isEnabled;
    eventRef.current = event;
  }, [url, getData, isEnabled, event]);

  useEffect(() => {
    const handleEvent = () => {
      // Check if enabled
      if (!isEnabledRef.current) {
        return;
      }

      // If using visibilitychange, only proceed if state is 'hidden'
      if (
        eventRef.current === "visibilitychange" &&
        document.visibilityState !== "hidden"
      ) {
        return;
      }

      // Get the latest data *right now*
      const payload = getDataRef.current();

      // Only send if payload is not null/undefined
      if (payload !== null && payload !== undefined) {
        try {
          const dataString = JSON.stringify(payload);
          const dataBlob = new Blob([dataString], { type: "application/json" });

          // Construct the full URL if your base URL isn't absolute
          // Assuming `api.defaults.baseURL` holds your base path like '/api' or 'http://...'
          const fullUrl = `${api.defaults.baseURL || ""}${urlRef.current}`;

          // Use sendBeacon
          const queued = navigator.sendBeacon(fullUrl, dataBlob);

          if (queued) {
            console.info(`Beacon successfully queued for ${fullUrl}`);
          } else {
            console.error(
              `Failed to queue beacon for ${fullUrl}. Data might be too large or URL invalid.`,
            );
            // Note: You cannot reliably do complex fallbacks here during unload.
          }
        } catch (error) {
          console.error("Error preparing data for sendBeacon:", error);
        }
      } else {
        console.info("Beacon skipped: getData returned null or undefined.");
      }
    };

    // Add the event listener based on the chosen event
    const currentEvent = eventRef.current; // Use the ref's value at the time of effect setup
    if (currentEvent === "visibilitychange") {
      document.addEventListener("visibilitychange", handleEvent);
    } else {
      // 'pagehide'
      window.addEventListener("pagehide", handleEvent);
    }

    // Cleanup function to remove the listener
    return () => {
      if (currentEvent === "visibilitychange") {
        document.removeEventListener("visibilitychange", handleEvent);
      } else {
        // 'pagehide'
        window.removeEventListener("pagehide", handleEvent);
      }
    };
  }, []); // Empty dependency array: runs once on mount, cleans up on unmount. Refs handle dynamic values.

  // This hook doesn't return anything, it just sets up a side effect.
}

export default useBeaconOnHide;
