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
      
      // Don't create a new connection if one already exists and is open
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

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
            onScanRef.current(data.payload);
          }
        } catch (err) {
          console.error("❌ Invalid WS payload", err);
        }
      };

      ws.onerror = (error) => {
        console.warn("⚠️ WebSocket error");
      };

      ws.onclose = () => {
        console.log("🔴 WebSocket disconnected");
        socketRef.current = null;
        
        // Auto-reconnect after 3 seconds if still mounted
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Attempting to reconnect...");
            connect();
          }, 3000);
        }
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
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount
}
