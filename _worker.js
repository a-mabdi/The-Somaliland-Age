// The Somaliland Age - Cloudflare Pages backend: login, instant saving of content, image uploads (stored in KV)
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
async function hmac(secret,msg){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,enc.encode(msg)))}
async function pbk(pw,salt){const k=await crypto.subtle.importKey('raw',enc.encode(String(pw)),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},k,256))}
const same=(a,b)=>{a=String(a);b=String(b);if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0};
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'};
const KINDS={image:{ext:types,pre:'img:',dir:'images',max:14e6,msg:'Use a JPG, PNG, GIF or WebP image.'},
 video:{ext:{mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime',ogg:'video/ogg'},pre:'vid:',dir:'videos',max:33e6,msg:'Use an MP4, WebM, MOV or OGG video (up to about 24 MB on Cloudflare; for longer videos use a YouTube link).'},
 font:{ext:{woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf',otf:'font/otf'},pre:'fnt:',dir:'fonts',max:8e6,msg:'Use a .woff2, .woff, .ttf or .otf font file.'}};
const valid=c=>c&&typeof c==='object'&&c.site&&Array.isArray(c.menu)&&Array.isArray(c.articles)&&c.footer&&c.home;
async function secret(env){let s=await env.SITE_KV.get('secret');if(!s){s=rnd(32);await env.SITE_KV.put('secret',s)}return s}
async function token(env,a){const e=Date.now()+30*864e5;return e+'.'+await hmac(await secret(env),e+'.'+a.hash.slice(0,16))}
async function authed(req,env){const a=await env.SITE_KV.get('auth','json');if(!a)return false;const [e,s]=(req.headers.get('Authorization')||'').replace('Bearer ','').split('.');
 return !!(e&&s&&+e>Date.now()&&same(s,await hmac(await secret(env),e+'.'+a.hash.slice(0,16))))}
export default{async fetch(req,env){
 const url=new URL(req.url),p=url.pathname;
 try{
  if(p==='/admin'||p==='/admin/')return Response.redirect(url.origin+'/#/login',302);
  if(p==='/api/content'&&req.method==='GET'){
   const c=env.SITE_KV&&await env.SITE_KV.get('content');
   if(c)return new Response(c,{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   const t=await (await env.ASSETS.fetch(new Request(new URL('/data/content.js',url)))).text();
   return new Response(t.replace(/^\s*window\.SITE_DATA\s*=\s*/,'').replace(/;\s*$/,''),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
  if(p.startsWith('/api/')&&req.method==='POST'){
   if(!env.SITE_KV)return J({error:'Setup incomplete: connect the SITE_KV storage to this project in Cloudflare (see README), then upload the folder again.'},500);
   const b=await req.json().catch(()=>({}));
   if(p==='/api/login'){
    let a=await env.SITE_KV.get('auth','json');
    if(!a){
     const u0=env.ADMIN_USER||'admin',p0=env.ADMIN_PASSWORD||'admin123';
     if(same(b.user||'',u0)&&same(b.password||'',p0)){const salt=rnd(16);a={user:u0,salt,hash:await pbk(b.password,salt),isDefault:!env.ADMIN_PASSWORD};await env.SITE_KV.put('auth',JSON.stringify(a));return J({token:await token(env,a)})}
    }else{
     const h=await pbk(b.password||'',a.salt);
     if(same(b.user||'',a.user)&&same(h,a.hash))return J({token:await token(env,a)});
    }
    await new Promise(r=>setTimeout(r,800));return J({error:'Wrong username or password'},401);
   }
   if(!await authed(req,env))return J({error:'Not logged in'},401);
   if(p==='/api/me'){const a=await env.SITE_KV.get('auth','json');return J({ok:true,isDefault:!!(a&&a.isDefault)})}
   if(p==='/api/content'){if(!valid(b))return J({error:'Invalid content'},400);b.rev=Date.now();const s=JSON.stringify(b);if(s.length>3e6)return J({error:'Content is too large'},400);await env.SITE_KV.put('content',s);return J({ok:true,rev:b.rev})}
   if(p==='/api/upload'){
    const K=KINDS[b.kind||'image'];if(!K)return J({error:'Unknown upload type'},400);
    const ext=((b.name||'').split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(!K.ext[ext])return J({error:K.msg},400);
    if(!b.data||b.data.length>K.max)return J({error:'That file is too large. '+K.msg},400);
    const base=(b.name||'file').replace(/\.[^.]*$/,'').replace(/[^a-z0-9_-]/gi,'').slice(0,40)||'file';
    const name=Date.now()+'-'+base+'.'+ext;
    await env.SITE_KV.put(K.pre+name,Uint8Array.from(atob(b.data),c=>c.charCodeAt(0)),{metadata:{type:K.ext[ext]}});
    return J({url:K.dir+'/'+name});
   }
   if(p==='/api/account'){
    const a=await env.SITE_KV.get('auth','json');if(!a)return J({error:'Not set up'},400);
    if(!same(await pbk(b.current||'',a.salt),a.hash))return J({error:'Your current password is not correct.'},403);
    const user=String(b.user||'').trim()||a.user;if(user.length>60)return J({error:'Username is too long.'},400);
    if(b.password&&String(b.password).length<8)return J({error:'Use at least 8 characters for the new password.'},400);
    a.user=user;if(b.password){a.salt=rnd(16);a.hash=await pbk(b.password,a.salt)}a.isDefault=false;
    await env.SITE_KV.put('auth',JSON.stringify(a));return J({ok:true,token:await token(env,a)});
   }
   return J({error:'Not found'},404);
  }
  const KD=Object.values(KINDS).find(K=>p.startsWith('/'+K.dir+'/'));
  if(KD&&env.SITE_KV){
   const r=await env.SITE_KV.getWithMetadata(KD.pre+decodeURIComponent(p.slice(KD.dir.length+2)),'arrayBuffer');
   if(r.value){const buf=r.value,size=buf.byteLength,type=(r.metadata&&r.metadata.type)||'application/octet-stream',rg=req.headers.get('Range');
    const h={'Content-Type':type,'Cache-Control':'public, max-age=300','Accept-Ranges':'bytes'};
    if(rg){const m=rg.match(/bytes=(\d*)-(\d*)/);if(m){let s=m[1]?+m[1]:0,e=m[2]?+m[2]:size-1;if(!m[1]&&m[2]){s=Math.max(0,size-(+m[2]));e=size-1}e=Math.min(e,size-1);
     if(s>e||s>=size)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
     return new Response(buf.slice(s,e+1),{status:206,headers:{...h,'Content-Range':`bytes ${s}-${e}/${size}`,'Content-Length':String(e-s+1)}})}}
    return new Response(buf,{headers:{...h,'Content-Length':String(size)}})}
  }
 }catch(e){return J({error:String(e.message||e)},500)}
 return env.ASSETS.fetch(req);
}};
