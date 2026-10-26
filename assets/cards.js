/* Share cards drawn on canvas: WhatsApp/Instagram square, Status/Stories, link preview. */
(function(){
'use strict';
const SIZES=[{k:'square',w:1080,h:1080,label:'WhatsApp & Instagram post'},{k:'story',w:1080,h:1920,label:'WhatsApp Status & Stories'},{k:'wide',w:1200,h:630,label:'X, Facebook & link preview'}];
function wrap(ctx,text,maxW,maxLines){const words=text.split(/\s+/);const lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);
  if(lines.length>maxLines){const l=lines.slice(0,maxLines);let last=l[maxLines-1];while(ctx.measureText(last+'…').width>maxW&&last.length)last=last.slice(0,-1);l[maxLines-1]=last.trim()+'…';return l}return lines}
function fit(ctx,t,maxW){if(ctx.measureText(t).width<=maxW)return t;while(t.length&&ctx.measureText(t+'…').width>maxW)t=t.slice(0,-1);return t.trim()+'…'}
function loadImg(src){return new Promise(r=>{if(!src)return r(null);const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
async function draw(canvas,p,size){const {w,h}=size;canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');const F='Arial, Helvetica, sans-serif';
  c.fillStyle='#111';c.fillRect(0,0,w,h);const img=await loadImg(p.image);const pad=Math.round(w*.07);
  const photoH=size.k==='wide'?h:size.k==='story'?h*.42:h*.42;
  if(img){const ph=size.k==='wide'?h:photoH,pw=size.k==='wide'?w*.42:w;const x0=size.k==='wide'?w-pw:0;const s=Math.max(pw/img.width,ph/img.height);
    c.save();c.beginPath();c.rect(x0,0,pw,ph);c.clip();c.drawImage(img,x0+(pw-img.width*s)/2,(ph-img.height*s)/2,img.width*s,img.height*s);c.restore();
    if(size.k!=='wide'){const g=c.createLinearGradient(0,ph*.55,0,ph);g.addColorStop(0,'rgba(17,17,17,0)');g.addColorStop(1,'#111');c.fillStyle=g;c.fillRect(0,0,w,ph)}}
  else{const r=CG.rng(CG.hash(p.id));c.globalAlpha=.25;c.strokeStyle='#fff';for(let i=0;i<16;i++){const y=(i+1)*h/17;c.lineWidth=1+r()*2;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y-60+r()*120,w*.65,y-60+r()*120,w,y+r()*40-20);c.stroke()}c.globalAlpha=1;
    c.fillStyle='#d7ff3f';c.beginPath();c.arc(w*.82,h*.14,w*.025,0,7);c.fill()}
  const textW=size.k==='wide'?(img?w*.58-pad*1.5:w-pad*2):w-pad*2;
  // brand
  c.fillStyle='#fff';c.font=`900 ${Math.round(w*.03)}px ${F}`;c.textBaseline='top';c.fillText('PETITION.AFRICA',pad,pad);
  // label
  let y=size.k==='wide'?h*.26:size.k==='story'?photoH+20:photoH-10;
  const lab=(p.status==='victory'?'VICTORY · ':'PETITION · ')+CG.scopeLabel(p).toUpperCase();c.font=`800 ${Math.round(w*.022)}px ${F}`;
  const labT=fit(c,lab,textW-28);const lw=c.measureText(labT).width+28;c.fillStyle='#d7ff3f';c.fillRect(pad,y,lw,Math.round(w*.042));c.fillStyle='#111';c.fillText(labT,pad+14,y+Math.round(w*.01));
  y+=Math.round(w*.07);
  // title
  const wide=size.k==='wide';const fs=Math.round(wide?w*.042:w*(p.title.length>70?.062:.072)*(size.k==='story'?1.15:1));c.font=`900 ${fs}px ${F}`;c.fillStyle='#fff';
  const lines=wrap(c,p.title,textW,size.k==='story'?6:wide?3:4);lines.forEach(l=>{c.fillText(l,pad,y);y+=fs*1.05});
  y+=fs*.3;const tf=Math.round(w*(wide?.022:.03));c.font=`400 ${tf}px ${F}`;c.fillStyle='#ccc';
  const to='To: '+(p.target.name?p.target.name+', ':'')+p.target.title;wrap(c,to,textW,wide?1:2).forEach(l=>{c.fillText(l,pad,y);y+=tf*1.3});
  // count + cta at bottom
  const by=h-pad;const n=CG.fmt(CG.count(p));c.textBaseline='alphabetic';
  c.font=`900 ${Math.round(w*(wide?.05:.085))}px ${F}`;c.fillStyle='#fff';c.fillText(n,pad,by-w*(size.k==='wide'?.05:.075));
  const nw=c.measureText(n).width;c.font=`700 ${Math.round(w*.024)}px ${F}`;c.fillStyle='#bbb';c.fillText(p.status==='victory'?'signatures. We won.':'people have signed',pad+nw+16,by-w*(size.k==='wide'?.05:.075));
  const cta=p.status==='victory'?'See the victory at '+CG.SITE:'Add your name at '+CG.SITE;c.font=`800 ${Math.round(w*.026)}px ${F}`;
  const cw=c.measureText(cta).width+40;const ctaT=fit(c,cta,textW-40);c.fillStyle='#d7ff3f';c.fillRect(pad,by-w*.045,Math.min(cw,textW),w*.05);c.fillStyle='#111';c.fillText(ctaT,pad+20,by-w*.012)}
async function save(canvas,name){const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
  try{const dl=window.claude&&await window.claude.use('downloads');if(dl){await dl.save({filename:name,data:blob});return}}catch(e){if(e&&e.code&&e.code!=='unavailable'){CG.toast('Download was cancelled');return}}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();CG.toast('Card saved')}catch(e){CG.toast('Saving is blocked here. Long-press the card to save it.')}}
CG.renderCards=async function(el,p){el.innerHTML=`<div class="cardgrid">${SIZES.map(s=>`<figure><canvas data-k="${s.k}" aria-label="${s.label} share card"></canvas><figcaption><span>${s.label}<br><small style="color:var(--muted);font-weight:400">${s.w}×${s.h}</small></span><button class="btn small" data-save="${s.k}">Save image</button></figcaption></figure>`).join('')}</div>`;
  for(const s of SIZES)await draw(el.querySelector(`canvas[data-k="${s.k}"]`),p,s);
  el.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{CG.track(p,'shares');save(el.querySelector(`canvas[data-k="${b.dataset.save}"]`),'petition-'+p.id.replace(/^p_/,'')+'-'+b.dataset.save+'.png')})};
CG.shareLinks=function(p){const t=encodeURIComponent(CG.shareText(p)),u=encodeURIComponent(CG.shareUrl(p));
  return `<div class="sharerow"><a class="wa" href="https://wa.me/?text=${t}" target="_blank" rel="noopener" data-sh>WhatsApp</a><a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(p.title)}&url=${u}" target="_blank" rel="noopener" data-sh>X</a><a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" data-sh>Facebook</a><a href="https://t.me/share/url?url=${u}&text=${encodeURIComponent(p.title)}" target="_blank" rel="noopener" data-sh>Telegram</a><button type="button" data-copy>Copy</button></div>`};
CG.bindShare=function(el,p){el.querySelectorAll('[data-sh]').forEach(a=>a.addEventListener('click',()=>CG.track(p,'shares')));el.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{CG.track(p,'shares');CG.copy(CG.shareText(p))})};
})();
