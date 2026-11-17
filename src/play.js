/* ================= Play vs coach ================= */
const LEVELS=[
  {skill:0, depth:1, mt:60, elo:'~400'},{skill:2, depth:2, mt:100, elo:'~700'},{skill:5, depth:4, mt:200, elo:'~1000'},{skill:8, depth:6, mt:300, elo:'~1300'},
  {skill:11, depth:8, mt:400, elo:'~1600'},{skill:14, depth:10, mt:600, elo:'~1900'},{skill:17, depth:12, mt:800, elo:'~2200'},{skill:20, depth:16, mt:1200, elo:'2700+'},
];
const P={ chess:new Chess(), userColor:'w', level:+LS.get('level','3'), thinking:false, lastEval:null, hintStage:0, hintMove:null, flip:false, lastUser:null, history:[], over:false };
let opponent=null;
function getOpp(){ if(!opponent) opponent=new Engine('opp'); return opponent; }

function renderLevels(){
  $('#levels').innerHTML=LEVELS.map((l,i)=>`<button data-l="${i}" class="${i===P.level?'on':''}">רמה ${i+1}<small><bdi dir="ltr">${l.elo}</bdi></small></button>`).join('');
  $$('#levels button').forEach(b=>b.onclick=()=>{ P.level=+b.dataset.l; LS.set('level',P.level); renderLevels(); });
}
function coachSay(html){ $('#coachMsg').innerHTML=html; }
function renderPlay(){
  if(currentTab!=='play') return;
  const c=P.chess; const fen=c.fen(); const h=c.history({verbose:true}); const last=h[h.length-1];
  let chk=null; if(c.in_check()){ const b=parseFen(fen); chk=Object.keys(b).find(s=>b[s].type==='k'&&b[s].color===c.turn()); }
  const arrows=[]; if(P.hintStage===2 && P.hintMove) arrows.push({from:P.hintMove.slice(0,2), to:P.hintMove.slice(2,4), color:'#4aa3ff'});
  const ul=P.lastUser; const badge = ul && ul.res && h.length && (h.length===ul.ply+1 || h.length===ul.ply+2) ? {sq:ul.mv.to, sym:CLS[ul.res.cls].sym, color:CLS[ul.res.cls].hex} : null;
  board.set({fen, flip:P.flip, hl: last?[last.from,last.to]:[], arrows, check:chk, badge, hint: P.hintStage===1&&P.hintMove?P.hintMove.slice(0,2):null});
  if(P.lastEval) setEvalBar(P.lastEval.wp, P.lastEval.txt, P.flip); else setEvalBar(50,'0.0',P.flip);
  const lvl=LEVELS[P.level];
  const me=`<span class="sw" style="background:${P.userColor==='w'?'#fff':'#222'}"></span><b>אתה</b>`;
  const bot=`<span class="sw" style="background:${P.userColor==='w'?'#222':'#fff'}"></span><b>המאמן</b> <span class="muted">(רמה ${P.level+1}, <bdi dir="ltr">${lvl.elo}</bdi>)</span>${P.thinking?' <span class="muted small">חושב…</span>':''}`;
  const userBottom = (P.userColor==='w') !== P.flip;
  $('#topPlayer').innerHTML = userBottom?bot:me; $('#botPlayer').innerHTML = userBottom?me:bot;
  renderMaterial(null, h, fen, userBottom ? other(P.userColor) : P.userColor);
  // move list
  let t='<table>'; for(let k=0;k<h.length;k+=2){ const cell=j=>{ if(j>=h.length) return '<td></td>'; const r=P.history[j]; return `<td><span class="mv">${r&&r.res?ci(r.res.cls):''}${h[j].san}</span></td>`; }; t+=`<tr><td class="no">${k/2+1}.</td>${cell(k)}${cell(k+1)}</tr>`; }
  $('#playMoves').innerHTML=t+'</table>'; $('#playMoves').scrollTop=1e6;
}
function newPlayGame(){
  const sel=$('#colorSeg .on').dataset.c; P.userColor = sel==='r' ? (Math.random()<.5?'w':'b') : sel;
  Object.assign(P,{chess:new Chess(), flip:P.userColor==='b', lastEval:null, hintStage:0, hintMove:null, lastUser:null, history:[], over:false, thinking:false});
  getOpp().newGame(); coach.cancel();
  coachSay(`משחק חדש! אתה משחק עם ה${P.userColor==='w'?'לבנים':'שחורים'} ברמה ${P.level+1}. בהצלחה 🙂`);
  renderPlay(); if(P.userColor!==P.chess.turn()) botMove();
}
async function botMove(){
  if(P.over) return; P.thinking=true; renderPlay(); const lvl=LEVELS[P.level];
  const fenAtStart=P.chess.fen();
  const r=await getOpp().search(fenAtStart, {depth:lvl.depth, movetime:lvl.mt, skill:lvl.skill});
  P.thinking=false;
  if(!r || P.chess.fen()!==fenAtStart || !r.bestmove || r.bestmove==='(none)') { renderPlay(); return; }
  const m=mvFromUci(P.chess, r.bestmove); P.history.push({mv:m}); say(endDot('המאמן משחק: '+spSan(m.san)), {interrupt:false});
  P.hintStage=0; P.hintMove=null; renderPlay(); checkOver();
}
function checkOver(){
  const c=P.chess; if(!c.game_over()) return false; P.over=true;
  let msg;
  if(c.in_checkmate()) msg = c.turn()===P.userColor ? 'מט 😔 המאמן ניצח. לחץ על "נתח את המשחק הזה" כדי ללמוד מהטעויות.' : 'מט! 🎉 ניצחת את המאמן! לחץ על "נתח את המשחק הזה" כדי לראות את המהלכים הכי טובים שלך.';
  else msg='המשחק נגמר בתיקו (פט, חזרה משולשת או חוסר חומר).';
  coachSay(msg); toast(msg, 5000); say(msg.replace(/[🎉😔]/gu,'').split('לחץ')[0], {interrupt:false}); return true;
}
async function userMove(from, to){
  if(P.over || P.thinking || P.chess.turn()!==P.userColor) return;
  const fenBefore=P.chess.fen();
  const m=P.chess.move({from, to, promotion:'q'}); if(!m) return;
  const mv={san:m.san, uci:m.from+m.to+(m.promotion||''), from:m.from, to:m.to, color:m.color, piece:m.piece, captured:m.captured, flags:m.flags, fenBefore, fenAfter:P.chess.fen()};
  const entry={mv, ply:P.chess.history().length-1}; P.history.push(entry); P.lastUser=entry; P.hintStage=0; P.hintMove=null;
  coachSay('<span class="muted">המאמן בודק את המהלך שלך…</span>');
  renderPlay();
  const over=checkOver();
  // evaluate user's move with the coach engine (in parallel with the bot's reply)
  evaluateUserMove(entry);
  if(!over) botMove();
}
async function evaluateUserMove(entry){
  const mv=entry.mv; const ply=entry.ply;
  const anB = terminalInfo(mv.fenBefore) || await coach.search(mv.fenBefore, {depth:12, multipv:2});
  const anA = terminalInfo(mv.fenAfter) || await coach.search(mv.fenAfter, {depth:12});
  if(!anB || !anA) return;
  const sans=P.chess.history(); const op=detectOpening(sans.slice(0,ply+1));
  const prev = P.history[ply-1];
  const res=classify(mv, anB, anA, ply, op?op.moves.length:0, prev&&prev.res?prev.res.cls:null, prev?prev.mv:null);
  entry.res=res; entry.exp=explainMove(mv, anB, anA, res, op); entry.anA=anA; entry.anB=anB;
  P.lastEval={wp:wpWhite(anA), txt:shortEval(anA.lines[0], anA.stm)};
  if(P.lastUser===entry){
    say(`המהלך שלך, ${spSan(mv.san)}: ${spLabel(res.cls)}. ${shortSpoken(entry.exp, res.cls)}`, {interrupt:false});
    const bad=['inaccuracy','mistake','blunder','miss'].includes(res.cls);
    if(bad && $('#autoWhy').checked) showWhy(); else if(!P.over) coachSay(`${ci(res.cls)} ${san(mv.san)} – <b>${CLS[res.cls].he}</b>. <span class="muted">לחץ "למה?" להסבר.</span>`);
  }
  renderPlay();
}
function showWhy(){
  const e=P.lastUser; if(!e){ coachSay('עוד לא שיחקת מהלך.'); return; }
  if(!e.res){ coachSay('<span class="muted">המאמן עדיין בודק את המהלך…</span>'); return; }
  coachSay(`<div class="explain"><div class="head">${ci(e.res.cls)}<span>${san(e.mv.san)} – ${CLS[e.res.cls].he}</span></div><ul>${e.exp.html.map(x=>`<li>${x}</li>`).join('')}</ul><div class="evalline">הערכה אחרי המהלך: ${san(evalText(e.anA.lines[0], e.anA.stm))}</div></div>`);
}
async function hint(){
  if(P.over || P.chess.turn()!==P.userColor){ coachSay('חכה לתורך 🙂'); return; }
  if(P.hintStage===0 || !P.hintMove){
    coachSay('<span class="muted">חושב על רמז…</span>'); const fen=P.chess.fen();
    const r=await coach.search(fen, {depth:12}); if(!r || P.chess.fen()!==fen) return;
    P.hintMove=r.lines[0].pv[0]; P.hintStage=1;
    const b=parseFen(fen); const p=b[P.hintMove.slice(0,2)]; const m=uciToMove(fen,P.hintMove);
    let extra=''; if(r.lines[0].mate>0) extra=` יש כאן <b>מט ב-${r.lines[0].mate}</b>!`; else if(m.captured) extra=' חפש לקיחה.'; else if(m.san.includes('+')) extra=' חפש שח.';
    coachSay(`💡 רמז: נסה להזיז את ${HED[p.type]} ב-${sqh(P.hintMove.slice(0,2))}.${extra} <span class="muted">(לחץ שוב על רמז כדי לראות את המהלך)</span>`); say(speakHtml(`רמז: נסה להזיז את ${HED[p.type]} ב-${sqh(P.hintMove.slice(0,2))}.${extra}`));
  } else { P.hintStage=2; const m=uciToMove(P.chess.fen(),P.hintMove); coachSay(`💡 המהלך המומלץ: ${san(m.san)}`); say('המהלך המומלץ: '+spSan(m.san)); }
  renderPlay();
}
function undo(){
  if(P.thinking) return; coach.cancel();
  const h=P.chess.history(); if(!h.length) return;
  P.chess.undo(); P.history.pop(); if(P.chess.turn()!==P.userColor && P.chess.history().length){ P.chess.undo(); P.history.pop(); }
  P.over=false; P.hintStage=0; P.lastUser=[...P.history].reverse().find(x=>x.mv.color===P.userColor)||null; coachSay('המהלך בוטל. נסה שוב!'); renderPlay();
  if(P.chess.turn()!==P.userColor) botMove();
}

