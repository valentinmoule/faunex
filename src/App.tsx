import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LevelSplash from "./components/LevelSplash";
import LevelUpCelebration from "./components/LevelUpCelebration";
import LoadingScreen from "./components/LoadingScreen";
import BottomNav from "./components/BottomNav";
import ScrollToTop from "./components/ScrollToTop";
import PullToDiscover from "./components/PullToDiscover";
import { PushPermissionPrompt } from "./components/PushPermissionPrompt";
import { isFirstLogin, markFirstLoginDone } from "./lib/firstLogin";
import PageTransition from "./components/PageTransition";
import { SHOW_MARKETING_PAGES } from "./lib/platform";
import { useSyncAccountLocale } from "./hooks/useAppLocale";
import { ProfileDrawerProvider } from "./components/ProfileDrawer";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { lazyWithRetry } from "./lib/lazyWithRetry";


// Lazy-loaded routes for smaller initial bundle

const CapturePage = lazyWithRetry(() => import("./pages/CapturePage"));
const CollectionPage = lazyWithRetry(() => import("./pages/CollectionPage"));
const ExplorersPage = lazyWithRetry(() => import("./pages/ExplorersPage"));
const AuthPage = lazyWithRetry(() => import("./pages/AuthPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const FriendCollectionPage = lazyWithRetry(() => import("./pages/FriendCollectionPage"));
const BestiairePage = lazyWithRetry(() => import("./pages/BestiairePage"));
const NotificationsPage = lazyWithRetry(() => import("./pages/NotificationsPage"));
const ModerationPage = lazyWithRetry(() => import("./pages/ModerationPage"));
const LegalPage = lazyWithRetry(() => import("./pages/LegalPage"));
const ShareProfilePage = lazyWithRetry(() => import("./pages/ShareProfilePage"));
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const ResetPasswordPage = lazyWithRetry(() => import("./pages/ResetPasswordPage"));
const NativeAuthCallbackPage = lazyWithRetry(() => import("./pages/NativeAuthCallbackPage"));
const NativeAuthBridgePage = lazyWithRetry(() => import("./pages/NativeAuthBridgePage"));
const PremiumPage = lazyWithRetry(() => import("./pages/PremiumPage"));
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage"));
const RefundPolicyPage = lazyWithRetry(() => import("./pages/RefundPolicyPage"));
const PrivacyPage = lazyWithRetry(() => import("./pages/PrivacyPage"));
const LandingPage = SHOW_MARKETING_PAGES ? lazyWithRetry(() => import("./pages/LandingPage")) : null;
const CompleteProfilePage = lazyWithRetry(() => import("./pages/CompleteProfilePage"));
const ContentIndexPage = SHOW_MARKETING_PAGES ? lazyWithRetry(() => import("./pages/ContentIndexPage")) : null;
const ArticlePage = SHOW_MARKETING_PAGES ? lazyWithRetry(() => import("./pages/ArticlePage")) : null;
const SpeciesIndexPage = SHOW_MARKETING_PAGES ? lazyWithRetry(() => import("./pages/SpeciesIndexPage")) : null;
const SpeciesPage = SHOW_MARKETING_PAGES ? lazyWithRetry(() => import("./pages/SpeciesPage")) : null;



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

// Marque la première connexion comme gérée après un court délai :
// les popups (Splash de niveau, quêtes du jour) ne s'affichent qu'à partir
// de la visite suivante — remplace l'ancienne popup d'installation PWA.
const FirstLoginMarker = () => {
  const { session } = useAuth();
  React.useEffect(() => {
    if (!session?.user) return;
    if (!isFirstLogin(session.user.id)) return;
    const timer = setTimeout(() => markFirstLoginDone(session.user.id), 5000);
    return () => clearTimeout(timer);
  }, [session]);
  return null;
};

const AppRoutes = () => {
  const location = useLocation();
  useSyncAccountLocale();
  const isCapturePage = location.pathname === '/capture';
  const isModerationPage = location.pathname === '/moderation';
  const isPremiumPage = location.pathname === '/premium';
  const isPublicPage =
    location.pathname === '/' ||
    location.pathname.startsWith('/auth') ||
    location.pathname === '/reset-password' ||
    location.pathname === '/complete-profile' ||
    location.pathname === '/legal' ||
    location.pathname === '/confidentialite' ||
    location.pathname === '/tarifs' ||
    location.pathname === '/remboursement' ||
    location.pathname.startsWith('/guides') ||
    location.pathname.startsWith('/fonctionnalites') ||
    location.pathname.startsWith('/especes') ||
    location.pathname.startsWith('/u/');

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <PageTransition>
        <Routes>
          <Route
            path="/"
            element={
              SHOW_MARKETING_PAGES && LandingPage ? (
                <LandingRoute><LandingPage /></LandingRoute>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />

          <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/native-callback" element={<NativeAuthCallbackPage />} />
          <Route path="/auth/native-bridge" element={<NativeAuthBridgePage />} />
          <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><BestiairePage /></ProtectedRoute>} />
          <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
          <Route path="/capture" element={<ProtectedRoute><CapturePage /></ProtectedRoute>} />
          <Route path="/profile" element={<Navigate to="/home?profile=1" replace />} />
          <Route path="/feed" element={<Navigate to="/explorers" replace />} />
          <Route path="/explorers" element={<ProtectedRoute><ExplorersPage /></ProtectedRoute>} />
          <Route path="/explorer/:userId/collection" element={<ProtectedRoute><FriendCollectionPage /></ProtectedRoute>} />
          <Route path="/bestiaire" element={<ProtectedRoute><BestiairePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/moderation" element={<AdminRoute><ModerationPage /></AdminRoute>} />
          <Route path="/quests" element={<Navigate to="/home?tab=badges" replace />} />
          <Route path="/premium" element={<ProtectedRoute><PremiumPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/confidentialite" element={<PrivacyPage />} />
          <Route path="/tarifs" element={<PricingPage />} />
          <Route path="/remboursement" element={<RefundPolicyPage />} />
          <Route path="/u/:username" element={<ShareProfilePage />} />
          {SHOW_MARKETING_PAGES && ContentIndexPage && ArticlePage && (
            <>
              <Route path="/guides" element={<ContentIndexPage type="guide" />} />
              <Route path="/guides/:slug" element={<ArticlePage type="guide" />} />
              <Route path="/fonctionnalites" element={<ContentIndexPage type="usecase" />} />
              <Route path="/fonctionnalites/:slug" element={<ArticlePage type="usecase" />} />
            </>
          )}
          {SHOW_MARKETING_PAGES && SpeciesIndexPage && SpeciesPage && (
            <>
              <Route path="/especes" element={<SpeciesIndexPage />} />
              <Route path="/especes/:slug" element={<SpeciesPage />} />
            </>
          )}

          <Route path="*" element={<NotFound />} />
        </Routes>
        </PageTransition>
      </Suspense>
      {!isCapturePage && !isModerationPage && !isPremiumPage && !isPublicPage && <BottomNav />}

      <PullToDiscover />
      {!isPremiumPage && (
        <>
          <PushPermissionPrompt />
          <LevelSplash />
          <LevelUpCelebration />
        </>
      )}
      <FirstLoginMarker />
    </>
  );
};

const App = () => (
  <AppErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Sonner />
            <ScrollToTop />
            <AuthProvider>
              <ProfileDrawerProvider>
                <AppRoutes />
              </ProfileDrawerProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </AppErrorBoundary>
);

export default App;
