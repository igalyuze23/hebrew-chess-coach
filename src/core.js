'use strict';
/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const VAL = {p:1,n:3,b:3,r:5,q:9,k:0};
const HE = {p:'רגלי',n:'פרש',b:'רץ',r:'צריח',q:'מלכה',k:'מלך'};
const HED = {p:'הרגלי',n:'הפרש',b:'הרץ',r:'הצריח',q:'המלכה',k:'המלך'};
const san = s => `<bdi class="san">${s}</bdi>`;
const sqh = s => `<bdi class="san sq">${s}</bdi>`;
const other = c => c === 'w' ? 'b' : 'w';
const LS = {
  get(k, d){ try{ const v = localStorage.getItem('cc_'+k); return v === null ? d : v; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('cc_'+k, v); }catch(e){} }
};
function toast(msg, ms=3500){ const t=document.createElement('div'); t.className='toast'; t.innerHTML=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), ms); }
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---- win% & accuracy (lichess formulas) ---- */
function wpFromCp(cp){ return 50 + 50 * (2/(1+Math.exp(-0.00368208*cp)) - 1); }
function wpLine(l){ // win% for side to move
  if(!l) return 50;
  if(l.mate !== undefined && l.mate !== null){ return l.mate > 0 ? 100 : 0; }
  return wpFromCp(Math.max(-2000, Math.min(2000, l.cp)));
}
function moveAccuracy(loss){ return Math.max(0, Math.min(100, 103.1668*Math.exp(-0.04354*loss) - 3.1669)); }
function evalText(l, stm){ // white POV text
  if(!l) return '';
  if(l.terminal === 'mate') return stm==='w' ? '0-1' : '1-0';
  if(l.terminal === 'draw') return '½-½';
  if(l.mate !== undefined && l.mate !== null){ const m = stm==='w' ? l.mate : -l.mate; return (m>0?'M':'-M') + Math.abs(m); }
  const cp = stm==='w' ? l.cp : -l.cp; return (cp>0?'+':'') + (cp/100).toFixed(1);
}
function shortEval(l, stm){ if(!l) return ''; if(l.mate!=null && !l.terminal) return 'M'+Math.abs(l.mate); if(l.terminal) return evalText(l,stm); const cp=Math.abs(stm==='w'?l.cp:-l.cp)/100; return cp>=10?cp.toFixed(0):cp.toFixed(1); }

