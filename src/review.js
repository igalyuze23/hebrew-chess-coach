/* ================= Classification & Explanations ================= */
const CLS = {
  brilliant:{he:'מבריק', sym:'!!', color:'var(--c-brilliant)', hex:'#1baca6'},
  great:{he:'מהלך גדול', sym:'!', color:'var(--c-great)', hex:'#5c8bb0'},
  best:{he:'הטוב ביותר', sym:'★', color:'var(--c-best)', hex:'#81b64c'},
  excellent:{he:'מצוין', sym:'✓', color:'var(--c-excellent)', hex:'#96bc4b'},
  good:{he:'טוב', sym:'✓', color:'var(--c-good)', hex:'#8aa57a'},
  book:{he:'ספר (תיאוריה)', sym:'≡', color:'var(--c-book)', hex:'#a88865'},
  inaccuracy:{he:'אי-דיוק', sym:'?!', color:'var(--c-inaccuracy)', hex:'#f0c037'},
  mistake:{he:'טעות', sym:'?', color:'var(--c-mistake)', hex:'#e58f2a'},
  miss:{he:'החמצה', sym:'✗', color:'var(--c-miss)', hex:'#ee6b55'},
  blunder:{he:'טעות גסה', sym:'??', color:'var(--c-blunder)', hex:'#ca3431'},
};
const CLS_ORDER=['brilliant','great','best','excellent','good','book','inaccuracy','mistake','miss','blunder'];
const ci = k => `<span class="ci" style="background:${CLS[k].hex}">${CLS[k].sym}</span>`;

function povText(l, sign){ if(l.terminal==='mate') return sign>0?'מט':'מט'; if(l.mate!=null) return (l.mate*sign>0?'M':'-M')+Math.abs(l.mate); const v=l.cp*sign/100; return (v>0?'+':'')+v.toFixed(1); }
function gv(t,m,f){ return t==='q'?f:m; }
function sacrificeInfo(mv){
  // is the moved piece left en prise so that the opponent can win material by taking it?
  if(mv.piece==='p' || mv.piece==='k') return null;
  const b=parseFen(mv.fenAfter); const p=b[mv.to]; if(!p) return null;
  const opp=other(mv.color);
  const c=new Chess(mv.fenAfter); const caps=c.moves({verbose:true}).filter(m=>m.to===mv.to);
  if(!caps.length) return null;
  const minCap=Math.min(...caps.map(m=>m.piece==='k'?100:VAL[m.piece]));
  const def=attackersOf(b,mv.to,mv.color).length;
  const gained = mv.captured ? VAL[mv.captured] : 0;
  const risk = def ? Math.max(0, VAL[p.type]-minCap) : VAL[p.type];
  if(risk - gained >= 1 && VAL[p.type]>=3) return {piece:p.type, net:risk-gained};
  return null;
}

function classify(mv, anB, anA, ply, bookLen, prevCls, prevMv){
  const mover=mv.color;
  const lB=anB.lines[0], lA=anA.lines[0];
  const wpB = wpLine(lB);                     // mover POV (mover is stm before)
  const wpA = lA.terminal==='mate' ? 100 : lA.terminal==='draw' ? 50 : 100 - wpLine(lA); // stm after = opponent
  let loss = Math.max(0, wpB - wpA);
  const bestUci = lB.pv && lB.pv[0];
  const isBest = mv.uci===bestUci || (lA.terminal==='mate');
  if(isBest) loss=0;
  let cls;
  if(ply < bookLen && loss < 6) cls='book';
  else if(isBest){
    cls='best';
    const second = anB.lines[1];
    const legal = new Chess(mv.fenBefore).moves().length;
    const sac = sacrificeInfo(mv);
    if(sac && wpA >= 50 && (wpB < 98 || (lB.mate!=null && lB.mate>0))) cls='brilliant';
    else if(second && legal>1 && wpB < 97 && (wpB - wpLine(second)) >= 15 && !(mv.captured && prevMv && prevMv.captured && prevMv.to===mv.to)) cls='great';
  }
  else if(loss < 2) cls='excellent';
  else if(loss < 5) cls='good';
  else if(loss < 10) cls='inaccuracy';
  else {
    const hadWin = wpB >= 75 || (lB.mate!=null && lB.mate>0);
    const oppErred = prevCls==='mistake' || prevCls==='blunder' || prevCls==='miss';
    if(hadWin && wpA >= 40 && (oppErred || wpB>=85)) cls='miss';
    else cls = loss < 20 ? 'mistake' : 'blunder';
  }
  return {cls, loss, wpB, wpA, isBest, acc: moveAccuracy(loss)};
}
function prevCaptureOn(mv){ // simple recapture detection: previous position had a piece of ours captured on this square
  return false;
}

