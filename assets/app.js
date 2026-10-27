/* Petition.africa core: storage, demo data, phone sign-in, petitions, signatures, leaders, shared UI.
   Needs geo/index.js and leaders.js loaded first. */
(function(){
'use strict';
const CG=window.CG={};
const DB_KEY='pa_db_v1',SESSION_KEY='pa_session',ADMIN_KEY='pa_admin',COUNTRY_KEY='pa_country',NAV_KEY='pa_nav';
const ADMIN_PASSWORD='petitionafrica';
const mem={};
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return mem[k]??null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){mem[k]=v;return false}},del(k){try{localStorage.removeItem(k)}catch(e){delete mem[k]}}};
CG.ls=ls;
CG.GEO=window.CG_GEOINDEX;CG.L=window.CG_LEADERS;
CG.COUNTRIES={};Object.keys(CG.GEO).sort((a,b)=>CG.GEO[a].name.localeCompare(CG.GEO[b].name)).forEach(k=>CG.COUNTRIES[k]=CG.GEO[k].name);
CG.SITE='petition.africa';
const DIAL={NG:'+234',GH:'+233',KE:'+254',ZA:'+27',UG:'+256',TZ:'+255',ET:'+251',EG:'+20',MA:'+212',SN:'+221',CM:'+237',CI:'+225',RW:'+250',ZM:'+260',ZW:'+263'};
CG.dial=cc=>DIAL[cc]||'';
CG.CATS=['Roads & transport','Water & sanitation','Health','Education','Electricity','Security','Jobs & economy','Environment','Housing','Accountability','Rights & justice','Other'];

/* ---------- utils ---------- */
const esc=CG.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
CG.fmt=n=>Number(n||0).toLocaleString('en-GB');
CG.short=n=>n>=1e6?(n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,'')+'M':n>=1e4?Math.round(n/1e3)+'K':n>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,'')+'K':String(n);
CG.uid=p=>(p||'id')+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
CG.date=t=>new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
CG.ago=t=>{const s=(Date.now()-t)/1000;if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';const d=Math.floor(s/86400);return d<30?d+' d ago':CG.date(t)};
CG.$=(s,r)=>(r||document).querySelector(s);CG.$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const rng=CG.rng=seed=>{let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}};
const hash=CG.hash=str=>{let h=2166136261;for(const c of String(str)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

/* ---------- geography ---------- */
const areaIdx={};
for(const cc in CG.GEO){const g=CG.GEO[cc];g.adm1.forEach(([id,n])=>areaIdx[id]={id,name:n,level:1,cc});g.adm2.forEach(([id,n,p])=>areaIdx[id]={id,name:n,level:2,cc,parent:p})}
CG.area=id=>areaIdx[id]||null;
CG.areaName=id=>areaIdx[id]?areaIdx[id].name:'';
CG.place=(cc,a1,a2)=>[a2&&CG.areaName(a2),a1&&CG.areaName(a1),cc&&CG.COUNTRIES[cc]].filter(Boolean).join(', ');
CG.adm1List=cc=>CG.GEO[cc].adm1.map(([id,name])=>({id,name}));
CG.adm2List=(cc,p)=>CG.GEO[cc].adm2.filter(a=>!p||a[2]===p).map(([id,name,parent])=>({id,name,parent}));
CG.geoCache={};
const base=()=>(document.querySelector('script[src*="assets/app.js"]')?.getAttribute('src')||'assets/app.js').replace('app.js','');
CG.loadGeo=cc=>{if(window.CG_GEO&&window.CG_GEO[cc])return Promise.resolve(window.CG_GEO[cc]);if(CG.geoCache[cc])return CG.geoCache[cc];
  return CG.geoCache[cc]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=base()+'geo/'+cc.toLowerCase()+'.js';s.onload=()=>res(window.CG_GEO[cc]);s.onerror=()=>{delete CG.geoCache[cc];rej(new Error('Could not load map data for '+CG.COUNTRIES[cc]))};document.head.appendChild(s)})};