/* ---- board geometry helpers on a {sq:{type,color}} map ---- */
function parseFen(fen){
  const rows = fen.split(' ')[0].split('/'); const b = {};
  rows.forEach((row,i)=>{ let f=0; for(const ch of row){ if(/\d/.test(ch)) f+=+ch; else { b['abcdefgh'[f]+(8-i)] = {type:ch.toLowerCase(), color: ch===ch.toUpperCase()?'w':'b'}; f++; } } });
  return b;
}
const sqXY = sq => [sq.charCodeAt(0)-97, +sq[1]-1];
const xySq = (x,y) => (x<0||x>7||y<0||y>7) ? null : String.fromCharCode(97+x)+(y+1);
const DIR_B=[[1,1],[1,-1],[-1,1],[-1,-1]], DIR_R=[[1,0],[-1,0],[0,1],[0,-1]], DIR_Q=DIR_B.concat(DIR_R);
const KN=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
function attacksFrom(b, sq){
  const p=b[sq]; if(!p) return []; const [x,y]=sqXY(sq); const out=[];
  const ray=(dirs,slide)=>dirs.forEach(([dx,dy])=>{ let nx=x+dx, ny=y+dy; for(;;){ const s=xySq(nx,ny); if(!s) break; out.push(s); if(!slide||b[s]) break; nx+=dx; ny+=dy; } });
  switch(p.type){
    case 'p': { const d=p.color==='w'?1:-1; [[-1,d],[1,d]].forEach(([dx,dy])=>{ const s=xySq(x+dx,y+dy); if(s) out.push(s); }); break; }
    case 'n': ray(KN,false); break;
    case 'b': ray(DIR_B,true); break;
    case 'r': ray(DIR_R,true); break;
    case 'q': ray(DIR_Q,true); break;
    case 'k': ray(DIR_Q,false); break;
  }
  return out;
}
function attackersOf(b, sq, color){ return Object.keys(b).filter(s => b[s].color===color && s!==sq && attacksFrom(b,s).includes(sq)); }
function hangingPieces(b, color){
  const opp=other(color), res=[];
  for(const s in b){ const p=b[s]; if(p.color!==color || p.type==='k') continue;
    const def=attackersOf(b,s,color);
    const att=attackersOf(b,s,opp).filter(a => b[a].type!=='k' || def.length===0);
    if(!att.length) continue;
    const minA=Math.min(...att.map(a => b[a].type==='k' ? 100 : VAL[b[a].type]));
    if(def.length===0 || minA < VAL[p.type]) res.push({sq:s, piece:p, attackers:att, defended:def.length>0});
  }
  return res;
}
function forkTargets(b, sq){
  const p=b[sq]; if(!p) return []; const opp=other(p.color);
  const t = attacksFrom(b,sq).filter(s => b[s] && b[s].color===opp).filter(s => {
    const q=b[s]; if(q.type==='k') return true; if(VAL[q.type] > VAL[p.type]) return true;
    return VAL[q.type]>=3 && attackersOf(b,s,opp).length===0;
  });
  const big = t.filter(s => b[s].type==='k' || VAL[b[s].type]>=3);
  return big.length>=2 ? big : [];
}
function pinsBy(b, color){
  const res=[];
  for(const s in b){ const p=b[s]; if(p.color!==color || !'brq'.includes(p.type)) continue;
    const dirs = p.type==='b'?DIR_B : p.type==='r'?DIR_R : DIR_Q; const [x,y]=sqXY(s);
    for(const [dx,dy] of dirs){ let nx=x+dx, ny=y+dy, first=null;
      for(;;){ const q=xySq(nx,ny); if(!q) break;
        if(b[q]){ if(!first){ if(b[q].color===color || b[q].type==='k') break; first=q; }
          else { if(b[q].color!==color && (b[q].type==='k' || (VAL[b[q].type]>VAL[b[first].type] && VAL[b[q].type]>=5))) res.push({pinner:s, pinned:first, behind:q, absolute:b[q].type==='k'}); break; } }
        nx+=dx; ny+=dy; } }
  }
  return res;
}
function material(b){ let s=0; for(const k in b){ const v=VAL[b[k].type]; s += b[k].color==='w'?v:-v; } return s; }
/* ---- material counter: captured pieces per side + balance (P1 N3 B3 R5 Q9) ---- */
const START_CNT={p:8,n:2,b:2,r:2,q:1};
function capturedFromFen(fen){ // pieces already missing in a custom start position (promotion-aware heuristic)
  const b=parseFen(fen); const cnt={w:{p:0,n:0,b:0,r:0,q:0}, b:{p:0,n:0,b:0,r:0,q:0}};
  for(const s in b){ const p=b[s]; if(p.type!=='k') cnt[p.color][p.type]++; }
  const caps={w:[], b:[]}; // caps.w = black pieces taken by white
  for(const c of ['w','b']){ const k=cnt[c]; let promo=0; for(const t of 'nbrq') promo+=Math.max(0,k[t]-START_CNT[t]);
    const miss={p:Math.max(0,8-k.p-promo)}; for(const t of 'nbrq') miss[t]=Math.max(0,START_CNT[t]-k[t]);
    for(const t of 'pnbrq') for(let i=0;i<miss[t];i++) caps[other(c)].push(t); }
  return caps;
}
function materialState(startFen, moves, fen){
  // Icons come from replaying the moves that lead to this fen, so stepping
  // backward/forward (review, sidelines, or a PV preview) cannot leave a stale capture.
  const caps = startFen ? capturedFromFen(startFen) : {w:[], b:[]};
  const list = moves || [];
  let replayed = false;
  if(list.length && list.every(m => m && m.from && m.to)){
    try{
      const c = new Chess(startFen || undefined);
      const got = {w:[], b:[]};
      let ok = true;
      for(const m of list){
        const spec = {from:m.from, to:m.to};
        const promo = m.promotion || (m.uci && m.uci.length>4 ? m.uci[4] : '');
        if(promo) spec.promotion = promo;
        const played = c.move(spec);
        if(!played){ ok=false; break; }
        if(played.captured) got[played.color].push(played.captured);
      }
      if(ok){ caps.w = caps.w.concat(got.w); caps.b = caps.b.concat(got.b); replayed = true; }
    }catch(e){ replayed = false; }
  }
  if(!replayed){ for(const m of list){ if(m && m.captured && m.color) caps[m.color].push(m.captured); } }
  const ord='pnbrq'; caps.w.sort((a,b)=>ord.indexOf(a)-ord.indexOf(b)); caps.b.sort((a,b)=>ord.indexOf(a)-ord.indexOf(b));
  return {caps, diff: material(parseFen(fen))}; // diff = white minus black, promotions included via the fen
}
function matHtml(st, color){
  const list=st.caps[color]; const oc=other(color); let h='', last=null, grp='';
  for(const t of list){ if(t!==last){ if(grp) h+=`<span class="grp">${grp}</span>`; grp=''; last=t; } grp+=`<img src="${PIECE_IMG[oc+t]}" alt="${HE[t]}" class="${oc}">`; }
  if(grp) h+=`<span class="grp">${grp}</span>`;
  const adv = color==='w' ? st.diff : -st.diff;
  if(adv>0) h+=`<b class="adv">+${adv}</b>`;
  return h;
}
function renderMaterial(startFen, moves, fen, topColor){
  const st=materialState(startFen, moves, fen);
  const t=$('#topMat'), b=$('#botMat'); if(!t||!b) return st;
  t.innerHTML=matHtml(st, topColor); b.innerHTML=matHtml(st, other(topColor));
  const tip=c=>{ const a=c==='w'?st.diff:-st.diff; return (c==='w'?'הלבן':'השחור')+' לקח: '+(st.caps[c].map(x=>HE[x]).join(', ')||'כלום')+(a>0?` · יתרון חומר +${a}`:''); };
  const apply=(el,color)=>{
    const adv = color==='w' ? st.diff : -st.diff;
    el.title=tip(color);
    el.dataset.adv=String(adv);
    el.dataset.caps=st.caps[color].join('');
  };
  apply(t, topColor); apply(b, other(topColor));
  return st;
}
function nonPawnMaterial(b){ let s=0; for(const k in b){ if(!'pk'.includes(b[k].type)) s+=VAL[b[k].type]; } return s; }