function phaseOf(fen, ply){ const b=parseFen(fen); if(ply<20 && nonPawnMaterial(b)>=26) return 'opening'; if(nonPawnMaterial(b)<=14) return 'endgame'; return 'middlegame'; }

/* Hebrew explanation (rule-based on top of engine output). Returns {html, tags} */
function explainMove(mv, anB, anA, res, opening){
  const out=[]; const tags=new Set();
  const mover=mv.color, opp=other(mover);
  const lB=anB.lines[0], lA=anA.lines[0];
  const bB=parseFen(mv.fenBefore), bA=parseFen(mv.fenAfter);
  const bestUci=lB.pv && lB.pv[0];
  const best = bestUci ? uciToMove(mv.fenBefore, bestUci) : null;
  const bad = ['inaccuracy','mistake','blunder','miss'].includes(res.cls);
  const c = new Chess(mv.fenAfter);

  // --- what the move itself does ---
  const self=[];
  if(c.in_checkmate()) self.push('זה <b>מט</b>! סוף המשחק.');
  else {
    if(mv.captured) self.push(`המהלך לוקח את ${HED[mv.captured]} ב-${sqh(mv.to)}.`);
    const ft=forkTargets(bA, mv.to);
    if(ft.length) { self.push(`<b>מזלג!</b> ${HED[mv.piece]} ב-${sqh(mv.to)} ${gv(mv.piece,'תוקף','תוקפת')} בבת אחת את ${ft.map(s=>HED[bA[s].type]+' ב-'+sqh(s)).join(' ואת ')}.`); tags.add('didFork'); }
    const pinsNew = pinsBy(bA, mover).filter(p=>p.pinner===mv.to);
    if(pinsNew.length){ const p=pinsNew[0]; self.push(`נוצרת <b>הצמדה</b> על ${HED[bA[p.pinned].type]} ב-${sqh(p.pinned)}, מול ${HED[bA[p.behind].type]} ב-${sqh(p.behind)}${p.absolute?' (הצמדה מוחלטת: אסור לו לזוז)':''}.`); }
    if(c.in_check() && !self.length) self.push('המהלך נותן <b>שח</b>.');
    if(mv.flags.includes('k')||mv.flags.includes('q')) self.push('הצרחה – המלך עובר למקום בטוח והצריח נכנס למשחק.');
  }

  if(res.cls==='book') out.push(`מהלך תיאורטי${opening?` מתוך <b>${opening.he}</b>`:''}. ככה משחקים שחקנים חזקים בפתיחה הזו.`);
  else if(res.cls==='brilliant'){ const s=sacrificeInfo(mv); out.push(`<b>הקרבה מבריקה!</b> ${s?`${HED[s.piece]} ב-${sqh(mv.to)} ${gv(s.piece,'נשאר','נשארת')} להכאה`:'החומר מוקרב'}, אבל המנוע מאשר שזה המהלך החזק ביותר בעמדה.`); }
  else if(res.cls==='great') out.push('<b>המהלך היחיד</b> ששומר על העמדה. כל מהלך אחר היה גרוע בהרבה. כל הכבוד על המציאה!');
  else if(res.cls==='best') out.push('זה המהלך הטוב ביותר לפי המנוע.');
  else if(res.cls==='excellent') out.push(`מהלך מצוין, כמעט טוב כמו המהלך של המנוע (${best?san(best.san):''}).`);
  else if(res.cls==='good') out.push(`מהלך סביר, אבל ${best?san(best.san):'מהלך אחר'} היה מדויק יותר.`);
  self.forEach(s=>out.push(s));

  if(bad && best){
    // mates
    if(lB.mate!=null && lB.mate>0 && !(lA.mate!=null && lA.mate<0)){
      out.push(`היה <b>מט ב-${lB.mate}</b>: ${pvText(mv.fenBefore, lB.pv, Math.min(lB.mate*2-1, 9))}`); tags.add('missedMate');
    }
    if(lA.mate!=null && lA.mate>0 && !(lB.mate!=null && lB.mate<0)){
      out.push(`⚠️ אחרי המהלך הזה ליריב יש <b>מט ב-${lA.mate}</b>: ${pvText(mv.fenAfter, lA.pv, Math.min(lA.mate*2-1, 9))}`); tags.add('allowedMate');
    }
    out.push(`המהלך הטוב יותר היה ${san(best.san)}. המשך אפשרי: ${pvText(mv.fenBefore, lB.pv, 6)}`);

    // what the best move would have achieved
    if(best.captured){
      const hangOpp = hangingPieces(bB, opp).map(h=>h.sq);
      if(hangOpp.includes(best.to)){ out.push(`פוספסה <b>לקיחה חינמית</b>: ${HED[best.captured]} ב-${sqh(best.to)} ${gv(best.captured,'לא היה מוגן מספיק','לא הייתה מוגנת מספיק')}.`); tags.add('missedCapture'); }
    }
    { const cc=new Chess(mv.fenBefore); mvFromUci(cc,bestUci); const bb=parseFen(cc.fen()); const ft=forkTargets(bb,best.to); if(ft.length){ out.push(`${san(best.san)} היה יוצר <b>מזלג</b> על ${ft.map(s=>HED[bb[s].type]+' ב-'+sqh(s)).join(' ועל ')}.`); tags.add('missedFork'); } }

    // what the move allowed: opponent best reply
    const nBefore = out.length;
    const replyUci = lA.pv && lA.pv[0];
    if(replyUci){
      const cc=new Chess(mv.fenAfter); const reply=mvFromUci(cc, replyUci);
      if(reply){
        const bR=parseFen(cc.fen());
        const hangAfter = hangingPieces(bA, mover); const hangBefore = hangingPieces(bB, mover);
        const hangSqs = hangAfter.map(h=>h.sq);
        if(reply.captured && hangSqs.includes(reply.to)){
          const wasThreat = hangBefore.some(h=>h.sq===reply.to) && mv.from!==reply.to;
          if(reply.to===mv.to) { out.push(`${HED[mv.piece]} ${gv(mv.piece,'שעבר','שעברה')} ל-${sqh(mv.to)} <b>${gv(mv.piece,'לא מוגן מספיק','לא מוגנת מספיק')}</b>, והיריב יכול לאכול ${gv(mv.piece,'אותו','אותה')}: ${san(reply.san)}.`); tags.add('hanging'); }
          else if(wasThreat){ out.push(`המהלך <b>מתעלם מהאיום</b> על ${HED[reply.captured]} ב-${sqh(reply.to)}. היריב פשוט לוקח: ${san(reply.san)}.`); tags.add('ignoredThreat'); }
          else { out.push(`המהלך משאיר את ${HED[reply.captured]} ב-${sqh(reply.to)} <b>${gv(reply.captured,'תלוי','תלויה')}</b> (בלי הגנה מספקת): ${san(reply.san)}.`); tags.add('hanging'); }
        } else if(reply.captured){ out.push(`התגובה החזקה של היריב: ${san(reply.san)}, שלוקח את ${HED[reply.captured]}.`); }
        const ft=forkTargets(bR, reply.to);
        if(ft.length){ out.push(`היריב עונה ${san(reply.san)} ועושה <b>מזלג</b> על ${ft.map(s=>HED[bR[s].type]+' ב-'+sqh(s)).join(' ועל ')}.`); tags.add('allowedFork'); }
        const pins = pinsBy(bR, opp).filter(p=>p.pinner===reply.to);
        if(pins.length){ const p=pins[0]; out.push(`היריב עונה ${san(reply.san)} ויוצר <b>הצמדה</b> על ${HED[bR[p.pinned].type]} ב-${sqh(p.pinned)}, מול ${HED[bR[p.behind].type]}.`); tags.add('allowedPin'); }
        if(!reply.captured && !ft.length && !pins.length && !(lA.mate>0)) { out.push(`${reply.san.includes('+')?'היריב עונה <b>בשח</b> ומרוויח זמן: ':'התגובה הטובה ביותר של היריב: '}${pvText(mv.fenAfter, lA.pv, 4)}`); }
      }
    }
    // material comparison
    const sign = mover==='w'?1:-1;
    const matBest = sign*materialAfterLine(mv.fenBefore, lB.pv);
    const matPlayed = sign*materialAfterLine(mv.fenAfter, lA.pv);
    const diff = matBest - matPlayed;
    if(diff >= 2 && !(lA.mate>0)){
      const eq = diff>=8?'בערך מלכה':diff>=5?'בערך צריח':diff>=3?'בערך כלי קל':diff+' רגלים';
      out.push(`בהשוואה למהלך הטוב ביותר, המהלך הזה עולה <b>${diff} נקודות חומר</b> (${eq}).`); tags.add('lostMaterial');
    }
    const tactical = [...tags].some(t=>t!=='didFork');
    if(res.cls==='miss') out.push('היריב נתן הזדמנות, והיא לא נוצלה. כדאי תמיד לשאול אחרי טעות של היריב: "מה הוא השאיר לא מוגן? יש שח, לקיחה או איום חזק?"');
    if(!tactical) out.push(`אין כאן טקטיקה מיידית, אבל העמדה נחלשת: לפי המנוע, ההערכה מנקודת המבט של ${mover==='w'?'הלבן':'השחור'} ירדה מ־${san(povText(lB,1))} ל־${san(povText(lA,-1))}. ${san(best.san)} שומר על עמדה טובה יותר.`);
  }
  return {html: out, tags:[...tags]};
}

