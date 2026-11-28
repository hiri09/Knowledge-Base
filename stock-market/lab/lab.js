/* Trading Lab — single-file practice terminal. No server, no deps. */
'use strict';

// ---------- tiny seeded RNG (reproducible scenarios) ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
let rnd=mulberry32(7);
function gauss(){let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}

// ---------- scenarios ----------
// Each returns {mu, sig} per bar index (daily terms), plus optional gap().
const SCENARIOS={
  trend_up:{name:'Uptrend with pullbacks',
    note:'A real uptrend is not a straight line. Practise: buy pullbacks to the 20-SMA, keep the stop below the last higher-low, and hold through noise.',
    f:i=>((i%45)<9?{mu:-0.006,sig:0.022}:{mu:0.0032,sig:0.014})},
  trend_down:{name:'Downtrend (bear market)',
    note:'Everything looks cheap on the way down. Practise: notice how every bounce fails, and how "averaging down" doubles your loss.',
    f:i=>((i%38)<7?{mu:0.005,sig:0.02}:{mu:-0.003,sig:0.017})},
  range:{name:'Sideways chop',
    note:'Markets range ~70% of the time. Practise: fade the edges, and count how much the fees eat. This scenario punishes overtrading.',
    f:()=>({mu:0,sig:0.013,ou:true})},
  crash:{name:'Crash and recovery',
    note:'Calm, then -35% in days, then a long repair. Practise: a stop that is actually honoured, and the fact that gaps jump straight past it.',
    f:i=>i<70?{mu:0.0015,sig:0.009}:i<78?{mu:-0.055,sig:0.05}:{mu:0.0022,sig:0.022}},
  bubble:{name:'Bubble and pop',
    note:'Risk feels lowest exactly where it is highest. Practise: spotting acceleration, and selling into strength instead of hope.',
    f:i=>i<95?{mu:0.002+i*0.00013,sig:0.012+i*0.00012}:i<108?{mu:-0.07,sig:0.055}:{mu:-0.004,sig:0.03}},
  earnings:{name:'Quarterly gaps (earnings)',
    note:'Overnight news does not respect your stop. Practise: position sizing when a single gap can be -12%.',
    f:()=>({mu:0.001,sig:0.012}),
    gap:i=>(i>0&&i%22===0)?(rnd()<0.5?-1:1)*(0.02+rnd()*0.08):0},
  random:{name:'Pure random walk (no edge)',
    note:'This is a coin flip with no drift. If you still "see" support, resistance and breakouts here, that is the lesson.',
    f:()=>({mu:0,sig:0.015})},
};

// ---------- state ----------
const START_CASH=500000, FEE=0.0005, SLIP=0.0004, TICKS_PER_BAR=8, HISTORY=170;
let S;
function init(key,seed){
  rnd=mulberry32(hash(key)+(seed||0));
  S={key,bars:[],i:0,tick:0,price:1000,cash:START_CASH,fees:0,realized:0,
     pos:{qty:0,avg:0},orders:[],oid:1,log:[],levels:[],
     peak:START_CASH,maxDD:0,playing:false,view:130,hover:null,center:1000};
  for(let k=0;k<HISTORY;k++) newBar(true), runBar();
  S.center=S.price;              // the range scenario oscillates around where live play starts
  S.i=S.bars.length-1;
}
function newBar(){const p=S.price;S.bars.push({o:p,h:p,l:p,c:p,v:0})}
function runBar(){for(let t=0;t<TICKS_PER_BAR;t++) runTick(true)}

function runTick(silent){
  const sc=SCENARIOS[S.key], n=S.bars.length-1-HISTORY;
  // warm-up history is deliberately calm: scripted events must happen while he is watching
  const p=n<0?{mu:0.0006,sig:0.011}:sc.f(n);
  const dt=1/TICKS_PER_BAR;
  let mu=p.mu;
  if(p.ou){ // mean-revert to the 60-bar average: a range, not a trend
    mu=0.05*Math.log(S.center/S.price);
  }
  const ret=(mu-0.5*p.sig*p.sig)*dt+p.sig*Math.sqrt(dt)*gauss();
  S.price=Math.max(1,S.price*Math.exp(ret));
  const b=S.bars[S.bars.length-1];
  b.c=S.price; b.h=Math.max(b.h,S.price); b.l=Math.min(b.l,S.price);
  b.v+=Math.round((0.6+Math.abs(ret)*140+rnd()*0.8)*12000);
  if(!silent) matchOrders();
}
function avgClose(n){const a=S.bars.slice(-n);return a.reduce((s,b)=>s+b.c,0)/(a.length||1)}