/* ---- chess.js helpers ---- */
function mvFromUci(c, uci){ return c.move({from:uci.slice(0,2), to:uci.slice(2,4), promotion: uci[4] || 'q'}); }
function uciToMove(fen, uci){ if(!uci) return null; const c=new Chess(fen); return mvFromUci(c, uci); }
function pvSanList(fen, pv, n=6){ const c=new Chess(fen); const out=[]; for(const u of (pv||[]).slice(0,n)){ const m=mvFromUci(c,u); if(!m) break; out.push(m.san); } return out; }
function pvPlain(fen, pv, n=8){
  const parts=fen.split(' '); let stm=parts[1], no=+parts[5]||1; const sans=pvSanList(fen,pv,n); let out='';
  sans.forEach((s,i)=>{ if(stm==='w') out+=no+'. '+s+' '; else { out += (i===0? no+'... ':'') + s + ' '; no++; } stm=other(stm); });
  return out.trim();
}
function pvText(fen, pv, n=6){ return san(pvPlain(fen, pv, n)); }
function stmEvalText(l){
  if(!l) return '';
  if(l.terminal==='mate') return 'מט';
  if(l.terminal==='draw') return '0.0';
  if(l.mate!=null) return (l.mate>0?'+':'-')+'M'+Math.abs(l.mate);
  if(l.cp==null) return '';
  const v=l.cp/100, abs=Math.abs(v), num=abs>=10?abs.toFixed(0):abs.toFixed(1);
  return (v>0?'+':v<0?'-':'')+num;
}
function buildLine(fen, pv){
  const c=new Chess(fen); const fens=[c.fen()], moves=[];
  for(const u of (pv||[])){
    if(!u || u.length<4) break;
    const m=mvFromUci(c, u); if(!m) break;
    moves.push({san:m.san, uci:u, from:m.from, to:m.to, color:m.color, piece:m.piece, captured:m.captured||null, promotion:m.promotion||null, flags:m.flags});
    fens.push(c.fen());
  }
  return {fens, moves};
}
function materialAfterLine(fen, pv, minPlies=6){
  const c=new Chess(fen); let i=0, last=null;
  for(const u of (pv||[])){ if(i>=minPlies && !(last && last.captured)) break; if(i>=14) break; const m=mvFromUci(c,u); if(!m) break; last=m; i++; }
  return material(parseFen(c.fen()));
}
function cleanPgn(pgn){
  const headers={}; pgn.replace(/\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]/g, (m,k,v)=>{ headers[k]=v; return ''; });
  let mt = pgn.replace(/\[[^\]]*\]/g,' ');
  mt = mt.replace(/\{[^}]*\}/g,' ').replace(/;[^\n]*/g,' ');
  let prev; do { prev=mt; mt = mt.replace(/\([^()]*\)/g,' '); } while(mt!==prev);
  mt = mt.replace(/\$\d+/g,' ').replace(/\d+\.\.\./g,' ').replace(/[?!]+/g,'').replace(/\s+/g,' ').trim();
  return {headers, movetext: mt};
}
function splitPgns(text){ return text.replace(/\r/g,'').split(/\n\s*\n(?=\s*\[Event )/).map(s=>s.trim()).filter(s=>/\d\./.test(s)); }
function gameFromPgn(pgn){
  const {headers, movetext} = cleanPgn(pgn);
  const c = new Chess(headers.FEN || undefined);
  const toks = movetext.split(' ').filter(t => t && !/^\d+\.$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)).map(t=>t.replace(/^\d+\./,''));
  const startFen = c.fen(); const fens=[startFen], moves=[];
  for(const t of toks){ if(!t) continue; const fenBefore=c.fen(); const m=c.move(t, {sloppy:true}); if(!m) throw new Error('מהלך לא חוקי ב-PGN: '+t);
    moves.push({san:m.san, uci:m.from+m.to+(m.promotion||''), from:m.from, to:m.to, color:m.color, piece:m.piece, captured:m.captured, promotion:m.promotion, flags:m.flags, fenBefore, fenAfter:c.fen()}); fens.push(c.fen()); }
  if(!moves.length) throw new Error('לא נמצאו מהלכים ב-PGN');
  return {headers, fens, moves, startFen};
}

