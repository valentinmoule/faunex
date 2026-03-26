import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PwaInstallProvider } from "./contexts/PwaInstallContext";
import PwaInstallBanner from "./components/PwaInstallBanner";
import LevelSplash from "./components/LevelSplash";
import LevelUpCelebration from "./components/LevelUpCelebration";
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
import QuestsPage from "./pages/QuestsPage";
import LandingPage from "./pages/LandingPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, needsUsername } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3"><img src="/pwa-icon-512.png" alt="Faunex" className="w-20 h-20" /><span className="text-muted-foreground font-display text-sm">Chargement...</span></div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (needsUsername && location.pathname !== '/complete-profile') return <Navigate to="/complete-profile" replace />;
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
  if (session) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const LandingRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const location = useLocation();
  const isCapturePage = location.pathname === '/capture';
  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/auth';
  const isCompleteProfile = location.pathname === '/complete-profile';

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingRoute><LandingPage /></LandingRoute>} />
        <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
        <Route path="/capture" element={<ProtectedRoute><CapturePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/explorers" element={<ProtectedRoute><ExplorersPage /></ProtectedRoute>} />
        <Route path="/explorer/:userId/collection" element={<ProtectedRoute><FriendCollectionPage /></ProtectedRoute>} />
        <Route path="/bestiaire" element={<ProtectedRoute><BestiairePage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/moderation" element={<AdminRoute><ModerationPage /></AdminRoute>} />
        <Route path="/quests" element={<ProtectedRoute><QuestsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/u/:username" element={<ShareProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isCapturePage && !isLandingPage && !isAuthPage && !isCompleteProfile && <BottomNav />}
      <PwaInstallBanner />
      <LevelSplash />
      <LevelUpCelebration />
    </>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PwaInstallProvider>
              <AppRoutes />
            </PwaInstallProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
