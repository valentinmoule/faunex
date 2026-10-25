import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Copy, UserMinus, Link, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { readFamily, type FamilyInfo } from '@/lib/family';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { IS_NATIVE_APP } from '@/lib/platform';
import { getPaddleEnvironment } from '@/lib/paddle';
import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { useSubscription } from '@/hooks/useSubscription';

export default function FamilyPage() {
  const {t,i18n}=useTranslation(); const navigate=useNavigate(); const {user}=useAuth();
  const [family,setFamily]=useState<FamilyInfo|null>(null); const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false); const [failed,setFailed]=useState(false); const [link,setLink]=useState('');
  const [remove,setRemove]=useState<string|null>(null); const [code,setCode]=useState('');
  const {openCheckout}=usePaddleCheckout(); const {refresh}=useSubscription(user?.id);
  const [params,setParams]=useSearchParams(); const autoOpened=useRef(false);
  useEffect(()=>{
    if(IS_NATIVE_APP || params.get('checkout')!=='auto' || autoOpened.current || !user)return;
    autoOpened.current=true;
    const plan=params.get('plan')==='monthly'?'monthly':'yearly';
    const familyIntentId=params.get('familyIntent');
    const uid=params.get('uid'); const referralId=params.get('referral');
    setParams({}, {replace:true});
    if(!familyIntentId || uid!==user.id){toast.error(t('family.error'));return;}
    void openCheckout({priceId:plan==='yearly'?'faunex_premium_family_yearly':'faunex_premium_family_monthly',plan,customerEmail:user.email,customData:{userId:user.id,familyIntentId,...(plan==='yearly'&&referralId?{referralId}:{})},successUrl:`${window.location.origin}/family?checkout=success`}).catch(()=>toast.error(t('family.error')));
  },[params,user,setParams,openCheckout,t]);
  const error=(message?:string)=>toast.error(t(`family.errors.${message}`,{defaultValue:t('family.error')}));
  const load=async()=>{setLoading(true); const {data,error:e}=await supabase.rpc('my_family');setFailed(Boolean(e));if(!e)setFamily(readFamily(data));setLoading(false);};
  useEffect(()=>{void load();const listener=()=>void load();window.addEventListener('focus',listener);return()=>window.removeEventListener('focus',listener);},[]);
  const action=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);try{await fn();await load();await refresh();}catch(e){error(e instanceof Error?e.message:undefined);}finally{setBusy(false);}};
  const invite=()=>action(async()=>{const {data,error:e}=await supabase.rpc('create_family_invitation');if(e)throw e;setLink(`https://faunex.fr/family/invite#${data}`);});
  const copy=async()=>{try{await navigator.clipboard.writeText(link);toast.success(t('family.copied'));}catch{error();}};
  const subscribe=(plan:'monthly'|'yearly')=>action(async()=>{
    if(!user)return;
    let referralId:string|undefined;
    if(plan==='yearly'&&code.trim()){const {data,error:e}=await supabase.rpc('reserve_referral',{p_code:code,p_env:getPaddleEnvironment()});if(e)throw e;referralId=data;}
    const {data,error:e}=await supabase.functions.invoke('family-checkout',{body:{plan,environment:getPaddleEnvironment()}});
    if(e || !data?.intentId) {
      const response=e && 'context' in e ? e.context : null;
      const detail=response instanceof Response ? await response.json().catch(()=>null) : null;
      throw new Error(detail?.error ?? data?.error ?? 'error');
    }
    await openCheckout({priceId:data.priceId,plan,customerEmail:user.email,customData:{userId:user.id,familyIntentId:data.intentId,...(referralId?{referralId}:{})},successUrl:`${window.location.origin}/family?checkout=success`});
  });
  const owner=family?.owner_id===user?.id;
  return <div className="min-h-screen bg-background pb-28">
    <PaymentTestModeBanner/>
    <PageHeader><div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label={t('family.title')} onClick={()=>navigate('/settings')}><ArrowLeft className="size-5"/></Button><h1 className="text-xl font-display font-bold">{t('family.title')}</h1></div></PageHeader>
    <main className="max-w-lg mx-auto px-5 pt-6 space-y-6">
      {loading?<Loader2 className="size-6 animate-spin text-primary"/>:failed?<Button variant="outline" onClick={()=>void load()}>{t('family.retry')}</Button>:!family?<>
        <Users className="size-8 text-primary"/><h2 className="text-2xl font-display font-bold">{t('family.offer')}</h2><p className="text-muted-foreground">{t('family.intro')}</p><p className="text-sm text-muted-foreground">{t('family.empty')}</p>
        <Input value={code} onChange={e=>setCode(e.target.value)} aria-label={t('family.referral')} placeholder={t('family.referral')}/><div className="divide-y divide-border">{(['yearly','monthly'] as const).map(plan=><div key={plan} className="flex items-center justify-between gap-3 py-4"><span className="font-semibold">{t(`family.${plan}`)}</span><Button disabled={busy} onClick={()=>void subscribe(plan)}>{busy?<Loader2 className="size-4 animate-spin"/>:t('family.subscribe')}</Button></div>)}</div>
      </>:<>
        <div className="flex items-center gap-2"><Users className="size-5 text-primary"/><span className={family.active?'text-primary font-semibold':'text-muted-foreground'}>{t(family.active?'family.active':'family.expired')}</span></div>
        <h2 className="font-display font-semibold">{t('family.members',{count:family.members.length})}</h2>
        <div className="divide-y divide-border">{family.members.map(member=><div className="flex items-center justify-between gap-3 py-4" key={member.user_id}><div className="min-w-0"><p className="font-medium break-words">{member.name}</p><p className="text-sm text-muted-foreground">{member.user_id===family.owner_id?t('family.owner'):member.username}</p></div>{owner&&member.user_id!==user?.id&&<Button variant="ghost" size="icon" title={t('family.remove')} aria-label={t('family.remove')} disabled={busy} onClick={()=>setRemove(member.user_id)}><UserMinus className="size-5"/></Button>}</div>)}</div>
        {owner?<>
          {family.active&&<Button disabled={busy||family.members.length+family.invitations.length>=4} onClick={()=>void invite()}><Link className="size-4 mr-2"/>{t('family.invite')}</Button>}
          {link&&<div className="flex gap-2"><Input readOnly value={link} aria-label={t('family.invitation')}/><Button variant="ghost" size="icon" aria-label={t('family.copy')} title={t('family.copy')} onClick={()=>void copy()}><Copy className="size-5"/></Button></div>}
          {family.invitations.length>0&&<><h3 className="font-semibold">{t('family.pending')}</h3>{family.invitations.map(inv=><div key={inv.id} className="flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">{t('family.expires',{date:new Date(inv.expires_at).toLocaleDateString(i18n.language)})}</span><Button variant="ghost" size="icon" aria-label={t('family.revoke')} title={t('family.revoke')} disabled={busy} onClick={()=>void action(async()=>{const {error:e}=await supabase.rpc('revoke_family_invitation',{p_invitation:inv.id});if(e)throw e;setLink('');})}><X className="size-4"/></Button></div>)}</>}
          <Button variant="outline" onClick={()=>navigate('/premium')}>{t('family.manage')}</Button>
        </>:<Button variant="outline" onClick={()=>setRemove(user?.id??null)}>{t('family.leave')}</Button>}
        {!owner&&<p className="text-sm text-muted-foreground">{t('family.personalWarning')}</p>}
      </>}
    </main>
    {remove&&createPortal(<div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center px-6"><div className="max-w-sm space-y-6"><h2 className="font-semibold">{t(remove===user?.id?'family.confirmLeave':'family.confirmRemove')}</h2><div className="flex gap-3"><Button variant="outline" onClick={()=>setRemove(null)}>{t('family.cancel')}</Button><Button disabled={busy} onClick={()=>void action(async()=>{const {error:e}=await supabase.rpc('remove_family_member',{p_user:remove});if(e)throw e;setRemove(null);})}>{t('family.confirm')}</Button></div></div></div>,document.body)}
  </div>;
}