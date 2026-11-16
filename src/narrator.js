/* ================= Narrator (Web Speech API, Hebrew) ================= */
const NAR = { on: LS.get('tts','0')==='1', rate: +LS.get('ttsrate','1'), voice:null, voicesLoaded:false, auto:false, autoTok:0, log:[] };
window.__ttsLog = NAR.log;
const SP_PIECE={K:'מלך',Q:'מלכה',R:'צריח',B:'רץ',N:'פרש'};
const SP_FILE={a:'איי',b:'בי',c:'סי',d:'די',e:'אי',f:'אף',g:"ג'י",h:"אייץ'"};
const SAN_RE=/^(O-O(-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?)[+#]?$/;
const spSq = s => SP_FILE[s[0]]+' '+s[1];
function spSan(x){
  x=(x||'').trim(); let base;
  if(/^O-O-O/.test(x)) base='הצרחה ארוכה';
  else if(/^O-O/.test(x)) base='הצרחה קצרה';
  else { const m=x.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=([QRBN]))?/); if(!m) return x;
    const piece=m[1]?SP_PIECE[m[1]]:'רגלי'; const take = m[1]==='Q' ? ' לוקחת ב־' : ' לוקח ב־';
    base = piece + (m[4] ? take : ' ל־') + spSq(m[5]); if(m[7]) base+=', והכתרה ל'+SP_PIECE[m[7]]; }
  if(x.endsWith('#')) base+=', מט!'; else if(x.endsWith('+')) base+=', שח';
  return base;
}
function speakHtml(h){
  let s=String(h).split('המשך אפשרי')[0];
  if(s.startsWith('אין כאן טקטיקה מיידית')) return 'אין כאן טקטיקה מיידית, אבל העמדה נחלשת.';
  s=s.replace(/<bdi class="san sq">([^<]*)<\/bdi>/g,(m,x)=>spSq(x.trim()))
     .replace(/<bdi class="san">([^<]*)<\/bdi>/g,(m,x)=>SAN_RE.test(x.trim())?spSan(x):'')
     .replace(/<[^>]+>/g,'').replace(/[⚠️💡]/gu,'').replace(/\s+/g,' ').trim();
  if(/:\s*\.?$/.test(s)) return '';
  return s.replace(/\s*\.\s*$/,'.');
}
function shortSpoken(exp, cls){
  if(!exp) return '';
  const bad=['inaccuracy','mistake','blunder','miss'].includes(cls);
  let items=exp.html.map(speakHtml).filter(Boolean);
  if(bad){ items=items.filter(s=>!/^המהלך לוקח את|^נוצרת הצמדה|^המהלך נותן שח/.test(s)); items.sort((a,b)=>(/^המהלך הטוב יותר/.test(b)?1:0)-(/^המהלך הטוב יותר/.test(a)?1:0)); return items.slice(0,3).join(' '); }
  if(cls==='book') return '';
  if(cls==='best') return items.filter(s=>!/^זה המהלך הטוב ביותר/.test(s)).slice(0,1).join(' ');
  return items.slice(0,1).join(' ');
}
const spLabel = k => k==='book' ? 'מהלך תיאוריה' : CLS[k].he;
const endDot = t => /[.!?]$/.test(t) ? t : t+'.';
function pickVoice(){
  if(!('speechSynthesis' in window)) return;
  const vs=speechSynthesis.getVoices(); if(vs.length) NAR.voicesLoaded=true;
  NAR.voice = vs.find(v=>/^(he|iw)/i.test(v.lang) && /natural|online/i.test(v.name)) || vs.find(v=>/^(he|iw)/i.test(v.lang)) || null;
  updateTtsUi();
}
function updateTtsUi(){
  const b=$('#ttsBtn'); if(!b) return;
  b.textContent = NAR.on ? '🔊 קריין' : '🔇 קריין'; b.classList.toggle('on', NAR.on);
  $('#ttsRate').value=String(NAR.rate);
  const note=$('#ttsNote');
  if(!('speechSynthesis' in window)){ note.innerHTML='הדפדפן הזה לא תומך בהקראה. נסה Chrome או Edge.'; note.classList.toggle('hidden', !NAR.on); return; }
  if(NAR.on && !NAR.voice){
    note.innerHTML = `⚠️ לא נמצא קול עברי במחשב, אז ההקראה תשתמש בקול ברירת המחדל (ייתכן שלא יבטא עברית טוב).<br>
      <b>להוספת קול עברי ב-Windows:</b> הגדרות ← זמן ושפה ← דיבור ← "ניהול קולות" ← הוספת קולות ← בחר <b>עברית</b> (Microsoft Asaf) ← התקן, ואז סגור ופתח מחדש את הדפדפן.<br>
      <span class="muted">טיפ: בדפדפן Edge יש קולות עבריים טבעיים מובנים (Avri / Hila) בלי התקנה.</span>`;
    note.classList.remove('hidden');
  } else note.classList.add('hidden');
  $('#autoBtn').textContent = NAR.auto ? '⏸ עצור' : '▶ ניגון אוטומטי';
}
function say(text, {interrupt=true}={}){
  text=(text||'').trim(); if(!NAR.on || !text) return Promise.resolve();
  NAR.log.push(text); if(NAR.log.length>200) NAR.log.shift();
  if(!('speechSynthesis' in window)) return Promise.resolve();
  if(interrupt) speechSynthesis.cancel();
  return new Promise(res=>{
    const u=new SpeechSynthesisUtterance(text); u.lang='he-IL'; if(NAR.voice) u.voice=NAR.voice; u.rate=NAR.rate;
    let done=false; const fin=()=>{ if(!done){ done=true; res(); } };
    u.onend=fin; u.onerror=fin;
    // safety net: some browsers/headless never fire onend
    setTimeout(fin, Math.max(1500, text.length*95/NAR.rate) + 1500);
    speechSynthesis.speak(u);
  });
}
function reviewSpeech(i){
  const g=R.game; if(!g) return '';
  if(i===0) return 'עמדת הפתיחה.';
  const mv=g.moves[i-1], res=R.res[i-1];
  const who = mv.color==='w' ? 'לבן' : 'שחור';
  let t = endDot(`מהלך ${Math.floor((i-1)/2)+1}, ${who}: ${spSan(mv.san)}`);
  if(res){ t += ` ${spLabel(res.cls)}.`; const sh=shortSpoken(R.exp[i-1], res.cls); if(sh) t+=' '+sh; }
  return t;
}
function narrateReview(i){ if(NAR.on) say(reviewSpeech(i)); }
function stopAuto(){ if(NAR.auto){ NAR.auto=false; NAR.autoTok++; updateTtsUi(); } }
async function autoplay(){
  if(NAR.auto){ stopAuto(); if('speechSynthesis' in window) speechSynthesis.cancel(); return; }
  if(!R.game){ toast('קודם טען משחק לניתוח'); return; }
  NAR.auto=true; const tok=++NAR.autoTok; updateTtsUi();
  if(R.cur>=R.game.fens.length-1) R.cur=0;
  while(NAR.auto && tok===NAR.autoTok && R.cur < R.game.fens.length-1){
    goto(R.cur+1, true);
    if(NAR.on) await say(reviewSpeech(R.cur)); else await new Promise(r=>setTimeout(r, 1400/NAR.rate));
    await new Promise(r=>setTimeout(r, 450));
  }
  if(tok===NAR.autoTok){ NAR.auto=false; updateTtsUi(); }
}
function initNarrator(){
  if('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged=pickVoice; setTimeout(pickVoice, 1200); }
  $('#ttsBtn').onclick=()=>{ NAR.on=!NAR.on; LS.set('tts', NAR.on?'1':'0'); if(!NAR.on && 'speechSynthesis' in window) speechSynthesis.cancel(); updateTtsUi(); if(NAR.on) say(NAR.voice?'הקריין הופעל.':'הקריין הופעל.'); };
  $('#ttsRate').onchange=e=>{ NAR.rate=+e.target.value; LS.set('ttsrate', NAR.rate); say('זו המהירות החדשה.'); };
  $('#autoBtn').onclick=autoplay;
  updateTtsUi();
}