/* ---------- leaders ---------- */
CG.leader=id=>{ // id: country code, adm1 id or adm2 id -> {title,name,src,verified}
  const D=CG.db();const ov=(D.leaders||{})[id];
  if(CG.GEO[id]){const h=CG.L.heads[id];const base={title:h[0],name:h[1],src:'Verified '+CG.L.verified,level:0};
    if(h[2])base.gov={title:h[2],name:h[3]};return ov?{...base,...ov,src:'Updated '+CG.date(ov.at)}:base}
  const a=CG.area(id);if(!a)return null;const g=CG.GEO[a.cc];
  let title=a.level===1?g.o1:g.o2,name='',src='';
  if(a.level===1){const sub=CG.L.sub[a.cc];const v=sub&&sub.map[a.name];if(v){if(Array.isArray(v)){title=v[0];name=v[1]}else name=v;src=sub.src}}
  if(ov)return{title:ov.title||title,name:ov.name,src:'Updated '+CG.date(ov.at)+(ov.src?' · '+ov.src:''),level:a.level};
  if(!title)return{title:'',name:'',src:'',level:a.level};
  return{title:title+(a.level===2&&g.l2?', '+a.name:''),office:title,name,src,level:a.level};
};
CG.AU={title:'Chairperson, African Union Commission',name:'Mahmoud Ali Youssouf'};
CG.suggestTarget=(scope,cc,a1,a2)=>{
  if(scope==='africa')return{...CG.AU};
  if(scope==='country'&&cc){const l=CG.leader(cc);return l.gov&&/Prime Minister|Head of Government/.test(l.gov.title)?{title:l.gov.title+' of '+CG.COUNTRIES[cc],name:l.gov.name}:{title:l.title+' of '+CG.COUNTRIES[cc],name:l.name}}
  if(scope==='state'&&a1){const l=CG.leader(a1);return{title:(l.title||'Leader')+', '+CG.areaName(a1),name:l.name||''}}
  if(scope==='local'&&a2){const l=CG.leader(a2);return{title:l.title||('Local authority, '+CG.areaName(a2)),name:l.name||''}}
  if(scope==='local'&&a1){const l=CG.leader(a1);return{title:(l.title||'Leader')+', '+CG.areaName(a1),name:l.name||''}}
  return{title:'',name:''}};