/* ================= Engine ================= */
let SF_URL = null;
function createSFWorker(){
  if(window.SF_JS_SRC && window.SF_WASM_B64){
    if(!SF_URL){
      // Feed the wasm bytes from inside the worker (fetching blob:/file: URLs fails on file:// pages)
      const prefix = 'var __SFB="' + window.SF_WASM_B64 + '";(function(){var bin=atob(__SFB),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);__SFB=null;var of=self.fetch;self.fetch=function(url,o){if(String(url).indexOf("sfwasm:")===0)return Promise.resolve(new Response(u,{status:200,headers:{"Content-Type":"application/wasm"}}));return of.apply(self,arguments);};})();\n';
      const jsUrl=URL.createObjectURL(new Blob([prefix, window.SF_JS_SRC],{type:'text/javascript'}));
      SF_URL = jsUrl + '#' + encodeURIComponent('sfwasm:stockfish.wasm'); }
    return new Worker(SF_URL);
  }
  return new Worker('lib/stockfish-19-lite-single.js');
}
class Engine{
  constructor(name){
    this.name=name; this.listeners=[]; this.gen=0; this.queue=Promise.resolve();
    this.w = createSFWorker();
    this.w.onmessage = e => { const d=e.data; if(typeof d!=='string') return; for(const l of [...this.listeners]) l(d); };
    this.w.onerror = e => { console.error('engine error', e); setEngineStatus('שגיאה בטעינת המנוע', false); };
    this.ready = (async()=>{ this.send('uci'); await this.waitFor(l=>l==='uciok'); this.send('setoption name Hash value 32'); this.send('isready'); await this.waitFor(l=>l==='readyok'); })();
  }
  send(c){ this.w.postMessage(c); }
  waitFor(pred){ return new Promise(res=>{ const f=l=>{ if(pred(l)){ this.listeners.splice(this.listeners.indexOf(f),1); res(l); } }; this.listeners.push(f); }); }
  search(fen, opts={}){ const g=this.gen; const job=this.queue.then(()=> g===this.gen ? this._search(fen,opts) : null); this.queue=job.catch(()=>{}); return job; }
  cancel(){ this.gen++; this.send('stop'); }
  newGame(){ this.queue = this.queue.then(()=>{ this.send('ucinewgame'); this.send('isready'); return this.waitFor(l=>l==='readyok'); }); }
  async _search(fen, {depth=14, multipv=1, movetime=0, skill=20}={}){
    await this.ready;
    // Set on every search. Analysis asks for 3 lines; the engine's own moves pass 1
    // so playing strength and speed stay on a single PV.
    this.send('setoption name MultiPV value '+multipv);
    this.send('setoption name Skill Level value '+skill);
    this.send('position fen '+fen);
    const stm = fen.split(' ')[1]; const lines={};
    return new Promise(res=>{
      const f = l => {
        if(l.startsWith('info ') && l.includes(' pv ') && !l.includes('bound')){
          const g=(re)=>{ const m=l.match(re); return m?m[1]:null; };
          const mp=+(g(/ multipv (\d+)/)||1), d=+g(/ depth (\d+)/), cp=g(/ score cp (-?\d+)/), mate=g(/ score mate (-?\d+)/);
          const pv=l.split(' pv ')[1].trim().split(' ');
          const prev=lines[mp];
          if(!prev || d>=prev.depth) lines[mp] = {depth:d, cp: cp!==null?+cp:null, mate: mate!==null?+mate:null, pv};
        } else if(l.startsWith('bestmove')){
          this.listeners.splice(this.listeners.indexOf(f),1);
          const bm=l.split(' ')[1];
          // keys are multipv indexes starting at 1; numeric sort keeps PV 1 first
          const arr=Object.keys(lines).sort((a,b)=>a-b).map(k=>lines[k]);
          if(!arr.length && bm && bm!=='(none)') arr.push({depth:0, cp:0, mate:null, pv:[bm]});
          // Keep line 0 as PV 1, the move bestmove names, even if a late info line arrived out of order.
          if(arr.length && bm && bm!=='(none)' && (!arr[0].pv || arr[0].pv[0]!==bm)){
            const hit=arr.findIndex(l=>l.pv && l.pv[0]===bm);
            if(hit>0) arr.unshift(arr.splice(hit,1)[0]);
          }
          res({lines:arr, bestmove:bm, stm});
        }
      };
      this.listeners.push(f);
      this.send('go' + (depth?' depth '+depth:'') + (movetime?' movetime '+movetime:''));
    });
  }
}
function setEngineStatus(t, ok){ $('#engineText').textContent=t; $('#engineStatus').classList.toggle('ok', !!ok); }

