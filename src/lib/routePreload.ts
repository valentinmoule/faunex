/** The same promises back lazy routes and intent/idle preloading. Failed loads can retry. */
const loaders = {
  '/home': () => import('@/pages/BestiairePage'),
  '/explorers': () => import('@/pages/ExplorersPage'),
  '/capture': () => import('@/pages/CapturePage'),
  '/defis': () => import('@/pages/ChallengesPage'),
  '/notifications': () => import('@/pages/NotificationsPage'),
  '/apprendre': () => import('@/pages/LearningPage'),
  '/settings': () => import('@/pages/SettingsPage'),
};
type TabPath = keyof typeof loaders;
const pending = new Map<TabPath, ReturnType<typeof loaders[TabPath]>>();
export function loadTab(path: TabPath) {
  const existing = pending.get(path);
  if (existing) return existing;
  const request = loaders[path]().catch(error => { pending.delete(path); throw error; });
  pending.set(path, request);
  return request;
}
export function prefetchRoute(path: string) {
  if (Object.prototype.hasOwnProperty.call(loaders, path)) void loadTab(path as TabPath).catch(() => {});
}
export function prefetchTabs() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /2g/.test(connection?.effectiveType ?? '')) return;
  Object.keys(loaders).forEach((path, index) => window.setTimeout(() => prefetchRoute(path), index * 400));
}