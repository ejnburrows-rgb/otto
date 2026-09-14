import { requireServerAuth } from './_lib/serverAuth.js';

export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'method_not_allowed'});return;}
  const identity=await requireServerAuth(req,res,{roles:['owner']});
  if(!identity)return;
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key){res.status(503).json({error:'auth_not_configured'});return;}
  const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  const customerId=String(body.customerId||'').trim();
  const email=String(body.email||'').trim().toLowerCase();
  const name=String(body.name||'').trim();
  if(!customerId||!/^\S+@\S+\.\S+$/.test(email)){res.status(400).json({error:'valid_customer_and_email_required'});return;}
  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  const customerRes=await fetch(`${url}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&select=id,data`,{headers});
  const customerRows=customerRes.ok?await customerRes.json():[];
  if(customerRows.length!==1){res.status(404).json({error:'customer_not_found'});return;}
  const usersRes=await fetch(`${url}/rest/v1/users?select=id,data,auth_uid`,{headers});
  const users=usersRes.ok?await usersRes.json():[];
  const clashes=users.filter(row=>String(row?.data?.email||'').trim().toLowerCase()===email&&row?.data?.customerId!==customerId);
  if(clashes.length){res.status(409).json({error:'email_already_assigned'});return;}
  let row=users.find(r=>r?.data?.role==='customer'&&r?.data?.customerId===customerId);
  const profileId=row?.id||`customer-${customerId}`;
  const profile={id:profileId,role:'customer',customerId,email,name:name||customerRows[0]?.data?.name||'',active:true,updated:new Date().toISOString()};
  const save=await fetch(`${url}/rest/v1/users`,{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([{id:profileId,data:profile,auth_uid:row?.auth_uid||null,updated_at:new Date().toISOString()}])});
  if(!save.ok){res.status(502).json({error:'profile_save_failed'});return;}
  const redirectTo=process.env.OTTO_APP_URL||'https://otto-kohl.vercel.app';
  const invite=await fetch(`${url}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,{method:'POST',headers,body:JSON.stringify({email})});
  if(!invite.ok){
    if(invite.status===409||invite.status===422){res.status(200).json({ok:true,invited:false,existing:true,profileId});return;}
    res.status(502).json({error:'invite_failed'});return;
  }
  const invited=await invite.json();
  if(invited?.id){await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(profileId)}`,{method:'PATCH',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({auth_uid:invited.id,updated_at:new Date().toISOString()})});}
  res.status(200).json({ok:true,invited:true,profileId});
}
