import { useState, useEffect, useRef } from "react";
import { api } from "../server/api";

export const useConnection = (pollInterval: number = 10000) => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // We assume a successful request means the server is online.
        await api.get("/healthcheck");
        setIsOnline(true);
      } catch (error) {
        // Any error during the request is treated as the server being offline.
        setIsOnline(false);
      } finally {
        // Only update loading state on the initial check.
        if (isLoadingRef.current) {
          setIsLoading(false);
        }
      }
    };

    // Perform the initial check immediately on mount.
    checkConnection();

    // Set up polling to re-check the connection at the specified interval.
    const intervalId = setInterval(checkConnection, pollInterval);

    // Cleanup function to clear the interval when the component unmounts.
    return () => clearInterval(intervalId);
  }, [pollInterval]); // The effect re-runs only if the pollInterval changes.

  return { isOnline, isLoading };
};