/* ---------- demo data ---------- */
const DAY=864e5,HOUR=36e5;
function seed(){
  const now=Date.now();
  const A1=(cc,n)=>{const x=CG.GEO[cc].adm1.find(a=>a[1]===n);return x?x[0]:''};
  const A2=(cc,a1,n)=>{const x=CG.GEO[cc].adm2.find(a=>a[2]===a1&&a[1]===n);return x?x[0]:''};
  const P=(o)=>Object.assign({status:'open',signs:[],views:0,shares:0,updates:[],image:null,creatorId:'demo',demo:true,reports:0},o);
  const lag=A1('NG','Lagos'),kan=A1('NG','Kano'),oyo=A1('NG','Oyo'),riv=A1('NG','Rivers'),acc=A1('GH','Greater Accra'),ash=A1('GH','Ashanti'),nai=A1('KE','Nairobi'),msa=A1('KE','Mombasa'),gau=A1('ZA','Gauteng'),wc=A1('ZA','Western Cape');
  const ps=[
    P({id:'p_lekki',title:'Fix the collapsed drainage on Lekki-Epe Expressway before the rains',short:'Every rainy season the expressway floods and traders lose stock.',category:'Roads & transport',scope:'local',country:'NG',adm1:lag,adm2:A2('NG',lag,'Eti Osa'),target:{title:'Executive Governor, Lagos State',name:'Babajide Sanwo-Olu'},base:48210,recent:6120,goal:75000,created:now-9*DAY,featured:true}),
    P({id:'p_kano_pumps',title:'Restore water supply to Dala and Fagge communities',short:'Public taps have been dry for four months.',category:'Water & sanitation',scope:'local',country:'NG',adm1:kan,adm2:A2('NG',kan,'Dala'),target:{title:'Governor, Kano',name:'Abba Kabir Yusuf'},base:21340,recent:3980,goal:30000,created:now-6*DAY}),
    P({id:'p_nepa',title:'Publish a feeder-by-feeder electricity supply schedule for Nigeria',short:'Customers pay Band A tariffs without the hours to match.',category:'Electricity',scope:'country',country:'NG',target:{title:'President of Nigeria',name:'Bola Ahmed Tinubu'},base:132870,recent:9400,goal:200000,created:now-18*DAY}),
    P({id:'p_ph_soot',title:'End the black soot pollution in Port Harcourt',short:'Families breathe soot from illegal refining every day.',category:'Environment',scope:'state',country:'NG',adm1:riv,target:{title:'Governor, Rivers',name:'Siminalayi Fubara'},base:39880,recent:1210,goal:50000,created:now-40*DAY}),
    P({id:'p_accra_flood',title:'Desilt the Odaw drain before the next flood season',short:'Kaneshie and Circle flood every June.',category:'Environment',scope:'local',country:'GH',adm1:acc,adm2:A2('GH',acc,'Accra Metropolis'),target:{title:'Regional Minister, Greater Accra',name:'Linda Ocloo'},base:17660,recent:2870,goal:25000,created:now-5*DAY}),
    P({id:'p_kumasi_market',title:'Rebuild the Kejetia market stalls lost in the fire',short:'Hundreds of traders still have nowhere to sell.',category:'Jobs & economy',scope:'state',country:'GH',adm1:ash,target:{title:'Regional Minister, Ashanti',name:'Frank Amoakohene'},base:9120,recent:640,goal:15000,created:now-22*DAY}),
    P({id:'p_nai_waste',title:'Weekly waste collection for every ward in Nairobi',short:'Rubbish piles up for weeks in informal settlements.',category:'Environment',scope:'state',country:'KE',adm1:nai,target:{title:'Governor, Nairobi',name:'Johnson Sakaja'},base:28450,recent:4410,goal:40000,created:now-8*DAY}),
    P({id:'p_msa_ferry',title:'Add a second Likoni ferry during rush hour',short:'Commuters wait over an hour in dangerous crowds.',category:'Roads & transport',scope:'state',country:'KE',adm1:msa,target:{title:'Governor, Mombasa',name:'Abdulswamad Shariff Nassir'},base:12780,recent:2150,goal:20000,created:now-4*DAY}),
    P({id:'p_za_gbv',title:'Fund 24-hour GBV desks at every police station in Gauteng',short:'Survivors are turned away at night.',category:'Rights & justice',scope:'state',country:'ZA',adm1:gau,target:{title:'Premier, Gauteng',name:'Panyaza Lesufi'},base:56300,recent:3300,goal:80000,created:now-15*DAY}),
    P({id:'p_ct_water',title:'Freeze water tariff hikes for pensioners in Cape Town',short:'Pensioners on fixed incomes cannot keep up.',category:'Water & sanitation',scope:'state',country:'ZA',adm1:wc,target:{title:'Premier, Western Cape',name:'Alan Winde'},base:7340,recent:520,goal:15000,created:now-27*DAY}),
    P({id:'p_roaming',title:'Scrap mobile roaming charges across Africa',short:'Calling a neighbour country costs more than calling Europe.',category:'Jobs & economy',scope:'africa',target:{...CG.AU},base:204500,recent:12800,goal:500000,created:now-35*DAY}),
    P({id:'p_visa',title:'Visa-free travel for all African passport holders',short:'Africans need visas for most of their own continent.',category:'Rights & justice',scope:'africa',target:{...CG.AU},base:318900,recent:8100,goal:1000000,created:now-60*DAY}),
    P({id:'p_ug_schools',title:'Stop extra fees in Uganda’s free government schools',short:'Parents are asked for "development fees" every term.',category:'Education',scope:'country',country:'UG',target:{title:'President of Uganda',name:'Yoweri Museveni'},base:15440,recent:1980,goal:25000,created:now-12*DAY}),
    P({id:'p_sn_fish',title:'Protect Senegal’s fishing waters from foreign trawlers',short:'Local fishers are losing their catch and their jobs.',category:'Jobs & economy',scope:'country',country:'SN',target:{title:'President of Senegal',name:'Bassirou Diomaye Faye'},base:22900,recent:1400,goal:30000,created:now-20*DAY}),
    P({id:'p_bodija',title:'Restore power to Bodija market',short:'Traders went three months without electricity.',category:'Electricity',scope:'local',country:'NG',adm1:oyo,adm2:A2('NG',oyo,'Ibadan North'),target:{title:'Governor, Oyo',name:'Seyi Makinde'},base:6120,recent:0,goal:6000,created:now-80*DAY,status:'victory',outcome:'The transformer was replaced and power restored to all stalls.',wonAt:now-40*DAY}),
    P({id:'p_ke_fees',title:'Reverse the university fee hike for continuing students',short:'Students faced a sudden fee increase mid-course.',category:'Education',scope:'country',country:'KE',target:{title:'President of Kenya',name:'William Ruto'},base:88400,recent:0,goal:80000,created:now-120*DAY,status:'victory',outcome:'Continuing students kept their original fees after the ministry reviewed the policy.',wonAt:now-70*DAY}),
    P({id:'p_gh_ambulance',title:'Station a working ambulance in every district',short:'Patients wait hours for transport to hospital.',category:'Health',scope:'country',country:'GH',target:{title:'President of Ghana',name:'John Dramani Mahama'},base:31200,recent:0,goal:30000,created:now-150*DAY,status:'victory',outcome:'The government announced ambulances for every district and published the rollout list.',wonAt:now-95*DAY}),
    P({id:'p_lag_bus',title:'Run evening BRT buses until 11pm for shift workers',short:'Night workers have no safe way home.',category:'Roads & transport',scope:'state',country:'NG',adm1:lag,target:{title:'Executive Governor, Lagos State',name:'Babajide Sanwo-Olu'},base:0,recent:0,goal:5000,created:now-3*HOUR,status:'pending'})
  ];
  const writer=window.CGWriter;
  ps.forEach(p=>{p.body=writer?writer.write({title:p.title,short:p.short,category:p.category,scope:p.scope,country:p.country,adm1:p.adm1,adm2:p.adm2,target:p.target},0):p.short;
    p.views=Math.round(p.base*2.6);p.shares=Math.round(p.base*.07);
    if(p.status==='open'&&p.id==='p_kano_pumps')p.updates=[{at:now-2*DAY,text:'Petition delivered to the Kano State Water Board. They have agreed to a meeting.'}];
    if(p.id==='p_nai_waste')p.updates=[{at:now-1*DAY,text:'County officials agreed to pilot weekly collection in Kibra and Mathare.'}];});
  return{version:1,seededAt:now,petitions:ps,users:[],leaders:{},reports:[],activity:[{at:now-3*HOUR,text:'New petition submitted: "Run evening BRT buses until 11pm"'},{at:now-40*DAY,text:'Victory: Bodija market power restored'}]};
}