/* terminal-position aware analysis */
function terminalInfo(fen){ const c=new Chess(fen); if(c.in_checkmate()) return {lines:[{terminal:'mate', mate:0, cp:null, pv:[]}], stm:fen.split(' ')[1], terminal:true};
  if(c.in_stalemate() || c.insufficient_material() || c.in_threefold_repetition()) return {lines:[{terminal:'draw', cp:0, mate:null, pv:[]}], stm:fen.split(' ')[1], terminal:true};
  return null; }
function wpWhite(an){ if(!an) return 50; const l=an.lines[0]; let wp = l.terminal==='mate' ? 0 : l.terminal==='draw' ? 50 : wpLine(l); return an.stm==='w' ? wp : 100-wp; }

/* ================= Board UI ================= */
const PIECE_IMG = {}; ['w','b'].forEach(c=>'kqrbnp'.split('').forEach(t=>{ PIECE_IMG[c+t]='lib/pieces/'+c+t.toUpperCase()+'.svg'; }));
class BoardUI{
  constructor(el, opts={}){
    this.el=el; this.opts=opts; this.flip=false; this.fen='8/8/8/8/8/8/8/8 w - - 0 1'; this.hl=[]; this.arrows=[]; this.badge=null; this.sel=null; this.dots=[]; this.hint=null; this.check=null;
    el.innerHTML='<div class="sqs"></div><svg class="arrows" viewBox="0 0 800 800"></svg>';
    this.sqsEl=el.querySelector('.sqs'); this.svg=el.querySelector('svg');
    el.addEventListener('pointerdown', e=>this.down(e));
    window.addEventListener('pointermove', e=>this.move(e));
    window.addEventListener('pointerup', e=>this.up(e));
  }
  set(o){ Object.assign(this, o); this.render(); }
  sqCenter(sq){ const [x,y]=sqXY(sq); const cx=this.flip?7-x:x, cy=this.flip?y:7-y; return [cx*100+50, cy*100+50]; }
  render(){
    const b=parseFen(this.fen); let h='';
    for(let r=0;r<8;r++) for(let f=0;f<8;f++){
      const x=this.flip?7-f:f, y=this.flip?r:7-r; const sq=xySq(x,y); const light=(x+y)%2===1;
      const cls=['sq', light?'l':'d']; if(this.hl.includes(sq)) cls.push('hl'); if(this.sel===sq) cls.push('sel'); if(this.check===sq) cls.push('chk'); if(this.hint===sq) cls.push('hint');
      let inner=''; const p=b[sq];
      if(p) inner+=`<img src="${PIECE_IMG[p.color+p.type]}" alt="" draggable="false" ${this.dragFrom===sq?'style="opacity:.25"':''}>`;
      if(this.dots.includes(sq)) inner+= p?'<div class="ring"></div>':'<div class="dot"></div>';
      if(r===7) inner+=`<span class="cf" style="right:auto;left:3px">${'abcdefgh'[x]}</span>`;
      if(f===0) inner+=`<span class="cr">${y+1}</span>`;
      if(this.badge && this.badge.sq===sq) inner+=`<div class="badge" style="background:${this.badge.color}">${this.badge.sym}</div>`;
      h+=`<div class="${cls.join(' ')}" data-sq="${sq}">${inner}</div>`;
    }
    this.el.dataset.fen=this.fen;
    this.sqsEl.innerHTML=h;
    let s='<defs>'; const cols=[...new Set(this.arrows.map(a=>a.color))]; cols.forEach((c,i)=>{ s+=`<marker id="ah${i}" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="${c}"/></marker>`; }); s+='</defs>';
    for(const a of this.arrows){ const [x1,y1]=this.sqCenter(a.from), [x2,y2]=this.sqCenter(a.to); const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy); const ex=x2-dx/len*28, ey=y2-dy/len*28;
      s+=`<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" stroke="${a.color}" stroke-width="${a.w||18}" stroke-linecap="round" opacity="${a.op||.85}" marker-end="url(#ah${cols.indexOf(a.color)})"/>`; }
    this.svg.innerHTML=s;
  }
  sqAt(x,y){ const r=this.el.getBoundingClientRect(); if(x<r.left||x>r.right||y<r.top||y>r.bottom) return null; let f=Math.floor((x-r.left)/r.width*8), rr=Math.floor((y-r.top)/r.height*8); f=Math.min(7,Math.max(0,f)); rr=Math.min(7,Math.max(0,rr)); return this.flip? xySq(7-f, rr) : xySq(f, 7-rr); }
  down(e){
    if(!this.opts.interactive || !this.opts.interactive()) return;
    const sq=this.sqAt(e.clientX,e.clientY); if(!sq) return; e.preventDefault();
    if(this.sel && this.dots.includes(sq)){ const from=this.sel; this.clearSel(); this.opts.onMove(from, sq); return; }
    const b=parseFen(this.fen); const p=b[sq];
    if(p && this.opts.canPick(p.color)){
      this.sel=sq; this.dots=this.opts.targets(sq); this.dragFrom=sq; this.render();
      const img=document.createElement('img'); img.src=PIECE_IMG[p.color+p.type]; img.className='ghost'; const size=this.el.getBoundingClientRect().width/8; img.style.width=img.style.height=size+'px'; img.style.left=e.clientX+'px'; img.style.top=e.clientY+'px'; document.body.appendChild(img); this.ghost=img;
    } else this.clearSel();
  }
  move(e){ if(this.ghost){ this.ghost.style.left=e.clientX+'px'; this.ghost.style.top=e.clientY+'px'; } }
  up(e){
    if(!this.ghost) return; this.ghost.remove(); this.ghost=null; const from=this.dragFrom; this.dragFrom=null;
    const sq=this.sqAt(e.clientX,e.clientY);
    if(sq && sq!==from && this.dots.includes(sq)){ this.clearSel(); this.opts.onMove(from, sq); return; }
    this.render();
  }
  clearSel(){ this.sel=null; this.dots=[]; this.dragFrom=null; this.render(); }
}
function setEvalBar(wpW, text, flip){
  const bar=$('#evalbar'); bar.classList.toggle('flip', flip);
  $('#evalW').style.height = Math.max(2, Math.min(98, wpW)) + '%';
  const whiteAhead = wpW>=50;
  const top=$('#evalTop'), bot=$('#evalBot');
  // label sits on the side of whoever is ahead
  const onBottom = flip ? !whiteAhead : whiteAhead;
  top.textContent = onBottom ? '' : text; bot.textContent = onBottom ? text : '';
  top.style.color = whiteAhead ? '#222' : '#eee'; bot.style.color = whiteAhead ? '#222' : '#eee';
}

