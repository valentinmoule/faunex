DROP FUNCTION public.my_referral_code();
DROP FUNCTION public.reserve_referral(text, text);
DROP FUNCTION public.confirm_paid_referral(uuid, text, text, text, text, timestamptz, timestamptz);

DROP POLICY own_code ON public.referral_codes;
DROP POLICY own_rewards ON public.referral_rewards;
REVOKE SELECT ON public.referral_codes FROM authenticated;
REVOKE SELECT ON public.referral_rewards FROM authenticated;

COMMENT ON TABLE public.referral_codes IS 'ARCHIVE: retired referral program; historical codes only, no active application access.';
COMMENT ON TABLE public.referrals IS 'ARCHIVE: retired referral program; historical relationships only, no new rewards.';
COMMENT ON TABLE public.referral_rewards IS 'ARCHIVE: preserved solely so previously earned Premium entitlements expire naturally; no new referral rewards.';