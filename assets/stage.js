/* Trending stage: dark Africa map + horizontal card carousel. The map flies to each petition and pops a pin. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg',S=100;
const my=lat=>{const r=Math.max(-80,Math.min(80,lat))*Math.PI/180;return Math.log(Math.tan(Math.PI/4+r/2))*180/Math.PI};
const P=(lon,lat)=>[lon*S,-my(lat)*S];
function decode(rings){let d='';for(const poly of rings)for(const r of poly){let x=r[0],y=r[1];d+='M'+(x/1000*S).toFixed(1)+' '+(-my(y/1000)*S).toFixed(1);for(let i=2;i<r.length;i+=2){x+=r[i];y+=r[i+1];d+='L'+(x/1000*S).toFixed(1)+' '+(-my(y/1000)*S).toFixed(1)}d+='Z'}return d}
const box=(b,pad)=>{const [x0,y1]=P(b[0],b[1]),[x1,y0]=P(b[2],b[3]);const w=x1-x0,h=y1-y0;return[x0-w*pad,y0-h*pad,w*(1+2*pad),h*(1+2*pad)]};
const AFRICA=box([-26,-36,58,38],.0);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function where(p){const pts=window.CG_POINTS||{};const c=window.CG_AFRICA.find(x=>x.id===p.country);
  if(p.scope==='africa')return null;const id=p.adm2||p.adm1;const l=(id&&pts[id])||(c&&c.l);return l?P(l[0],l[1]):null}
CG.stage=function(root,opts){opts=opts||{};let list=[],active=0,timer=null,paused=false,vb=AFRICA.slice(),raf=0,t0=0;const DUR=6500;
  root.innerHTML=`<div class="stage"><div class="stage-map"><svg aria-hidden="true" preserveAspectRatio="xMidYMid slice"><g class="st-c"></g></svg><div class="st-pins"></div></div>
  <div class="stage-in wrap"><div class="stage-head"><div><div class="eyebrow">Trending now</div><h2>Getting the most attention.</h2></div><div class="filters st-f"></div></div>
  <div class="stage-feat" aria-live="polite"></div>
  <div class="stage-rail"><div class="stage-track" tabindex="0" aria-label="Trending petitions"></div></div>
  <div class="stage-ctl"><div class="st-prog"><i></i></div><span class="st-n"></span><button class="st-btn" data-d="-1" aria-label="Previous petition">←</button><button class="st-btn" data-d="1" aria-label="Next petition">→</button><a class="st-all" href="browse.html">See all ↗</a></div></div></div>`;
  const svg=root.querySelector('svg'),G=root.querySelector('.st-c'),pins=root.querySelector('.st-pins'),track=root.querySelector('.stage-track'),feat=root.querySelector('.stage-feat'),prog=root.querySelector('.st-prog i'),stageEl=root.querySelector('.stage');
  window.CG_AFRICA.forEach(c=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',decode(c.c));p.dataset.id=c.id;p.style.setProperty('--d',((c.l[0]+26)/84*600).toFixed(0)+'ms');G.appendChild(p)});
  const apply=()=>{svg.setAttribute('viewBox',vb.map(x=>x.toFixed(1)).join(' '));place()};
  function fly(t){cancelAnimationFrame(raf);if(reduce){vb=t.slice();apply();return}const f=vb.slice(),s=performance.now(),D=1100;const step=n=>{let k=Math.min(1,(n-s)/D);k=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;vb=f.map((x,i)=>x+(t[i]-x)*k);apply();if(k<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)}
  function toScreen(x,y){const r=svg.getBoundingClientRect(),sc=Math.max(r.width/vb[2],r.height/vb[3]);const ox=(r.width-vb[2]*sc)/2,oy=(r.height-vb[3]*sc)/2;return[(x-vb[0])*sc+ox,(y-vb[1])*sc+oy]}
  function place(){pins.querySelectorAll('[data-x]').forEach(el=>{const [x,y]=toScreen(+el.dataset.x,+el.dataset.y);el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`})}
  function fitIn(bx){const r=svg.getBoundingClientRect();const W=r.width||1,H=r.height||1;const wide=innerWidth>860;
    const R=wide?[.44,.06,.98,.6]:[.06,.12,.94,.9]; // open area of the stage, as fractions
    const rw=(R[2]-R[0])*W,rh=(R[3]-R[1])*H;const sc=Math.min(rw/bx[2],rh/bx[3]);const vw=W/sc,vh=H/sc;
    const cx=bx[0]+bx[2]/2,cy=bx[1]+bx[3]/2;return[cx-((R[0]+R[2])/2)*vw,cy-((R[1]+R[3])/2)*vh,vw,vh]}
  function target(p){if(p.scope==='africa'){const r=svg.getBoundingClientRect();return innerWidth>860?fitIn(box([-20,-36,52,38],.02)):fitIn(AFRICA)}
    const c=window.CG_AFRICA.find(x=>x.id===p.country);if(!c)return fitIn(AFRICA);return fitIn(box(c.b,.12))}
  function counter(el,to){if(reduce){el.textContent=CG.fmt(to);return}const s=performance.now(),from=Math.round(to*.82);const st=n=>{const k=Math.min(1,(n-s)/900);el.textContent=CG.fmt(Math.round(from+(to-from)*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)}
  function show(i,fromScroll){if(!list.length)return;active=(i+list.length)%list.length;const p=list[active];
    G.querySelectorAll('path').forEach(x=>{x.classList.toggle('on',p.scope!=='africa'&&x.dataset.id===p.country);x.classList.toggle('has',list.some(q=>q.country===x.dataset.id))});
    stageEl.classList.toggle('all',p.scope==='africa');void G.offsetWidth;
    // pins: dim pins for all trending, live pin + callout for the active one
    pins.innerHTML=list.map((q,j)=>{const w=where(q);return w&&j!==active?`<span class="st-dot" data-x="${w[0]}" data-y="${w[1]}"></span>`:''}).join('');
    const w=where(p);const c=CG.count(p);
    if(w)pins.insertAdjacentHTML('beforeend',`<span class="st-pin" data-x="${w[0]}" data-y="${w[1]}"><i></i><b class="st-call"><small>#${active+1} · ${CG.esc(CG.scopeLabel(p))}</small>${CG.short(c)} signatures</b></span>`);
    else pins.insertAdjacentHTML('beforeend',`<span class="st-pin st-wide" data-x="${(AFRICA[0]+AFRICA[2]*.62)}" data-y="${(AFRICA[1]+AFRICA[3]*.42)}"><b class="st-call"><small>#${active+1} · All 54 countries</small>${CG.short(c)} signatures</b></span>`);
    fly(target(p));place();
    feat.innerHTML=`<div class="sf" key="${p.id}"><div class="chips"><span class="chip lime">#${active+1} trending</span><span class="chip">${CG.esc(p.category)}</span></div>
      <h3>${CG.esc(p.title)}</h3><p>To ${CG.esc(p.target.name?p.target.name+', ':'')}${CG.esc(p.target.title)}</p>
      <div class="sf-n"><strong data-n></strong><span>signatures<br><em>+${CG.short(CG.recentCount(p))} this week</em></span></div>
      <div class="sf-bar"><i style="width:${Math.min(100,c/p.goal*100).toFixed(1)}%"></i></div>
      <div class="sf-act"><a class="btn accent" href="petition.html#${p.id}" data-pet="${p.id}">Sign this petition</a><a class="btn st-ghost" href="petition.html#${p.id}" data-pet="${p.id}">Read more</a></div></div>`;
    counter(feat.querySelector('[data-n]'),c);
    track.querySelectorAll('.st-card').forEach((el,j)=>el.classList.toggle('on',j===active));
    root.querySelector('.st-n').textContent=(active+1)+' / '+list.length;
    if(!fromScroll){const el=track.children[active];if(el)track.scrollTo({left:el.offsetLeft-track.offsetLeft-4,behavior:reduce?'auto':'smooth'})}
    restart()}
  function restart(){t0=performance.now();prog.style.transition='none';prog.style.width='0';if(reduce||paused)return;void prog.offsetWidth;prog.style.transition=`width ${DUR}ms linear`;prog.style.width='100%';clearTimeout(timer);timer=setTimeout(()=>{if(!paused&&visible)show(active+1)},DUR)}
  function pause(v){paused=v;if(v){clearTimeout(timer);const w=getComputedStyle(prog).width;prog.style.transition='none';prog.style.width=w}else restart()}
  function load(cc){list=CG.trending(cc).slice(0,8);
    track.innerHTML=list.map((p,i)=>`<a class="st-card" href="petition.html#${p.id}" data-pet="${p.id}" data-i="${i}" style="--i:${i}"><div class="st-img">${CG.img(p)}<span>#${i+1}</span></div><div class="st-b"><small>${CG.esc(CG.scopeLabel(p))}</small><h4>${CG.esc(p.title)}</h4><div class="st-f2"><strong>${CG.short(CG.count(p))}</strong><em>+${CG.short(CG.recentCount(p))} this week</em></div></div></a>`).join('')||'<div class="empty" style="color:#bbb;border-color:#333">No trending petitions here yet.</div>';
    stageEl.classList.remove('play');void stageEl.offsetWidth;stageEl.classList.add('play');active=0;track.scrollLeft=0;if(list.length)show(0,true);else{pins.innerHTML='';feat.innerHTML='';fly(AFRICA)}}
  // filters
  const uc=CG.user()?.country||CG.country();const ff=root.querySelector('.st-f');
  ff.innerHTML=`<button class="filter active" data-c="">All Africa</button><button class="filter" data-c="${uc}">${CG.esc(CG.COUNTRIES[uc])}</button>`;
  ff.onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;ff.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));load(b.dataset.c)};
  root.querySelectorAll('.st-btn').forEach(b=>b.onclick=()=>show(active+ +b.dataset.d));
  // hover a card to preview it on the map (desktop)
  let hv=0;track.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||(!e.movementX&&!e.movementY))return;const c=e.target.closest('.st-card');if(!c||+c.dataset.i===active)return;clearTimeout(hv);hv=setTimeout(()=>show(+c.dataset.i,true),120)});
  // swipe/scroll: the card nearest the left edge becomes active
  let st=0;track.addEventListener('scroll',()=>{clearTimeout(st);st=setTimeout(()=>{if(track._auto)return;const x=track.scrollLeft;const ae=track.children[active];if(ae){const l=ae.offsetLeft-track.offsetLeft;if(l>=x-8&&l+ae.offsetWidth<=x+track.clientWidth+8)return}let best=0,bd=1e9;[...track.children].forEach((el,j)=>{const d=Math.abs(el.offsetLeft-track.offsetLeft-x);if(d<bd){bd=d;best=j}});
    if(track.scrollLeft+track.clientWidth>=track.scrollWidth-4&&bd>20)best=list.length-1;if(best!==active)show(best,true)},140)},{passive:true});
  ['mouseenter','focusin','touchstart'].forEach(ev=>stageEl.addEventListener(ev,()=>pause(true),{passive:true}));
  stageEl.addEventListener('mouseleave',()=>pause(false));stageEl.addEventListener('focusout',e=>{if(!stageEl.contains(e.relatedTarget))pause(false)});
  stageEl.addEventListener('touchend',()=>setTimeout(()=>pause(false),4000),{passive:true});
  track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();show(active+1)}if(e.key==='ArrowLeft'){e.preventDefault();show(active-1)}});
  let visible=true;if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&!paused)restart();else clearTimeout(timer)},{threshold:.25}).observe(stageEl);
  new ResizeObserver(()=>{if(list[active])fly(target(list[active]));place()}).observe(svg);
  vb=fitIn(AFRICA);apply();load('');
  return{load,show}};
})();