/* ================= Review state & UI ================= */
const R = { game:null, an:[], res:[], exp:[], cur:0, flip:false, token:0, analyzing:false, userColor:null, opening:null, bookLen:0 };
let coach=null, board=null;

function userColorFor(headers){
  const names=[LS.get('chesscom_user','Nibl82'), LS.get('lichess_user','Igalyuze23')].map(s=>s.toLowerCase());
  if(names.includes((headers.White||'').toLowerCase())) return 'w';
  if(names.includes((headers.Black||'').toLowerCase())) return 'b';
  return null;
}

async function startReview(pgn){
  let g; try{ g=gameFromPgn(pgn); }catch(e){ $('#importMsg').innerHTML='<span style="color:#ff8a87">'+esc(e.message)+'</span>'; return; }
  if(coach) coach.cancel(); stopAuto();
  const token=++R.token;
  Object.assign(R, {game:g, an:new Array(g.fens.length).fill(null), res:[], exp:[], cur:0, analyzing:true});
  R.userColor = userColorFor(g.headers);
  R.flip = R.userColor==='b';
  const op = detectOpening(g.moves.map(m=>m.san));
  R.opening = op; R.bookLen = op ? op.moves.length : 0;
  ['#explainCard','#graphCard','#progressCard'].forEach(s=>$(s).classList.remove('hidden')); document.body.classList.add('has-game');
  $('#summaryCard').classList.add('hidden');
  $('#openingName').innerHTML = op ? `📖 ${op.he} <span class="muted">(${op.en})</span>` : (g.headers.Opening ? '📖 '+esc(g.headers.Opening) : '');
  renderMoves(); renderReview();
  const depth=+$('#depthSel').value; const N=g.fens.length; const t0=performance.now();
  for(let i=0;i<N;i++){
    if(token!==R.token) return;
    const fen=g.fens[i];
    let an = terminalInfo(fen);
    if(!an){ an = await coach.search(fen, {depth, multipv:2}); }
    if(token!==R.token || !an) return;
    R.an[i]=an;
    if(i>0) computeMove(i-1);
    const pct=Math.round((i+1)/N*100); $('#progressBar').style.width=pct+'%';
    const el=(performance.now()-t0)/1000, eta=Math.round(el/(i+1)*(N-i-1));
    $('#progressText').textContent=`מנתח… ${i+1}/${N} עמדות · נותרו כ-${eta} שניות`;
    if(i % 2===1 || i===N-1){ renderMoves(); renderGraph(); if(R.cur===i || R.cur===i+1 || R.cur===0) renderReview(); }
  }
  R.analyzing=false; $('#progressCard').classList.add('hidden');
  renderMoves(); renderGraph(); renderSummary(); renderReview();
  document.body.dataset.analysis='done';
}
function computeMove(k){
  const mv=R.game.moves[k];
  const prev = k>0 && R.res[k-1] ? R.res[k-1].cls : null;
  const res = classify(mv, R.an[k], R.an[k+1], k, R.bookLen, prev, k>0?R.game.moves[k-1]:null);
  res.phase = phaseOf(mv.fenBefore, k);
  R.res[k]=res; R.exp[k]=explainMove(mv, R.an[k], R.an[k+1], res, R.opening);
}
function goto(i, fromAuto){ if(!R.game) return; if(!fromAuto) stopAuto(); const prev=R.cur; R.cur=Math.max(0, Math.min(R.game.fens.length-1, i)); renderReview(); if(!fromAuto && R.cur!==prev) narrateReview(R.cur); }

