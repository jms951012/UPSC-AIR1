const $=x=>document.getElementById(x);
let db,banks=[],stats={},marks=[],history=[],current,pool=[],quiz=[],i=0,score=0,wrong=[],timer,answered=false,finishing=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>crypto?.randomUUID?crypto.randomUUID():'BANK-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
const norm=v=>String(v??'').trim();

function openDB(){return new Promise((ok,fail)=>{let r=indexedDB.open('UPSC_ACTIVE_RECALL_V3',1);r.onupgradeneeded=()=>{let d=r.result;if(!d.objectStoreNames.contains('d'))d.createObjectStore('d')};r.onsuccess=()=>{db=r.result;db.onversionchange=()=>db.close();ok()};r.onerror=()=>fail(r.error||new Error('Could not open local database.'))})}
function get(k,d){return new Promise((ok,fail)=>{try{let r=db.transaction('d','readonly').objectStore('d').get(k);r.onsuccess=()=>ok(r.result??d);r.onerror=()=>fail(r.error||new Error('Could not read local data.'))}catch(e){fail(e)}})}
function put(k,v){return new Promise((ok,fail)=>{try{let tx=db.transaction('d','readwrite'),r=tx.objectStore('d').put(v,k);r.onsuccess=()=>ok();r.onerror=()=>fail(r.error||new Error('Could not save local data.'));tx.onerror=()=>fail(tx.error||new Error('Could not save local data.'))}catch(e){fail(e)}})}

const all=()=>banks.flatMap(b=>(b.questions||[]).map(q=>({...q,bankId:b.id,bankName:b.name||b.bank_name||b.chapter||'Question Bank',subject:q.subject||b.subject||'General',book:q.book||b.book,chapter:q.chapter||b.chapter||b.name||b.bank_name}))); 
const due=q=>!stats[q.id]?.nextReview||stats[q.id].nextReview<=today();
function show(id){document.querySelectorAll('.screen').forEach(x=>x.classList.add('hidden'));$(id).classList.remove('hidden');scrollTo(0,0)}
function home(){show('home');render()}

async function normalizeBanks(){
  let changed=false;
  const usedIds=new Set();
  const usedQuestionIds=new Set();
  const oldStats={...stats};
  const oldMarks=[...marks];
  const newStats={...stats};
  const newMarks=new Set(marks.map(String));
  for(const b of banks){
    if(!b.id){b.id=uid();changed=true}
    if(!b.name)b.name=b.bank_name||b.chapter||`${b.subject||'General'} — Question Bank`;
    if(!Array.isArray(b.questions))b.questions=[];
    let bi=0;
    for(const q of b.questions){
      if(!q.id)q.id=`${b.id}-${++bi}`;
      const original=String(q.id);
      if(usedQuestionIds.has(original)){
        const fresh=`${b.id}-${bi||1}-${Math.random().toString(36).slice(2,8)}`;
        if(oldStats[original]) delete newStats[original];
        if(newMarks.has(original)){newMarks.delete(original);}
        q.id=fresh;changed=true;
      }
      usedQuestionIds.add(String(q.id));
      q.subject=q.subject||b.subject||'General';
      q.book=q.book||b.book;
      q.chapter=q.chapter||b.chapter||b.name;
    }
    if(usedIds.has(b.id)){b.id=uid();changed=true}
    usedIds.add(b.id);
  }
  stats=newStats;marks=[...newMarks];
  if(changed){await put('banks',banks);await put('stats',stats);await put('marks',marks);}
}

async function init(){banks=await get('banks',[]);stats=await get('stats',{});marks=await get('marks',[]);history=await get('history',[]);await normalizeBanks();render()}

function render(){
  let term=($('search').value||'').toLowerCase().trim();
  let qs=all(),h='';
  const filtered=banks.filter(b=>{
    const name=String(b.name||b.bank_name||b.chapter||'Question Bank');
    const subject=String(b.subject||'General');
    if(!term)return true;
    return subject.toLowerCase().includes(term)||name.toLowerCase().includes(term)||String(b.chapter||'').toLowerCase().includes(term)||String(b.bank_type||'').toLowerCase().includes(term);
  });
  const grouped={};
  for(const b of filtered){const s=b.subject||'General';(grouped[s]??=[]).push(b)}
  for(const s in grouped){
    const total=grouped[s].reduce((n,b)=>n+(b.questions||[]).length,0);
    h+=`<div class="subject"><b>📚 ${esc(s)}</b><span class="count">${total}</span>`;
    for(const b of grouped[s]){
      const name=b.name||b.bank_name||b.chapter||'Question Bank';
      const type=b.bank_type?`<small class="bankType">${esc(b.bank_type)}</small>`:'';
      h+=`<div class="chapter bankCard" data-bank-id="${esc(b.id)}"><div>📖 <b>${esc(name)}</b> <span class="count">${(b.questions||[]).length}</span></div>${type}</div>`;
    }
    h+='</div>';
  }
  $('subjectTree').innerHTML=h||'<p class="muted">No matching question banks.</p>';
  document.querySelectorAll('.bankCard').forEach(x=>x.onclick=()=>openBank(x.dataset.bankId));
  $('dueCount').textContent=qs.filter(due).length;
  $('wrongCount').textContent=qs.filter(q=>stats[q.id]?.wrong>0).length;
  $('markCount').textContent=marks.length;
  $('testCount').textContent=history.length+' tests';
}

