/* Petition.africa map: continent -> country -> state/region -> local area. Pure SVG, Mercator, bundled data.
   new CGMap(el,{values(level,state)->{data:{id:n},label,fmt}, onChange(state,map), tip(id,level)->html, lock:'NG'}) */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const RAMP=['#ecece6','#cfcfc8','#a8a8a0','#7a7a73','#4b4b47','#1f1f1d'],NODATA='#fafaf7';
const my=lat=>{const r=Math.max(-80,Math.min(80,lat))*Math.PI/180;return Math.log(Math.tan(Math.PI/4+r/2))*180/Math.PI};
const S=100; // projected units per degree
function decode(rings){let d='';for(const poly of rings)for(const r of poly){let x=r[0],y=r[1];d+='M'+(x/1000*S).toFixed(1)+' '+(-my(y/1000)*S).toFixed(1);
  for(let i=2;i<r.length;i+=2){x+=r[i];y+=r[i+1];d+='L'+(x/1000*S).toFixed(1)+' '+(-my(y/1000)*S).toFixed(1)}d+='Z'}return d}
const P=(lon,lat)=>[lon*S,-my(lat)*S];
class CGMap{
  constructor(el,o){this.el=el;this.o=o||{};this.st={cc:null,adm1:null,adm2:null};this.cache={};this.byId={};
    el.classList.add('map-frame');
    el.innerHTML=`<div class="mapcaption"><span class="eyebrow" data-r="lvl"></span><strong data-r="title"></strong><span data-r="sub"></span></div>
    <div class="maptools"><button type="button" data-a="in" aria-label="Zoom in">+</button><button type="button" data-a="out" aria-label="Zoom out">−</button><button type="button" data-a="fit" aria-label="Fit">⤢</button><button type="button" data-a="up" aria-label="Up one level">↑</button></div>
    <svg role="img" aria-label="Map"><g data-l="ctx"></g><g data-l="areas"></g><g data-l="outline"></g><g data-l="labels"></g></svg>
    <div class="legend"><div data-r="lt" style="font-weight:800"></div><div class="ramp">${RAMP.map(c=>`<i style="background:${c}"></i>`).join('')}</div><div class="ends"><span data-r="lo"></span><span data-r="hi"></span></div></div>
    <div class="maptip hidden"></div><div class="maploading hidden">Loading map…</div>`;
    this.svg=el.querySelector('svg');this.L={};el.querySelectorAll('[data-l]').forEach(g=>this.L[g.dataset.l]=g);this.R={};el.querySelectorAll('[data-r]').forEach(n=>this.R[n.dataset.r]=n);
    this.tip=el.querySelector('.maptip');this.loading=el.querySelector('.maploading');
    el.querySelector('.maptools').onclick=e=>{const a=e.target.closest('button')?.dataset.a;if(a==='in')this.zoomBy(.6);else if(a==='out')this.zoomBy(1/.6);else if(a==='fit')this.fit();else if(a==='up')this.up()};
    window.CG_AFRICA.forEach(c=>this.byId[c.id]={...c,cont:true});
    this._pz();new ResizeObserver(()=>this.vb&&this._apply()).observe(el)}
  path(id){if(this.cache[id])return this.cache[id];const f=this.byId[id];return this.cache[id]=decode(f.c)}
  box(b,pad){const [x0,y1]=P(b[0],b[1]),[x1,y0]=P(b[2],b[3]);const w=x1-x0,h=y1-y0,p=pad??.06;return[x0-w*p,y0-h*p,w*(1+2*p),h*(1+2*p)]}
  async open(cc,a1,a2,instant){
    if(!cc){this.st={cc:null,adm1:null,adm2:null};this._render(instant);return}
    if(!this.geo||this.geo.code!==cc){this.loading.classList.remove('hidden');try{this.geo=await CG.loadGeo(cc)}catch(e){this.loading.textContent=e.message;return}this.loading.classList.add('hidden');
      this.geo.adm1.forEach(a=>this.byId[a.id]=a);this.geo.adm2.forEach(a=>this.byId[a.id]=a)}
    const A2=a2&&this.byId[a2]?a2:null;let A1=a1&&this.byId[a1]?a1:null;if(A2)A1=this.byId[A2].p;
    this.st={cc,adm1:A1,adm2:A2};this._render(instant)}
  showAfrica(){this.open(null)}
  click(id,ctx){const f=this.byId[id];if(!f)return;
    if(f.cont){if(this.o.lock&&id!==this.o.lock)return;this.open(id);return}
    if(!f.p){ // adm1
      if(!this.geo.adm2.length||!this.geo.adm2.some(x=>x.p===id)){this.st.adm1=null;this.st.adm2=null;this.st.sel=this.st.sel===id?null:id;this._hl();this._emit();return}
      this.open(this.st.cc,id);return}
    this.st.adm2=this.st.adm2===id?null:id;this._hl();this._zoomSel();this._emit()}
  up(){const s=this.st;if(s.adm2){s.adm2=null;this._hl();this.fit();this._emit()}else if(s.adm1){this.open(s.cc)}else if(s.sel){s.sel=null;this._hl();this._emit()}else if(s.cc&&!this.o.lock)this.open(null)}
  refresh(){this._colour();this._emit()}
  level(){return !this.st.cc?0:this.st.adm1?2:1}
  _render(instant){const s=this.st,ctx=this.L.ctx,ar=this.L.areas,ol=this.L.outline;ctx.innerHTML='';ar.innerHTML='';ol.innerHTML='';
    const mk=(id,cls,par)=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',this.path(id));p.setAttribute('class',cls);p.dataset.id=id;par.appendChild(p);return p};
    let target;
    if(!s.cc){window.CG_AFRICA.forEach(c=>mk(c.id,'area',ar));const b=[-26,-36,58,38];target=this.box(b,.02)}
    else if(!s.adm1){if(!this.o.lock)window.CG_AFRICA.forEach(c=>{if(c.id!==s.cc)mk(c.id,'ctx',ctx)});this.geo.adm1.forEach(a=>mk(a.id,'area',ar));target=this.box(this.geo.bbox,.05)}
    else{this.geo.adm1.forEach(a=>{if(a.id!==s.adm1)mk(a.id,'ctx',ctx)});this.geo.adm2.forEach(a=>{if(a.p===s.adm1)mk(a.id,'area',ar)});mk(s.adm1,'focus-outline',ol);target=this.box(this.byId[s.adm1].b)}
    this.home=target;this._colour();this._hl();if(s.adm2)this._zoomSel(instant);else this._to(target,instant||!this.vb);this._emit()}
  _colour(){const v=this.o.values?this.o.values(this.level(),this.st):{data:{}};this.cur=v;const vals=Object.values(v.data).filter(x=>x!=null&&x>0);
    let lo=0,hi=Math.max(1,...vals);const f=v.fmt||(x=>CG.fmt(Math.round(x)));
    const sq=x=>Math.sqrt(x/hi); // sqrt scale: counts are skewed
    this.L.areas.querySelectorAll('path').forEach(p=>{const x=v.data[p.dataset.id];p.style.fill=!x?NODATA:RAMP[Math.min(RAMP.length-1,Math.floor(sq(x)*RAMP.length))]});
    this.R.lt.textContent=v.label||'';this.R.lo.textContent=f(lo);this.R.hi.textContent=f(hi)}
  _hl(){const sel=this.st.adm2||this.st.sel;this.L.areas.querySelectorAll('path').forEach(p=>p.classList.toggle('sel',p.dataset.id===sel));const e=this.L.areas.querySelector('.sel');if(e)this.L.areas.appendChild(e)}
  _zoomSel(instant){const s=this.st;if(!s.adm2){this._to(this.home,instant);return}const st=this.box(this.byId[s.adm1].b,0),lg=this.box(this.byId[s.adm2].b,0);
    if(lg[2]*lg[3]>st[2]*st[3]*.05){this._to(this.home,instant);return}const cx=lg[0]+lg[2]/2,cy=lg[1]+lg[3]/2,w=Math.max(lg[2]*4,st[2]*.22),h=Math.max(lg[3]*4,st[3]*.22);this._to([cx-w/2,cy-h/2,w,h],instant)}
  _emit(){const s=this.st;const g=this.geo;let lvl,title,sub;
    if(!s.cc){lvl='Africa · 54 countries';title='Africa';sub='Click a country to drill down'}
    else if(!s.adm1){lvl='Country · '+g.adm1.length+' '+g.l1p.toLowerCase();title=g.name;sub=s.sel?this.byId[s.sel].n:'Click a '+g.l1.toLowerCase()+(g.l2?' to see its '+g.l2p.toLowerCase():'')}
    else{lvl=s.adm2?g.l2:g.l1+' · '+this.byId[s.adm1].k+' '+g.l2p.toLowerCase();title=s.adm2?this.byId[s.adm2].n:this.byId[s.adm1].n;sub=s.adm2?this.byId[s.adm1].n+', '+g.name:'Click a '+g.l2.toLowerCase()+' for detail'}
    this.R.lvl.textContent=lvl;this.R.title.textContent=title;this.R.sub.textContent=sub;this.svg.setAttribute('aria-label','Map of '+title);
    this.o.onChange&&this.o.onChange({...s},this)}
  fit(){this._to(this.home)}
  zoomBy(f,cx,cy){const v=this.vb;cx=cx??v[0]+v[2]/2;cy=cy??v[1]+v[3]/2;if(f>1&&v[2]*f>12000)return;if(f<1&&v[2]*f<3)return;this._to([cx-(cx-v[0])*f,cy-(cy-v[1])*f,v[2]*f,v[3]*f],false,180)}
  _to(t,instant,dur){cancelAnimationFrame(this._raf);if(instant||!this.vb||matchMedia('(prefers-reduced-motion: reduce)').matches){this.vb=t.slice();this._apply();this._labels();return}
    const f=this.vb.slice(),t0=performance.now(),D=dur||450;const step=n=>{let p=Math.min(1,(n-t0)/D);p=1-Math.pow(1-p,3);this.vb=f.map((x,i)=>x+(t[i]-x)*p);this._apply();if(p<1)this._raf=requestAnimationFrame(step);else this._labels()};this._raf=requestAnimationFrame(step)}
  _apply(){this.svg.setAttribute('viewBox',this.vb.map(x=>x.toFixed(1)).join(' '))}
  _scale(){const r=this.svg.getBoundingClientRect();return Math.min(r.width/this.vb[2],r.height/this.vb[3])||1}
  _labels(){const L=this.L.labels;L.innerHTML='';const s=this.st,sc=this._scale();if(!sc||sc===1&&!this.svg.getBoundingClientRect().width)return;
    const items=!s.cc?window.CG_AFRICA:s.adm1?this.geo.adm2.filter(a=>a.p===s.adm1):this.geo.adm1;const fpx=!s.cc?10:s.adm1?10:11;const placed=[];const vb=this.vb;
    for(const a of items.slice().sort((x,y)=>y.a-x.a)){const [x,y]=P(a.l[0],a.l[1]);if(x<vb[0]||x>vb[0]+vb[2]||y<vb[1]||y>vb[1]+vb[3])continue;
      const bw=(a.b[2]-a.b[0])*S*sc;const tw=a.n.length*fpx*.58;if(bw<tw*.7&&a.id!==s.adm2)continue;
      const bx=[x*sc-tw/2,y*sc-fpx/2,x*sc+tw/2,y*sc+fpx/2];if(placed.some(p=>!(bx[2]<p[0]||bx[0]>p[2]||bx[3]<p[1]||bx[1]>p[3])))continue;placed.push(bx);
      const t=document.createElementNS(NS,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('font-size',fpx/sc);t.textContent=a.n;L.appendChild(t)}}
  _pz(){const svg=this.svg;let drag=null,moved=false;const pts=new Map();
    const toSvg=(cx,cy)=>{const r=svg.getBoundingClientRect(),sc=this._scale();const ox=(r.width-this.vb[2]*sc)/2,oy=(r.height-this.vb[3]*sc)/2;return[this.vb[0]+(cx-r.left-ox)/sc,this.vb[1]+(cy-r.top-oy)/sc]};
    svg.addEventListener('wheel',e=>{if(!this.vb)return;e.preventDefault();const [x,y]=toSvg(e.clientX,e.clientY);this.zoomBy(e.deltaY>0?1.25:.8,x,y)},{passive:false});
    svg.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);drag={x:e.clientX,y:e.clientY,vb:this.vb.slice(),d:null};moved=false;if(pts.size===2){const [a,b]=[...pts.values()];drag.d=Math.hypot(a[0]-b[0],a[1]-b[1])}});
    svg.addEventListener('pointermove',e=>{if(!drag||!pts.has(e.pointerId)){this._hover(e);return}pts.set(e.pointerId,[e.clientX,e.clientY]);const sc=this._scale();
      if(pts.size===2&&drag.d){const [a,b]=[...pts.values()];const f=drag.d/Math.hypot(a[0]-b[0],a[1]-b[1]);const v=drag.vb,cx=v[0]+v[2]/2,cy=v[1]+v[3]/2;this.vb=[cx-v[2]*f/2,cy-v[3]*f/2,v[2]*f,v[3]*f];this._apply();moved=true;return}
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4){moved=true;svg.classList.add('dragging');try{svg.setPointerCapture(e.pointerId)}catch(_){}}
      if(moved){this.vb=[drag.vb[0]-dx/sc,drag.vb[1]-dy/sc,drag.vb[2],drag.vb[3]];this._apply();this.tip.classList.add('hidden')}});
    const end=e=>{pts.delete(e.pointerId);if(pts.size)return;svg.classList.remove('dragging');if(drag&&moved)this._labels();
      else if(drag&&e.type==='pointerup'){const t=document.elementFromPoint(e.clientX,e.clientY);const id=t&&t.dataset&&t.dataset.id;if(id&&t.closest('svg')===svg&&!t.classList.contains('focus-outline'))this.click(id,t.classList.contains('ctx'))}drag=null};
    svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('pointerleave',()=>this.tip.classList.add('hidden'))}
  _hover(e){const t=e.target;const id=t.dataset&&t.dataset.id;if(!id||t.classList.contains('focus-outline')){this.tip.classList.add('hidden');return}
    const f=this.byId[id];const v=this.cur&&this.cur.data?this.cur.data[id]:null;const fm=(this.cur&&this.cur.fmt)||(x=>CG.fmt(x));
    const lvl=f.cont?'Country':f.p?this.geo.l2:this.geo.l1;const leaderId=f.cont?id:id;const L=CG.leader(leaderId);
    let ldr='';if(L&&L.title)ldr=`<span class="ldr">${CG.esc(f.cont?L.title:(L.office||L.title.split(',')[0]))}: ${CG.esc(L.name||'not yet listed')}</span>`;
    if(f.cont&&L&&L.gov)ldr+=`<span class="ldr">${CG.esc(L.gov.title)}: ${CG.esc(L.gov.name)}</span>`;
    const r=this.el.getBoundingClientRect();const ctx=t.classList.contains('ctx');
    this.tip.innerHTML=`<b>${CG.esc(f.n)}</b><small>${lvl}${f.p?' · '+CG.esc(this.byId[f.p].n):''}${ctx?' · click to open':''}</small>${ldr}${!ctx?`<small>${CG.esc(this.cur?.label||'')}: ${v?fm(v):'none yet'}</small>`:''}`;
    this.tip.classList.remove('hidden');let x=e.clientX-r.left,y=e.clientY-r.top;if(x>r.width-240)x-=250;if(y>r.height-110)y-=110;this.tip.style.left=x+'px';this.tip.style.top=y+'px'}
}
window.CGMap=CGMap;
})();
