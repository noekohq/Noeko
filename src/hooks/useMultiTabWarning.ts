import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "open_idea_tabs";

/**
 * Retrieves the record of open tabs from localStorage.
 * @returns A record where keys are idea IDs and values are arrays of tab IDs.
 */
const getOpenTabs = (): Record<string, string[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return {};
  }
};

/**
 * Saves the record of open tabs to localStorage.
 * @param tabs - The record of tabs to save.
 */
const setOpenTabs = (tabs: Record<string, string[]>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch (error) {
    console.error("Error writing to localStorage:", error);
  }
};

/**
 * A hook to detect if the same resource (identified by an ID) is open in multiple tabs.
 * It uses localStorage and BroadcastChannel to communicate between tabs.
 * The first tab to open a resource is considered the "primary" tab. All subsequent
 * tabs for the same resource are considered "duplicates".
 *
 * @param ideaId The unique identifier for the resource (e.g., an idea's ID).
 * @returns `true` if the current tab is a duplicate, `false` otherwise.
 */
export const useMultiTabWarning = (ideaId: string | null | undefined) => {
  const [isDuplicate, setIsDuplicate] = useState(false);
  // Use a ref to store a unique ID for the current tab instance.
  const tabId = useRef(String(Date.now() + Math.random()));
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Do nothing if there's no ideaId.
    if (!ideaId) {
      return;
    }

    // Create a BroadcastChannel specific to this ideaId.
    channel.current = new BroadcastChannel(`idea-tabs-${ideaId}`);

    const checkDuplicateStatus = () => {
      const allTabs = getOpenTabs();
      const tabsForThisIdea = allTabs[ideaId] || [];
      // The first tab in the array is the primary. If this tab is not the
      // first one, it's a duplicate.
      if (tabsForThisIdea.length > 0 && tabsForThisIdea[0] !== tabId.current) {
        setIsDuplicate(true);
      } else {
        setIsDuplicate(false);
      }
    };

    // When a message is received on the channel, re-check the duplicate status.
    const onMessage = () => {
      checkDuplicateStatus();
    };
    channel.current.addEventListener("message", onMessage);

    // --- Tab Registration ---
    const allTabs = getOpenTabs();
    const tabsForThisIdea = allTabs[ideaId] || [];
    if (!tabsForThisIdea.includes(tabId.current)) {
      const newTabsForThisIdea = [...tabsForThisIdea, tabId.current];
      setOpenTabs({ ...allTabs, [ideaId]: newTabsForThisIdea });
    }

    // Perform the initial check.
    checkDuplicateStatus();
    // Notify other tabs to re-check their own status.
    channel.current.postMessage("tab-change");

    // --- Cleanup Logic ---
    const cleanup = () => {
      const allTabsOnClose = getOpenTabs();
      const tabsForThisIdeaOnClose = allTabsOnClose[ideaId] || [];
      const updatedTabs = tabsForThisIdeaOnClose.filter((id) => id !== tabId.current);

      if (updatedTabs.length > 0) {
        setOpenTabs({ ...allTabsOnClose, [ideaId]: updatedTabs });
      } else {
        // If no tabs remain for this idea, remove the entry entirely.
        const { [ideaId]: _, ...rest } = allTabsOnClose;
        setOpenTabs(rest);
      }
      // Notify remaining tabs that a change has occurred.
      channel.current?.postMessage("tab-change");
    };

    // Use 'beforeunload' to handle tab closing.
    window.addEventListener("beforeunload", cleanup);

    // The return function from useEffect handles component unmounting.
    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup(); // Run cleanup logic on unmount as well.
      channel.current?.removeEventListener("message", onMessage);
      channel.current?.close();
    };
  }, [ideaId]);

  return isDuplicate;
};
