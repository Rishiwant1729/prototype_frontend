import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const WebSocketContext = createContext(null);

function getWsUrl() {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return explicit;
  const api = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
  try {
    const { protocol, host } = new URL(api);
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${host}`;
  } catch {
    return "ws://localhost:3000";
  }
}

export function WebSocketProvider({ children }) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const scanListenersRef = useRef(new Set());
  const dashboardListenersRef = useRef(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let stopped = false;

    const clearReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = () => {
      if (stopped) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === "SCAN_EVENT") {
          scanListenersRef.current.forEach((fn) => {
            try {
              fn(data.payload);
            } catch (e) {
              console.error("scan listener threw", e);
            }
          });
          dashboardListenersRef.current.forEach((fn) => {
            try {
              fn(data);
            } catch (e) {
              console.error("dashboard listener threw", e);
            }
          });
        } else if (data.type === "DASHBOARD_UPDATE") {
          dashboardListenersRef.current.forEach((fn) => {
            try {
              fn(data);
            } catch (e) {
              console.error("dashboard listener threw", e);
            }
          });
        }
      };

      ws.onerror = () => {
        console.warn("⚠️ WebSocket error");
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (stopped) return;
        clearReconnect();
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 1500);
      };
    };

    connect();

    return () => {
      stopped = true;
      clearReconnect();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, []);

  const subscribeScan = useCallback((fn) => {
    scanListenersRef.current.add(fn);
    return () => {
      scanListenersRef.current.delete(fn);
    };
  }, []);

  const subscribeDashboard = useCallback((fn) => {
    dashboardListenersRef.current.add(fn);
    return () => {
      dashboardListenersRef.current.delete(fn);
    };
  }, []);

  const isConnected = useCallback(() => connected, [connected]);

  const value = useMemo(
    () => ({ subscribeScan, subscribeDashboard, isConnected }),
    [subscribeScan, subscribeDashboard, isConnected]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return ctx;
}
