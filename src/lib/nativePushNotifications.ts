import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { safeNativePath } from '../../supabase/functions/_shared/native-push-policy';

let listeners: PluginListenerHandle[] = [];
let token: string | null = null;
let activeUser: string | null = null;
let generation = 0;
let ready: Promise<void> | null = null;

export async function nativePushPermission() {
  try { return (await FirebaseMessaging.checkPermissions()).receive; }
  catch { return 'denied'; }
}

async function saveToken(value: string, expectedUser: string, expectedGeneration: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id !== expectedUser || activeUser !== expectedUser || generation !== expectedGeneration) return false;
  const { error } = await supabase.functions.invoke('register-native-push', { body: { token: value, platform: Capacitor.getPlatform(), action: 'register' } });
  if (error) return false;
  token = value;
  return true;
}

export async function initializeNativePush(userId: string) {
  if (!Capacitor.isNativePlatform()) return;
  if (activeUser === userId && ready) return ready;
  await stopNativePushListeners();
  activeUser = userId;
  const current = generation;
  ready = (async () => {
    try {
      const refreshed = await FirebaseMessaging.addListener('tokenReceived', event => {
        if (generation === current) void saveToken(event.token, userId, current);
      });
      const tapped = await FirebaseMessaging.addListener('notificationActionPerformed', event => {
        if (generation !== current) return;
        const data = event.notification.data as Record<string, unknown> | undefined;
        window.location.assign(safeNativePath(data?.path));
      });
      if (generation !== current) { await refreshed.remove(); await tapped.remove(); return; }
      listeners = [refreshed, tapped];
      if (localStorage.getItem('faunex_native_push_enabled') === 'true' && await nativePushPermission() === 'granted') {
        const result = await FirebaseMessaging.getToken();
        await saveToken(result.token, userId, current);
      }
    } catch { console.warn('Native push initialization unavailable'); }
  })();
  return ready;
}

export async function stopNativePushListeners() {
  generation++;
  activeUser = null;
  ready = null;
  await Promise.all(listeners.map(listener => listener.remove()));
  listeners = [];
}

export async function subscribeNativePush(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    await initializeNativePush(user.id);
    if ((await FirebaseMessaging.requestPermissions()).receive !== 'granted') return false;
    const result = await FirebaseMessaging.getToken();
    const saved = await saveToken(result.token, user.id, generation);
    if (saved) localStorage.setItem('faunex_native_push_enabled', 'true');
    return saved;
  } catch { return false; }
}

export async function unsubscribeNativePush() {
  if (token) {
    const { error } = await supabase.functions.invoke('register-native-push', { body: { token, platform: Capacitor.getPlatform(), action: 'remove' } });
    if (error) throw new Error('Unable to remove push registration');
  }
  await FirebaseMessaging.deleteToken();
  token = null;
  localStorage.removeItem('faunex_native_push_enabled');
  await stopNativePushListeners();
}

export async function hasNativePushSubscription() {
  return localStorage.getItem('faunex_native_push_enabled') === 'true' && await nativePushPermission() === 'granted';
}