import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESSAGES = [
  { title: 'Faunex t\'attend 🦊', body: 'De nouvelles espèces ont peut-être pointé le bout de leur museau près de toi.' },
  { title: 'Une capture en vue ? 📸', body: 'Reviens explorer la faune autour de toi !' },
  { title: 'Ton bestiaire s\'ennuie 🌿', body: 'Reprends ton exploration et débloque de nouvelles cartes.' },
  { title: 'Petit rappel sauvage 🐾', body: 'Une mission quotidienne t\'attend dans Faunex.' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@faunex.fr';

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const INACTIVE_DAYS = 10;
    const COOLDOWN_DAYS = 30;
    const now = new Date();
    const inactiveBefore = new Date(now.getTime() - INACTIVE_DAYS * 86400000).toISOString();
    const cooldownAfter = new Date(now.getTime() - COOLDOWN_DAYS * 86400000).toISOString();

    // 1. Find inactive users
    const { data: inactiveProfiles, error: profErr } = await supabase
      .from('profiles')
      .select('user_id, last_login_at')
      .lt('last_login_at', inactiveBefore)
      .not('last_login_at', 'is', null);

    if (profErr) throw profErr;
    if (!inactiveProfiles || inactiveProfiles.length === 0) {
      return new Response(JSON.stringify({ ok: true, candidates: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidateIds = inactiveProfiles.map(p => p.user_id);

    // 2. Exclude recently notified
    const { data: recentLogs } = await supabase
      .from('inactivity_notifications_log')
      .select('user_id')
      .gte('sent_at', cooldownAfter)
      .in('user_id', candidateIds);

    const recentlyNotified = new Set((recentLogs ?? []).map(r => r.user_id));
    const toNotify = candidateIds.filter(id => !recentlyNotified.has(id));

    if (toNotify.length === 0) {
      return new Response(JSON.stringify({ ok: true, candidates: candidateIds.length, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch their push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', toNotify);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, candidates: candidateIds.length, sent: 0, reason: 'no subs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Group by user and send
    const byUser = new Map<string, typeof subs>();
    for (const s of subs) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const [userId, userSubs] of byUser.entries()) {
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      const payload = JSON.stringify({
        title: msg.title,
        body: msg.body,
        url: '/home',
        tag: 'inactivity-reminder',
      });

      let success = 0;
      let failure = 0;

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          success++;
        } catch (e: any) {
          failure++;
          // Endpoint gone -> remove
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error('push send error', e?.statusCode, e?.body);
          }
        }
      }

      totalSent += success;
      totalFailed += failure;

      if (success > 0) {
        await supabase.from('inactivity_notifications_log').insert({
          user_id: userId,
          success_count: success,
          failure_count: failure,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        candidates: candidateIds.length,
        users_notified: byUser.size,
        sent: totalSent,
        failed: totalFailed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('inactivity push fatal', e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
