import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import SportRoom from "./pages/SportRoom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { RailScanFeedProvider } from "./context/RailScanFeedContext";

export default function App() {
  return (
    <AuthProvider>
      <RailScanFeedProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sport-room"
            element={
              <ProtectedRoute>
                <SportRoom />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
      </RailScanFeedProvider>
    </AuthProvider>
  );
}
