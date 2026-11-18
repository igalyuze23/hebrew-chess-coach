/* ================= Narrator (Hebrew) =================
 * Automatic: a real he/iw system voice (Natural/Online names first, e.g. Edge
 * Avri/Hila, or the Android shim) speaks through speechSynthesis.
 * Otherwise, or when the user picks it: keyless Google Translate TTS
 * (client=tw-ob, tl=iw) played on an <audio> element. No API key, no backend.
 * 250+ characters gets HTTP 400, so lines are split under 180 at sentence
 * and comma boundaries. say() always settles on error or timeout.
 */
const TTS_MODES = ['auto','system','online'];
function savedTtsMode(){
  const m = LS.get('ttsmode','auto');
  return TTS_MODES.includes(m) ? m : 'auto';
}
const NAR = {
  on: LS.get('tts','0')==='1', rate: +LS.get('ttsrate','1') || 1, mode: savedTtsMode(),
  voice:null, voicesLoaded:false, voicesReady:typeof speechSynthesis==='undefined',
  auto:false, autoTok:0, log:[],
  audio:null, audioTok:0, audioTimer:0, playing:false, q:[]
};
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
function isHeVoice(v){ return !!(v && /^(he|iw)/i.test(v.lang||'')); }
function hebrewVoice(){ return isHeVoice(NAR.voice) ? NAR.voice : null; }
function useOnline(){
  if(NAR.mode==='online') return true;
  if(NAR.mode==='system') return false;
  if(hebrewVoice()) return false;
  return !!NAR.voicesReady;
}
function pickVoice(){
  if(!('speechSynthesis' in window)){ NAR.voicesReady=true; updateTtsUi(); return; }
  let vs=[];
  try{ vs=speechSynthesis.getVoices()||[]; }catch(e){ vs=[]; }
  if(vs.length){ NAR.voicesLoaded=true; NAR.voicesReady=true; }
  NAR.voice = vs.find(v=>isHeVoice(v) && /natural|online/i.test(v.name||'')) || vs.find(isHeVoice) || null;
  updateTtsUi();
}
function updateTtsUi(){
  const b=$('#ttsBtn'); if(!b) return;
  b.textContent = NAR.on ? '🔊 קריין' : '🔇 קריין'; b.classList.toggle('on', NAR.on);
  const rate=$('#ttsRate'); if(rate) rate.value=String(NAR.rate);
  const mode=$('#ttsMode'); if(mode && mode.value!==NAR.mode) mode.value=NAR.mode;
  const auto=$('#autoBtn'); if(auto) auto.textContent = NAR.auto ? '⏸ עצור' : '▶ ניגון אוטומטי';
  const note=$('#ttsNote'); if(!note) return;
  if(!NAR.on){ note.classList.add('hidden'); return; }
  if(useOnline()){
    note.textContent='מופעל קול עברי מקוון (צריך חיבור לאינטרנט).';
    note.classList.remove('hidden');
    return;
  }
  if(!('speechSynthesis' in window)){
    note.innerHTML='הדפדפן הזה לא תומך בהקראה. נסה Chrome או Edge.';
    note.classList.remove('hidden');
    return;
  }
  if(NAR.voicesReady && !hebrewVoice()){
    note.innerHTML = `⚠️ לא נמצא קול עברי במחשב, אז ההקראה תשתמש בקול ברירת המחדל (ייתכן שלא יבטא עברית טוב).<br>
      <b>להוספת קול עברי ב-Windows:</b> הגדרות ← זמן ושפה ← דיבור ← "ניהול קולות" ← הוספת קולות ← בחר <b>עברית</b> (Microsoft Asaf) ← התקן, ואז סגור ופתח מחדש את הדפדפן.<br>
      <span class="muted">טיפ: בדפדפן Edge יש קולות עבריים טבעיים מובנים (Avri / Hila) בלי התקנה. אפשר גם לבחור "קול עברי מקוון".</span>`;
    note.classList.remove('hidden');
  } else note.classList.add('hidden');
}
function splitTts(text, max){
  max=max||180;
  const out=[];
  let s=String(text||'').replace(/\s+/g,' ').trim();
  while(s.length>max){
    const win=s.slice(0, max);
    let at=-1;
    for(const mark of ['. ','! ','? ','… ']){ const i=win.lastIndexOf(mark); if(i>at) at=i; }
    let cut;
    if(at>=8) cut=at+1;
    else {
      at=-1;
      for(const mark of [', ','، ']){ const i=win.lastIndexOf(mark); if(i>at) at=i; }
      if(at>=8) cut=at+1;
      else { const sp=win.lastIndexOf(' '); cut=sp>=8 ? sp : max; }
    }
    const piece=s.slice(0, cut).trim();
    if(!piece){ out.push(s.slice(0, max)); s=s.slice(max).trim(); continue; }
    out.push(piece);
    s=s.slice(cut).trim();
  }
  if(s) out.push(s);
  return out;
}
function ttsUrl(q){
  return 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=iw&q='+encodeURIComponent(q);
}
function clearAudioTimer(){ if(NAR.audioTimer){ clearTimeout(NAR.audioTimer); NAR.audioTimer=0; } }
function ensureAudio(){
  if(NAR.audio && NAR.audio.isConnected) return NAR.audio;
  const a=document.createElement('audio');
  a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
  a.preload='auto'; a.hidden=true; a.setAttribute('aria-hidden','true');
  (document.body||document.documentElement).appendChild(a);
  NAR.audio=a;
  return a;
}
// translate_tts returns 404 HTML when a Referer is present, and Chrome does not
// honor referrerpolicy on the audio element itself. A document policy does apply.
function stripReferrer(){
  if(document.querySelector('meta[name="referrer"][content="no-referrer"]')) return;
  const m=document.createElement('meta');
  m.name='referrer'; m.content='no-referrer';
  (document.head||document.documentElement).appendChild(m);
}
function stopOnline(){
  NAR.audioTok++;
  clearAudioTimer();
  const q=NAR.q.splice(0);
  NAR.playing=false;
  const a=NAR.audio;
  if(a){
    a.onended=a.onerror=a.onplay=a.onloadedmetadata=null;
    try{ a.pause(); }catch(e){}
    try{ a.removeAttribute('src'); a.load(); }catch(e){}
  }
  q.forEach(j=>j.fin());
}
function stopSpeaking(){
  stopOnline();
  if('speechSynthesis' in window){ try{ speechSynthesis.cancel(); }catch(e){} }
}
function playNextChunk(){
  if(NAR.playing) return;
  const job=NAR.q[0];
  if(!job) return;
  if(job.tok!==NAR.audioTok || job.i>=job.chunks.length){
    NAR.q.shift(); job.fin(); playNextChunk(); return;
  }
  const chunk=job.chunks[job.i++];
  const gen=job.tok;
  const a=ensureAudio();
  const rate=(NAR.rate>0 && NAR.rate<=4) ? NAR.rate : 1;
  NAR.playing=true;
  let done=false, listen=false;
  const step=()=>{
    if(done || gen!==NAR.audioTok) return;
    done=true;
    clearAudioTimer();
    a.onended=a.onerror=a.onplay=a.onloadedmetadata=null;
    NAR.playing=false;
    playNextChunk();
  };
  const budget=Math.max(10000, Math.round(chunk.length*180/rate)+7000);
  NAR.audioTimer=setTimeout(step, budget);
  // Ignore an error from the previous src aborting in the same turn.
  a.onended=()=>{ if(listen) step(); };
  a.onerror=()=>{ if(listen) step(); };
  const apply=()=>{ try{ if(gen===NAR.audioTok) a.playbackRate=rate; }catch(e){} };
  a.onloadedmetadata=apply; a.onplay=apply;
  stripReferrer();
  try{ a.src=ttsUrl(chunk); }catch(e){ listen=true; setTimeout(step, 0); return; }
  setTimeout(()=>{ listen=true; }, 0);
  apply();
  let p;
  try{ p=a.play(); }catch(e){ setTimeout(step, 0); return; }
  if(p&&typeof p.then==='function') p.then(apply).catch(()=>setTimeout(step, 0));
}
function sayOnline(text, interrupt){
  if(interrupt){
    stopOnline();
    if('speechSynthesis' in window){ try{ speechSynthesis.cancel(); }catch(e){} }
  }
  const chunks=splitTts(text, 180);
  const tok=NAR.audioTok;
  return new Promise(resolve=>{
    const job={chunks, i:0, tok, done:false, fin(){ if(this.done) return; this.done=true; resolve(); }};
    if(!chunks.length){ job.fin(); return; }
    NAR.q.push(job);
    playNextChunk();
  });
}
function saySystem(text, interrupt){
  if(!('speechSynthesis' in window)) return Promise.resolve();
  if(interrupt){ try{ speechSynthesis.cancel(); }catch(e){} }
  return new Promise(res=>{
    const u=new SpeechSynthesisUtterance(text);
    u.lang='he-IL';
    if(hebrewVoice()){ try{ u.voice=NAR.voice; }catch(e){} }
    const rate=(NAR.rate>0 && NAR.rate<=4) ? NAR.rate : 1;
    u.rate=rate;
    let done=false; const fin=()=>{ if(!done){ done=true; res(); } };
    u.onend=fin; u.onerror=fin;
    setTimeout(fin, Math.max(1500, text.length*95/rate)+1500);
    try{ speechSynthesis.speak(u); }catch(e){ fin(); }
  });
}
function speakNow(text, interrupt){
  if(!NAR.on || !text) return Promise.resolve();
  if(useOnline()) return sayOnline(text, interrupt);
  if(interrupt) stopOnline();
  return saySystem(text, interrupt);
}
function waitVoices(){
  if(NAR.voicesReady || !('speechSynthesis' in window)){ NAR.voicesReady=true; return Promise.resolve(); }
  if(NAR.voicesWait) return NAR.voicesWait;
  NAR.voicesWait=new Promise(res=>{
    let settled=false;
    const fin=()=>{
      if(settled) return; settled=true;
      NAR.voicesReady=true;
      try{ speechSynthesis.onvoiceschanged=pickVoice; }catch(e){}
      try{ pickVoice(); }catch(e){}
      res();
    };
    try{
      const prev=speechSynthesis.onvoiceschanged;
      speechSynthesis.onvoiceschanged=function(){
        if(typeof prev==='function' && prev!==pickVoice && prev!==speechSynthesis.onvoiceschanged){ try{ prev(); }catch(e){} }
        fin();
      };
    }catch(e){}
    setTimeout(fin, 1200);
  });
  return NAR.voicesWait;
}
function say(text, {interrupt=true}={}){
  text=(text||'').trim(); if(!NAR.on || !text) return Promise.resolve();
  NAR.log.push(text); if(NAR.log.length>200) NAR.log.shift();
  if(NAR.mode==='auto' && !NAR.voicesReady && ('speechSynthesis' in window))
    return waitVoices().then(()=>speakNow(text, interrupt));
  return speakNow(text, interrupt);
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
  if(NAR.auto){ stopAuto(); stopSpeaking(); return; }
  if(!R.game){ toast('קודם טען משחק לניתוח'); return; }
  if(R.v) exitVariation(false);
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
  if('speechSynthesis' in window){
    pickVoice();
    try{ speechSynthesis.onvoiceschanged=pickVoice; }catch(e){}
    setTimeout(()=>{ NAR.voicesReady=true; pickVoice(); }, 1200);
  } else NAR.voicesReady=true;
  $('#ttsBtn').onclick=()=>{
    NAR.on=!NAR.on; LS.set('tts', NAR.on?'1':'0');
    if(!NAR.on) stopSpeaking();
    updateTtsUi();
    if(NAR.on) say('הקריין הופעל.');
  };
  $('#ttsRate').onchange=e=>{ NAR.rate=+e.target.value || 1; LS.set('ttsrate', NAR.rate); say('זו המהירות החדשה.'); };
  const mode=$('#ttsMode');
  if(mode) mode.onchange=e=>{
    NAR.mode=TTS_MODES.includes(e.target.value) ? e.target.value : 'auto';
    LS.set('ttsmode', NAR.mode);
    updateTtsUi();
    say('זה הקול החדש.');
  };
  $('#autoBtn').onclick=autoplay;
  updateTtsUi();
}