function openBank(id){
  const b=banks.find(x=>x.id===id);if(!b)return home();
  const q=(b.questions||[]).map(x=>({...x,bankId:b.id,bankName:b.name,subject:x.subject||b.subject||'General',book:x.book||b.book,chapter:x.chapter||b.chapter||b.name}));
  current={bankId:b.id,name:b.name,questions:q,subject:b.subject||'General',chapter:b.chapter||b.name};
  $('chapterTitle').textContent=b.name||'Question Bank';
  $('chapterSub').textContent=`${b.subject||'General'} • ${q.length} questions`;
  let t={};q.forEach(x=>t[x.topic||'Unspecified']=(t[x.topic||'Unspecified']||0)+1);
  $('topics').innerHTML=Object.entries(t).map(([k,n])=>`<div class="topic" data-topic="${esc(k)}">🎯 ${esc(k)} <span class="count">${n}</span></div>`).join('')||'<p class="muted">No topics found.</p>';
  document.querySelectorAll('.topic').forEach(x=>x.onclick=()=>setup(q.filter(y=>(y.topic||'Unspecified')===x.dataset.topic),`${b.name} — ${x.dataset.topic}`));
  $('chapterTest').onclick=()=>setup(q,b.name);
  $('deleteChapter').onclick=()=>deleteBank(b.id);
  $('renameBank').onclick=()=>renameBank(b.id);
  show('chapter');
}

