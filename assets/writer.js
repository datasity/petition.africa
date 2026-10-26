/* Petition writer: expands a short idea into a structured petition with no AI service.
   CGWriter.write({title,short,category,scope,country,adm1,adm2,target}, variant) -> text (paragraphs separated by blank lines)
   CGWriter.titleTips(title) -> [tips] */
(function(){
'use strict';
const pick=(arr,v)=>arr[((v%arr.length)+arr.length)%arr.length];
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const end=s=>{s=(s||'').trim();return !s?s:/[.!?]$/.test(s)?s:s+'.'};
const lc=s=>s?s.charAt(0).toLowerCase()+s.slice(1):s;
const IMPACT={
 'Roads & transport':['Every day, people lose hours and money on unsafe, broken routes. Traders cannot move goods, children walk to school in danger, and emergency vehicles cannot get through.','Bad roads and unreliable transport push up the price of everything. Workers arrive late, goods spoil and accidents rise.','When roads fail, whole communities are cut off from work, markets, schools and hospitals.'],
 'Water & sanitation':['Without clean, reliable water, families spend money they do not have on vendors and sachets, and children fall sick from unsafe sources.','Women and children carry the heaviest burden, queuing for hours instead of working or learning. Poor sanitation spreads disease.','Clean water is a basic need. When taps run dry, health, schooling and incomes all suffer.'],
 'Health':['People are being turned away or kept waiting when every minute matters. Families are forced to pay for care they cannot afford.','When health services fail, the poorest pay first, with their savings and sometimes their lives.','A working health system should not depend on where you live or who you know.'],
 'Education':['Children are losing learning they will never get back. Parents are paying more while getting less.','Every child deserves a safe classroom, a trained teacher and the materials to learn.','When schools are underfunded, families pay twice: through fees today and lost opportunities tomorrow.'],
 'Electricity':['Businesses close early, food spoils and families spend a large share of their income on fuel for generators.','Unreliable power drives up costs for everyone, from the smallest kiosk to the largest employer.','People are paying for electricity they do not receive, while backup power eats into their income.'],
 'Security':['People no longer feel safe in their homes, on the roads or at the market.','Insecurity is driving families from their homes and destroying livelihoods.','Everyone has a right to live and work without fear.'],
 'Jobs & economy':['Livelihoods are at stake. Traders, workers and young people are losing income they rely on to feed their families.','When small businesses suffer, whole communities feel it through lost jobs and higher prices.','Fair economic policy should protect the people who keep our local economy running.'],
 'Environment':['Pollution and neglect are damaging our health, our land and our water, and the people with the least are hit the hardest.','The damage is visible every day, and the cost to health and livelihoods keeps growing.','We all share this environment, and we will all pay if it is not protected now.'],
 'Housing':['Families are being priced out of safe, decent homes.','Without secure housing, people cannot plan, save or build a future.','Decent, affordable housing is the foundation of a stable community.'],
 'Accountability':['Public money and public power must serve the public, openly.','People deserve to know how decisions are made and how their money is spent.','Transparency builds trust. Without it, problems are hidden instead of solved.'],
 'Rights & justice':['People are being denied rights that should be protected for everyone.','Justice delayed is justice denied, and the people affected cannot wait.','Equal treatment under the law must be real, not just written down.'],
 'Other':['This issue affects people\u2019s daily lives, and it has gone unresolved for too long.','The people affected have waited long enough for action.','This is a problem with a practical solution, if the right people act.']};
const ASKS=[
 t=>[`take immediate action to ${t}`,'publish a clear timeline and budget for the work','give the public regular progress updates until the job is done'],
 t=>[`commit publicly to ${t}`,'meet with residents and the people most affected within 30 days','report back openly on what has been done'],
 t=>[`${t}, starting with the areas worst affected`,'set out who is responsible and by when','make the plan and its progress public']];
function actionFrom(title){let t=(title||'').trim().replace(/[.!]$/,'');
  const verb=/^(fix|stop|end|build|restore|provide|publish|protect|scrap|open|reopen|repair|reverse|add|run|fund|freeze|ban|bring|create|give|allow|pay|reduce|remove|release|desilt|station|rebuild|install|extend|make|keep|hire|clean|enforce|ensure)\b/i;
  return verb.test(t)?lc(t):'act on this: '+lc(t)}
function where(o){const G=window.CG_GEOINDEX;const name=id=>{if(!id)return'';for(const cc in G){const a=G[cc].adm1.find(x=>x[0]===id)||G[cc].adm2.find(x=>x[0]===id);if(a)return a[1]}return''};
  const country=o.country&&G[o.country]?G[o.country].name:'';
  if(o.scope==='africa')return{place:'across Africa',who:'Africans in every country'};
  if(o.scope==='country')return{place:'in '+country,who:'people across '+country};
  if(o.scope==='state'){const s=name(o.adm1);return{place:'in '+s,who:'residents of '+s}}
  const l=name(o.adm2)||name(o.adm1);return{place:'in '+l,who:'residents of '+l}}
function write(o,v){v=v||0;const w=where(o);const cat=IMPACT[o.category]?o.category:'Other';
  const tgt=o.target&&(o.target.name||o.target.title)?(o.target.name?o.target.name+', '+o.target.title:o.target.title):'the responsible authority';
  const short=end(cap((o.short||'').trim()));
  const open=pick([
    `${short} This is the reality for ${w.who}, and it cannot continue.`,
    `${short} We are ${w.who}, and we are asking for action now.`,
    `${short} For ${w.who}, this is not a small problem. It shapes daily life.`],v);
  const impact=pick(IMPACT[cat],v);
  const act=actionFrom(o.title);const asks=pick(ASKS,v)(act);
  const ask=`We are calling on ${tgt} to:\n1. ${cap(asks[0])}.\n2. ${cap(asks[1])}.\n3. ${cap(asks[2])}.`;
  const why=pick([
    `This is a practical change that can be delivered. What is needed is a decision and a commitment.`,
    `The solution is within reach. It needs leadership and a clear plan.`,
    `Other communities have solved problems like this. We are asking for the same commitment ${w.place}.`],v+1);
  const close=pick([
    `Every signature shows that this matters to real people ${w.place}. Please sign, then share this petition on WhatsApp with your family, neighbours and colleagues.`,
    `Add your name and share this with everyone who cares about ${w.place.replace(/^(in|across) /,'')}. The more of us who sign, the harder it is to ignore.`,
    `Sign now and forward this to your WhatsApp groups. Together we can make sure our voices are heard.`],v);
  return [open,impact,ask,why,close].join('\n\n')}
function titleTips(t){const tips=[];t=(t||'').trim();
  if(t.length<20)tips.push('Make the title more specific: say what should change and where.');
  if(t.length>90)tips.push('Keep the title under 90 characters so it fits on share cards.');
  if(t&&!/^(fix|stop|end|build|restore|provide|publish|protect|scrap|open|reopen|repair|reverse|add|run|fund|freeze|ban|bring|create|give|allow|pay|reduce|remove|release|desilt|station|rebuild|install|extend|make|keep|hire|clean|enforce|ensure|weekly|visa)/i.test(t))tips.push('Start with an action word, for example "Fix", "Restore", "Publish" or "Stop".');
  if(/[A-Z]{6,}/.test(t))tips.push('Avoid writing in capitals; it reads as shouting.');
  return tips}
window.CGWriter={write,titleTips};
})();
