import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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
import SettingsPage from "./pages/SettingsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3"><img src="/pwa-icon-512.png" alt="Faunex" className="w-20 h-20" /><span className="text-muted-foreground font-display text-sm">Chargement...</span></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!session?.user) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    });
  }, [session]);

  if (loading || isAdmin === null) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3"><img src="/pwa-icon-512.png" alt="Faunex" className="w-20 h-20" /><span className="text-muted-foreground font-display text-sm">Chargement...</span></div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const location = useLocation();
  const isCapturePage = location.pathname === '/capture';

  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
        <Route path="/capture" element={<ProtectedRoute><CapturePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/explorers" element={<ProtectedRoute><ExplorersPage /></ProtectedRoute>} />
        <Route path="/explorer/:userId/collection" element={<ProtectedRoute><FriendCollectionPage /></ProtectedRoute>} />
        <Route path="/bestiaire" element={<ProtectedRoute><BestiairePage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/moderation" element={<AdminRoute><ModerationPage /></AdminRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/u/:username" element={<ShareProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isCapturePage && <BottomNav />}
    </>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
  </ThemeProvider>
);

export default App;
