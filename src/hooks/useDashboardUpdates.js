import { useEffect, useRef } from "react";
import { useWebSocket } from "../context/WebSocketContext";

/**
 * Custom hook for listening to real-time dashboard updates via WebSocket
 * Used by the Analytics Dashboard to receive live updates
 */
export default function useDashboardUpdates(onUpdate) {
  const { subscribeDashboard, isConnected } = useWebSocket();
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    return subscribeDashboard((data) => {
      if (data.type !== "SCAN_EVENT" && data.type !== "DASHBOARD_UPDATE") {
        return;
      }
      console.log("📊 Real-time WS message:", data.type);
      if (onUpdateRef.current) {
        try {
          onUpdateRef.current(data);
        } catch (err) {
          console.error("onUpdate handler threw", err);
        }
      }
    });
  }, [subscribeDashboard]);

  return { isConnected };
}
