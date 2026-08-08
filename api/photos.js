// Server-side relay for private Supabase Storage photo files.
import { hasServerAuth, denyUnauthenticated } from './_lib/serverAuth.js';
const BUCKET = 'job-photos';
export default async function handler(req, res) {
  if (!(await hasServerAuth(req))) { denyUnauthenticated(res); return; }
  return photosHandler(req, res);
}
export async function photosHandler(req, res) {
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { res.status(503).json({ error: 'no_server_key' }); return; }
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    if (req.method === 'GET') {
      const fileId = req.query?.fileId; if (!fileId) { res.status(400).json({ error: 'missing_fileId' }); return; }
      const r = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(fileId)}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) });
      if (!r.ok) { res.status(r.status).json({ error: 'sign_failed' }); return; }
      const data = await r.json(); res.status(200).json({ url: data.signedURL || data.signedUrl || data.data?.signedURL }); return;
    }
    if (req.method === 'POST') {
      let fileBuffer, fileId, mime; const ct = req.headers?.['content-type'] || '';
      if (ct.includes('multipart/form-data')) { fileBuffer=req.body?.file; fileId=req.body?.fileId; mime=req.body?.mime || 'image/jpeg'; }
      else { const parsed=await parseBody(req); fileId=parsed.fileId; mime=parsed.mime || 'image/jpeg'; if(parsed.data) fileBuffer=Buffer.from(parsed.data.replace(/^data:[^;]+;base64,/,''),'base64'); }
      if (!fileId || !fileBuffer) { res.status(400).json({ error: 'missing_file_or_fileId' }); return; }
      const r=await fetch(`${url}/storage/v1/object/${BUCKET}/${encodeURIComponent(fileId)}`,{method:'POST',headers:{...headers,'Content-Type':mime,'x-upsert':'true'},body:fileBuffer});
      if(!r.ok){res.status(r.status).json({error:'upload_failed'});return;} res.status(200).json({ok:true,path:fileId});return;
    }
    if (req.method === 'DELETE') {
      const fileId=req.query?.fileId;if(!fileId){res.status(400).json({error:'missing_fileId'});return;}
      const r=await fetch(`${url}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[fileId]})});
      if(!r.ok){res.status(r.status).json({error:'delete_failed'});return;}res.status(200).json({ok:true});return;
    }
    res.status(405).json({error:'method_not_allowed'});
  } catch { res.status(500).json({error:'proxy_error'}); }
}
async function parseBody(req){if(req.body!=null&&typeof req.body!=='string')return req.body;const raw=typeof req.body==='string'?req.body:await readRaw(req);return raw?JSON.parse(raw):{};}
function readRaw(req){return new Promise((resolve,reject)=>{let data='';req.on('data',(c)=>{data+=c;});req.on('end',()=>resolve(data));req.on('error',reject);});}