function playerLabel(color){
  const h=R.game?R.game.headers:{}; const name = color==='w'?(h.White||'לבן'):(h.Black||'שחור'); const elo = color==='w'?h.WhiteElo:h.BlackElo;
  const you = R.userColor===color ? ' <span class="tag">אתה</span>':'';
  return `<span class="sw" style="background:${color==='w'?'#fff':'#222'}"></span><b style="direction:ltr">${esc(name)}</b>${elo?` <span class="muted">(${esc(elo)})</span>`:''}${you}`;
}
function renderReview(){
  if(currentTab!=='review') return;
  const g=R.game; if(!g){ board.set({fen:new Chess().fen(), hl:[], arrows:[], badge:null, flip:R.flip}); setEvalBar(50,'0.0',R.flip); return; }
  const i=R.cur; const fen=g.fens[i];
  const mv=i>0?g.moves[i-1]:null; const res=i>0?R.res[i-1]:null;
  const arrows=[];
  if(mv && res && !res.isBest && res.cls!=='book'){ const bu=R.an[i-1].lines[0].pv[0]; if(bu) arrows.push({from:bu.slice(0,2), to:bu.slice(2,4), color:'#81b64c'}); }
  else if(R.an[i] && R.an[i].lines[0].pv && R.an[i].lines[0].pv[0] && i<g.fens.length-1){ const bu=R.an[i].lines[0].pv[0]; arrows.push({from:bu.slice(0,2), to:bu.slice(2,4), color:'#4aa3ff', w:12, op:.6}); }
  const c=new Chess(fen); let chk=null; if(c.in_check()){ const b=parseFen(fen); chk=Object.keys(b).find(s=>b[s].type==='k'&&b[s].color===c.turn()); }
  board.set({fen, flip:R.flip, hl: mv?[mv.from,mv.to]:[], arrows, check:chk, badge: res?{sq:mv.to, sym:CLS[res.cls].sym, color:CLS[res.cls].hex}:null});
  const an=R.an[i]; if(an) setEvalBar(wpWhite(an), shortEval(an.lines[0], an.stm), R.flip); 
  $('#topPlayer').innerHTML=playerLabel(R.flip?'w':'b'); $('#botPlayer').innerHTML=playerLabel(R.flip?'b':'w');
  // explanation
  const box=$('#explainBox');
  if(!mv){ box.innerHTML = `<div class="head">♟️ עמדת הפתיחה</div><div class="muted">השתמש בחצים ← → או לחץ על מהלך כדי לעבור על המשחק. ${R.analyzing?'הניתוח רץ ברקע…':'הסיכום המלא נמצא למטה.'}</div>`; }
  else if(!res){ box.innerHTML = `<div class="head">${san(moveNo(i-1)+mv.san)}</div><div class="muted">מנתח את המהלך הזה…</div>`; }
  else {
    const e=R.exp[i-1]; const anB=R.an[i-1], anA=R.an[i];
    box.innerHTML = `<div class="head">${ci(res.cls)}<span>${san(moveNo(i-1)+mv.san)} – ${CLS[res.cls].he}</span></div>
      <ul>${e.html.map(x=>`<li>${x}</li>`).join('')}</ul>
      <div class="evalline">הערכה: ${san(evalText(anB.lines[0], anB.stm))} ← לפני · אחרי → ${san(evalText(anA.lines[0], anA.stm))} · דיוק המהלך: ${Math.round(res.acc)}%</div>`;
  }
  $$('.mv').forEach(el=>el.classList.toggle('cur', +el.dataset.ply===i));
  const cur=$('.mv.cur'); if(cur){ const box2=$('#movesBox'); const r1=cur.getBoundingClientRect(), r2=box2.getBoundingClientRect(); if(r1.top<r2.top||r1.bottom>r2.bottom) box2.scrollTop += r1.top-r2.top-box2.clientHeight/2; }
  renderGraphCursor();
}
function moveNo(k){ return Math.floor(k/2)+1 + (k%2===0?'. ':'... '); }
function renderMoves(){
  const g=R.game; if(!g) return; let h='<table>';
  for(let k=0;k<g.moves.length;k+=2){
    const cell=j=>{ if(j>=g.moves.length) return '<td></td>'; const r=R.res[j]; return `<td><span class="mv" data-ply="${j+1}">${r?ci(r.cls):''}${g.moves[j].san}</span></td>`; };
    h+=`<tr><td class="no">${k/2+1}.</td>${cell(k)}${cell(k+1)}</tr>`;
  }
  $('#movesBox').innerHTML=h+'</table>';
  $$('#movesBox .mv').forEach(el=>el.onclick=()=>goto(+el.dataset.ply));
  $$('.mv').forEach(el=>el.classList.toggle('cur', +el.dataset.ply===R.cur));
}
function renderGraph(){
  const g=R.game; if(!g) return; const N=g.fens.length; const W=1000,H=100;
  const pts=[]; for(let i=0;i<N;i++){ if(!R.an[i]) break; pts.push([N>1? i/(N-1)*W : 0, H - wpWhite(R.an[i])/100*H]); }
  let s=`<rect x="0" y="0" width="${W}" height="${H}" fill="#3a3834"/><line x1="0" y1="50" x2="${W}" y2="50" stroke="#ffffff30" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  if(pts.length){ s+=`<path d="M0,${H} L${pts.map(p=>p.join(',')).join(' L')} L${pts[pts.length-1][0]},${H} Z" fill="#f2f2f2"/>`; }
  R.res.forEach((r,k)=>{ if(!r || !['blunder','mistake','miss','brilliant','great'].includes(r.cls)) return; const x=(k+1)/(N-1)*W; const y=H-wpWhite(R.an[k+1])/100*H; s+=`<circle cx="${x}" cy="${y}" r="4.5" fill="${CLS[r.cls].hex}" stroke="#000" stroke-width="1" vector-effect="non-scaling-stroke"/>`; });
  s+=`<line id="gcur" x1="0" y1="0" x2="0" y2="${H}" stroke="#81b64c" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  $('#graph').innerHTML=s; renderGraphCursor();
}
function renderGraphCursor(){ const l=$('#gcur'); if(!l||!R.game) return; const N=R.game.fens.length; const x=N>1?R.cur/(N-1)*1000:0; l.setAttribute('x1',x); l.setAttribute('x2',x); }