/* demo signature geography: generated from each petition's base count, never stored */
const HUBS={'Lagos':5,'Kano':3,'Federal Capital Territory':2.5,'Rivers':2.5,'Oyo':2.2,'Greater Accra':4,'Ashanti':3,'Nairobi':4,'Mombasa':2,'Gauteng':5,'Western Cape':3,'KwaZulu-Natal':3};
const CW={NG:10,EG:6,ET:5,CD:4,ZA:5,KE:5,TZ:3,UG:3,GH:4,DZ:2,MA:3,SD:2,AO:2,MZ:1.5,CM:2,CI:2,SN:1.5,ZM:1.5,ZW:1.5,RW:1};
function areaWeights(cc,a1){const g=CG.GEO[cc];const r=rng(hash(cc+(a1||'')));
  if(g.adm2.length){return g.adm2.filter(a=>!a1||a[2]===a1).map(a=>[a[2],a[0],(HUBS[CG.areaName(a[2])]||1)*(.4+r()*1.4)])}
  return g.adm1.filter(a=>!a1||a[0]===a1).map(a=>[a[0],'',(HUBS[a[1]]||1)*(.4+r()*1.4)])}
function spread(out,n,list){let t=0;for(const x of list)t+=x[2];if(!t)return;let left=n;
  list.forEach((x,i)=>{const k=i===list.length-1?left:Math.round(n*x[2]/t);if(k<=0)return;left-=k;const key=x[0]+'|'+x[1];out[key]=(out[key]||0)+k})}
function demoGeo(p){const out={};const n=p.base||0;if(!n)return out;
  if(p.scope==='africa'){const ccs=Object.keys(CG.GEO);let t=0;const w=ccs.map(c=>{const v=(CW[c]||.6)*(.6+rng(hash(p.id+c))()*.8);t+=v;return[c,v]});
    w.forEach(([c,v])=>{const k=Math.round(n*v/t);if(k>0)spread(out,k,areaWeights(c))});return out}
  if(p.scope==='country'){spread(out,n,areaWeights(p.country));return out}
  if(p.scope==='state'){spread(out,Math.round(n*.88),areaWeights(p.country,p.adm1));spread(out,n-Math.round(n*.88),areaWeights(p.country));return out}
  // local
  const own=p.adm2?Math.round(n*.62):0;if(own)out[p.adm1+'|'+p.adm2]=own;
  spread(out,Math.round(n*.28),areaWeights(p.country,p.adm1));spread(out,n-own-Math.round(n*.28),areaWeights(p.country));return out}

/* ---------- store ---------- */
let db=null;
CG.db=()=>{if(db)return db;const raw=ls.get(DB_KEY);if(raw){try{db=JSON.parse(raw)}catch(e){db=null}}
  if(!db){db=seed();CG.save()}
  db.leaders=db.leaders||{};db.reports=db.reports||[];
  return db};
CG.save=()=>{const ok=ls.set(DB_KEY,JSON.stringify(db));if(!ok)CG.toast&&CG.toast('Storage is full. Remove a photo or reset demo data in admin.');CG._sig=null;return ok};
CG.resetDemo=()=>{db=seed();CG.save()};
CG.log=t=>{const D=CG.db();D.activity.unshift({at:Date.now(),text:t});D.activity=D.activity.slice(0,200);CG.save()};
CG.pet=id=>CG.db().petitions.find(p=>p.id===id);

/* ---------- signatures ---------- */
CG.count=p=>(p.base||0)+p.signs.length;
CG.recentCount=p=>(p.recent||0)+p.signs.filter(s=>s.at>Date.now()-7*DAY).length;
CG.live=p=>p.status==='open'||p.status==='victory';
CG.attention=p=>{if(p.status!=='open')return 0;const age=(Date.now()-p.created)/HOUR;
  return (CG.recentCount(p)*1+(p.shares||0)*.6+(p.views||0)*.04)/Math.pow(age/24+2,.6)};
CG.trending=(cc)=>CG.db().petitions.filter(p=>p.status==='open'&&(!cc||p.country===cc||p.scope==='africa')).sort((a,b)=>CG.attention(b)-CG.attention(a));
/* signature index: key 'cc' | adm1 | adm2 -> count */
CG.sigIndex=()=>{if(CG._sig)return CG._sig;const idx={};const add=(k,n)=>{if(k)idx[k]=(idx[k]||0)+n};
  for(const p of CG.db().petitions){if(!CG.live(p))continue;const g=demoGeo(p);
    for(const key in g){const [a1,a2]=key.split('|');const n=g[key];add(a1.slice(0,2),n);add(a1,n);add(a2,n)}
    for(const s of p.signs){add(s.country,1);add(s.adm1,1);add(s.adm2,1)}}
  return CG._sig=idx};
