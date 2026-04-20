import { createContext, useContext, useState } from "react";
import useScanListener from "../hooks/useScanListener";

const RailScanFeedContext = createContext(null);

function scanToEntry(scan) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    student: scan.student?.student_name || "Unknown",
    facility: scan.facility,
    action: scan.action || scan.mode,
    time: new Date()
  };
}

/**
 * Global recent-scan feed for the command rail (all pages).
 * Single WebSocket subscription so entries stay consistent site-wide.
 */
export function RailScanFeedProvider({ children }) {
  const [entries, setEntries] = useState([]);

  useScanListener((scan) => {
    if (!scan) return;
    setEntries((prev) => [scanToEntry(scan), ...prev].slice(0, 40));
  });

  return (
    <RailScanFeedContext.Provider value={entries}>{children}</RailScanFeedContext.Provider>
  );
}

export function useRailScanFeed() {
  const v = useContext(RailScanFeedContext);
  return Array.isArray(v) ? v : [];
}
