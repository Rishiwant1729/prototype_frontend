import { useEffect, useRef } from "react";
import { useWebSocket } from "../context/WebSocketContext";

export default function useScanListener(onScan) {
  const { subscribeScan } = useWebSocket();
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    return subscribeScan((payload) => {
      console.log("📡 Scan event received:", payload);
      if (!onScanRef.current) return;
      try {
        onScanRef.current(payload);
      } catch (err) {
        console.error("onScan handler threw", err);
      }
    });
  }, [subscribeScan]);
}
