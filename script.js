/* The Somaliland Age - site renderer, routing, login, instant saving. The dashboard lives in admin.js (loaded only after login). */
(()=>{
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
/* ---- safe rich text ---- */
const OK=new Set('P BR B I U STRONG EM A BLOCKQUOTE H2 H3 UL OL LI SPAN DIV FONT'.split(' ')),DROP=new Set('SCRIPT STYLE IFRAME OBJECT EMBED LINK META SVG FORM INPUT'.split(' '));
const CSSOK=['color','font-family','font-weight','font-style','text-decoration','background-color','text-shadow','-webkit-text-stroke','paint-order'];
function clean(h){const t=document.createElement('template');t.innerHTML=h||'';
 (function w(n){[...n.childNodes].forEach(c=>{if(c.nodeType===3)return;if(c.nodeType!==1){c.remove();return}
  if(DROP.has(c.tagName)){c.remove();return}
  if(c.tagName==='DIV'&&c.classList.contains('vid')){const d=c.dataset,k=d.k,ok=(k==='yt'||k==='vm')?/^[A-Za-z0-9_-]{5,20}$/.test(d.id||''):(k==='file'&&/^(videos\/[A-Za-z0-9_\-.]+|data:video\/(mp4|webm|ogg|quicktime);base64,[A-Za-z0-9+\/=]+)$/.test(d.src||''));
   if(!ok){c.remove();return}
   const keep={k,id:k==='file'?'':d.id,src:k==='file'?d.src:'',w:Math.min(100,Math.max(10,+d.w||100)),a:['left','center','right'].includes(d.a)?d.a:'center',r:['16:9','4:3','3:2','1:1','21:9','9:16'].includes(d.r)?d.r:'16:9',c:d.c==='0'?0:1,ap:d.ap==='1'?1:0,lp:d.lp==='1'?1:0};
   [...c.attributes].forEach(a=>c.removeAttribute(a.name));c.className='vid';c.textContent='';Object.entries(keep).forEach(([x,y])=>{if(y!==''&&y!=null)c.setAttribute('data-'+x,y)});return}
  w(c);
  if(!OK.has(c.tagName)){c.replaceWith(...[...c.childNodes]);return}
  const st=[];CSSOK.forEach(p=>{const v=c.style.getPropertyValue(p);if(v&&!/url\(|expression/i.test(v))st.push(p+':'+v)});
  const href=c.tagName==='A'?c.getAttribute('href')||'':'',id=c.getAttribute('id')||'',tg=c.getAttribute('target')||'',cls=c.getAttribute('class')||'';
  [...c.attributes].forEach(a=>c.removeAttribute(a.name));
  if(st.length)c.setAttribute('style',st.join(';'));
  if(/^anc-[a-z0-9_-]{1,60}$/.test(id))c.setAttribute('id',id);
  if(c.tagName==='SPAN'&&cls==='anchor')c.setAttribute('class','anchor');
  if(c.tagName==='A'&&/^(https?:|mailto:|tel:|#)/i.test(href)){c.setAttribute('href',href);if(tg==='_blank'||(/^https?:/i.test(href)&&tg!=='_self')){c.target='_blank';c.rel='noopener'}}})})(t.content);
 return t.innerHTML}
/* ---- device-only mode: with no server, login and saving still work (stored in this browser) ---- */
function sha256(s){s=unescape(encodeURIComponent(s));
 const rr=(v,a)=>(v>>>a)|(v<<(32-a)),mp=Math.pow,mw=mp(2,32);let i,j,res='',words=[],bl=s.length*8,hash=[],k=[],pc=0,ic={};
 for(let c=2;pc<64;c++)if(!ic[c]){for(i=0;i<313;i+=c)ic[i]=c;hash[pc]=(mp(c,.5)*mw)|0;k[pc++]=(mp(c,1/3)*mw)|0}
 s+='\x80';while(s.length%64-56)s+='\x00';
 for(i=0;i<s.length;i++){j=s.charCodeAt(i);words[i>>2]|=j<<((3-i)%4)*8}
 words[words.length]=(bl/mw)|0;words[words.length]=bl;
 for(j=0;j<words.length;){const w=words.slice(j,j+=16),old=hash;hash=hash.slice(0,8);
  for(i=0;i<64;i++){const w15=w[i-15],w2=w[i-2],a=hash[0],e=hash[4];
   const t1=hash[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&hash[5])^(~e&hash[6]))+k[i]+(w[i]=i<16?w[i]:(w[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
   const t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
   hash=[(t1+t2)|0].concat(hash);hash[4]=(hash[4]+t1)|0}
  for(i=0;i<8;i++)hash[i]=(hash[i]+old[i])|0}
 for(i=0;i<8;i++)for(j=3;j+1;j--){const b=(hash[i]>>(j*8))&255;res+=(b<16?0:'')+b.toString(16)}
 return res}
const LA='somaliland-local-auth',rs=()=>Math.random().toString(36).slice(2)+Date.now();
function localAuth(){let a=null;try{a=JSON.parse(localStorage.getItem(LA)||'null')}catch(e){}
 if(!a){const salt=rs();a={user:'admin',salt,hash:sha256(salt+'admin123'),isDefault:true};localStorage.setItem(LA,JSON.stringify(a))}return a}
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('somaliland-local',1);r.onupgradeneeded=()=>r.result.createObjectStore('k');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
async function ldbGet(){try{localStorage.removeItem('ama-draft');const d=await idb();return await new Promise(ok=>{const q=d.transaction('k').objectStore('k').get('draft');q.onsuccess=()=>ok(q.result||null);q.onerror=()=>ok(null)})}catch(e){try{return JSON.parse(localStorage.getItem('ama-draft')||'null')}catch(e2){return null}}}
async function ldbSet(v){try{const d=await idb();await new Promise((ok,no)=>{const t=d.transaction('k','readwrite');t.objectStore('k').put(v,'draft');t.oncomplete=ok;t.onerror=()=>no(t.error)});return true}catch(e){try{localStorage.setItem('ama-draft',JSON.stringify(v));return true}catch(e2){return false}}}
async function localApi(path,b){const a=localAuth();
 if(path==='api/login'){if(b.user===a.user&&sha256(a.salt+(b.password||''))===a.hash)return {token:'local'};await new Promise(r=>setTimeout(r,600));return {error:'Wrong username or password'}}
 if(path==='api/me')return {ok:true,isDefault:!!a.isDefault};
 if(path==='api/content'){return (await ldbSet({base:window.SITE_DATA.rev,data:D}))?{ok:true,local:true}:{error:'This browser could not store your changes (storage is full or blocked).'}}
 if(path==='api/upload'){const ext=((b.name||'').split('.').pop()||'').toLowerCase(),M={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime',ogg:'video/ogg',woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf',otf:'font/otf'};
  const kind=b.kind||'image';if(!M[ext]||(kind==='video'&&!/^video/.test(M[ext]))||(kind==='font'&&!/^font/.test(M[ext]))||(kind==='image'&&!/^image/.test(M[ext])))return {error:'That file type is not supported here.'};
  if(kind==='video'&&(b.data||'').length>16e6)return {error:'Offline mode can store videos up to about 12 MB. For bigger videos use a YouTube link, or the server version.'};
  return {url:'data:'+(kind==='video'&&ext==='mov'?'video/mp4':M[ext])+';base64,'+b.data}}
 if(path==='api/account'){if(sha256(a.salt+(b.current||''))!==a.hash)return {error:'Your current password is not correct.'};
  const user=String(b.user||'').trim()||a.user;if(user.length>60)return {error:'Username is too long.'};if(b.password&&String(b.password).length<8)return {error:'Use at least 8 characters for the new password.'};
  a.user=user;if(b.password){a.salt=rs();a.hash=sha256(a.salt+b.password)}a.isDefault=false;localStorage.setItem(LA,JSON.stringify(a));return {ok:true,token:'local'}}
 return {error:'Not available'}}
/* ---- state ---- */
const app=document.getElementById('app'),TK='ama-token';
let D=null,BACKEND=false,saving=false,again=false,pt;
const tok=()=>localStorage.getItem(TK)||'';
const logged=()=>!!tok();
const isLocal=()=>location.protocol==='file:'||/^(localhost|127\.|\[::1\]|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$|\.localhost$/.test(location.hostname);
let lastSt='Ready';
const status=(t,bad)=>{lastSt=t;if(AMA.onStatus)AMA.onStatus(t,bad);const el=document.getElementById('sv');if(el){el.textContent=t;el.className=bad?'bad':''}};
async function api(path,body){if(!BACKEND)return localApi(path,body);let r;try{r=await fetch(path,{method:'POST',headers:{Authorization:'Bearer '+tok()},body:JSON.stringify(body)})}catch(e){return {error:'Cannot reach the server.',network:1}}
 if(r.status===401&&path!=='api/login'){localStorage.removeItem(TK);status('Session expired - please log in again',true);if(window.Admin)Admin.close(true);render();loginModal('Your session expired. Please log in again.')}
 return r.json().catch(()=>({error:'Unexpected reply from the server.'}))}
async function push(){if(saving){again=true;return}saving=true;
 const r=await api('api/content',D);
 if(r&&r.ok){if(r.rev)D.rev=r.rev;status(r.local?'Saved on this device ✓ (not on the live website)':'All changes saved ✓')}else if(r&&r.network){status('Could not save - retrying…',true);setTimeout(push,3000)}else if(r&&!r.expired)status(r.error||'Could not save',true);
 saving=false;if(again){again=false;push()}}
const AMA=window.AMA={E,slug,clean,render,api,tok,logged,removeBlock,
 D:()=>D,backend:()=>BACKEND,
 ch(){status('Saving…');clearTimeout(pt);pt=setTimeout(push,450)},
 logout(){localStorage.removeItem(TK);if(window.Admin)Admin.close(true);render()}};
window.addEventListener('beforeunload',e=>{if(saving||pt&&again){e.preventDefault();e.returnValue=''}});
function normalize(){const S=D.site;const dflt={headerTitle:S.name||'',headerTagline:'',headerShowText:true,headerTitleColor:'#ffffff',headerTaglineColor:'#9db4d6',headerTitleSize:6,headerTaglineSize:1.4,headerTextLeft:16.5,headerTextAlign:'center',logoOffset:8,headerStyle:'banner',headerFont:"'Chomsky'",headerFontFile:'',headerTitleWeight:'Regular',headerTitleItalic:'Normal',headerTitleUnderline:'None',headerTitleCase:'As typed',headerTitleSpacing:1};for(const k in dflt)if(S[k]===undefined)S[k]=dflt[k];['titleFx','taglineFx'].forEach(k=>{S[k]=Object.assign({shadow:'None',shadowColor:'#000000',outline:'None',outlineColor:'#000000',glow:'None',glowColor:'#ffd166',background:''},S[k]||{})});if(!D.tagV){if(!S.headerTagline)S.headerTagline='Independent news, broadcasting & analysis.';D.tagV=1}if(!D.fontsV){if(!S.headerFontFile&&(!S.headerFont||S.headerFont.indexOf('SiteMasthead')>-1))S.headerFont="'Chomsky'";D.fontsV=1}D.home.blocks=(D.home.blocks||[]).map(b=>({type:'bento',anchor:'',...b}));if(S.logo===undefined)S.logo='images/logo.png';if(!S.logoPosition)S.logoPosition='left';if(S.logoSize===undefined)S.logoSize=70;D.pages=(D.pages||[]).map(p=>({parent:'',inMenu:false,...p}))}
let migratedPending=false;
function migrate(){if(D.v>=3)return false;D.v=3;migratedPending=true;
 const OLD=/ahmedabdi\.uk|AMA Studio/g;
 (function rep(o){for(const k in o){const v=o[k];if(k==='slug'||k==='url'||/image|logo|^file$|^src$|font/i.test(k))continue;if(typeof v==='string'){if(!v.startsWith('data:'))o[k]=v.replace(OLD,'The Somaliland Age')}else if(v&&typeof v==='object')rep(v)}})(D);
 Object.assign(D.site,{headerStyle:'banner',headerTextAlign:'center',headerTitleColor:'#ffffff',headerTaglineColor:'#9db4d6',headerTitleSize:6,headerTaglineSize:1.4,headerShowText:true});
 const B={'Trending Now':{enabled:true,count:6,columns:6,style:'tiles'},"Editors' Picks":{enabled:true,count:4,columns:4,style:'tiles'},'More Headlines':{enabled:true,count:9,columns:3,style:'list'}};
 D.home.blocks.forEach(b=>{if(B[b.title]&&(b.type||'bento')==='bento')Object.assign(b,B[b.title])});return true}
async function load(){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),3500);const r=await fetch('api/content',{cache:'no-store',signal:c.signal});clearTimeout(t);
  if(r.ok&&/json/.test(r.headers.get('content-type')||'')){D=await r.json();BACKEND=true;normalize();if(migrate()&&logged())setTimeout(()=>AMA.ch(),600);return}}catch(e){}
 D=JSON.parse(JSON.stringify(window.SITE_DATA));BACKEND=false;const dr=await ldbGet();if(dr&&dr.base===D.rev&&dr.data)D=dr.data;normalize();if(migrate()&&logged())setTimeout(()=>AMA.ch(),600)}
/* ---- helpers ---- */
const href=a=>E(a.url||'#/a/'+encodeURIComponent(a.slug||slug(a.title)));
const bg=a=>a.image?`style="background-image:url('${E(a.image)}')"`:'';
const lk=x=>`<a href="${E(x.url||(x.label==='Home'?'#/':'#/c/'+encodeURIComponent(x.label)))}">${E(x.label)}</a>`;
const F=f=>D.articles.filter(a=>a.flags&&a.flags[f]);
const find=s=>D.articles.find(a=>(a.slug||slug(a.title))===s);
const card=a=>`<a class="c" href="${href(a)}"><div class="im" ${bg(a)}></div><div class="b"><div class="tg">${E(a.category)}</div><div class="t">${E(a.title)}</div><small>${E(a.summary)}</small></div></a>`;
const tile=a=>`<a class="c" href="${href(a)}"><div class="im" ${bg(a)}></div><div class="b"><div class="tg">${E(a.category)}</div><div class="t" style="font-size:14px">${E(a.title)}</div></div></a>`;
const paras=t=>(t||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${E(p)}</p>`).join('');
/* ---- content blocks (text, image, columns, button, video, divider, spacer, anchor, bento) ---- */
const visual=()=>logged()&&localStorage.getItem('ama-vis')!=='0';
let CUR={t:'',arg:''},pendingAnchor='';
const lists=o=>{if(o==='home')return D.home.blocks;const t=o.slice(0,1),s=o.slice(2);
 if(t==='p'){const p=(D.pages||[]).find(x=>x.slug===s);return p?(p.blocks=p.blocks||[]):null}
 if(t==='a'){const a=find(s);return a?(a.blocks=a.blocks||[]):null}return null};
const ownerNow=()=>CUR.t==='a'?'a:'+CUR.arg:CUR.t==='p'?'p:'+CUR.arg:(!CUR.t?'home':null);
function parseVid(u){u=String(u||'');let m;if((m=u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,15})/)))return {k:'yt',id:m[1]};if((m=u.match(/vimeo\.com\/(?:video\/)?(\d{5,12})/)))return {k:'vm',id:m[1]};return null}
function hydrate(root){root.querySelectorAll('.vid').forEach(v=>{if(v.firstChild)return;const d=v.dataset,[rw,rh]=(d.r||'16:9').split(':').map(Number);
 v.style.width=(+d.w||100)+'%';v.style.marginLeft=d.a==='left'?'0':'auto';v.style.marginRight=d.a==='right'?'0':'auto';
 const box=document.createElement('div');box.className='vbox';box.style.paddingTop=(rh/rw*100)+'%';
 if(d.k==='file'){if(!/^(videos\/|data:video\/)/.test(d.src||''))return;const el=document.createElement('video');el.src=d.src;el.preload='metadata';el.playsInline=true;if(d.c!=='0')el.controls=true;if(d.ap==='1'){el.autoplay=true;el.muted=true}if(d.lp==='1')el.loop=true;box.append(el)}
 else{const f=document.createElement('iframe'),id=d.id,q=[];if(d.k==='yt'){q.push('rel=0');if(d.c==='0')q.push('controls=0');if(d.ap==='1')q.push('autoplay=1','mute=1');if(d.lp==='1')q.push('loop=1','playlist='+id);f.src='https://www.youtube-nocookie.com/embed/'+id+'?'+q.join('&')}
  else{if(d.ap==='1')q.push('autoplay=1','muted=1');if(d.lp==='1')q.push('loop=1');f.src='https://player.vimeo.com/video/'+id+(q.length?'?'+q.join('&'):'')}f.loading='lazy';f.allowFullscreen=true;f.title='Video';f.setAttribute('allow','autoplay; picture-in-picture; fullscreen');box.append(f)}
 v.append(box)})}
function bento(b){let L=b.flag?F(b.flag):D.articles;if(b.category)L=L.filter(a=>a.category.toLowerCase()===b.category.toLowerCase());L=L.slice(0,+b.count||99);if(!L.length)return '';
 const inner=b.style==='list'?`<div class="hl" style="--cols:${+b.columns||2}">${L.map((a,i)=>`<a href="${href(a)}"><span>${String(i+1).padStart(2,'0')}</span><div><div class="tg">${E(a.category)}</div><b>${E(a.title)}</b></div></a>`).join('')}</div>`:`<div class="gr" style="--cols:${+b.columns||3}">${L.map(b.style==='cards'?card:tile).join('')}</div>`;
 return `<section class="bx"><h2><span>${E(b.title)}</span>${b.badge?`<span class="bd">${E(b.badge)}</span>`:''}</h2>${inner}</section>`}
const tgt=n=>n?' target="_blank" rel="noopener"':'';
function blockHTML(b,owner,i){const ty=b.type||'bento',v=visual();let h='';
 const ph=t=>v?`<div class="ph">${t}</div>`:'';
 if(ty==='bento')h=b.enabled===false?(v?`<div class="ph">Hidden section: ${E(b.title)} (turned off)</div>`:''):bento(b);
 else if(ty==='text')h=`<div class="cb-text" style="${b.background?'background:'+E(b.background):''}">${b.title?`<h2 class="bt">${E(b.title)}</h2>`:''}<div class="body">${clean(b.html)}</div></div>`;
 else if(ty==='image'){const im=b.image?`<img src="${E(b.image)}" alt="${E(b.alt||'')}" style="width:${+b.width||100}%">`:ph('🖼 Choose an image');
  h=`<figure class="cb-img" style="text-align:${E(b.align||'center')}">${b.link&&b.image?`<a href="${E(b.link)}"${tgt(b.newTab)}>${im}</a>`:im}${b.caption?`<figcaption>${E(b.caption)}</figcaption>`:''}</figure>`}
 else if(ty==='columns'){const cs=b.columns||[];h=`${b.title?`<h2 class="bt">${E(b.title)}</h2>`:''}<div class="cb-cols" style="grid-template-columns:repeat(${Math.max(cs.length,1)},minmax(0,1fr))">${cs.map(c=>{const im=c.image?`<img src="${E(c.image)}" alt="">`:'';return `<div>${c.title?`<h3>${E(c.title)}</h3>`:''}${c.link&&c.image?`<a href="${E(c.link)}">${im}</a>`:im}<div class="body">${clean(c.html)}</div></div>`}).join('')}</div>`}
 else if(ty==='button')h=`<div class="cb-btn ${E(b.variant||'primary')}" style="text-align:${E(b.align||'left')}"><a href="${E(b.url||'#')}"${tgt(b.newTab)}>${E(b.label||'Button')}</a></div>`;
 else if(ty==='video'){const pv=b.file?{k:'file'}:parseVid(b.youtube);h=(pv?`<div class="vid" data-k="${pv.k}"${pv.k==='file'?` data-src="${E(b.file)}"`:` data-id="${pv.id}"`} data-w="${+b.width||100}" data-a="${E(b.align||'center')}" data-r="${E(b.ratio||'16:9')}" data-c="${b.controls===false?0:1}" data-ap="${b.autoplay?1:0}" data-lp="${b.loop?1:0}"></div>`:ph('▶ Add a YouTube link or upload a video'))+(b.caption?`<p class="cap" style="text-align:${E(b.align||'center')}">${E(b.caption)}</p>`:'')}
 else if(ty==='divider')h='<div class="cb-div"><hr></div>';
 else if(ty==='spacer')h=`<div style="height:${+b.height||40}px"></div>`;
 else if(ty==='anchor')h=ph('⚓ Anchor point: '+E(b.name));
 if(!h&&!v)return '';
 const an=ty==='anchor'?b.name:b.anchor;
 return `<div class="blk" data-owner="${E(owner)}" data-bi="${i}"${an?` id="anc-${E(slug(an))}"`:''}>${h}</div>`}
function renderBlocks(L,owner){L=L||[];const z=i=>visual()?`<div class="addz" data-owner="${E(owner)}" data-at="${i}">＋ Add here</div>`:'';
 return L.map((b,i)=>z(i)+blockHTML(b,owner,i)).join('')+z(L.length)}
function mkBlock(type,n){return {
 text:{type:'text',title:'',html:'<p>Write your text here…</p>',background:'',anchor:''},
 image:{type:'image',image:'',alt:'',caption:'',link:'',newTab:false,width:100,align:'center',anchor:''},
 columns:{type:'columns',title:'',columns:Array.from({length:n||2},(_,i)=>({title:'Column '+(i+1),html:'<p>Write here…</p>',image:'',link:''})),anchor:''},
 button:{type:'button',label:'Click here',url:'',newTab:false,variant:'primary',align:'left',anchor:''},
 video:{type:'video',youtube:'',file:'',width:100,align:'center',ratio:'16:9',controls:true,autoplay:false,loop:false,caption:'',anchor:''},divider:{type:'divider'},spacer:{type:'spacer',height:40},anchor:{type:'anchor',name:'my-anchor'},
 bento:{type:'bento',enabled:true,title:'New section',badge:'',flag:'trending',category:'',count:4,columns:4,style:'tiles',anchor:''}}[type]}
function ownerOf(b){const o=['home'];(D.pages||[]).forEach(p=>o.push('p:'+p.slug));D.articles.forEach(a=>o.push('a:'+(a.slug||slug(a.title))));return o.find(x=>{const L=lists(x);return L&&L.includes(b)})}
function removeBlock(b){const o=ownerOf(b);if(!o)return;const L=lists(o);L.splice(L.indexOf(b),1);AMA.ch();render()}
const goAnchor=n=>{const el=document.getElementById('anc-'+slug(n));if(el)el.scrollIntoView({behavior:'smooth',block:'start'})};
function editBlock(b){loadAdmin().then(()=>Admin.editBlock(b)).catch(e=>alert(e.message))}
function blockAction(a,el){const owner=el.dataset.owner,i=+el.dataset.bi,L=lists(owner);if(!L)return;const b=L[i];
 if(a==='edit')return editBlock(b);
 if(a==='up'||a==='down'){const j=i+(a==='up'?-1:1);if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]]}
 else if(a==='dup'){const c=JSON.parse(JSON.stringify(b));delete c.anchor;L.splice(i+1,0,c)}
 else if(a==='del'){if(!confirm('Delete this block?'))return;L.splice(i,1)}
 AMA.ch();render()}
function closePop(){const p=document.getElementById('blkpop');if(p)p.remove()}
function showPop(x,y,owner,at){closePop();const p=document.createElement('div');p.id='blkpop';
 const L=owner?lists(owner):null,prev=L&&L[at-1];
 const add=(type,n)=>()=>{const b=mkBlock(type,n);L.splice(at,0,b);AMA.ch();render();editBlock(b)};
 const rows=!L?[['ℹ️','Blocks can be added on the home page, articles and pages.',()=>{location.hash='#/'}]]:[
  ['📝','Text',add('text')],['🖼','Image',add('image')],['▥','2 columns',add('columns',2)],['▥','3 columns',add('columns',3)],['▥','4 columns',add('columns',4)],
  ...(prev&&prev.type==='columns'?[['➕','Add a column to the block above',()=>{prev.columns.push({title:'Column '+(prev.columns.length+1),html:'<p>Write here…</p>',image:'',link:''});AMA.ch();render();editBlock(prev)}]]:[]),
  ['🧱','Bento (article section)',add('bento')],['🔘','Button',add('button')],['▶','Video',add('video')],['➖','Divider',add('divider')],['↕','Spacer',add('spacer')],['⚓','Anchor point',add('anchor')]];
 rows.push(['📰','New article…',()=>loadAdmin().then(()=>Admin.open('editor'))],['📄','New page…',()=>loadAdmin().then(()=>Admin.open('pageeditor'))],['⚙','Open dashboard',()=>openAdmin('articles')]);
 p.innerHTML='<div class="pt">Add to this spot</div>';
 rows.forEach(([ic,l,f])=>{const b=document.createElement('button');b.innerHTML=`<span>${ic}</span> ${l}`;b.onclick=e=>{e.stopPropagation();closePop();f()};p.append(b)});
 document.body.append(p);p.style.left=Math.max(8,Math.min(x,innerWidth-p.offsetWidth-8))+'px';p.style.top=Math.max(8,Math.min(y,innerHeight-p.offsetHeight-8))+'px'}
function decorate(){const v=visual();document.body.classList.toggle('editing',v);if(!v)return;
 document.querySelectorAll('.blk').forEach(el=>{const b=document.createElement('div');b.className='btb';b.innerHTML='<button data-a="edit">✎ Edit</button><button data-a="up" title="Move up">↑</button><button data-a="down" title="Move down">↓</button><button data-a="dup" title="Duplicate">⧉</button><button data-a="del" title="Delete">🗑</button>';el.append(b)});}
const emptySpot=t=>t===document.documentElement||t===document.body||t.id==='app'||t.id==='main'||['g','mid','below'].some(c=>t.classList&&t.classList.contains(c));
document.addEventListener('click',e=>{const t=e.target;
 const an=t.closest('a[href^="#~"]');if(an){e.preventDefault();goAnchor(an.getAttribute('href').slice(2));return}
 if(!logged())return;
 const tg=t.closest('#vt');if(tg){localStorage.setItem('ama-vis',visual()?'0':'1');render();return}
 const hb=t.closest('#hdtb button');if(hb){e.preventDefault();e.stopPropagation();closeHdTb();if(hb.dataset.a==='e')loadAdmin().then(()=>Admin.editHeader()).catch(er=>alert(er.message));else openAdmin('site');return}
 if(!t.closest('#hdtb'))closeHdTb();
 if(visual()&&t.closest('#hd')){e.preventDefault();const tx=t.closest('.ht1,.ht2');if(tx)showHdTb(tx);return}
 const bt=t.closest('.btb button');if(bt){e.preventDefault();e.stopPropagation();blockAction(bt.dataset.a,bt.closest('.blk'));return}
 if(!visual()||t.closest('#blkpop'))return;closePop();
 let owner=ownerNow(),at=null;const z=t.closest('.addz');
 if(z){owner=z.dataset.owner;at=+z.dataset.at}
 else if(emptySpot(t)){const L=owner?lists(owner):[];at=L.length;for(const el of document.querySelectorAll('.blk')){if(el.getBoundingClientRect().top>e.clientY){at=+el.dataset.bi;break}}}
 else return;
 showPop(e.clientX,e.clientY,owner,at)});
function closeHdTb(){const x=document.getElementById('hdtb');if(x)x.remove()}
function showHdTb(el){closeHdTb();closePop();const r=el.getBoundingClientRect(),d=document.createElement('div');d.id='hdtb';d.innerHTML='<button data-a="e">✎ Edit title &amp; tagline</button><button data-a="s">⚙ Header settings</button>';
 d.style.left=Math.max(8,Math.min(r.left+scrollX,innerWidth-300))+'px';d.style.top=(r.top<56?r.bottom+scrollY+8:r.top+scrollY-46)+'px';document.body.append(d)}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePop();closeHdTb()}});
/* ---- page views ---- */
function home(){const hero=F('hero'),M=D.home;
 return {mid:`${hero.length?`<div class="sl">${hero.map(a=>`<a class="sd" href="${href(a)}" ${bg(a)}><div class="tg">${E(a.category)}</div><h2>${E(a.title)}</h2><p>${E(a.summary)}</p></a>`).join('')}<button class="ar" style="left:12px" data-d="-1" aria-label="Previous">‹</button><button class="ar" style="right:12px" data-d="1" aria-label="Next">›</button><div class="dots">${hero.map(()=>'<b></b>').join('')}</div></div>`:''}
 ${D.promo.enabled?`<div class="pr"><div><b>${E(D.promo.title)}</b><small>${E(D.promo.text)}</small></div><a class="btn" href="${E(D.promo.url)}">${E(D.promo.button)}</a></div>`:''}
 ${M.showHeroCards?`<div class="cs" style="--cols:${+M.heroCardColumns||3}">${F('card').map(card).join('')}</div>`:''}`,below:`<div class="below">${renderBlocks(M.blocks,'home')}</div>`}}
function article(s){const a=find(s);if(!a)return {mid:'<div class="art"><h1>Article not found</h1><p><a href="#/">Back to home</a></p></div>'};
 const rel=D.articles.filter(x=>x!==a&&x.category===a.category).slice(0,4);
 return {title:a.title,mid:`<article class="art"><div class="tg">${E(a.category)}</div><h1>${E(a.title)}</h1><p class="dk">${E(a.summary)}</p>${a.image?`<img class="aimg" src="${E(a.image)}" alt="${E(a.title)}">`:''}<div class="body">${clean(a.body)}</div>${logged()?`<p><button class="ea" data-edit="${E(a.slug||slug(a.title))}">✏️ Edit this article</button></p>`:''}</article>${renderBlocks(a.blocks,'a:'+(a.slug||slug(a.title)))}${rel.length?`<section class="bx"><h2><span>More in ${E(a.category)}</span></h2><div class="gr">${rel.map(tile).join('')}</div></section>`:''}`}}
function section(c){const L=D.articles.filter(a=>a.category.toLowerCase()===c.toLowerCase());
 return {title:c,mid:`<section class="bx"><h2><span>${E(c)}</span></h2>${L.length?`<div class="cs">${L.map(card).join('')}</div>`:'<p>No articles in this section yet.</p>'}</section>`}}
function search(q){const t=q.toLowerCase(),L=D.articles.filter(a=>[a.title,a.summary,a.category,(a.body||'').replace(/<[^>]*>/g,' ')].join(' ').toLowerCase().includes(t));
 return {title:'Search',mid:`<section class="bx"><h2><span>Search: ${E(q)}</span></h2>${L.length?`<div class="cs">${L.map(card).join('')}</div>`:'<p>No articles found.</p>'}</section>`}}
function pg(s){const P=D.pages||[],p=P.find(x=>x.slug===s);if(!p)return {mid:'<div class="art"><h1>Page not found</h1><p><a href="#/">Back to home</a></p></div>'};
 const par=p.parent?P.find(x=>x.slug===p.parent):null,ks=P.filter(k=>k.parent===p.slug);
 const html=/<[a-z][\s\S]*>/i.test(p.body||'')?clean(p.body):paras(p.body);
 return {title:p.title,mid:`<article class="art">${par?`<div class="crumb"><a href="#/p/${E(par.slug)}">${E(par.title)}</a> ›</div>`:''}<h1>${E(p.title)}</h1><div class="body">${html}</div>${ks.length?`<h3>In this section</h3><ul class="sub">${ks.map(k=>`<li><a href="#/p/${E(k.slug)}">${E(k.title)}</a></li>`).join('')}</ul>`:''}</article>${renderBlocks(p.blocks,'p:'+p.slug)}`}}
function view(){const raw=location.hash.replace(/^#\/?/,''),pa=raw.split('~'),[t,...r]=pa[0].split('/');pendingAnchor=pa.slice(1).join('~');let arg='';try{arg=decodeURIComponent(r.join('/'))}catch(e){}
 CUR={t:t||'',arg};
 if(t==='a')return article(arg);if(t==='c')return section(arg);if(t==='p')return pg(arg);if(t==='s')return search(arg);return home()}
/* ---- site name (header title) style: only affects the title ---- */
function titleCss(S){const W={Light:300,Regular:400,Medium:500,'Semi-bold':600,Bold:700,'Extra-bold':800},U={Underline:'underline',Overline:'overline',Strikethrough:'line-through'},C={UPPERCASE:'uppercase',lowercase:'lowercase',Capitalize:'capitalize'};
 return 'font-weight:'+(W[S.headerTitleWeight]||400)+';font-style:'+(S.headerTitleItalic==='Italic'?'italic':'normal')+';text-decoration:'+(U[S.headerTitleUnderline]||'none')+';text-transform:'+(C[S.headerTitleCase]||'none')+';letter-spacing:'+((+S.headerTitleSpacing||0)/100)+'em'}
function fxCss(f,ctr){f=f||{};const r=n=>+n.toFixed(3),col=(c,d)=>/^#[0-9a-f]{3,8}$/i.test(c||'')?c:d,L={Soft:1,Medium:2,Strong:3},sh=L[f.shadow],gl=L[f.glow],ol={Thin:1,Medium:2,Thick:3}[f.outline],s=[];
 if(sh)s.push(r(sh*.035)+'em '+r(sh*.045)+'em '+r(sh*.05)+'em '+col(f.shadowColor,'#000000'));
 if(gl){const c=col(f.glowColor,'#ffd166');s.push('0 0 '+r(gl*.12)+'em '+c,'0 0 '+r(gl*.3)+'em '+c)}
 let o='text-shadow:'+(s.join(',')||'none')+';'+(ol?'-webkit-text-stroke:'+r(ol*.02)+'em '+col(f.outlineColor,'#000000')+';paint-order:stroke fill':'-webkit-text-stroke:0');
 const bg=col(f.background,'');if(bg)o+=';background:'+bg+';padding:.08em .35em;border-radius:.12em;display:block;width:fit-content;margin-left:'+(ctr?'auto':'0')+';margin-right:'+(ctr?'auto':'0');return o}
/* ---- render ---- */
function render(){if(!D)return;
 const S=D.site,Fo=D.footer,R=document.documentElement.style;
 R.setProperty('--p',S.colors.primary);R.setProperty('--a',S.colors.accent);R.setProperty('--m',S.colors.menu);R.setProperty('--f',S.font||'Arial, Helvetica, sans-serif');
 const v=view();document.title=(v.title?v.title+' | ':'')+S.name;
 const date=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
 const n=(Fo.columns||[]).length||1,al=Fo.align||'left',bgc=E(Fo.backgroundColor);
 const wave=Fo.showWave?`<svg viewBox="0 0 1440 80" preserveAspectRatio="none" style="display:block;width:100%;height:${+Fo.waveHeight||60}px;margin-bottom:-1px;fill:${bgc}"><path d="M0,45 C220,90 460,0 720,35 C980,70 1200,75 1440,15 L1440,80 L0,80Z"/></svg>`:'';
 const cols=(Fo.columns||[]).map(c=>`<div>${c.title?`<h4>${E(c.title)}</h4>`:''}${c.text?`<div class="fm">${E(c.text)}</div>`:''}${(c.links||[]).map(lk).join('')}</div>`).join('');
 const foot=`<footer class="ft" style="margin-top:50px;color:${E(Fo.textColor)};--fl:${E(Fo.linkColor)};--fm:${E(Fo.mutedColor)}">${wave}<div class="fb" style="background:${bgc};text-align:${al}"><div class="fg" style="grid-template-columns:${al==='left'?'1.6fr '+'1fr '.repeat(n-1):'repeat('+n+',1fr)'}">${cols}</div><div class="cp"><span>${E(Fo.copyright)}</span>${Fo.note?`<small>${E(Fo.note)}</small>`:''}</div></div></footer>`;
 const M=D.home||{},lc=M.showAllArticles,rc=M.showInDepth;
 const left=lc?`<aside class="pn"><h3>${E(D.labels.allArticles)}</h3><div class="al">${D.articles.map(a=>`<a class="it" href="${href(a)}"><div class="tg">${E(a.category)}</div><span>${E(a.title)}</span></a>`).join('')}</div></aside>`:'';
 const right=rc?`<aside class="pn"><h3>${E(D.labels.inDepth)}</h3>${F('inDepth').map(a=>`<a class="dp" href="${href(a)}"><div class="im" ${bg(a)}></div><div><div class="tg">${E(a.category)}</div><div class="t">${E(a.title)}</div></div></a>`).join('')}</aside>`:'';
 const body=`<div class="g" style="grid-template-columns:${lc?'240px ':''}minmax(0,1fr)${rc?' 300px':''}">${left}<main class="mid">${v.mid}</main>${right}</div>${v.below||''}`;
 const mast=S.headerStyle!=='banner',hf=(S.headerFontFile?"'SiteMastheadCustom',":'')+(S.headerFont||"'SiteMasthead'")+',serif';
 R.setProperty('--hf',hf);let fs=document.getElementById('hfstyle');if(!fs){fs=document.createElement('style');fs.id='hfstyle';document.head.append(fs)}fs.textContent=S.headerFontFile?`@font-face{font-family:'SiteMastheadCustom';src:url('${S.headerFontFile.replace(/'/g,'')}');font-display:swap}`:'';
 const mode=S.loginButton||'auto',showLogin=logged()||mode==='show'||(mode==='auto'&&isLocal());
 const PG=D.pages||[],navPages=PG.filter(p=>!p.parent&&p.inMenu).map(p=>{const ks=PG.filter(k=>k.parent===p.slug&&k.inMenu);const a=`<a href="#/p/${E(p.slug)}">${E(p.title)}</a>`;return ks.length?`<div class="dd">${a}<button class="ddb" aria-label="Show sub-pages">▾</button><div class="ddm">${ks.map(k=>`<a href="#/p/${E(k.slug)}">${E(k.title)}</a>`).join('')}</div></div>`:a}).join('');
 const tk=D.ticker.map(x=>`<i>${E(x.tag)}</i>${x.url?`<a href="${E(x.url)}">${E(x.text)}</a>`:`<span>${E(x.text)}</span>`}`).join('');
 app.innerHTML=`<div class="top"><span>${date}</span><span class="tr2"><span style="color:#ff4d5e">●</span> <span>${E(S.liveLabel)}</span>${D.topLinks.map(x=>`<a href="${E(x.url)}">${E(x.label)}</a>`).join('')}<input id="q" type="search" placeholder="Search articles…" aria-label="Search"></span></div>
 <a id="hd" class="${mast?'mast':'bnr'}" href="#/" data-img="site.headerImage">${mast?'':`<img src="${E(S.headerImage)}" alt="${E(S.headerAlt)}">`}${S.logo&&S.logoPosition!=='hidden'?`<img class="hlogo ${E(S.logoPosition)}" src="${E(S.logo)}" style="height:${+S.logoSize||70}%;${S.logoPosition==='right'?'right':'left'}:${S.logoPosition==='center'?50:+S.logoOffset}%" alt="">`:''}${S.headerShowText?`<div class="htxt"${mast?'':(S.headerTextAlign==='left'?` style="left:${+S.headerTextLeft}%"`:' style="left:50%;transform:translate(-50%,-50%);text-align:center"')}><div class="ht1" style="color:${mast&&/^#fff(fff)?$/i.test(S.headerTitleColor)?'#000000':E(S.headerTitleColor)};font-size:${+S.headerTitleSize}vw;font-size:${+S.headerTitleSize}cqw;${titleCss(S)};${fxCss(S.titleFx,mast||S.headerTextAlign!=='left')}">${E(S.headerTitle)}</div>${S.headerTagline||visual()?`<div class="ht2" data-ph="Click to add a tagline" style="color:${mast&&/^#9db4d6$/i.test(S.headerTaglineColor)?'#444444':E(S.headerTaglineColor)};font-size:${+S.headerTaglineSize}vw;font-size:${+S.headerTaglineSize}cqw;${fxCss(S.taglineFx,mast||S.headerTextAlign!=='left')}">${E(S.headerTagline)}</div>`:''}</div>`:''}</a>


 <nav><button class="hb" aria-label="Menu" aria-expanded="false"><span>☰</span> Menu</button><div class="nl">${D.menu.map(lk).join('')}${navPages}</div></nav>
 <div class="tick"><b>${E(D.ticker[0]?.tag||'')}</b><div class="tw"><div class="tr">${tk}${tk}</div></div></div>
 ${body}${foot}${logged()?`<div id="sv">${E(lastSt)}</div><button class="lg2" id="vt">✏️ Visual editing: ${visual()?'ON':'OFF'}</button>`:''}${showLogin?`<a class="lg" href="#/login">${logged()?'Dashboard':E(S.loginLabel)}</a>`:''}`;
 hydrate(app);decorate();
 const sl=[...document.querySelectorAll('.sd')],dt=[...document.querySelectorAll('.dots b')];let i=0;
 const go=k=>{if(!sl.length)return;i=(k+sl.length)%sl.length;sl.forEach((s,j)=>s.classList.toggle('on',j===i));dt.forEach((d,j)=>d.classList.toggle('on',j===i))};
 document.querySelectorAll('.ar').forEach(b=>b.onclick=e=>{e.preventDefault();go(i+ +b.dataset.d)});dt.forEach((d,k)=>d.onclick=()=>go(k));
 clearInterval(window.__si);go(0);if(sl.length>1)window.__si=setInterval(()=>go(i+1),5500);
 const nv=document.querySelector('nav'),hb=nv.querySelector('.hb');hb.onclick=()=>{const o=nv.classList.toggle('open');hb.setAttribute('aria-expanded',o);hb.firstChild.textContent=o?'✕':'☰'};
 document.querySelectorAll('.ddb').forEach(b=>b.onclick=e=>{e.preventDefault();b.parentElement.classList.toggle('open')});
 if(S.logo){let ic=document.querySelector('link[rel=icon]');if(!ic){ic=document.createElement('link');ic.rel='icon';document.head.append(ic)}ic.href=S.logo}
 const q=document.getElementById('q');q.onkeydown=e=>{if(e.key==='Enter'&&q.value.trim())location.hash='#/s/'+encodeURIComponent(q.value.trim())};
 const cp=document.querySelector('.cp span');if(cp){let n=0,t0=0;cp.onclick=()=>{const now=Date.now();n=now-t0>2000?1:n+1;t0=now;if(n>=5){n=0;location.hash='#/login'}}}
 const ea=document.querySelector('.ea');if(ea)ea.onclick=()=>openAdmin('editor',ea.dataset.edit);
}
/* ---- login + dashboard loader ---- */
function loadAdmin(){return window.Admin?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='admin.js';s.onload=ok;s.onerror=()=>no(new Error('admin.js not found'));document.head.append(s)})}
function openAdmin(tab,arg){loadAdmin().then(()=>Admin.open(tab,arg)).catch(e=>alert(e.message))}
function loginModal(msg){if(document.getElementById('lm'))return;const m=document.createElement('div');m.id='lm';
 m.innerHTML=`<form class="lgc"><h1>Log in</h1><label>Username</label><input name="u" autocomplete="username" required><label>Password</label><input name="p" type="password" autocomplete="current-password" required><button>Log in</button><button type="button" class="cl">Cancel</button><div id="lerr"></div></form>`;
 document.body.append(m);const f=m.firstChild,err=document.getElementById('lerr');err.textContent=msg||'';f.u.focus();
 if(!BACKEND){f.insertAdjacentHTML('beforeend','<p class="offl">Offline mode: no server needed. Your changes are saved in this browser. <a href="#" id="rst">Forgot your login? Reset to admin / admin123</a></p>');document.getElementById('rst').onclick=e=>{e.preventDefault();if(confirm('Reset the offline login to admin / admin123?')){localStorage.removeItem(LA);err.textContent='Reset. Log in with admin / admin123.'}}}
 else f.insertAdjacentHTML('beforeend','<p class="offl">Forgot your login? See "Reset your login" in the README.</p>');
 m.querySelector('.cl').onclick=()=>m.remove();
 f.onsubmit=async e=>{e.preventDefault();err.textContent='';
  const r=await api('api/login',{user:f.u.value,password:f.p.value});
  if(r.token){localStorage.setItem(TK,r.token);if(migratedPending){migratedPending=false;setTimeout(()=>AMA.ch(),300)}m.remove();render();openAdmin('articles')}else err.textContent=r.error||'Login failed'}}
function route(){if(!D)return;closePop();if(location.hash==='#/login'){history.replaceState(null,'',location.pathname+location.search+'#/');if(logged()&&BACKEND)openAdmin('articles');else loginModal()}render();if(pendingAnchor)setTimeout(()=>goAnchor(pendingAnchor),80)}
window.addEventListener('hashchange',()=>{route();scrollTo(0,0)});
document.addEventListener('click',e=>{const a=e.target.closest('a.lg');if(a&&logged()){e.preventDefault();openAdmin('articles')}});
load().then(route);
})();
