import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { fetchLiveActivity } from "../api/platform";

const LiveContext = createContext(null);

const POLL_INTERVAL = 5000;

export function LiveProvider({ children }) {
  const [activity, setActivity] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [lastPoll, setLastPoll] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  const poll = useCallback(async () => {
    try {
      const since = lastPoll ? new Date(lastPoll.getTime() - 2000) : null;
      const items = await fetchLiveActivity(since);
      const fresh = items.filter((item) => {
        const key = `${item.type}-${item.id}-${item.timestamp}`;
        if (seenIdsRef.current.has(key)) return false;
        seenIdsRef.current.add(key);
        return true;
      });

      if (fresh.length > 0) {
        setNewItems((prev) => [...fresh, ...prev].slice(0, 20));
        setActivity((prev) => [...fresh, ...prev].slice(0, 100));
      }
      setLastPoll(new Date());
    } catch {
      // Silently fail on polling errors
    }
  }, [lastPoll]);

  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, poll]);

  const dismissNew = useCallback(() => {
    setNewItems([]);
  }, []);

  const toggleLive = useCallback(() => {
    setIsLive((prev) => !prev);
  }, []);

  return (
    <LiveContext.Provider
      value={{
        activity,
        newItems,
        isLive,
        lastPoll,
        dismissNew,
        toggleLive,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  const context = useContext(LiveContext);
  if (!context) {
    throw new Error("useLive must be used within LiveProvider");
  }
  return context;
}

