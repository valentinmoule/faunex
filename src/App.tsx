import React, { lazy, Suspense } from "react";
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
import LoadingScreen from "./components/LoadingScreen";
import BottomNav from "./components/BottomNav";
import ScrollToTop from "./components/ScrollToTop";
import { PushPermissionPrompt } from "./components/PushPermissionPrompt";

// Lazy-loaded routes for smaller initial bundle
const Index = lazy(() => import("./pages/Index"));
const CapturePage = lazy(() => import("./pages/CapturePage"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ExplorersPage = lazy(() => import("./pages/ExplorersPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FriendCollectionPage = lazy(() => import("./pages/FriendCollectionPage"));
const BestiairePage = lazy(() => import("./pages/BestiairePage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ModerationPage = lazy(() => import("./pages/ModerationPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const ShareProfilePage = lazy(() => import("./pages/ShareProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const QuestsPage = lazy(() => import("./pages/QuestsPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const CompleteProfilePage = lazy(() => import("./pages/CompleteProfilePage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const ContentIndexPage = lazy(() => import("./pages/ContentIndexPage"));
const ArticlePage = lazy(() => import("./pages/ArticlePage"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, needsUsername } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
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

  if (loading || isAdmin === null) return <LoadingScreen />;
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
  const isModerationPage = location.pathname === '/moderation';
  const isPublicPage =
    location.pathname === '/' ||
    location.pathname === '/auth' ||
    location.pathname === '/reset-password' ||
    location.pathname === '/complete-profile' ||
    location.pathname === '/legal' ||
    location.pathname === '/unsubscribe' ||
    location.pathname.startsWith('/guides') ||
    location.pathname.startsWith('/fonctionnalites') ||
    location.pathname.startsWith('/u/');

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingRoute><LandingPage /></LandingRoute>} />
          <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
          <Route path="/capture" element={<ProtectedRoute><CapturePage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/feed" element={<Navigate to="/explorers" replace />} />
          <Route path="/explorers" element={<ProtectedRoute><ExplorersPage /></ProtectedRoute>} />
          <Route path="/explorer/:userId/collection" element={<ProtectedRoute><FriendCollectionPage /></ProtectedRoute>} />
          <Route path="/bestiaire" element={<ProtectedRoute><BestiairePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/moderation" element={<AdminRoute><ModerationPage /></AdminRoute>} />
          <Route path="/quests" element={<ProtectedRoute><QuestsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/u/:username" element={<ShareProfilePage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/guides" element={<ContentIndexPage type="guide" />} />
          <Route path="/guides/:slug" element={<ArticlePage type="guide" />} />
          <Route path="/fonctionnalites" element={<ContentIndexPage type="usecase" />} />
          <Route path="/fonctionnalites/:slug" element={<ArticlePage type="usecase" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!isCapturePage && !isModerationPage && !isPublicPage && <BottomNav />}

      <PwaInstallBanner />
      <PushPermissionPrompt />
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
          <ScrollToTop />
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
