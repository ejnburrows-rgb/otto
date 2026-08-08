// Vercel serverless proxy for Claude. Provider key remains server-only.
import { hasServerAuth, denyUnauthenticated } from './_lib/serverAuth.js';
export default async function handler(req,res){if(!(await hasServerAuth(req))){denyUnauthenticated(res);return;}return claudeHandler(req,res);}
export async function claudeHandler(req,res){
 if(req.method!=='POST'){res.status(405).json({error:'method_not_allowed'});return;}
 const key=process.env.ANTHROPIC_API_KEY;if(!key){res.status(503).json({error:'no_server_key'});return;}
 try{let body=req.body;if(typeof body==='string')body=JSON.parse(body);const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify(body||{})});const text=await r.text();res.status(r.status);res.setHeader('Content-Type',r.headers.get('content-type')||'application/json');res.send(text);}catch{res.status(502).json({error:'upstream_error'});}
}