function advanceTick(){
  S.tick++;
  runTick(false);
  if(S.tick%TICKS_PER_BAR===0){
    const sc=SCENARIOS[S.key];
    if(sc.gap){const g=sc.gap(S.bars.length-HISTORY); if(g){S.price*=1+g; log((g>0?'▲ ':'▼ ')+'Overnight gap '+(g*100).toFixed(1)+'%','warn');}}
    newBar(); matchOrders();
  }
  S.i=S.bars.length-1;
  markEquity();
}
function equity(){return S.cash+S.pos.qty*S.price}
function markEquity(){const e=equity();S.peak=Math.max(S.peak,e);
  S.maxDD=Math.max(S.maxDD,(S.peak-e)/S.peak)}

// ---------- orders & fills ----------
function log(msg,cls){S.log.unshift({msg,cls:cls||'',t:S.bars.length});S.log.length=Math.min(S.log.length,120)}
function money(x){return '₹'+Math.round(x).toLocaleString('en-IN')}
function px(x){return x.toFixed(2)}

function applyFill(side,qty,price,why){
  const dir=side==='buy'?1:-1, fee=price*qty*FEE;
  S.cash-=dir*price*qty; S.cash-=fee; S.fees+=fee;
  const q=dir*qty, pos=S.pos;
  if(pos.qty!==0&&Math.sign(q)!==Math.sign(pos.qty)){
    const closed=Math.min(Math.abs(q),Math.abs(pos.qty));
    S.realized+=(price-pos.avg)*closed*Math.sign(pos.qty);
    const nq=pos.qty+q;
    if(nq===0){pos.qty=0;pos.avg=0}
    else if(Math.sign(nq)===Math.sign(pos.qty)){pos.qty=nq}
    else {pos.qty=nq;pos.avg=price}          // flipped side
  } else {
    const nq=pos.qty+q;
    pos.avg=(pos.avg*Math.abs(pos.qty)+price*qty)/Math.abs(nq);
    pos.qty=nq;
  }
  log(`${side==='buy'?'BUY':'SELL'} ${qty} @ ${px(price)} ${why||''} · fee ${money(fee)}`,side==='buy'?'up':'dn');
  if(S.pos.qty===0) S.orders=S.orders.filter(o=>!o.reduceOnly);
}
function slipped(side){return S.price*(1+(side==='buy'?SLIP:-SLIP))}

function place(side,type,qty,price,sl,tp){
  qty=Math.floor(qty);
  if(!(qty>0)) return log('Order rejected: quantity must be > 0','warn');
  if(type!=='market'&&!(price>0)) return log('Order rejected: needs a price','warn');
  if(type==='market'){
    const f=slipped(side); applyFill(side,qty,f,'(market)');
    attachBrackets(side,qty,sl,tp);
  } else {
    S.orders.push({id:S.oid++,side,type,qty,price,sl,tp});
    log(`${type.toUpperCase()} ${side} ${qty} @ ${px(price)} placed`);
  }
}
function attachBrackets(side,qty,sl,tp){
  const opp=side==='buy'?'sell':'buy';
  const grp=S.oid;
  if(sl>0){S.orders.push({id:S.oid++,side:opp,type:'stop',qty,price:sl,reduceOnly:true,grp});
           log(`Stop-loss ${opp} ${qty} @ ${px(sl)}`)}
  if(tp>0){S.orders.push({id:S.oid++,side:opp,type:'limit',qty,price:tp,reduceOnly:true,grp});
           log(`Target ${opp} ${qty} @ ${px(tp)}`)}
}
function matchOrders(){
  const p=S.price, done=[];
  for(const o of S.orders){
    let hit=false,fill=p;
    if(o.type==='limit'){
      if(o.side==='buy'&&p<=o.price){hit=true;fill=o.price}
      if(o.side==='sell'&&p>=o.price){hit=true;fill=o.price}
    } else if(o.type==='stop'){
      // triggers, then fills at market — this is where gaps hurt
      if(o.side==='buy'&&p>=o.price){hit=true;fill=slipped('buy')}
      if(o.side==='sell'&&p<=o.price){hit=true;fill=slipped('sell')}
    }
    if(!hit) continue;
    let q=o.qty;
    if(o.reduceOnly){ q=Math.min(q,Math.abs(S.pos.qty)); if(q<=0){done.push(o);continue} }
    applyFill(o.side,q,fill,o.reduceOnly?'(bracket)':'('+o.type+')');
    done.push(o);
    if(o.grp) S.orders.filter(x=>x.grp===o.grp&&x!==o).forEach(x=>done.push(x)); // OCO
    if(!o.reduceOnly) attachBrackets(o.side,q,o.sl,o.tp);
  }
  if(done.length) S.orders=S.orders.filter(o=>!done.includes(o));
}

