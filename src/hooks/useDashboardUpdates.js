import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for listening to real-time dashboard updates via WebSocket
 * Used by the Analytics Dashboard to receive live updates
 */
export default function useDashboardUpdates(onUpdate) {
  const socketRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);
  const reconnectTimeoutRef = useRef(null);

  // Keep the callback ref updated
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      // Don't create duplicate connections
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const ws = new WebSocket("ws://localhost:3000");
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("📊 Dashboard WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle both SCAN_EVENT and DASHBOARD_UPDATE
          if (data.type === "SCAN_EVENT" || data.type === "DASHBOARD_UPDATE") {
            if (onUpdateRef.current) {
              onUpdateRef.current(data);
            }
          }
        } catch (err) {
          console.error("❌ Invalid dashboard WS payload", err);
        }
      };

      ws.onerror = () => {
        console.warn("⚠️ Dashboard WebSocket error");
      };

      ws.onclose = () => {
        console.log("🔴 Dashboard WebSocket disconnected");
        socketRef.current = null;

        // Auto-reconnect after 5 seconds
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Dashboard reconnecting...");
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  // Return connection status
  const isConnected = useCallback(() => {
    return socketRef.current?.readyState === WebSocket.OPEN;
  }, []);

  return { isConnected };
}