CG.petGeo=p=>{const g=demoGeo(p),idx={};const add=(k,n)=>{if(k)idx[k]=(idx[k]||0)+n};for(const key in g){const [a1,a2]=key.split('|');add(a1.slice(0,2),g[key]);add(a1,g[key]);add(a2,g[key])}
  for(const s of p.signs){add(s.country,1);add(s.adm1,1);add(s.adm2,1)}return idx};
CG.petsIn=id=>{const lvl=CG.GEO[id]?0:CG.area(id)?.level;return CG.db().petitions.filter(p=>CG.live(p)&&(lvl===0?p.country===id:lvl===1?p.adm1===id:p.adm2===id))};

/* ---------- session ---------- */
CG.user=()=>{const id=ls.get(SESSION_KEY);return id?CG.db().users.find(u=>u.id===id)||null:null};
CG.signOut=()=>{ls.del(SESSION_KEY);location.reload()};
CG.isAdmin=()=>ls.get(ADMIN_KEY)==='1';CG.adminLogin=pw=>{if(pw===ADMIN_PASSWORD){ls.set(ADMIN_KEY,'1');return true}return false};CG.adminLogout=()=>ls.del(ADMIN_KEY);
CG.country=()=>{const c=ls.get(COUNTRY_KEY);return CG.GEO[c]?c:'NG'};CG.setCountry=c=>ls.set(COUNTRY_KEY,c);
CG.go=(href,params)=>{try{sessionStorage.setItem(NAV_KEY,JSON.stringify(params||{}))}catch(e){mem[NAV_KEY]=JSON.stringify(params||{})}location.href=href+(params&&params.id?'#'+params.id:'')};
CG.params=()=>{let p={};try{p=JSON.parse(sessionStorage.getItem(NAV_KEY)||'{}')}catch(e){try{p=JSON.parse(mem[NAV_KEY]||'{}')}catch(_){}}
  const q=new URLSearchParams(location.search);q.forEach((v,k)=>p[k]=v);const h=location.hash.slice(1);if(h&&!p.id)p.id=h;if(h&&CG.pet&&CG.db().petitions.some(x=>x.id===h))p.id=h;return p};