function setup(q,name){pool=[...q];current={...current,name,questions:pool};$('setupTitle').textContent=name;$('setupSub').textContent=pool.length+' questions';show('setup')}
function start(){let p=[...pool],d=$('difficulty').value;if(d!=='all')p=p.filter(q=>(q.difficulty||'').toLowerCase()===d.toLowerCase());if($('selection').value==='random')p.sort(()=>Math.random()-.5);if($('selection').value==='weak')p.sort((a,b)=>(stats[b.id]?.wrong||0)-(stats[a.id]?.wrong||0));if(!p.length)return alert('No questions match this filter.');quiz=p;i=0;score=0;wrong=[];finishing=false;show('quiz');startTimer();renderQ()}
function startTimer(){clearInterval(timer);let s=+$('timer').value*60;$('clock').textContent='';if(!s)return;$('clock').textContent=`⏱ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;timer=setInterval(()=>{s--;if(s<=0){clearInterval(timer);timer=null;$('clock').textContent='⏱ 0:00';finish();return}$('clock').textContent=`⏱ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`},1000)}
function renderQ(){let q=quiz[i];if(!q){finish();return}answered=false;$('progress').textContent=`Q ${i+1}/${quiz.length}`;$('score').textContent=`Score ${score}`;$('meta').textContent=[q.subject,q.book,q.chapter,q.topic,q.difficulty,q.source].filter(Boolean).join(' • ');$('question').textContent=q.question;$('feedback').classList.add('hidden');$('next').classList.add('hidden');$('bookmark').textContent=marks.includes(String(q.id))?'★ Bookmarked':'☆ Bookmark';$('options').innerHTML='';const opts=Array.isArray(q.options)?q.options.reduce((o,v,n)=>(o[String.fromCharCode(65+n)]=v,o),{}):(q.options||{});Object.entries(opts).forEach(([k,v])=>{let b=document.createElement('button');b.className='option';b.textContent=k+'. '+v;b.onclick=()=>answer(k);$('options').appendChild(b)})}
async function answer(k){if(answered||finishing)return;answered=true;let q=quiz[i],ok=k===q.answer;if(ok)score++;else wrong.push(q);let s=stats[q.id]||{attempts:0,correct:0,wrong:0,streak:0,interval:0};s.attempts++;s[ok?'correct':'wrong']++;s.streak=ok?s.streak+1:0;s.interval=ok?(s.interval?Math.min(Math.round(s.interval*2.2),180):1):0;s.nextReview=new Date(Date.now()+s.interval*86400000).toISOString().slice(0,10);stats[q.id]=s;try{await put('stats',stats)}catch(e){console.warn('Stats save failed:',e)}[...$('options').children].forEach((b,n)=>{let key=String.fromCharCode(65+n);b.disabled=true;if(key===q.answer)b.classList.add('correct');if(key===k&&!ok)b.classList.add('wrong')});let oa=q.option_analysis||'',a=typeof oa==='string'?`<div>${esc(oa)}</div>`:Object.entries(oa).map(([x,v])=>`<div><b>${esc(x)}:</b> ${esc(v)}</div>`).join('');$('feedback').innerHTML=`<b>${ok?'✅ Correct':'❌ Incorrect'}</b>${ok?'':'<p><b>Correct answer: '+esc(q.answer)+'</b></p>'}<p><b>Explanation:</b> ${esc(q.explanation||'')}</p>${a?'<hr><b>Option analysis</b>'+a:''}${q.upsc_trap?'<hr><b>⚠ UPSC Trap:</b> '+esc(q.upsc_trap):''}${q.memory_hook?'<hr><b>🧠 Memory Hook:</b> '+esc(q.memory_hook):''}${q.key_fact?'<hr><b>📌 Key Fact:</b> '+esc(q.key_fact):''}${q.linkage?'<hr><b>🔗 Linkage:</b> '+esc(q.linkage):''}`;$('feedback').classList.remove('hidden');$('next').classList.remove('hidden')}
function nextQ(){if(finishing||!answered)return;i++;i<quiz.length?renderQ():finish()}
async function finish(){if(finishing)return;finishing=true;clearInterval(timer);timer=null;if(!quiz.length){finishing=false;home();return}let pct=Math.round(score/quiz.length*100);history.unshift({date:new Date().toISOString(),name:current?.name||'Test',total:quiz.length,correct:score,pct});history=history.slice(0,200);try{await put('history',history)}catch(e){console.warn('History save failed:',e)}let m={};wrong.forEach(q=>m[q.topic||'Unspecified']=(m[q.topic||'Unspecified']||0)+1);$('resultStats').innerHTML=`<div class="big">${pct}%</div><p>Correct: <b>${score}</b> / ${quiz.length}</p><p>Wrong: <b>${quiz.length-score}</b></p>`;$('weak').innerHTML=Object.entries(m).map(([k,n])=>`<li>${esc(k)} — ${n} wrong</li>`).join('')||'<li>No weak topics 🎉</li>';show('result')}
async function bookmark(){let id=String(quiz[i].id);marks=marks.includes(id)?marks.filter(x=>String(x)!==id):[...marks,id];await put('marks',marks);renderQ();render()}
function revision(type){let q=all(),p=type==='wrong'?q.filter(x=>stats[x.id]?.wrong>0):type==='marked'?q.filter(x=>marks.includes(String(x.id))):q.filter(due);if(!p.length)return alert('Nothing to revise.');setup(p,type==='wrong'?'Wrong Questions':type==='marked'?'Bookmarks':'Due Review')}

async function deleteBank(id){
  const b=banks.find(x=>x.id===id);if(!b)return;
  const name=b.name||'Question Bank',count=(b.questions||[]).length;
  showDeleteConfirm(name,count,async()=>{
    const ids=(b.questions||[]).map(q=>String(q.id));
    banks=banks.filter(x=>x.id!==id);
    ids.forEach(qid=>{delete stats[qid];marks=marks.filter(m=>String(m)!==qid)});
    try{await put('banks',banks);await put('stats',stats);await put('marks',marks);closeDeleteModal();home();showDeleteMessage('Deleted successfully',`${name}\n\n${count} questions were removed from this PWA.\n\nThe original JSON file and GitHub copy were NOT deleted.`)}catch(e){showDeleteMessage('Delete failed',e?.message||String(e))}
  });
}

function showDeleteConfirm(name,count,onConfirm){
  closeDeleteModal();const wrap=document.createElement('div');wrap.id='deleteModal';wrap.className='modalOverlay';
  wrap.innerHTML=`<div class="modalCard"><h2>🗑 Delete Question Bank?</h2><p><b>${esc(name)}</b></p><p>${count} questions will be removed from this PWA.</p><p class="muted">Your original JSON/GitHub copy will NOT be deleted.</p><div class="modalActions"><button id="deleteConfirm" class="danger">Yes, Delete</button><button id="deleteCancel" class="secondary">Cancel</button></div></div>`;
  document.body.appendChild(wrap);$('deleteCancel').onclick=closeDeleteModal;$('deleteConfirm').onclick=async()=>{const b=$('deleteConfirm');b.disabled=true;b.textContent='Deleting…';await onConfirm()};
}
function showDeleteMessage(title,msg){closeDeleteModal();const wrap=document.createElement('div');wrap.id='deleteModal';wrap.className='modalOverlay';wrap.innerHTML=`<div class="modalCard"><h2>${esc(title)}</h2><p style="white-space:pre-line">${esc(msg)}</p><button id="deleteOk">OK</button></div>`;document.body.appendChild(wrap);$('deleteOk').onclick=closeDeleteModal}
function closeDeleteModal(){const m=document.getElementById('deleteModal');if(m)m.remove()}

async function renameBank(id){
  const b=banks.find(x=>x.id===id);if(!b)return;
  const old=b.name||b.bank_name||b.chapter||'Question Bank';
  const name=prompt('Rename question bank:',old);
  if(name===null)return;
  const n=name.trim();if(!n)return alert('Name cannot be empty.');
  if(banks.some(x=>x.id!==id&&String(x.name||'').trim().toLowerCase()===n.toLowerCase()))return alert('A question bank with this name already exists. Choose another name.');
  b.name=n;
  b.bank_name=n;
  try{await put('banks',banks);openBank(id);render()}catch(e){alert('Rename failed: '+(e?.message||e))}
}

async function importBank(file){
  try{
    let d=JSON.parse(await file.text());
    if(!Array.isArray(d.questions))throw Error('JSON must contain questions array.');
    const suppliedName=String(d.name||d.bank_name||'').trim();
    d.name=suppliedName||`${d.subject||'General'} — ${d.chapter||'Bank'}`;
    d.id=uid(); // Every import gets a new independent bank. Never merge by chapter/name.
    d.importedFileName=file.name||'';
    const existingQuestionIds=new Set(all().map(q=>String(q.id)));
    d.questions.forEach((q,n)=>{
      const original=String(q.id??'').trim();
      let qid=original||`${d.id}-${n+1}`;
      if(existingQuestionIds.has(qid)||d.questions.slice(0,n).some(x=>String(x.id)===qid))qid=`${d.id}-${n+1}`;
      q.id=qid;q.subject=q.subject||d.subject||'General';q.book=q.book||d.book;q.chapter=q.chapter||d.chapter||d.name;existingQuestionIds.add(q.id);
    });
    banks.push(d);
    await put('banks',banks);render();alert(`Imported as a separate question bank:\n\n${d.name}\n${d.questions.length} questions.`)
  }catch(e){alert('Import failed: '+e.message)}
}
function backup(){let d={format:'UPSC_ACTIVE_RECALL_V3',version:4,exportedAt:new Date().toISOString(),banks,stats,marks,history},a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.download='UPSC_Active_Recall_V4_Backup.json';a.click()}
function restore(){let f=document.createElement('input');f.type='file';f.accept='.json';f.onchange=async()=>{try{let d=JSON.parse(await f.files[0].text());if(!Array.isArray(d.banks))throw Error('Not a valid backup.');banks=d.banks||[];stats=d.stats||{};marks=d.marks||[];history=d.history||[];await normalizeBanks();await put('banks',banks);await put('stats',stats);await put('marks',marks);await put('history',history);alert('Backup restored.');render()}catch(e){alert(e.message)}};f.click()}
function showHistory(){let q=all(),a=q.filter(x=>stats[x.id]?.attempts),att=a.reduce((n,x)=>n+stats[x.id].attempts,0),cor=a.reduce((n,x)=>n+stats[x.id].correct,0);$('performance').innerHTML=`<p><b>Total questions:</b> ${q.length}</p><p><b>Question banks:</b> ${banks.length}</p><p><b>Questions attempted:</b> ${a.length}</p><p><b>Total attempts:</b> ${att}</p><p><b>Overall accuracy:</b> ${att?Math.round(cor/att*100):0}%</p><h3>Recent tests</h3>`+(history.length?history.slice(0,20).map(h=>`<div class="historyRow"><b>${esc(h.name)}</b><br>${new Date(h.date).toLocaleString()}<br>${h.correct}/${h.total} correct — <b>${h.pct}%</b></div>`).join(''):'<p class="muted">No tests yet.</p>');show('history')}

$('search').oninput=render;
$('fileInput').onchange=e=>{const f=e.target.files[0];if(f)importBank(f);e.target.value=''};
$('backupBtn').onclick=backup;$('restoreBtn').onclick=restore;$('back').onclick=home;$('cancel').onclick=home;$('start').onclick=start;$('next').onclick=nextQ;$('bookmark').onclick=bookmark;$('retry').onclick=()=>revision('wrong');$('resultHome').onclick=home;$('historyHome').onclick=home;
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{let a=b.dataset.action;if(a==='history')showHistory();else if(a==='all')setup(all(),'All Questions');else revision(a)});
openDB().then(init);
if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(e=>console.warn('SW registration failed:',e))}
