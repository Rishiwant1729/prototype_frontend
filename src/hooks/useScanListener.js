import { useEffect, useRef, useCallback } from "react";

export default function useScanListener(onScan) {
  const socketRef = useRef(null);
  const onScanRef = useRef(onScan);
  const reconnectTimeoutRef = useRef(null);

  // Keep the callback ref updated without triggering reconnects
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      // If there is an open socket already, do nothing
      if (socketRef.current?.readyState === WebSocket.OPEN) return;

      // If there is a connecting socket, avoid creating another
      if (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING) return;

      const ws = new WebSocket("ws://localhost:3000");
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("🟢 WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📡 Scan event received:", data);

          if (data.type === "SCAN_EVENT" && onScanRef.current) {
            // call onScan synchronously to minimize UI latency
            try {
              onScanRef.current(data.payload);
            } catch (err) {
              console.error('onScan handler threw', err);
            }
          }
        } catch (err) {
          console.error("❌ Invalid WS payload", err);
        }
      };

      ws.onerror = (error) => {
        console.warn("⚠️ WebSocket error", error && error.message);
      };

      ws.onclose = () => {
        console.log("🔴 WebSocket disconnected");
        socketRef.current = null;

        // Auto-reconnect with short backoff if still mounted
        if (isMounted) {
          // try immediate reconnection first
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Attempting to reconnect...");
            connect();
          }, 1000); // 1s backoff
        }
      };

      // respond to ping/pong to keep connection alive
      ws.onping = () => {
        try { ws.pong(); } catch (e) {}
      };
    };

    connect();

    return () => {
      isMounted = false;

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Close WebSocket
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (e) {}
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount
}