/* ---------- toast & modal ---------- */
CG.toast=msg=>{let t=CG.$('#cgToast');if(!t){t=document.createElement('div');t.id='cgToast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2800)};
CG.modal=(html,opts)=>{opts=opts||{};let bg=CG.$('#cgModal');if(!bg){bg=document.createElement('div');bg.id='cgModal';bg.className='modal-bg';bg.innerHTML='<div class="modal" role="dialog" aria-modal="true"></div>';document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)CG.closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')CG.closeModal()})}
  const m=bg.firstChild;m.className='modal'+(opts.wide?' wide':'');m.innerHTML=html;bg.classList.add('open');CG.$$('[data-close]',m).forEach(b=>b.onclick=CG.closeModal);
  setTimeout(()=>{const f=m.querySelector('input,select,textarea');f&&f.focus()},30);return m};
CG.closeModal=()=>{const bg=CG.$('#cgModal');bg&&bg.classList.remove('open')};
CG.confirm=(title,text,yes,onYes)=>{const m=CG.modal(`<div class="modal-head"><div><div class="eyebrow">Please confirm</div><h2>${esc(title)}</h2></div><button class="close" data-close>Close</button></div><p style="font-size:13px">${esc(text)}</p><p style="display:flex;gap:8px"><button class="btn danger" id="cfYes">${esc(yes)}</button><button class="btn outline" data-close>Cancel</button></p>`);CG.$('#cfYes',m).onclick=()=>{CG.closeModal();onYes()}};
CG.copy=(text,el)=>{(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(()=>CG.toast('Copied'),()=>{if(el){el.select();CG.toast('Press Ctrl+C to copy')}else CG.toast('Copy is blocked here')})};
CG.copyBox=(title,text)=>{const m=CG.modal(`<div class="modal-head"><div><div class="eyebrow">Export</div><h2>${esc(title)}</h2></div><button class="close" data-close>Close</button></div><textarea id="cpText" readonly style="width:100%;height:300px;font:11px monospace;padding:10px;border:1px solid #ccc">${esc(text)}</textarea><p style="margin-top:10px"><button class="btn" id="cpCopy">Copy to clipboard</button></p>`,{wide:true});CG.$('#cpCopy',m).onclick=()=>CG.copy(text,CG.$('#cpText',m))};

/* ---------- pickers ---------- */
CG.countryOptions=sel=>Object.entries(CG.COUNTRIES).map(([k,v])=>`<option value="${k}" ${k===sel?'selected':''}>${esc(v)}</option>`).join('');
CG.locationPicker=(el,init,opts)=>{init=init||{};opts=opts||{};const p=opts.prefix||'loc';
  el.innerHTML=`<div class="form-grid three"><div class="field"><label for="${p}C">Country</label><select id="${p}C">${CG.countryOptions(init.country||CG.country())}</select></div>
  <div class="field" id="${p}1w"><label for="${p}1" id="${p}1l">State</label><select id="${p}1"></select></div><div class="field" id="${p}2w"><label for="${p}2" id="${p}2l">LGA</label><select id="${p}2"></select></div></div>`;
  const c=CG.$('#'+p+'C',el),s1=CG.$('#'+p+'1',el),s2=CG.$('#'+p+'2',el);
  const f1=()=>{const g=CG.GEO[c.value];CG.$('#'+p+'1l',el).textContent=g.l1;s1.innerHTML=`<option value="">${opts.optional?'Any':'Choose'} ${g.l1.toLowerCase()}</option>`+CG.adm1List(c.value).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');
    CG.$('#'+p+'1w',el).hidden=opts.levels<1;f2();ready&&opts.onChange&&opts.onChange()};
  const f2=()=>{const g=CG.GEO[c.value];const has=!!g.l2&&opts.levels!==1&&opts.levels!==0;CG.$('#'+p+'2w',el).hidden=!has;if(!has){s2.innerHTML='';return}
    CG.$('#'+p+'2l',el).textContent=g.l2;s2.innerHTML=`<option value="">${s1.value?(opts.optional?'Any ':'Choose ')+g.l2:'Choose '+g.l1.toLowerCase()+' first'}</option>`+(s1.value?CG.adm2List(c.value,s1.value).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join(''):'');s2.disabled=!s1.value};
  let ready=false;f1();if(init.adm1){s1.value=init.adm1;f2();if(init.adm2)s2.value=init.adm2}ready=true;
  c.onchange=f1;s1.onchange=()=>{f2();opts.onChange&&opts.onChange()};s2.onchange=()=>opts.onChange&&opts.onChange();
  return{get:()=>({country:c.value,adm1:s1.value,adm2:s2.value}),set(levels){opts.levels=levels;f1()}}};

/* ---------- phone sign-in ---------- */
CG.openSignIn=(after,why)=>{
  const cc=CG.country();
  const m=CG.modal(`<div class="modal-head"><div><div class="eyebrow">${esc(why||'Sign in')}</div><h2>Continue with your phone.</h2></div><button class="close" data-close>Close</button></div>
  <form id="siForm"><div class="form-grid"><div class="field"><label for="siC">Country</label><select id="siC">${CG.countryOptions(cc)}</select></div><div class="field"><label for="siPhone">Phone number</label><div style="display:flex"><span id="siDial" style="border:1px solid #ccc;border-right:0;padding:11px 9px;font-size:12px;background:var(--soft)">${CG.dial(cc)||'+'}</span><input id="siPhone" inputmode="tel" required placeholder="801 234 5678" autocomplete="tel-national"></div></div></div>
  <div class="field"><label for="siName">Your name</label><input id="siName" required maxlength="40" placeholder="Shown as first name only" autocomplete="given-name"></div>
  <div id="siOtpW" hidden><div class="notice">Demo mode: your code is <b id="siCode"></b>. A live site sends this by SMS.</div><div class="field"><label for="siOtp">6-digit code</label><input id="siOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div></div>
  <button class="btn" type="submit" id="siGo">Send code</button><div id="siErr" class="smallnote" style="color:var(--danger)"></div>
  <p class="smallnote">One account per phone number. We never show your number publicly.</p></form>`);
  const ccSel=CG.$('#siC',m);ccSel.onchange=()=>CG.$('#siDial',m).textContent=CG.dial(ccSel.value)||'+';
  let code=null;
  CG.$('#siPhone',m).addEventListener('blur',()=>{const ph=norm();const u=CG.db().users.find(x=>x.phone===ph);if(u)CG.$('#siName',m).value=u.name});
  const norm=()=>(CG.dial(ccSel.value)||'')+CG.$('#siPhone',m).value.replace(/\D/g,'').replace(/^0/,'');
  CG.$('#siForm',m).onsubmit=e=>{e.preventDefault();const err=CG.$('#siErr',m);err.textContent='';
    const digits=CG.$('#siPhone',m).value.replace(/\D/g,'');if(digits.length<7||digits.length>12){err.textContent='Enter a valid phone number.';return}
    if(!code){code=String(100000+Math.floor(Math.random()*899999));CG.$('#siCode',m).textContent=code;CG.$('#siOtpW',m).hidden=false;CG.$('#siGo',m).textContent='Verify and continue';CG.$('#siOtp',m).focus();return}
    if(CG.$('#siOtp',m).value.trim()!==code){err.textContent='That code is wrong. Check it and try again.';return}
    const D=CG.db(),ph=norm();let u=D.users.find(x=>x.phone===ph);
    if(u&&u.status==='suspended'){err.textContent='This account is suspended.';return}
    if(!u){u={id:CG.uid('u'),phone:ph,name:CG.$('#siName',m).value.trim(),country:ccSel.value,adm1:'',adm2:'',joined:Date.now(),status:'active'};D.users.push(u);CG.log('New supporter joined from '+CG.COUNTRIES[u.country])}
    else u.name=CG.$('#siName',m).value.trim()||u.name;
    CG.save();ls.set(SESSION_KEY,u.id);CG.setCountry(u.country);CG.closeModal();CG.toast('Signed in as '+u.name);
    if(after)after(u);else setTimeout(()=>location.reload(),400)};
};
CG.requireUser=(fn,why)=>{const u=CG.user();if(u)fn(u);else CG.openSignIn(fn,why)};

/* ---------- sign a petition ---------- */
CG.sign=(id,info,cb)=>{CG.requireUser(u=>{const p=CG.pet(id);if(!p||p.status!=='open'){CG.toast('This petition is not open for signatures');return}
  if(p.signs.some(s=>s.uid===u.id)){CG.toast('You have already signed this petition');cb&&cb(false);return}
  const loc=info&&info.adm1?info:{country:u.country,adm1:u.adm1,adm2:u.adm2};
  if(info&&info.adm1){const uu=CG.db().users.find(x=>x.id===u.id);if(!uu.adm1){Object.assign(uu,{country:info.country,adm1:info.adm1,adm2:info.adm2})}}
  p.signs.push({uid:u.id,name:u.name.split(' ')[0],at:Date.now(),country:loc.country||u.country,adm1:loc.adm1||'',adm2:loc.adm2||'',comment:(info&&info.comment||'').slice(0,280),public:info?info.public!==false:true});
  CG.log(`Signature on "${p.title}"`);CG.save();cb&&cb(true)},'Sign this petition')};
CG.shareUrl=p=>'https://'+CG.SITE+'/p/'+p.id.replace(/^p_/,'');
CG.shareText=p=>`${p.title}\n\n${CG.fmt(CG.count(p))} people have signed. Add your name:\n${CG.shareUrl(p)}`;
CG.track=(p,k)=>{p[k]=(p[k]||0)+1;CG.save()};

/* ---------- moderation ---------- */
const BAD=/\b(kill|burn (them|down)|lynch|behead|bomb|shoot (him|her|them)|exterminate|cockroach(es)?|rape)\b/i;
CG.screen=t=>{if(BAD.test(t))return'Contains language that may incite violence';if(/(\+?\d[\d\s-]{8,}\d)/.test(t))return'Contains a phone number';if(/[\w.+-]+@[\w-]+\.[\w.]+/.test(t))return'Contains an email address';return''};

/* ---------- art ---------- */
CG.art=(s,dark)=>{const r=rng(hash(s));const fg=dark===false?'#111':'#fff',bg=dark===false?'#f1f1ed':'#151515';let o=`<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="225" fill="${bg}"/>`;
  for(let i=0;i<12;i++){const y=12+i*18;o+=`<path d="M0 ${y} C ${100+r()*60} ${y-26+r()*52}, ${240+r()*60} ${y-26+r()*52}, 400 ${y+r()*20-10}" fill="none" stroke="${fg}" stroke-opacity="${.07+r()*.22}" stroke-width="${.6+r()*1.1}"/>`}
  for(let i=0;i<4;i++)o+=`<circle cx="${40+r()*320}" cy="${25+r()*175}" r="${3+r()*5}" fill="${i?fg:'#d7ff3f'}" fill-opacity="${i?.55:1}"/>`;return o+'</svg>'};
CG.img=p=>p.image?`<img src="${p.image}" alt="">`:CG.art(p.id);

/* ---------- petition card ---------- */
CG.scopeLabel=p=>p.scope==='africa'?'All of Africa':p.scope==='country'?CG.COUNTRIES[p.country]:p.scope==='state'?CG.place(p.country,p.adm1):CG.place(p.country,p.adm1,p.adm2);
CG.card=(p,rank)=>{const c=CG.count(p),wk=CG.recentCount(p);
  return `<a class="pcard" href="petition.html#${p.id}" data-pet="${p.id}"><div class="pimg">${rank?`<span class="rank">#${rank} trending</span>`:''}${p.status==='victory'?'<span class="rank">Victory</span>':''}${CG.img(p)}</div>
  <div class="pbody"><div class="chips"><span class="chip">${esc(CG.scopeLabel(p))}</span></div><h3>${esc(p.title)}</h3><p>To: ${esc(p.target.name?p.target.name+', ':'')}${esc(p.target.title)}</p>
  <div class="pfoot"><span><strong>${CG.fmt(c)}</strong>signatures</span>${p.status==='victory'?'<span class="chip lime">Won</span>':wk?`<span class="hot">+${CG.short(wk)} this week</span>`:''}</div></div></a>`};
document.addEventListener('click',e=>{const a=e.target.closest('a[data-pet]');if(a&&!e.ctrlKey&&!e.metaKey){e.preventDefault();CG.go('petition.html',{id:a.dataset.pet})}});

/* ---------- header & footer ---------- */
const NAV=[['browse.html','Browse','browse'],['map.html','Map','map'],['browse.html#victories','Victories','victories'],['account.html','My petitions','account']];
CG.renderChrome=()=>{const page=document.body.dataset.page;const u=CG.user();const h=CG.$('#siteHeader');
  if(h){h.outerHTML=`<div class="topline"></div><header class="site"><div class="wrap nav"><a href="index.html" class="brand">PETITION<em>.</em>AFRICA</a>
  <nav class="navlinks" id="navlinks" aria-label="Main">${NAV.map(([href,label,key])=>`<a href="${href}" class="${key===page?'current':''}">${label}</a>`).join('')}<a href="start.html" class="btn small" style="color:var(--paper);border-bottom:0">Start a petition</a></nav>
  <div class="navright">${u?`<a class="btn outline small" id="signInBtn" href="account.html">${esc(u.name.split(' ')[0])}</a>`:'<button class="btn outline small" id="signInBtn">Sign in</button>'}
  <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="drawer" aria-label="Open menu"><span class="burger"><i></i><i></i><i></i></span></button></div></div></header>
  <div class="drawer-bg" id="drawerBg"></div>
  <aside class="drawer" id="drawer" aria-label="Menu" aria-hidden="true">
    <div class="drawer-top"><a href="index.html" class="brand">PETITION<em>.</em>AFRICA</a><button class="drawer-x" id="drawerX" aria-label="Close menu">✕</button></div>
    <nav class="drawer-nav">${[['index.html','Home','home'],...NAV].map(([href,label,key],i)=>`<a href="${href}" class="${key===page?'current':''}" style="--i:${i}"><span>${String(i+1).padStart(2,'0')}</span>${label}</a>`).join('')}</nav>
    <div class="drawer-foot" style="--i:6"><a href="start.html" class="btn accent">Start a petition ↗</a>${u?`<a href="account.html" class="drawer-user">Signed in as <b>${esc(u.name)}</b></a>`:'<button class="btn st-ghost" id="drawerSignIn">Sign in</button>'}<p>Petitions for all 54 African countries.</p></div>
  </aside>`;
    if(!u){CG.$('#signInBtn').onclick=()=>CG.openSignIn();CG.$('#drawerSignIn').onclick=()=>{close();setTimeout(()=>CG.openSignIn(),300)}}
    const btn=CG.$('#menuBtn'),dr=CG.$('#drawer'),bg=CG.$('#drawerBg');
    const open=()=>{document.body.classList.add('drawer-open');dr.setAttribute('aria-hidden','false');btn.setAttribute('aria-expanded','true');setTimeout(()=>CG.$('#drawerX').focus(),50)};
    const close=()=>{if(!document.body.classList.contains('drawer-open'))return;document.body.classList.remove('drawer-open');dr.setAttribute('aria-hidden','true');btn.setAttribute('aria-expanded','false');btn.focus()};
    btn.onclick=open;CG.$('#drawerX').onclick=close;bg.onclick=close;
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    dr.querySelectorAll('.drawer-nav a').forEach(a=>a.addEventListener('click',()=>close()));
    // swipe left to close
    let sx=null;dr.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});dr.addEventListener('touchmove',e=>{if(sx==null)return;const dx=Math.min(0,e.touches[0].clientX-sx);dr.style.transform=`translateX(${dx}px)`;dr.style.transition='none'},{passive:true});
    dr.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;dr.style.transform='';dr.style.transition='';sx=null;if(dx<-70)close()})}
  const f=CG.$('#siteFooter');
  if(f)f.outerHTML=`<footer class="site"><div class="wrap footer-row"><div><a href="index.html" class="brand">PETITION<em>.</em>AFRICA</a><p>Start, sign and win petitions in all 54 African countries. Boundaries from geoBoundaries (CC BY). Leader names verified ${esc(CG.L.verified)}. Signature counts on this prototype include demonstration data.</p></div>
  <div class="footlinks"><a href="start.html">Start a petition</a><a href="browse.html">Browse</a><a href="map.html">Map</a><a href="about.html">Guidelines &amp; privacy</a><a href="admin.html">Admin</a></div></div></footer>`};
document.addEventListener('DOMContentLoaded',()=>{CG.db();CG.renderChrome()});
})();
