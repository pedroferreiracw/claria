import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Dashboard from "./pages/Dashboard";
import SDRsPage from "./pages/SDRs";
import EvaluationsPage from "./pages/Evaluations";
import ExportPage from "./pages/Export";
import SettingsPage from "./pages/Settings";
import GoalsPage from "./pages/Goals";
import DevelopmentPage from "./pages/Development";
import ComparePage from "./pages/Compare";
import BestPracticesPage from "./pages/BestPractices";
import GamificationPage from "./pages/Gamification";
import ClosersPage from "./pages/Closers";
import CloserEvaluationsPage from "./pages/CloserEvaluations";
import IntelligencePage from "./pages/Intelligence";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/sdrs" element={<ProtectedRoute><SDRsPage /></ProtectedRoute>} />
                <Route path="/evaluations" element={<ProtectedRoute><EvaluationsPage /></ProtectedRoute>} />
                <Route path="/closers" element={<ProtectedRoute><ClosersPage /></ProtectedRoute>} />
                <Route path="/closer-evaluations" element={<ProtectedRoute><CloserEvaluationsPage /></ProtectedRoute>} />
                <Route path="/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
                <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
                <Route path="/development" element={<ProtectedRoute><DevelopmentPage /></ProtectedRoute>} />
                <Route path="/compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
                <Route path="/best-practices" element={<ProtectedRoute><BestPracticesPage /></ProtectedRoute>} />
                <Route path="/gamification" element={<ProtectedRoute><GamificationPage /></ProtectedRoute>} />
                <Route path="/intelligence" element={<ProtectedRoute><IntelligencePage /></ProtectedRoute>} />
                <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
