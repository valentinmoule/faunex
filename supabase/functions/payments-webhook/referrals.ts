import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';
import { qualifyingReferralPayment, referralBillingTarget } from '../_shared/referral-policy.ts';

type Client = ReturnType<typeof createClient>;

/** Read the paid transaction back from Paddle: simulated or client-supplied events cannot grant access. */
export async function confirmReferral(client: Client, transactionId: string, env: PaddleEnv) {
  const paddle = getPaddleClient(env);
  const transaction = await paddle.transactions.get(transactionId);
  if (!qualifyingReferralPayment(transaction)) return;
  const referralId = transaction.customData?.referralId;
  if (typeof referralId !== 'string' || !/^[0-9a-f-]{36}$/i.test(referralId)) return;
  const { data: referral, error } = await client.from('referrals').select('*')
    .eq('id', referralId).eq('environment', env).maybeSingle();
  if (error) throw error;
  if (!referral || transaction.customData?.userId !== referral.referred_user_id) return;
  if (new Date(transaction.createdAt) < new Date(referral.created_at)) return;
  if (!transaction.subscriptionId) return;

  if (!referral.rewarded_at) {
    // A shared email/customer or an earlier Premium purchase is not a new customer.
    const [buyer, sponsor] = await Promise.all([
      client.auth.admin.getUserById(referral.referred_user_id),
      client.auth.admin.getUserById(referral.referrer_user_id),
    ]);
    if (buyer.error || sponsor.error) throw new Error('Referral accounts unavailable');
    if (!buyer.data.user || !sponsor.data.user) return;
    if (buyer.data.user.email?.toLowerCase() === sponsor.data.user.email?.toLowerCase()) return;
    const history = paddle.transactions.list({ customerId: [transaction.customerId], status: ['completed'] });
    for await (const previous of history) {
      if (previous.id !== transaction.id && previous.items.some(item =>
        item.price.importMeta?.externalId?.startsWith('faunex_premium_'))) return;
    }
    const sub = await paddle.subscriptions.get(transaction.subscriptionId);
    if (sub.customData?.userId !== referral.referred_user_id) return;
    const { error: awardError } = await client.rpc('confirm_paid_referral', {
      p_referral: referralId, p_transaction: transaction.id,
      p_subscription: sub.id, p_env: env, p_customer: transaction.customerId,
      p_paid_start: transaction.billingPeriod?.startsAt,
      p_paid_end: transaction.billingPeriod?.endsAt,
    });
    if (awardError) throw awardError;
  }

  const { data: rewards, error: rewardError } = await client.from('referral_rewards')
    .select('*').eq('referral_id', referralId).is('billing_applied_at', null);
  if (rewardError) throw rewardError;
  for (const reward of rewards ?? []) {
    if (!reward.billing_subscription_id || !reward.billing_target_at) continue;
    const sub = await paddle.subscriptions.get(reward.billing_subscription_id);
    // Cancelled/paused accounts retain the separate entitlement; do not undo their cancellation.
    if (sub.status === 'active' && !sub.scheduledChange && sub.nextBilledAt) {
      const target = referralBillingTarget(sub.nextBilledAt, reward.billing_target_at);
      if (Date.parse(target) > Date.parse(sub.nextBilledAt)) {
        await paddle.subscriptions.update(sub.id, { nextBilledAt: target, prorationBillingMode: 'do_not_bill' });
      }
      const latest = await paddle.subscriptions.get(sub.id);
      const { error: syncError } = await client.from('subscriptions').update({
        current_period_end: latest.currentBillingPeriod?.endsAt ?? target,
        updated_at: new Date().toISOString(),
      }).eq('paddle_subscription_id', sub.id).eq('environment', env);
      if (syncError) throw syncError;
    }
    const { error: appliedError } = await client.from('referral_rewards')
      .update({ billing_applied_at: new Date().toISOString() }).eq('id', reward.id);
    if (appliedError) throw appliedError;
  }
}