const PRACTICE = {
  hanging:['בדיקת "כלים תלויים" לפני כל מהלך','לפני שאתה לוחץ: איזה כלי שלי לא מוגן? מה היריב יכול לאכול אחרי המהלך?'],
  ignoredThreat:['לשים לב לאיומים של היריב','אחרי כל מהלך של היריב, שאל: "מה הוא מאיים לעשות עכשיו?"'],
  allowedFork:['טקטיקה: מזלגות','פתור פאזלים בנושא Fork (מזלג), במיוחד מזלגות של פרש.'],
  missedFork:['טקטיקה: מזלגות','פתור פאזלים בנושא Fork (מזלג), במיוחד מזלגות של פרש.'],
  allowedPin:['טקטיקה: הצמדות','פאזלים בנושא Pin, ושים לב לכלים שעומדים על אותו קו עם המלך או המלכה.'],
  missedCapture:['לחפש לקיחות חינמיות','בכל מהלך עבור על "שחים, לקיחות, איומים" (Checks, Captures, Threats).'],
  missedMate:['תרגילי מט','פתור פאזלים של מט ב-1 עד מט ב-3 כל יום.'],
  allowedMate:['בטיחות המלך','שים לב לשורה האחורית ולכלים שתוקפים את המלך שלך.'],
  lostMaterial:['חישוב חילופים','ספור תוקפים ומגינים לפני חילוף, ותבדוק מה נשאר בסוף.'],
};
function renderSummary(){
  const g=R.game; if(!g) return; const box=$('#summaryBox');
  const sides=['w','b']; const stats={};
  for(const c of sides){ const idx=g.moves.map((m,k)=>k).filter(k=>g.moves[k].color===c && R.res[k]);
    const accs=idx.map(k=>R.res[k].acc); const mean=accs.reduce((a,b)=>a+b,0)/(accs.length||1); const harm=accs.length/accs.reduce((a,b)=>a+1/Math.max(5,b),0);
    const counts={}; CLS_ORDER.forEach(k=>counts[k]=0); idx.forEach(k=>counts[R.res[k].cls]++);
    stats[c]={acc: accs.length ? (mean+harm)/2 : 0, counts, idx}; }
  const h=g.headers; const nm=c=>esc(c==='w'?(h.White||'לבן'):(h.Black||'שחור'));
  let s=`<div class="acc">${sides.map(c=>`<div class="accbox ${c==='w'?'white':'black'}"><div class="who">${c==='w'?'⚪':'⚫'} <bdi>${nm(c)}</bdi>${R.userColor===c?' (אתה)':''}</div><div class="n">${stats[c].acc.toFixed(1)}</div><div class="who">דיוק</div></div>`).join('')}</div>`;
  s+=`<table class="counts"><tr><td></td><td class="num">⚪</td><td class="num">⚫</td></tr>${CLS_ORDER.map(k=>`<tr><td>${ci(k)} ${CLS[k].he}</td><td class="num">${stats.w.counts[k]}</td><td class="num">${stats.b.counts[k]}</td></tr>`).join('')}</table>`;
  const focus = R.userColor || null;
  const pool = g.moves.map((m,k)=>k).filter(k=>R.res[k] && (!focus || g.moves[k].color===focus));
  const key = pool.filter(k=>['blunder','mistake','miss'].includes(R.res[k].cls)).sort((a,b)=>R.res[b].loss-R.res[a].loss).slice(0,4);
  const good = pool.filter(k=>['brilliant','great'].includes(R.res[k].cls)).slice(0,3);
  s+=`<h3 style="margin-top:16px">🔑 רגעי מפתח${focus?' שלך':''}</h3>`;
  if(!key.length) s+='<div class="muted">לא היו טעויות משמעותיות. משחק נקי מאוד! 👏</div>';
  key.forEach(k=>{ const r=R.res[k], m=g.moves[k]; const first=R.exp[k].html.find(x=>x.includes('המהלך הטוב יותר'))||'';
    s+=`<div class="moment" data-ply="${k+1}">${ci(r.cls)} ${san(moveNo(k)+m.san)} – ${CLS[r.cls].he} <span class="muted small">(${r.phase==='opening'?'פתיחה':r.phase==='endgame'?'סיום':'אמצע המשחק'}, ירידה של ${Math.round(r.loss)}% בסיכויי הניצחון)</span><div class="small">${first}</div></div>`; });
  good.forEach(k=>{ const r=R.res[k], m=g.moves[k]; s+=`<div class="moment" data-ply="${k+1}">${ci(r.cls)} ${san(moveNo(k)+m.san)} – ${CLS[r.cls].he} 👏</div>`; });
  // practice
  const tagCount={}; pool.forEach(k=>{ if(['inaccuracy','mistake','blunder','miss'].includes(R.res[k].cls)) R.exp[k].tags.forEach(t=>tagCount[t]=(tagCount[t]||0)+1); });
  const phaseCount={opening:0,middlegame:0,endgame:0}; pool.forEach(k=>{ if(['mistake','blunder','miss'].includes(R.res[k].cls)) phaseCount[R.res[k].phase]++; });
  const tips=[]; const seen=new Set();
  Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).forEach(([t])=>{ const p=PRACTICE[t]; if(p && !seen.has(p[0])){ seen.add(p[0]); tips.push(p); } });
  if(phaseCount.opening>=1) tips.push(['הפתיחה',`רוב הנזק התחיל מוקדם. ${R.opening?`כדאי ללמוד את הרעיונות של <b>${R.opening.he}</b>.`:'כדאי ללמוד 1–2 פתיחות קבועות לעומק.'}`]);
  if(phaseCount.endgame>=1) tips.push(['סיומים','תרגל סיומים בסיסיים: מלך ורגלי, צריחים, והפעלת המלך בסוף המשחק.']);
  if(!tips.length) tips.push(['להמשיך כך','שחק משחקים ארוכים יותר (10+ דקות) ונתח כל הפסד.']);
  s+=`<h3 style="margin-top:16px">🏋️ מה לתרגל</h3><ul>${tips.slice(0,4).map(t=>`<li><b>${t[0]}:</b> ${t[1]}</li>`).join('')}</ul>`;
  const st = focus ? stats[focus] : null;
  if(st){ const bad=st.counts.blunder+st.counts.mistake+st.counts.miss; s+=`<div class="muted small" style="margin-top:8px">בשורה התחתונה: דיוק של ${st.acc.toFixed(1)}%, ${st.counts.blunder} טעויות גסות, ${st.counts.mistake} טעויות ו-${st.counts.miss} החמצות. ${bad===0?'משחק מצוין!':'כל טעות גסה שנחסכת שווה הרבה נקודות דירוג.'}</div>`; }
  box.innerHTML=s; $('#summaryCard').classList.remove('hidden');
  $$('#summaryBox .moment').forEach(el=>el.onclick=()=>{ goto(+el.dataset.ply); window.scrollTo({top:0,behavior:'smooth'}); });
}

