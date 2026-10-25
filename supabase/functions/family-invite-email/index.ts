import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts';
const schema=z.object({email:z.string().trim().email().max(254),locale:z.enum(['fr','en']).default('fr')});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
  if(req.method!=='POST')return respond({error:'method_not_allowed'},405);
  try {
    const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!key)return respond({error:'unavailable'},503);
    const db=createClient(url,key);
    const jwt=req.headers.get('Authorization')?.replace(/^Bearer /,'');
    if(!jwt)return respond({error:'authentication_required'},401);
    const {data:{user},error:authError}=await db.auth.getUser(jwt);
    if(authError||!user)return respond({error:'authentication_required'},401);
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return respond({error:'invalid_email'},400);
    const {data:invitation,error}=await db.rpc('create_family_email_invitation',{p_user:user.id,p_email:parsed.data.email});
    if(error)return respond({error:error.message},409);
    if(!invitation?.id||!invitation?.token||!invitation?.email)return respond({error:'unavailable'},503);
    const {data:profile}=await db.from('profiles').select('display_name,username').eq('user_id',user.id).maybeSingle();
    const result=await sendAppEmail(db,'family-invitation',invitation.email,{templateData:{ownerName:profile?.display_name||profile?.username||'Faunex',locale:parsed.data.locale,invitationUrl:`https://faunex.fr/family/invite#${invitation.token}`},idempotencyKey:`family-invitation-${invitation.id}`,messageId:`family-invitation-${invitation.id}`});
    if(result!=='sent'){
      await db.from('family_invitations').update({revoked_at:new Date().toISOString()}).eq('id',invitation.id).is('accepted_at',null);
      return respond({error:'email_send_failed'},503);
    }
    return respond({sent:true});
  }catch{return respond({error:'unavailable'},503);}
});