/* ================= Openings (small ECO list, Hebrew names) ================= */
const OPENINGS = [
 ['e4','פתיחת רגלי המלך',"King's Pawn"],['d4','פתיחת רגלי המלכה',"Queen's Pawn"],['c4','הפתיחה האנגלית','English Opening'],['Nf3','פתיחת רטי','Réti Opening'],
 ['f4','פתיחת בירד',"Bird's Opening"],['b3','פתיחת לרסן','Nimzo-Larsen'],['g3','פתיחת בניקו (פיאנקטו)','Benko/Hungarian'],['e3',"פתיחת ואן קרויק","Van 't Kruijs"],
 ['e4 e5','משחק פתוח',"Open Game"],['e4 e5 Nf3','פתיחת פרש המלך',"King's Knight"],['e4 e5 Nf3 Nc6','משחק פתוח – פרשים',"King's Knight"],
 ['e4 e5 Nf3 Nc6 Bb5','הפתיחה הספרדית (רואי לופז)','Ruy Lopez'],['e4 e5 Nf3 Nc6 Bb5 a6','ספרדית – וריאנט מורפי','Ruy Lopez: Morphy'],['e4 e5 Nf3 Nc6 Bb5 Nf6','ספרדית – ההגנה הברלינאית','Ruy Lopez: Berlin'],
 ['e4 e5 Nf3 Nc6 Bc4','הפתיחה האיטלקית','Italian Game'],['e4 e5 Nf3 Nc6 Bc4 Bc5','ג׳וקו פיאנו','Giuoco Piano'],['e4 e5 Nf3 Nc6 Bc4 Bc5 c3','ג׳וקו פיאנו – c3','Giuoco Piano: Main'],
 ['e4 e5 Nf3 Nc6 Bc4 Bc5 b4','גמביט אוונס','Evans Gambit'],['e4 e5 Nf3 Nc6 Bc4 Nf6','הגנת שני הפרשים','Two Knights Defense'],['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5','שני הפרשים – התקפת Ng5','Two Knights: Knight Attack'],
 ['e4 e5 Nf3 Nc6 Bc4 Be7','ההגנה ההונגרית','Hungarian Defense'],['e4 e5 Nf3 Nc6 d4','הפתיחה הסקוטית','Scotch Game'],['e4 e5 Nf3 Nc6 Nc3','ארבעת הפרשים (שלושה)','Three Knights'],
 ['e4 e5 Nf3 Nc6 Nc3 Nf6','פתיחת ארבעת הפרשים','Four Knights'],['e4 e5 Nf3 Nc6 c3','פתיחת פונציאני','Ponziani'],['e4 e5 Nf3 Nf6','ההגנה הרוסית (פטרוב)','Petrov Defense'],
 ['e4 e5 Nf3 d6','הגנת פילידור','Philidor Defense'],['e4 e5 Nf3 f6','הגנת דמיאנו','Damiano Defense'],['e4 e5 Nf3 d5','גמביט אלבין-לטבי','Elephant Gambit'],['e4 e5 Nf3 f5','הגמביט הלטבי','Latvian Gambit'],
 ['e4 e5 f4','גמביט המלך',"King's Gambit"],['e4 e5 f4 exf4','גמביט המלך המקובל',"King's Gambit Accepted"],['e4 e5 Nc3','הפתיחה הווינאית','Vienna Game'],['e4 e5 Bc4','פתיחת הרץ',"Bishop's Opening"],
 ['e4 e5 Qh5','פתיחת פרהם (מלכה מוקדמת)','Parham Attack'],['e4 e5 d4','משחק המרכז','Center Game'],['e4 e5 d4 exd4 c3','הגמביט הדני','Danish Gambit'],['e4 e5 Ke2','פתיחת "בונגקלאוד"','Bongcloud'],
 ['e4 c5','ההגנה הסיציליאנית','Sicilian Defense'],['e4 c5 Nf3','סיציליאנית – Nf3','Sicilian'],['e4 c5 Nf3 d6','סיציליאנית – d6','Sicilian: Modern'],['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6','סיציליאנית – נאידורף','Sicilian: Najdorf'],
 ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6','סיציליאנית – הדרקון','Sicilian: Dragon'],['e4 c5 Nf3 Nc6','סיציליאנית – Nc6','Sicilian: Old'],['e4 c5 Nf3 e6','סיציליאנית – e6','Sicilian: French Var.'],
 ['e4 c5 Nf3 d6 Bb5+','סיציליאנית – וריאנט מוסקבה','Sicilian: Moscow'],['e4 c5 Nf3 Nc6 Bb5','סיציליאנית – רוסולימו','Sicilian: Rossolimo'],['e4 c5 c3','סיציליאנית – אלאפין','Sicilian: Alapin'],
 ['e4 c5 Nc3','סיציליאנית סגורה','Closed Sicilian'],['e4 c5 d4 cxd4 c3','גמביט סמית׳-מורה','Smith-Morra Gambit'],['e4 c5 f4','סיציליאנית – התקפת גרנד פרי','Grand Prix Attack'],
 ['e4 e6','ההגנה הצרפתית','French Defense'],['e4 e6 d4 d5','ההגנה הצרפתית','French Defense'],['e4 e6 d4 d5 e5','צרפתית – וריאנט ההתקדמות','French: Advance'],['e4 e6 d4 d5 exd5','צרפתית – וריאנט החילוף','French: Exchange'],
 ['e4 e6 d4 d5 Nc3 Bb4','צרפתית – וינאוור','French: Winawer'],['e4 e6 d4 d5 Nc3 Nf6','צרפתית – קלאסית','French: Classical'],['e4 e6 d4 d5 Nd2','צרפתית – טראש','French: Tarrasch'],
 ['e4 c6','הגנת קרו-קאן','Caro-Kann'],['e4 c6 d4 d5','הגנת קרו-קאן','Caro-Kann'],['e4 c6 d4 d5 e5','קרו-קאן – וריאנט ההתקדמות','Caro-Kann: Advance'],['e4 c6 d4 d5 exd5 cxd5','קרו-קאן – וריאנט החילוף','Caro-Kann: Exchange'],
 ['e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5','קרו-קאן – קלאסית','Caro-Kann: Classical'],['e4 d5','ההגנה הסקנדינבית','Scandinavian'],['e4 d5 exd5 Qxd5','סקנדינבית – Qxd5','Scandinavian: Main'],
 ['e4 d6','הגנת פירץ','Pirc Defense'],['e4 g6','ההגנה המודרנית','Modern Defense'],['e4 Nf6','הגנת אלכין','Alekhine Defense'],['e4 Nc6','הגנת נימצוביץ׳','Nimzowitsch Defense'],['e4 b6','הגנת אוון',"Owen's Defense"],
 ['d4 d5','משחק רגלי המלכה',"Queen's Pawn Game"],['d4 d5 c4','גמביט המלכה',"Queen's Gambit"],['d4 d5 c4 e6','גמביט המלכה הנדחה',"QGD"],['d4 d5 c4 dxc4','גמביט המלכה המקובל',"QGA"],
 ['d4 d5 c4 c6','ההגנה הסלאבית','Slav Defense'],['d4 d5 c4 c6 Nf3 Nf6 Nc3 e6','ההגנה החצי-סלאבית','Semi-Slav'],['d4 d5 c4 e5','קונטר-גמביט אלבין','Albin Countergambit'],['d4 d5 c4 Nc6','הגנת צ׳יגורין','Chigorin'],
 ['d4 d5 Bf4','מערך לונדון','London System'],['d4 d5 Nf3 Nf6 Bf4','מערך לונדון','London System'],['d4 Nf6 Bf4','מערך לונדון','London System'],['d4 d5 Nf3 Nf6 Bf4 e6','מערך לונדון','London System'],
 ['d4 d5 e3','מערך קולה','Colle System'],['d4 d5 Bg5','פתיחת ורסוב/לוי','Levitsky Attack'],['d4 d5 e4','גמביט בלקמר-דימר','Blackmar-Diemer'],['d4 Nf6','הגנות הודיות','Indian Defense'],
 ['d4 Nf6 c4','הגנות הודיות','Indian Defense'],['d4 Nf6 c4 g6','הגנה הודית של המלך','King\'s Indian'],['d4 Nf6 c4 g6 Nc3 Bg7','הגנה הודית של המלך','King\'s Indian'],['d4 Nf6 c4 g6 Nc3 d5','הגנת גרינפלד','Grünfeld'],
 ['d4 Nf6 c4 e6','הגנות הודיות – e6','Indian: e6'],['d4 Nf6 c4 e6 Nc3 Bb4','ההגנה הנימצו-הודית','Nimzo-Indian'],['d4 Nf6 c4 e6 Nf3 b6','הגנה הודית של המלכה',"Queen's Indian"],['d4 Nf6 c4 e6 g3','הפתיחה הקטלאנית','Catalan'],
 ['d4 Nf6 c4 c5','בנוני','Benoni'],['d4 Nf6 c4 c5 d5 b5','גמביט בנקו','Benko Gambit'],['d4 Nf6 c4 e5','גמביט בודפשט','Budapest Gambit'],['d4 Nf6 Bg5','התקפת טרומפובסקי','Trompowsky'],
 ['d4 f5','ההגנה ההולנדית','Dutch Defense'],['d4 e6','הגנת רגלי המלכה – e6',"Queen's Pawn: e6"],['d4 d6','הגנת רגלי המלכה – d6',"Queen's Pawn: d6"],['d4 g6','ההגנה המודרנית','Modern Defense'],
 ['c4 e5','אנגלית – סיציליאנית הפוכה','English: Reversed Sicilian'],['c4 Nf6','אנגלית – אנגלו-הודית','English: Anglo-Indian'],['c4 c5','אנגלית – סימטרית','English: Symmetrical'],
 ['Nf3 d5','פתיחת רטי','Réti'],['Nf3 Nf6','פתיחת רטי','Réti'],['Nf3 d5 g3','התקפה הודית של המלך','King\'s Indian Attack'],
];
const OPEN_MAP = OPENINGS.map(([m,he,en])=>({moves:m.split(' '), he, en}));
function detectOpening(sans){
  const clean = sans.map(s=>s.replace(/[+#]/g,''));
  let best=null;
  for(const o of OPEN_MAP){ if(o.moves.length>clean.length) continue; if(o.moves.every((m,i)=>m.replace(/[+#]/g,'')===clean[i])) if(!best || o.moves.length>best.moves.length) best=o; }
  return best;
}
