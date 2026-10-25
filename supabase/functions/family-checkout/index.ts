import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { FAMILY_PRICES } from '../_shared/family-policy.ts';
const schema = z.object({ plan: z.enum(['monthly','yearly']), environment: z.enum(['live','sandbox']) });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:corsHeaders});
  const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
  if (req.method!=='POST') return respond({error:'method_not_allowed'},405);
  try {
    const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return respond({error:'unavailable'},503);
    const db=createClient(url,key);
    const jwt=req.headers.get('Authorization')?.replace(/^Bearer /,'');
    if (!jwt) return respond({error:'authentication_required'},401);
    const {data:{user},error:authError}=await db.auth.getUser(jwt);
    if (authError || !user) return respond({error:'authentication_required'},401);
    const parsed=schema.safeParse(await req.json());
    if (!parsed.success) return respond({error:'invalid_request'},400);
    const {plan,environment}=parsed.data;
    const {error:guard}=await db.rpc('family_checkout_guard',{p_user:user.id});
    if (guard) return respond({error:guard.message},409);
    const {data,error}=await db.from('family_checkout_intents').insert({user_id:user.id,price_id:FAMILY_PRICES[plan].id,environment}).select('id').single();
    if (error || !data) return respond({error:'unavailable'},503);
    return respond({intentId:data.id,priceId:FAMILY_PRICES[plan].id});
  } catch { return respond({error:'invalid_request'},400); }
});