// ---------- indicators ----------
const IND={sma20:true,sma50:true,bb:false,rsi:false,vol:true};
function sma(n,end){const a=S.bars.slice(Math.max(0,end-n+1),end+1);
  return a.length<n?null:a.reduce((s,b)=>s+b.c,0)/n}
function stdev(n,end){const m=sma(n,end);if(m===null)return null;
  const a=S.bars.slice(end-n+1,end+1);
  return Math.sqrt(a.reduce((s,b)=>s+(b.c-m)**2,0)/n)}
function rsi(n,end){if(end<n)return null;let g=0,l=0;
  for(let k=end-n+1;k<=end;k++){const d=S.bars[k].c-S.bars[k-1].c;d>=0?g+=d:l-=d}
  if(l===0)return 100;const rs=(g/n)/(l/n);return 100-100/(1+rs)}

// ---------- chart ----------
const cv=document.getElementById('c'), ctx=cv.getContext('2d');
let W=0,H=0,PAD={r:62,b:20,t:8,l:6},geom=null;
function resize(){const r=cv.parentElement.getBoundingClientRect(),d=devicePixelRatio||1;
  cv.width=r.width*d;cv.height=r.height*d;W=r.width;H=r.height;ctx.setTransform(d,0,0,d,0,0);draw()}
addEventListener('resize',resize);