/* ================= App init ================= */
let currentTab='review';
function setTab(t){
  currentTab=t; $('#tabReview').classList.toggle('on',t==='review'); $('#tabPlay').classList.toggle('on',t==='play');
  $('#reviewPanel').classList.toggle('hidden',t!=='review'); $('#playPanel').classList.toggle('hidden',t!=='play');
  $('#reviewNav').classList.toggle('hidden',t!=='review'); $('#playNav').classList.toggle('hidden',t!=='play');
  $('#autoBtn').classList.toggle('hidden', t!=='review'); if(t!=='review') stopAuto();
  $('#varBar').classList.toggle('hidden', t!=='review' || !R.v);
  board.clearSel(); if(t==='review') renderReview(); else renderPlay();
}
function init(){
  board=new BoardUI($('#board'), {
    interactive:()=> currentTab==='play' ? (!P.over && !P.thinking && P.chess.turn()===P.userColor) : (!!R.game && !NAR.auto && !new Chess(reviewFen()).game_over()),
    canPick:c=> currentTab==='play' ? c===P.userColor : c===reviewFen().split(' ')[1],
    targets:sq=> currentTab==='play' ? P.chess.moves({square:sq, verbose:true}).map(m=>m.to) : new Chess(reviewFen()).moves({square:sq, verbose:true}).map(m=>m.to),
    onMove:(f,t)=> currentTab==='play' ? userMove(f,t) : reviewUserMove(f,t),
  });
  setEngineStatus('טוען מנוע…', false);
  try{ coach=new Engine('coach'); coach.ready.then(()=>setEngineStatus('Stockfish 19 מוכן', true)); }
  catch(e){ setEngineStatus('המנוע לא נטען: '+e.message, false); }
  $('#depthSel').value=LS.get('depth','14'); $('#depthSel').onchange=e=>LS.set('depth',e.target.value);
  $$('#srcSeg button').forEach(b=>b.onclick=()=>setSrc(b.dataset.src)); setSrc(LS.get('src','chesscom'));
  $$('#srcSeg button').forEach(b=>b.addEventListener('click',()=>LS.set('src',b.dataset.src)));
  $('#fetchBtn').onclick=fetchGames; $('#userInput').addEventListener('keydown',e=>{ if(e.key==='Enter') fetchGames(); });
  $('#pgnBtn').onclick=()=>{ const games=splitPgns($('#pgnInput').value); if(!games.length){ $('#importMsg').textContent='הדבק PGN תקין'; return; } startReview(games[0]); if(games.length>1) toast(`נמצאו ${games.length} משחקים, מנתח את הראשון.`); };
  $('#sampleBtn').onclick=()=>{ $('#pgnInput').value=SAMPLE_PGN; startReview(SAMPLE_PGN); };
  $('#stopBtn').onclick=()=>{ R.token++; coach.cancel(); R.analyzing=false; $('#progressCard').classList.add('hidden'); renderMoves(); renderGraph(); if(R.res.filter(Boolean).length) renderSummary(); };
  $('#navFirst').onclick=()=>navTo('first'); $('#navLast').onclick=()=>navTo('last'); $('#navPrev').onclick=()=>navTo('prev'); $('#navNext').onclick=()=>navTo('next');
  $('#varBackBtn').onclick=()=>exitVariation(); $('#varEngineBtn').onclick=varEngineMove;
  $('#navFlip').onclick=()=>{ R.flip=!R.flip; renderReview(); };
  $('#graph').addEventListener('click', e=>{ if(!R.game) return; const r=e.currentTarget.getBoundingClientRect(); goto(Math.round((e.clientX-r.left)/r.width*(R.game.fens.length-1))); });
  document.addEventListener('keydown', e=>{ if(currentTab!=='review' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if(e.key==='ArrowRight'){ navTo('next'); e.preventDefault(); } else if(e.key==='ArrowLeft'){ navTo('prev'); e.preventDefault(); }
    else if(e.key==='ArrowUp'||e.key==='Home'){ navTo('first'); e.preventDefault(); } else if(e.key==='ArrowDown'||e.key==='End'){ navTo('last'); e.preventDefault(); }
    else if(e.key==='Escape' && R.v){ exitVariation(); e.preventDefault(); } });
  $('#tabReview').onclick=()=>setTab('review'); $('#tabPlay').onclick=()=>setTab('play');
  renderLevels();
  $$('#colorSeg button').forEach(b=>b.onclick=()=>{ $$('#colorSeg button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); });
  $('#newGameBtn').onclick=newPlayGame; $('#hintBtn').onclick=hint; $('#whyBtn').onclick=showWhy; $('#undoBtn').onclick=undo;
  $('#playFlip').onclick=()=>{ P.flip=!P.flip; renderPlay(); };
  $('#reviewPlayedBtn').onclick=()=>{ if(!P.chess.history().length){ toast('עוד לא שוחקו מהלכים'); return; }
    P.chess.header('White', P.userColor==='w'?LS.get('chesscom_user','Nibl82'):'המאמן', 'Black', P.userColor==='b'?LS.get('chesscom_user','Nibl82'):'המאמן');
    const pgn=P.chess.pgn(); setTab('review'); setSrc('pgn'); $('#pgnInput').value=pgn; startReview(pgn); };
  initNarrator();
  renderReview();
}
init();
