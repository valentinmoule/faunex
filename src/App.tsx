import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import CapturePage from "./pages/CapturePage";
import CollectionPage from "./pages/CollectionPage";
import ProfilePage from "./pages/ProfilePage";
import ExplorersPage from "./pages/ExplorersPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import FriendCollectionPage from "./pages/FriendCollectionPage";
import BestiairePage from "./pages/BestiairePage";
import NotificationsPage from "./pages/NotificationsPage";
import ModerationPage from "./pages/ModerationPage";
import LegalPage from "./pages/LegalPage";
import ShareProfilePage from "./pages/ShareProfilePage";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground font-display">Chargement...</span></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <>
    <Routes>
      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
      <Route path="/capture" element={<ProtectedRoute><CapturePage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/explorers" element={<ProtectedRoute><ExplorersPage /></ProtectedRoute>} />
      <Route path="/explorer/:userId/collection" element={<ProtectedRoute><FriendCollectionPage /></ProtectedRoute>} />
      <Route path="/bestiaire" element={<ProtectedRoute><BestiairePage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/moderation" element={<ProtectedRoute><ModerationPage /></ProtectedRoute>} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <BottomNav />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