/* ================= Import ================= */
let src='chesscom';
function setSrc(s){
  src=s; $$('#srcSeg button').forEach(b=>b.classList.toggle('on', b.dataset.src===s));
  $('#srcUser').classList.toggle('hidden', s==='pgn'); $('#srcPgn').classList.toggle('hidden', s!=='pgn');
  if(s==='chesscom') $('#userInput').value=LS.get('chesscom_user','Nibl82');
  if(s==='lichess') $('#userInput').value=LS.get('lichess_user','Igalyuze23');
  $('#gamesList').classList.add('hidden'); $('#importMsg').textContent='';
}
function resultFor(g, user){
  const u=user.toLowerCase(); const w=(g.white||'').toLowerCase()===u; const b=(g.black||'').toLowerCase()===u;
  if(g.result==='1/2-1/2') return ['draw','תיקו']; if(!w&&!b) return ['draw', g.result];
  const won = (g.result==='1-0'&&w)||(g.result==='0-1'&&b); return won?['win','ניצחון']:['loss','הפסד'];
}
const TC_HE={bullet:'בולט',blitz:'בליץ',rapid:'רפיד',classical:'קלאסי',daily:'יומי',correspondence:'התכתבות',ultraBullet:'אולטרה-בולט'};
async function fetchGames(){
  const user=$('#userInput').value.trim(); if(!user){ $('#importMsg').textContent='הכנס שם משתמש'; return; }
  LS.set(src==='chesscom'?'chesscom_user':'lichess_user', user);
  $('#importMsg').textContent='מביא משחקים…'; $('#gamesList').classList.add('hidden');
  let games=[];
  try{
    if(src==='chesscom'){
      const r=await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/archives`);
      if(r.status===404||r.status===410) throw new Error('המשתמש לא נמצא ב-Chess.com'); if(!r.ok) throw new Error('שגיאה מ-Chess.com ('+r.status+')');
      const arch=(await r.json()).archives||[]; if(!arch.length) throw new Error('אין משחקים למשתמש הזה');
      for(let i=arch.length-1;i>=0 && games.length<25 && i>=arch.length-4;i--){
        const rr=await fetch(arch[i]); if(!rr.ok) continue; const js=await rr.json();
        (js.games||[]).filter(x=>x.rules==='chess' && x.pgn).forEach(x=>{ const hd=cleanPgn(x.pgn).headers;
          games.push({white:x.white.username, black:x.black.username, we:x.white.rating, be:x.black.rating, result:hd.Result||'*', end:x.end_time*1000, tc:TC_HE[x.time_class]||x.time_class, pgn:x.pgn, url:x.url}); });
      }
      games.sort((a,b)=>b.end-a.end);
    } else {
      const r=await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=25&pgnInJson=true&opening=true&clocks=false&evals=false`, {headers:{Accept:'application/x-ndjson'}});
      if(r.status===404){ const u=await fetch(`https://lichess.org/api/user/${encodeURIComponent(user)}`).catch(()=>null); if(u && u.ok){ const uj=await u.json(); if(uj.disabled) throw new Error('החשבון סגור ב-Lichess'); throw new Error('Lichess לא החזיר משחקים כרגע (ייתכן חסימה זמנית). נסה שוב בעוד דקה, או הדבק PGN.'); } throw new Error('המשתמש לא נמצא ב-Lichess'); } if(!r.ok) throw new Error('שגיאה מ-Lichess ('+r.status+')');
      const txt=await r.text();
      txt.split('\n').filter(Boolean).forEach(line=>{ const x=JSON.parse(line); if(x.variant!=='standard' && x.variant!=='fromPosition') return; if(!x.moves) return;
        const res = x.winner==='white'?'1-0':x.winner==='black'?'0-1':(x.status==='started'?'*':'1/2-1/2');
        games.push({white:x.players.white.user?x.players.white.user.name:(x.players.white.aiLevel?'Stockfish '+x.players.white.aiLevel:'אנונימי'), black:x.players.black.user?x.players.black.user.name:(x.players.black.aiLevel?'Stockfish '+x.players.black.aiLevel:'אנונימי'), we:x.players.white.rating, be:x.players.black.rating, result:res, end:x.lastMoveAt||x.createdAt, tc:TC_HE[x.speed]||x.speed, pgn:x.pgn, url:'https://lichess.org/'+x.id, opening:x.opening&&x.opening.name}); });
    }
  }catch(e){ $('#importMsg').innerHTML='<span style="color:#ff8a87">'+esc(e.message||'שגיאת רשת')+'</span>'; return; }
  games=games.filter(g=>g.pgn && /\d\.\s*\S/.test(cleanPgn(g.pgn).movetext));
  if(!games.length){ $('#importMsg').textContent='לא נמצאו משחקים רגילים להצגה.'; return; }
  window.__games=games;
  $('#importMsg').textContent=`נמצאו ${games.length} משחקים אחרונים. בחר משחק לניתוח:`;
  const list=$('#gamesList'); list.innerHTML=games.slice(0,25).map((g,i)=>{ const [rc,rt]=resultFor(g,user); const d=new Date(g.end);
    return `<div class="game" data-i="${i}"><div><div class="who"><bdi>${esc(g.white)}</bdi> <span class="muted small">${g.we||''}</span> – <bdi>${esc(g.black)}</bdi> <span class="muted small">${g.be||''}</span></div><div class="meta">${esc(g.tc||'')} · ${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}${g.opening?' · <bdi>'+esc(g.opening)+'</bdi>':''}</div></div><span class="res ${rc}">${rt}</span></div>`; }).join('');
  list.classList.remove('hidden');
  $$('#gamesList .game').forEach(el=>el.onclick=()=>{ $$('#gamesList .game').forEach(x=>x.style.background=''); el.style.background='#81b64c22'; startReview(games[+el.dataset.i].pgn); if(innerWidth<900) window.scrollTo({top:0,behavior:'smooth'}); });
}
const SAMPLE_PGN = `[Event "Paris Opera"]
[Site "Paris"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;