function draw(){
  ctx.clearRect(0,0,W,H);
  const bars=S.bars, n=Math.min(S.view,bars.length), start=bars.length-n, vis=bars.slice(start);
  const rsiH=IND.rsi?H*0.16:0, volH=IND.vol?H*0.13:0;
  const priceH=H-PAD.t-PAD.b-rsiH-volH;
  let lo=Infinity,hi=-Infinity;
  vis.forEach(b=>{lo=Math.min(lo,b.l);hi=Math.max(hi,b.h)});
  S.levels.forEach(v=>{if(v<hi*1.3&&v>lo*0.7){lo=Math.min(lo,v);hi=Math.max(hi,v)}});
  const pad=(hi-lo)*0.08||1; lo-=pad; hi+=pad;
  const cw=(W-PAD.l-PAD.r)/n;
  const X=i=>PAD.l+(i+0.5)*cw;
  const Y=p=>PAD.t+priceH-((p-lo)/(hi-lo))*priceH;
  geom={start,n,cw,X,Y,lo,hi,priceH,volH,rsiH};

  // grid + price axis
  ctx.font='10px ui-monospace,monospace'; ctx.textBaseline='middle';
  for(let k=0;k<=5;k++){
    const p=lo+(hi-lo)*k/5, y=Y(p);
    ctx.strokeStyle='#1c222a'; ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();
    ctx.fillStyle='#6d7988'; ctx.fillText(p.toFixed(1),W-PAD.r+6,y);
  }
  // time axis
  const step=Math.max(1,Math.round(n/8));
  ctx.textBaseline='top';
  for(let i=0;i<n;i+=step){ctx.fillStyle='#4f5a68';ctx.fillText('d'+(start+i),X(i)-10,H-PAD.b+4)}

  // volume
  if(IND.vol){
    const mv=Math.max(...vis.map(b=>b.v))||1, base=PAD.t+priceH+volH;
    vis.forEach((b,i)=>{const h=(b.v/mv)*(volH-4);
      ctx.fillStyle=b.c>=b.o?'rgba(38,163,107,.35)':'rgba(224,82,96,.35)';
      ctx.fillRect(X(i)-cw*0.35,base-h,cw*0.7,h)});
  }
  // bollinger
  if(IND.bb){
    const up=[],dn=[];
    for(let i=0;i<n;i++){const m=sma(20,start+i),s=stdev(20,start+i);
      if(m!==null){up.push([X(i),Y(m+2*s)]);dn.push([X(i),Y(m-2*s)])}}
    if(up.length){ctx.fillStyle='rgba(91,157,255,.07)';ctx.beginPath();
      up.forEach((p,k)=>k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
      for(let k=dn.length-1;k>=0;k--)ctx.lineTo(dn[k][0],dn[k][1]);
      ctx.closePath();ctx.fill();}
  }
  // candles
  vis.forEach((b,i)=>{
    const x=X(i), up=b.c>=b.o;
    ctx.strokeStyle=ctx.fillStyle=up?'#26a36b':'#e05260';
    ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(Math.round(x)+.5,Y(b.h));ctx.lineTo(Math.round(x)+.5,Y(b.l));ctx.stroke();
    const y1=Y(b.o),y2=Y(b.c),h=Math.max(1,Math.abs(y2-y1));
    ctx.fillRect(x-cw*0.32,Math.min(y1,y2),Math.max(1,cw*0.64),h);
  });
  // moving averages
  const ma=(len,col)=>{ctx.strokeStyle=col;ctx.lineWidth=1.2;ctx.beginPath();let first=true;
    for(let i=0;i<n;i++){const m=sma(len,start+i);if(m===null)continue;
      const x=X(i),y=Y(m);first?(ctx.moveTo(x,y),first=false):ctx.lineTo(x,y)}
    ctx.stroke()};
  if(IND.sma20) ma(20,'#5b9dff');
  if(IND.sma50) ma(50,'#e6a44a');

  // position / orders / levels
  const hline=(p,col,label,dash)=>{if(p<lo||p>hi)return;const y=Y(p);
    ctx.save();ctx.setLineDash(dash||[4,4]);ctx.strokeStyle=col;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();ctx.restore();
    ctx.fillStyle=col;ctx.textBaseline='middle';ctx.fillText(label,PAD.l+4,y-7)};
  S.levels.forEach(v=>hline(v,'#7d8794',''));
  S.orders.forEach(o=>hline(o.price,o.reduceOnly?(o.type==='stop'?'#e05260':'#26a36b'):'#9b8cff',
    `${o.type} ${o.side} ${o.qty}`));
  if(S.pos.qty) hline(S.pos.avg,'#d8dee6',`avg ${px(S.pos.avg)} · ${S.pos.qty}`,[2,3]);

  // last price tag
  const y=Y(S.price);
  ctx.fillStyle=S.price>=S.bars[S.bars.length-1].o?'#26a36b':'#e05260';
  ctx.fillRect(W-PAD.r,y-8,PAD.r,16);
  ctx.fillStyle='#07090c';ctx.textBaseline='middle';ctx.fillText(px(S.price),W-PAD.r+5,y);

  // RSI pane
  if(IND.rsi){
    const top=PAD.t+priceH+volH, h=rsiH-6;
    const RY=v=>top+h-(v/100)*h;
    ctx.strokeStyle='#1c222a';[30,50,70].forEach(v=>{ctx.beginPath();
      ctx.moveTo(PAD.l,RY(v));ctx.lineTo(W-PAD.r,RY(v));ctx.stroke()});
    ctx.fillStyle='#4f5a68';ctx.textBaseline='middle';
    ctx.fillText('RSI 70',W-PAD.r+6,RY(70));ctx.fillText('30',W-PAD.r+6,RY(30));
    ctx.strokeStyle='#c792ea';ctx.lineWidth=1.2;ctx.beginPath();let f=true;
    for(let i=0;i<n;i++){const r=rsi(14,start+i);if(r===null)continue;
      const x=X(i),yy=RY(r);f?(ctx.moveTo(x,yy),f=false):ctx.lineTo(x,yy)}
    ctx.stroke();
  }
  // crosshair
  if(S.hover){
    const {mx,my}=S.hover;
    ctx.save();ctx.setLineDash([3,3]);ctx.strokeStyle='#4a5664';
    ctx.beginPath();ctx.moveTo(mx,PAD.t);ctx.lineTo(mx,H-PAD.b);
    ctx.moveTo(PAD.l,my);ctx.lineTo(W-PAD.r,my);ctx.stroke();ctx.restore();
  }
  readout();
}
function hoverBar(){if(!S.hover||!geom)return S.bars[S.bars.length-1];
  const i=Math.max(0,Math.min(geom.n-1,Math.floor((S.hover.mx-PAD.l)/geom.cw)));
  return S.bars[geom.start+i]}
function hoverPrice(){if(!S.hover||!geom)return S.price;
  const {lo,hi,priceH}=geom;return hi-((S.hover.my-PAD.t)/priceH)*(hi-lo)}

function readout(){
  const b=hoverBar(), chg=(b.c/b.o-1)*100;
  const r20=sma(20,S.bars.length-1), rs=rsi(14,S.bars.length-1);
  document.getElementById('readout').innerHTML=
    `<b>SIM</b> · O ${px(b.o)} H ${px(b.h)} L ${px(b.l)} C <b>${px(b.c)}</b> `+
    `<span class="${chg>=0?'up':'dn'}">${chg>=0?'+':''}${chg.toFixed(2)}%</span> · `+
    `Vol ${(b.v/1000).toFixed(0)}k`+
    (r20?` · SMA20 ${px(r20)}`:'')+(rs?` · RSI ${rs.toFixed(0)}`:'')+
    (S.hover?` · cursor ${px(hoverPrice())}`:'');
}

// ---------- panel rendering ----------
const $=id=>document.getElementById(id);
function cls(v){return v>0?'up':v<0?'dn':'dim'}
function renderPanels(){
  const eq=equity(), upl=S.pos.qty?(S.price-S.pos.avg)*S.pos.qty:0;
  $('equity').textContent=money(eq);
  $('equity').className=cls(eq-START_CASH);
  $('cash').textContent=money(S.cash);
  $('realised').textContent=money(S.realized); $('realised').className=cls(S.realized);
  $('feesPaid').textContent=money(S.fees);
  const r=(eq/START_CASH-1)*100;
  $('ret').textContent=(r>=0?'+':'')+r.toFixed(2)+'%'; $('ret').className=cls(r);
  $('dd').textContent='−'+(S.maxDD*100).toFixed(1)+'%';
  $('dd').className=S.maxDD>0.2?'dn':'dim';
  $('pqty').textContent=S.pos.qty; $('pqty').className=cls(S.pos.qty);
  $('pavg').textContent=S.pos.qty?px(S.pos.avg):'—';
  $('pupl').textContent=S.pos.qty?money(upl)+' ('+((upl/(Math.abs(S.pos.qty)*S.pos.avg))*100).toFixed(2)+'%)':'—';
  $('pupl').className=cls(upl);

  $('orders').innerHTML=S.orders.length?S.orders.map(o=>
    `<tr><td class="${o.side==='buy'?'up':'dn'}">${o.side}</td><td>${o.type}${o.reduceOnly?'*':''}</td>`+
    `<td>${o.qty}</td><td>${px(o.price)}</td><td class="x" data-id="${o.id}">✕</td></tr>`).join('')
    :'<tr><td class="dim">none</td></tr>';

  const mid=S.price, rows=[];
  for(let k=4;k>=1;k--){const p=mid*(1+k*0.0006);
    rows.push(`<tr><td class="dn">${px(p)}</td><td style="text-align:right">${Math.round(200+rnd()*800)}</td></tr>`)}
  rows.push(`<tr><td colspan="2" class="dim" style="text-align:center">spread ${(mid*0.0012).toFixed(2)}</td></tr>`);
  for(let k=1;k<=4;k++){const p=mid*(1-k*0.0006);
    rows.push(`<tr><td class="up">${px(p)}</td><td style="text-align:right">${Math.round(200+rnd()*800)}</td></tr>`)}
  $('depth').innerHTML=rows.join('');

  $('log').innerHTML=S.log.map(l=>`<div class="${l.cls}">d${l.t} · ${l.msg}</div>`).join('');
  $('clock').textContent=`bar ${S.bars.length} · tick ${S.tick%TICKS_PER_BAR+1}/${TICKS_PER_BAR}`;
  sizer();
}
function sizer(){
  const cap=equity(), rp=parseFloat($('riskPct').value)||0;
  const e=parseFloat($('rEntry').value), st=parseFloat($('rStop').value);
  const per=Math.abs(e-st);
  const q=(per>0&&rp>0)?Math.floor(cap*rp/100/per):null;
  $('sizeOut').textContent=q?`${q}  (${money(q*e)} position, risk ${money(q*per)})`:'—';
  return q;
}
function refresh(){draw();renderPanels()}

// ---------- controls ----------
let timer=null, runSeed=0;
function setPlay(on){
  S.playing=on; $('play').textContent=on?'❚❚ Pause':'▶ Play';
  clearInterval(timer);
  if(on) timer=setInterval(()=>{advanceTick();refresh()},Math.max(8,1000/ +$('speed').value));
}
$('play').onclick=()=>setPlay(!S.playing);
$('step').onclick=()=>{advanceTick();refresh()};
$('speed').oninput=()=>{if(S.playing)setPlay(true)};
$('reset').onclick=()=>{setPlay(false);init($('scenario').value,++runSeed);refresh()};  // new market each reset
$('scenario').onchange=()=>{setPlay(false);init($('scenario').value,runSeed);
  $('scenarioNote').textContent=SCENARIOS[S.key].note;refresh()};

function orderInputs(){
  const type=$('otype').value;
  const show=type!=='market';
  $('oprice').style.display=$('opriceLabel').style.display=show?'':'none';
  if(show&&!$('oprice').value)$('oprice').value=px(S.price);
}
$('otype').onchange=orderInputs;
const num=id=>{const v=parseFloat($(id).value);return isFinite(v)?v:0};
function submit(side){
  place(side,$('otype').value,num('oqty'),num('oprice'),num('osl'),num('otp'));
  refresh();
}
$('buy').onclick=()=>submit('buy');
$('sell').onclick=()=>submit('sell');
$('flat').onclick=()=>{if(!S.pos.qty)return;
  applyFill(S.pos.qty>0?'sell':'buy',Math.abs(S.pos.qty),slipped(S.pos.qty>0?'sell':'buy'),'(close)');
  S.orders=S.orders.filter(o=>!o.reduceOnly);refresh()};
$('orders').onclick=e=>{const id=e.target.dataset.id;if(!id)return;
  S.orders=S.orders.filter(o=>o.id!=id);log('order cancelled');refresh()};
['riskPct','rEntry','rStop'].forEach(id=>$(id).oninput=()=>renderPanels());
$('useSize').onclick=()=>{const q=sizer();if(!q)return;
  $('oqty').value=q; $('osl').value=$('rStop').value; refresh()};
$('lvlAdd').onclick=()=>{S.levels.push(hoverPrice());refresh()};
$('lvlClear').onclick=()=>{S.levels=[];refresh()};

// indicators
const indBox=$('indicators');
Object.keys(IND).forEach(k=>{
  const b=document.createElement('span');
  b.className='chip'+(IND[k]?' on':''); b.textContent=k.toUpperCase();
  b.onclick=()=>{IND[k]=!IND[k];b.classList.toggle('on');draw()};
  indBox.appendChild(b);
});
// scenarios
Object.entries(SCENARIOS).forEach(([k,v])=>{
  const o=document.createElement('option');o.value=k;o.textContent=v.name;$('scenario').appendChild(o)});

// chart interaction
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();
  S.hover={mx:e.clientX-r.left,my:e.clientY-r.top};draw()});
cv.addEventListener('mouseleave',()=>{S.hover=null;draw()});
cv.addEventListener('click',()=>{if(!S.hover)return;
  const p=hoverPrice();
  if($('otype').value!=='market')$('oprice').value=p.toFixed(2);
  $('rEntry').value=px(S.price); renderPanels()});
cv.addEventListener('wheel',e=>{e.preventDefault();
  S.view=Math.max(40,Math.min(400,Math.round(S.view*(e.deltaY>0?1.12:0.89))));draw()},{passive:false});
addEventListener('keydown',e=>{
  if(/input|select/i.test(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();setPlay(!S.playing)}
  if(e.key==='b')submit('buy'); if(e.key==='s')submit('sell');
  if(e.key==='l'){S.levels.push(hoverPrice());refresh()}
  if(e.key==='ArrowRight'){advanceTick();refresh()}
});

// ---------- go ----------
init('trend_up');
$('scenario').value='trend_up';
$('scenarioNote').textContent=SCENARIOS.trend_up.note;
orderInputs(); resize(); refresh();
