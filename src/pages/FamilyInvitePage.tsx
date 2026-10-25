import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
export default function FamilyInvitePage(){
  const {user,loading,needsUsername}=useAuth();const {t}=useTranslation();const navigate=useNavigate();const [busy,setBusy]=useState(false);const attempted=useRef(false);
  const [token]=useState(()=>window.location.hash.slice(1));
  const accept=async()=>{if(busy)return;setBusy(true);const {error}=await supabase.rpc('accept_family_invitation',{p_token:token});setBusy(false);sessionStorage.removeItem('faunex.familyReturn');if(error)toast.error(t(`family.errors.${error.message}`,{defaultValue:t('family.error')}));else {toast.success(t('family.joined'));navigate('/home',{replace:true});}};
  useEffect(()=>{
    if(loading||!user||attempted.current)return;
    attempted.current=true;
    if(needsUsername){sessionStorage.setItem('faunex.familyReturn',token);navigate('/complete-profile',{replace:true});return;}
    void accept();
  },[loading,user,needsUsername,token]);
  const signIn=(signup=false)=>{if(/^[0-9a-f]{64}$/.test(token))sessionStorage.setItem('faunex.familyReturn',token);navigate(signup?'/auth?mode=signup':'/auth');};
  return <main className="min-h-screen bg-background flex flex-col justify-center max-w-lg mx-auto px-6 pb-24 gap-6"><Users className="size-10 text-primary"/><h1 className="text-2xl font-display font-bold">{t('family.invitation')}</h1><p className="text-muted-foreground">{t('family.inviteText')}</p><p className="text-sm text-muted-foreground">{t('family.personalWarning')}</p>{loading?<Loader2 className="animate-spin size-6"/>:user?<Button disabled={busy} onClick={()=>void accept()}>{busy?<Loader2 className="animate-spin size-5"/>:t('family.accept')}</Button>:<><Button onClick={()=>signIn(true)}>{t('family.createAccount')}</Button><Button variant="outline" onClick={()=>signIn()}>{t('family.signIn')}</Button></>}</main>;
}