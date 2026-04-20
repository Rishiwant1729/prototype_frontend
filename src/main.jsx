import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/theme.css";
import App from "./App";
import { WebSocketProvider } from "./context/WebSocketContext";

// WebSocket lives outside StrictMode so React 18 dev double-mounting
// does not open/close a socket on every mount (which looked like flapping on the server).
ReactDOM.createRoot(document.getElementById("root")).render(
  <WebSocketProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </WebSocketProvider>
);

