/* StudyAI Studio: enhancements layered over the existing app, never replacing its core tools. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const safe = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = (key, fallback=[]) => {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;}};
const pages = Object.fromEntries([...document.querySelectorAll('.studyai-page')].map(el=>[el.dataset.page,el]));
if (!pages.tutor) return;
// Dedicated conversational workspace. Existing lesson generator remains available on Study Center.
const chatArea=document.createElement('div');chatArea.className='studio-chat studio-chat-pro';
chatArea.innerHTML=`<div class="studio-chat-head"><div class="studio-avatar">✦</div><div><h2>AI Tutor <span class="studio-online">● Ready to help</span></h2><p>Ask anything, follow up, and learn step by step.</p></div><button type="button" id="studioNewChat" class="studio-ghost">+ New chat</button></div><div class="studio-chat-layout"><aside class="studio-conversations"><div class="studio-side-title">CONVERSATIONS</div><div id="studioConversationList"></div></aside><div class="studio-chat-main"><div id="studioMessages" class="studio-messages" role="log" aria-live="polite"></div><div class="studio-prompts"><button data-prompt="Explain this like I'm a beginner.">Explain simply</button><button data-prompt="Quiz me on what we just learned.">Quiz me</button><button data-prompt="Give me a real-world example.">Give an example</button></div><form id="studioChatForm" class="studio-compose"><textarea id="studioChatInput" rows="2" maxlength="4000" placeholder="Ask a question or continue the conversation…" aria-label="Your question"></textarea><button id="studioSend" type="submit">Send ↗</button><button id="studioStop" type="button" hidden>Stop ■</button></form><p class="studio-chat-foot">AI can make mistakes. Check important answers. Chats are saved in this browser.</p></div></div>`;
pages.tutor.append(chatArea);
const storeKey='studyai.tutor.conversations.v2';
let conversations=read(storeKey,[]);
if(!Array.isArray(conversations))conversations=[];
const legacy=read('studyai.tutor.chat.v1',[]);
if(!conversations.length&&Array.isArray(legacy)&&legacy.length)conversations=[{id:'imported',title:'Previous conversation',messages:legacy}];
let activeId=conversations[0]?.id||null;
let busy=false,controller=null;
const freshId=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,8);
function current(){return conversations.find(c=>c.id===activeId);}
function persist(){try{localStorage.setItem(storeKey,JSON.stringify(conversations.slice(0,30).map(c=>({...c,messages:c.messages.slice(-80)}))));}catch(e){console.warn('Chat storage unavailable',e);}}
function richAssistant(content){
 const source=String(content??'');
 if(!window.marked||!window.DOMPurify)return safe(source).replace(/\n/g,'<br>');
 const math=[];
 const tokenized=source.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$([^\n$]+?)\$/g,(whole,a,b,c,d)=>{
 const expression=a??b??c??d,display=a!==undefined||b!==undefined,marker='STUDYAIMATHPLACEHOLDER'+math.length+'END';
 let rendered=safe(whole);if(window.katex){try{rendered=window.katex.renderToString(expression,{displayMode:display,throwOnError:false,trust:false,output:'html'});}catch{}}
 math.push(rendered);return marker;});
 const raw=window.marked.parse(tokenized,{gfm:true,breaks:true});
 const sanitized=window.DOMPurify.sanitize(raw,{USE_PROFILES:{html:true},ADD_ATTR:['class','aria-hidden','style']});
 return sanitized.replace(/STUDYAIMATHPLACEHOLDER(\d+)END/g,(_,n)=>math[Number(n)]??'');
}
function renderList(){
 const list=$('studioConversationList');
 list.innerHTML=conversations.map(c=>`<div class="studio-chat-row ${c.id===activeId?'selected':''}"><button class="studio-conversation ${c.id===activeId?'selected':''}" data-chat-id="${safe(c.id)}" type="button" title="Open conversation">✦ ${safe(c.title||'New chat')}</button><button class="studio-delete-chat" data-delete-id="${safe(c.id)}" type="button" aria-label="Delete conversation ${safe(c.title||'New chat')}" title="Delete chat">🗑</button></div>`).join('');
 list.querySelectorAll('[data-chat-id]').forEach(b=>b.addEventListener('click',()=>{if(busy)return;activeId=b.dataset.chatId;render();}));
 list.querySelectorAll('[data-delete-id]').forEach(b=>b.addEventListener('click',()=>{
  if(busy){alert('Stop generating before deleting a chat.');return;}
  const id=b.dataset.deleteId,chat=conversations.find(c=>c.id===id);
  if(!chat||!confirm(`Delete "${chat.title||'New chat'}"? This cannot be undone.`))return;
  conversations=conversations.filter(c=>c.id!==id);
  if(activeId===id)activeId=conversations[0]?.id||null;
  persist();render();
 }));
}
function render(){renderList();const log=$('studioMessages'),msgs=current()?.messages||[];
 log.innerHTML=msgs.length?msgs.map((m,i)=>`<div class="studio-msg ${m.role==='user'?'studio-user':'studio-assistant'}"><div class="studio-msg-icon">${m.role==='user'?'You':'✦'}</div><div class="studio-msg-body"><div class="studio-msg-text">${m.role==='assistant'?richAssistant(m.content):safe(m.content)}</div>${m.role==='assistant'?`<div class="studio-msg-actions"><button type="button" data-copy="${i}">Copy</button>${i===msgs.length-1?'<button type="button" data-regenerate="1">Regenerate</button>':''}</div>`:''}</div></div>`).join(''):'<div class="studio-empty"><div class="studio-empty-icon">✦</div><h3>What would you like to learn?</h3><p>Ask a question, share a topic, or request a practice example.</p></div>';
 log.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const m=current()?.messages[Number(b.dataset.copy)];if(!m)return;try{await navigator.clipboard.writeText(m.content);b.textContent='Copied ✓';}catch{b.textContent='Copy unavailable';}}));
 log.querySelectorAll('[data-regenerate]').forEach(b=>b.addEventListener('click',()=>regenerate()));
 log.scrollTop=log.scrollHeight;
}
function setBusy(value){busy=value;$('studioSend').disabled=value;$('studioSend').hidden=value;$('studioStop').hidden=!value;$('studioNewChat').disabled=value;}
function newChat(){if(busy)return;const c={id:freshId(),title:'New conversation',messages:[]};conversations.unshift(c);activeId=c.id;persist();render();$('studioChatInput').focus();}
$('studioNewChat').addEventListener('click',newChat);
$('studioStop').addEventListener('click',()=>controller?.abort());
chatArea.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{$('studioChatInput').value=b.dataset.prompt;$('studioChatInput').focus();}));
$('studioChatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('studioChatForm').requestSubmit();}});
async function requestAnswer(){if(busy)return;const c=current();if(!c)return;const last=c.messages.at(-1);if(last?.role!=='user')return;
 setBusy(true);controller=new AbortController();const chatId=c.id;
 c.messages.push({role:'assistant',content:''});render();
 const log=$('studioMessages');const status=document.createElement('div');status.className='studio-thinking';status.textContent='✦ Preparing answer…';log.append(status);
 let partial='';
 try{
 const history=c.messages.slice(0,-2).slice(-16);
 const response=await fetch('/api/tutor-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:last.content,history,topic:$('topicInput')?.value||'',pdfText:window.uploadedPDFText||''}),signal:controller.signal});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'Tutor is unavailable. Restart your server.');}
 if(!response.body)throw Error('Streaming not supported by this browser.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
 while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const parts=buffer.split('\n\n');buffer=parts.pop();for(const part of parts){const event=part.split('\n').find(x=>x.startsWith('data: '));if(!event)continue;let data;try{data=JSON.parse(event.slice(6));}catch{continue;}if(data.error)throw Error(data.error);if(data.delta){partial+=data.delta;c.messages.at(-1).content=partial;const bubble=$('studioMessages').querySelector('.studio-assistant:last-child .studio-msg-text');if(bubble)bubble.innerHTML=richAssistant(partial);$('studioMessages').scrollTop=$('studioMessages').scrollHeight;status.textContent='✦ Writing answer…';}}}
 }catch(err){if(err.name==='AbortError'){if(!partial)partial='Response stopped.';}else{if(!partial)partial='Sorry, I could not reply: '+err.message;}}
 finally{const found=conversations.find(x=>x.id===chatId);if(found)found.messages.at(-1).content=partial||'No response received.';status.remove();setBusy(false);controller=null;persist();render();$('studioChatInput').focus();}
}
function regenerate(){if(busy)return;const c=current();if(!c)return;if(c.messages.at(-1)?.role==='assistant')c.messages.pop();persist();render();requestAnswer();}
$('studioChatForm').addEventListener('submit',e=>{e.preventDefault();if(busy)return;const input=$('studioChatInput'),message=input.value.trim();if(!message)return;if(!current())newChat();const c=current();c.messages.push({role:'user',content:message});if(c.title==='New conversation')c.title=message.slice(0,44);input.value='';persist();render();requestAnswer();});
if(!activeId)newChat();else render();
// The same tutor is available wherever students learn. Keep original lesson/quiz/flashcard generators intact.
function openTutor(prompt){location.hash='#tutor';setTimeout(()=>{const input=$('studioChatInput');if(!input)return;input.value=prompt||'';input.focus();},70);}
const launcher=document.createElement('div');launcher.className='studio-quick-tutor';launcher.innerHTML='<span>✦ Need help while studying?</span><button type="button" id="studioQuickAsk">Ask AI Tutor ↗</button>';
const workspace=$('studyWorkspace');if(workspace)workspace.append(launcher);
$('studioQuickAsk')?.addEventListener('click',()=>openTutor('Help me understand '+($('topicInput')?.value.trim()||'what I am studying')+'.'));
const resultsArea=$('result');if(resultsArea){const ask=document.createElement('button');ask.type='button';ask.className='studio-ask-result';ask.textContent='✦ Discuss this with AI Tutor';resultsArea.append(ask);ask.addEventListener('click',()=>openTutor('Explain the study material I just generated about '+($('topicInput')?.value.trim()||'my topic')+' and help me practice it.'));}
window.studyAIAskTutor=openTutor;
// Start Studying now opens the conversational tutor and begins the lesson automatically.
// Capture the click before the legacy script's lesson generator runs.
const startStudyButton=$('studyButton');
if(startStudyButton){
 startStudyButton.addEventListener('click',event=>{
  event.preventDefault();
  event.stopImmediatePropagation();
  const topic=$('topicInput')?.value.trim()||'';
  const pdfText=String(window.uploadedPDFText||'').trim();
  if(!topic&&!pdfText){
   const field=$('topicInput');
   if(field){field.focus();field.placeholder='Enter a topic or upload notes first…';}
   return;
  }
  if(busy){location.hash='#tutor';return;}
  newChat();
  const prompt=pdfText
   ? `Teach me ${topic||'the material in my uploaded notes'} using my uploaded notes as the primary source. Start with a clear, well-organized lesson that explains the main ideas in simple steps, includes examples, and ends with 3 short review questions. Then wait for my answers and help me correct mistakes. If something is not supported by my notes, say so.`
   : `I want to study ${topic}. Start teaching me now with a clear, structured beginner-friendly lesson. Explain key ideas step by step, give practical examples, and end with 3 short review questions. Wait for my answers, review them, and explain any mistakes before moving on.`;
  const c=current();
  c.messages.push({role:'user',content:prompt});
  c.title='Study: '+(topic||'Uploaded notes').slice(0,44);
  persist();render();
  location.hash='#tutor';
  requestAnswer();
 },true);
}

// Premium study history page, sourced from the existing local data model.
const historyArea=document.createElement('div');historyArea.className='studio-section';pages.history.append(historyArea);
function historyView(){const items=read('studyHistory',[]);const list=Array.isArray(items)?items:[];const types=[...new Set(list.map(x=>x.type||'Study'))];historyArea.innerHTML=`<div class="studio-hero"><div><span class="studio-eyebrow">YOUR LEARNING JOURNEY</span><h2>Every session counts.</h2><p>Explore the lessons, quizzes, and flashcards you've completed.</p></div><div class="studio-hero-mark">◷</div></div><div class="studio-stat-grid"><div class="studio-stat"><span>Recorded activities</span><strong>${list.length}</strong><small>Across all topics</small></div><div class="studio-stat"><span>Subjects explored</span><strong>${new Set(list.map(x=>String(x.topic||'').toLowerCase())).size}</strong><small>Unique topics</small></div><div class="studio-stat"><span>Activity types</span><strong>${types.length}</strong><small>Ways you've learned</small></div></div><div class="studio-panel"><div class="studio-panel-head"><div><h3>Activity timeline</h3><p>Your latest sessions, newest first</p></div><input id="studioHistorySearch" type="search" placeholder="Search activity…" aria-label="Search study history"></div><div id="studioHistoryList"></div></div>`;const search=$('studioHistorySearch'),target=$('studioHistoryList');const draw=()=>{const filtered=list.filter(x=>(String(x.topic||'')+' '+String(x.type||'')).toLowerCase().includes(search.value.toLowerCase()));target.innerHTML=filtered.length?filtered.map((x,i)=>`<div class="studio-timeline"><div class="studio-timeline-dot">${/quiz/i.test(x.type)?'✎':/flash/i.test(x.type)?'◈':'▣'}</div><div class="studio-timeline-body"><strong>${safe(x.topic||'Untitled session')}</strong><span>${safe(x.type||'Study activity')}</span></div><time>${safe(x.date||'')}</time></div>`).join(''):'<div class="studio-no-data">No matching study sessions yet. Start a lesson or quiz to build your history.</div>';};search.addEventListener('input',draw);draw();}
const streakArea=document.createElement('div');streakArea.className='studio-section';pages.streak.append(streakArea);
function streakView(){const streak=Number(localStorage.getItem('studyStreak'))||0;const last=localStorage.getItem('lastStudyDate')||'';const today=new Date().toLocaleDateString('en-CA');const recent=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(13-i));return d;});const entries=read('studyHistory',[]);const activityDays=new Set((Array.isArray(entries)?entries:[]).map(x=>{const d=new Date(x.date);return Number.isNaN(+d)?'':d.toLocaleDateString('en-CA');}));if(last)activityDays.add(last);streakArea.innerHTML=`<div class="studio-hero streak-hero"><div><span class="studio-eyebrow">BUILD YOUR MOMENTUM</span><h2>Consistency is your superpower.</h2><p>A little progress every day adds up to something extraordinary.</p></div><div class="studio-flame">🔥</div></div><div class="studio-stat-grid"><div class="studio-stat"><span>Current streak</span><strong>${streak} <small>days</small></strong><small>Keep showing up</small></div><div class="studio-stat"><span>Last studied</span><strong class="studio-date">${safe(last||'Not yet')}</strong><small>Your latest activity</small></div><div class="studio-stat"><span>Study activities</span><strong>${Array.isArray(entries)?entries.length:0}</strong><small>All-time recorded</small></div></div><div class="studio-panel"><div class="studio-panel-head"><div><h3>Last 14 days</h3><p>Study activity recorded on your device</p></div></div><div class="studio-calendar">${recent.map(d=>{const day=d.toLocaleDateString('en-CA');const active=activityDays.has(day);return `<div class="studio-day ${active?'active':''}" title="${safe(day)}"><small>${d.toLocaleDateString('en-US',{weekday:'short'})}</small><strong>${d.getDate()}</strong><span>${active?'●':'·'}</span></div>`;}).join('')}</div><p class="studio-muted">Days without a recorded session are shown as inactive. Older streak history may not be available.</p></div><div class="studio-panel studio-motivation"><span>✦</span><div><h3>One session at a time</h3><p>Study a topic, review flashcards, or take a quiz today to keep building your habit.</p></div><a href="#study-center" class="studio-cta">Start studying ↗</a></div>`;}
// Navigation runs first. Replace the old history/streak result panels with their own layouts.
window.addEventListener('hashchange',()=>{if(location.hash==='#history')historyView();if(location.hash==='#streak')streakView();});
const observer=new MutationObserver(()=>{const page=location.hash.slice(1);if(page==='history'||page==='streak'){const results=$('result');if(results&&results.parentElement===pages[page]){results.hidden=true;results.style.display='none';}if(page==='history')historyView();else streakView();}});
// Avoid observing entire DOM: watch only results parent, when moved by navigation.
const results=$('result');if(results)observer.observe(document.querySelector('.page-content'),{childList:true,subtree:false});
function adjust(){const page=location.hash.slice(1);if(results){results.style.display=['history','streak'].includes(page)?'none':'';results.hidden=['history','streak'].includes(page);}if(page==='history')historyView();if(page==='streak')streakView();}
window.addEventListener('hashchange',()=>setTimeout(adjust,0));adjust();

// Analytics presentation upgrade: preserve existing calculations and circular quiz charts.
const polish=document.createElement('style');polish.textContent=`
.studio-chat-row{display:flex;align-items:center;gap:4px;border-radius:12px;margin:3px 0;min-width:0}
.studio-chat-row.selected{background:rgba(128,91,244,.14)}
.studio-chat-row .studio-conversation{flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.studio-delete-chat{flex:none;border:1px solid transparent;background:transparent;color:#aab8d3;cursor:pointer;border-radius:9px;padding:7px 8px;font-size:14px}
.studio-delete-chat:hover,.studio-delete-chat:focus-visible{color:#ffb4c2;background:rgba(244,63,94,.14);border-color:rgba(244,63,94,.35)}
#result .studio-analytics-card{border:1px solid rgba(146,164,210,.19);border-radius:18px;background:linear-gradient(150deg,#1b2743,#141e35);padding:25px;margin:16px 0;box-shadow:0 10px 28px rgba(0,0,0,.10)}
#result .studio-analytics-card h3{margin:0 0 7px;font-size:19px;color:#f5f5ff}
#resultsSection .studio-analytics-sub{color:#aab8d3;margin:0 0 20px}
.studio-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.studio-metric{border:1px solid #354363;background:#202e4d;border-radius:14px;padding:18px;min-width:0}
.studio-metric strong{display:block;font-size:clamp(23px,3vw,34px);color:#f8faff;margin:6px 0}
.studio-metric span,.studio-metric small{color:#b9c7e4;font-size:13px}
.studio-trend{padding:12px 15px;border:1px solid #364467;border-radius:12px;background:#202c48;color:#cbd6ee;margin-top:14px}
.studio-topic-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:13px}
.studio-topic-tile{border:1px solid #354363;border-radius:15px;background:#202d49;padding:16px;display:flex;align-items:center;gap:14px;min-width:0}
.studio-topic-ring{width:65px;height:65px;border-radius:50%;flex:none;display:grid;place-items:center;background:conic-gradient(var(--ring) calc(var(--pct)*1%),#34415f 0);position:relative}
.studio-topic-ring:before{content:'';position:absolute;inset:8px;border-radius:50%;background:#202d49}
.studio-topic-ring strong{position:relative;color:#fff;font-size:15px}
.studio-topic-info{min-width:0;flex:1}.studio-topic-info strong{display:block;overflow-wrap:anywhere;color:#fff;margin-bottom:7px}.studio-topic-info small{color:#b7c5df}
.studio-analytics-action{display:inline-block;border:1px solid #7764df;background:#6e52d8;color:white!important;border-radius:9px;padding:8px 11px;margin-top:10px;font-size:12px;cursor:pointer;text-decoration:none}
.studio-analytics-action:hover{background:#846af0}
.studio-recommendation{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #354363;border-radius:13px;padding:15px;margin-top:10px;background:#202d49}
.studio-recommendation strong{color:#fff}.studio-recommendation small{display:block;color:#b9c7e4;margin-top:4px}
.studio-analytics-progress{height:11px;background:#34415f;border-radius:20px;overflow:hidden;margin-top:10px}.studio-analytics-progress>span{display:block;height:100%;background:linear-gradient(90deg,#6d5cf5,#35b6ec);border-radius:20px}
@media(max-width:650px){.studio-metric-grid{grid-template-columns:1fr}#result .studio-analytics-card{padding:17px}.studio-recommendation{flex-wrap:wrap}}
`;document.head.append(polish);
const escAnalytics=safe;
function analyticsData(){
 try{const items=JSON.parse(localStorage.getItem('quizResults')||'[]');return Array.isArray(items)?items:[]}catch{return []}
}
function analyticsTopics(items){const map=new Map();for(const x of items){const name=String(x.topic||'Unknown').trim();const key=name.toLowerCase();const p=map.get(key)||{name,correct:0,total:0};p.correct+=Number(x.correct)||0;p.total+=Number(x.total)||0;map.set(key,p);}return [...map.values()].filter(x=>x.total>0).map(x=>({...x,score:Math.round(100*x.correct/x.total)})).sort((a,b)=>a.score-b.score);}
function analyticsRing(topic){const color=topic.score<40?'#fb7185':topic.score<70?'#fbbf24':'#7c78fa';return `<div class="studio-topic-tile"><div class="studio-topic-ring" style="--pct:${topic.score};--ring:${color}"><strong>${topic.score}%</strong></div><div class="studio-topic-info"><strong>${escAnalytics(topic.name)}</strong><small>${topic.score<40?'Needs attention':'Keep practicing'}</small><br><button class="studio-analytics-action" data-study-topic="${escAnalytics(topic.name)}" type="button">Practice with AI ↗</button></div></div>`;}
function improveAnalytics(){
 if(location.hash!=='#analytics')return;
 const root=$('result');if(!root)return;
 const cards=[...root.querySelectorAll('.goal-card:not(.studio-analytics-card)')];
 if(!cards.length)return;
 const items=analyticsData(),topics=analyticsTopics(items),weak=topics.filter(x=>x.score<70),recent=items.slice(0,5),avg=recent.length?Math.round(recent.reduce((s,x)=>s+(Number(x.score)||0),0)/recent.length):0;
 for(const card of cards){const heading=card.querySelector('h3')?.textContent||'';if(!heading)continue;card.classList.add('studio-analytics-card');
  if(heading.includes('Smart Learning Insights')){card.innerHTML=`<h3>🧠 Smart Learning Insights</h3><p class="studio-analytics-sub">Your recent performance at a glance</p><div class="studio-metric-grid"><div class="studio-metric"><span>Recent quiz average</span><strong>${avg}%</strong><small>Last ${recent.length} quizzes</small></div><div class="studio-metric"><span>Quizzes completed</span><strong>${items.length}</strong><small>Practice sessions recorded</small></div></div><div class="studio-trend">${items.length<6?'✦ Complete more quizzes to unlock a reliable performance trend.':'✦ Keep practicing to improve your average over time.'}</div>`;}
  else if(heading.includes('Topics to Improve')){card.innerHTML=`<h3>🎯 Topics to Improve</h3><p class="studio-analytics-sub">Topics currently below the 70% mastery target</p>${weak.length?`<div class="studio-topic-grid">${weak.map(analyticsRing).join('')}</div>`:'<div class="studio-trend">🎉 No topics below 70% right now.</div>'}`;}
  else if(heading.includes('Study Recommendations')){card.innerHTML=`<h3>💡 Study Recommendations</h3><p class="studio-analytics-sub">Personalized next steps based on your quiz results</p>${weak.length?weak.slice(0,3).map(x=>`<div class="studio-recommendation"><div><strong>📖 ${escAnalytics(x.name)}</strong><small>${x.score}% mastery · Review key concepts and retry a quiz</small></div><button type="button" class="studio-analytics-action" data-study-topic="${escAnalytics(x.name)}">Study now ↗</button></div>`).join(''):'<div class="studio-trend">Great work! Keep building on your strongest topics.</div>'}`;}
  else if(heading.includes('Learning Progress')){const latest=items[0];card.innerHTML=`<h3>📈 Learning Progress</h3><p class="studio-analytics-sub">Your practice journey so far</p><div class="studio-metric-grid"><div class="studio-metric"><span>Quiz attempts</span><strong>${items.length}</strong><small>Completed quizzes</small></div><div class="studio-metric"><span>Latest score</span><strong>${latest?Number(latest.score)||0:0}%</strong><small>${latest?escAnalytics(latest.topic||'Latest topic'):'No quiz yet'}</small></div></div><div class="studio-trend">${items.length?'Each quiz helps StudyAI identify what to review next.':'Take your first quiz to start tracking progress.'}</div>`;}
  else if(heading.includes('Your Goal')){const missingGoal=card.textContent.includes('not set');card.innerHTML=`<h3>🎯 Your Goal</h3><p class="studio-analytics-sub">Set a study target and keep your momentum</p><div class="studio-trend">${missingGoal?'No goal set yet. Head to Study Goals to create one.':'Track your progress in Study Goals.'}</div><a class="studio-analytics-action" href="#goals">${missingGoal?'Set a goal ↗':'View goal ↗'}</a>`;}
 }
 root.querySelectorAll('[data-study-topic]').forEach(b=>b.addEventListener('click',()=>openTutor(`Help me review ${b.dataset.studyTopic}. I need extra practice. Explain it simply, give examples, and quiz me one question at a time.`)));
}
window.addEventListener('hashchange',()=>{if(location.hash==='#analytics')setTimeout(improveAnalytics,50)});
// The analytics view is rendered by the legacy app when the user navigates.
const analyticsRoot=$('result');if(analyticsRoot){let scheduled=false;new MutationObserver(()=>{if(location.hash!=='#analytics'||scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;improveAnalytics()},50)}).observe(analyticsRoot,{childList:true});}
setTimeout(improveAnalytics,200);


// StudyAI visual analytics v3: detect actual cards on any route, not only #analytics.
const analyticsVisualCSS=document.createElement('style');
analyticsVisualCSS.textContent=`
.studio-analytics-v3{padding:26px!important;background:linear-gradient(145deg,#1b2947,#17223c)!important;border:1px solid #344565!important;border-radius:19px!important}
.studio-analytics-v3 h3{margin:0 0 8px!important;font-size:19px!important;color:#f6f5ff!important}
.studio-analytics-v3 .av-sub{color:#aebddd;margin:0 0 18px;font-size:14px}
.av-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:15px;margin:18px 0}
.av-stat{border:1px solid #354766;background:#202f4e;border-radius:15px;padding:19px;min-width:0}
.av-stat small{display:block;color:#b8c8e4;font-size:13px}.av-stat strong{display:block;font-size:clamp(25px,3vw,36px);margin:8px 0;color:#fff}.av-stat span{color:#aab8d6;font-size:12px}
.av-ring{--value:0;--ring:#9276ff;display:grid;place-items:center;width:95px;height:95px;border-radius:50%;background:conic-gradient(var(--ring) calc(var(--value)*1%),#344260 0);position:relative;flex:none}
.av-ring:before{content:'';position:absolute;inset:10px;background:#202f4e;border-radius:50%}.av-ring b{position:relative;color:#fff;font-size:21px}
.av-topic{display:flex;align-items:center;gap:17px;padding:15px;background:#202f4e;border:1px solid #354766;border-radius:16px;min-width:0}
.av-topic-content{flex:1;min-width:0}.av-topic-content strong{display:block;color:#fff;overflow-wrap:anywhere}.av-topic-content small{display:block;color:#b8c8e4;margin:5px 0 9px}
.av-button{background:#7458e6;border:1px solid #9d85ff;color:#fff;border-radius:10px;padding:9px 13px;font-size:13px;cursor:pointer;text-decoration:none;display:inline-block}.av-button:hover{background:#8a70f1}
.av-progress{height:11px;background:#35415c;border-radius:100px;overflow:hidden;margin:12px 0}.av-progress span{display:block;height:100%;border-radius:100px;background:linear-gradient(90deg,#7c61ed,#44c5e8)}
.av-recommend{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;background:#202f4e;border:1px solid #354766;border-radius:14px;padding:17px;margin:12px 0}.av-recommend strong{display:block;color:#fff}.av-recommend small{color:#b8c8e4}
.av-note{color:#b9c8e3;background:#202f4e;border:1px solid #354766;border-radius:12px;padding:13px;margin-top:12px}
@media(max-width:600px){.studio-analytics-v3{padding:17px!important}.av-ring{width:76px;height:76px}.av-ring b{font-size:17px}}
`;document.head.appendChild(analyticsVisualCSS);
const avEscape=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function avScores(){const arr=analyticsData();return arr.map(x=>({topic:String(x.topic||'Unknown'),score:Math.max(0,Math.min(100,Number(x.score??(Number(x.total)?100*Number(x.correct)/Number(x.total):0))||0))}));}
function avRing(n,color){return `<div class="av-ring" style="--value:${Math.round(n)};--ring:${color||'#9276ff'}"><b>${Math.round(n)}%</b></div>`;}
function avEnhance(){
 const headings=['Smart Learning Insights','Topics to Improve','Study Recommendations','Learning Progress','Your Goal'];
 const nodes=[...document.querySelectorAll('h3,h2')].filter(h=>headings.some(s=>h.textContent.includes(s)));
 if(!nodes.length)return;
 const scores=avScores();const weak=new Map();for(const s of scores){const key=s.topic.toLowerCase();const a=weak.get(key)||{topic:s.topic,sum:0,count:0};a.sum+=s.score;a.count++;weak.set(key,a);}
 const topics=[...weak.values()].map(x=>({topic:x.topic,score:Math.round(x.sum/x.count)})).filter(x=>x.score<70).sort((a,b)=>a.score-b.score);
 const avg=scores.length?Math.round(scores.slice(-5).reduce((n,x)=>n+x.score,0)/Math.min(5,scores.length)):0;
 for(const h of nodes){const title=headings.find(s=>h.textContent.includes(s));const card=h.closest('.goal-card')||h.parentElement;if(!card||card.dataset.avEnhanced==='yes')continue;
 const prior=card.textContent||'';card.dataset.avEnhanced='yes';card.classList.add('studio-analytics-v3');
 if(title==='Smart Learning Insights')card.innerHTML=`<h3>🧠 Smart Learning Insights</h3><p class="av-sub">Your performance at a glance</p><div class="av-grid"><div class="av-stat"><small>Recent quiz average</small><strong>${avg}%</strong><div class="av-progress"><span style="width:${avg}%"></span></div><span>Last ${Math.min(5,scores.length)} quizzes</span></div><div class="av-stat"><small>Quizzes completed</small><strong>${scores.length}</strong><span>Practice sessions</span></div></div><div class="av-note">${scores.length<5?'Complete more quizzes to see a reliable trend.':'Your recent average is based on your last five quiz scores.'}</div>`;
 if(title==='Topics to Improve')card.innerHTML=`<h3>🎯 Topics to Improve</h3><p class="av-sub">Subjects below your 70% target</p><div class="av-grid">${topics.length?topics.map(t=>`<div class="av-topic">${avRing(t.score,t.score<40?'#fb7185':'#fbbf24')}<div class="av-topic-content"><strong>${avEscape(t.topic)}</strong><small>${t.score}% average · Target 70%</small><button type="button" class="av-button" data-av-topic="${avEscape(t.topic)}">Practice with AI ↗</button></div></div>`).join(''):'<div class="av-note">No topics below 70%. Keep it up!</div>'}</div>`;
 if(title==='Study Recommendations')card.innerHTML=`<h3>💡 Study Recommendations</h3><p class="av-sub">Your next best study sessions</p>${topics.length?topics.slice(0,3).map(t=>`<div class="av-recommend"><div><strong>📖 ${avEscape(t.topic)}</strong><small>Current average: ${t.score}% · Review the basics and retry</small><div class="av-progress"><span style="width:${t.score}%"></span></div></div><button type="button" class="av-button" data-av-topic="${avEscape(t.topic)}">Study now ↗</button></div>`).join(''):'<div class="av-note">Take a quiz to receive personalized recommendations.</div>'}`;
 if(title==='Learning Progress'){const latest=scores.at(-1);card.innerHTML=`<h3>📈 Learning Progress</h3><p class="av-sub">Every quiz moves you forward</p><div class="av-grid"><div class="av-stat"><small>Quiz attempts</small><strong>${scores.length}</strong><span>Completed quizzes</span></div><div class="av-stat"><small>Latest score</small><strong>${latest?Math.round(latest.score):0}%</strong><span>${latest?avEscape(latest.topic):'No quiz yet'}</span></div></div><div class="av-grid">${scores.slice(-5).map((s,i)=>`<div class="av-topic">${avRing(s.score)}<div class="av-topic-content"><strong>Quiz ${Math.max(1,scores.length-4)+i}</strong><small>${avEscape(s.topic)}</small></div></div>`).join('')}</div>`;}
 if(title==='Your Goal')card.innerHTML=`<h3>🎯 Your Goal</h3><p class="av-sub">Build your next milestone</p><div class="av-grid"><div class="av-topic">${avRing(avg)}<div class="av-topic-content"><strong>${prior.toLowerCase().includes('not set')?'Set your first study goal':'Keep building your goal'}</strong><small>Recent quiz average: ${avg}%</small><a class="av-button" href="#goals">${prior.toLowerCase().includes('not set')?'Set a goal ↗':'View goals ↗'}</a></div></div></div>`;
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-av-topic]');if(b)openTutor(`Help me study ${b.dataset.avTopic}. Explain it clearly, give examples, and quiz me one question at a time.`)});
let avTimer;new MutationObserver(()=>{clearTimeout(avTimer);avTimer=setTimeout(avEnhance,90)}).observe(document.body,{subtree:true,childList:true});
window.addEventListener('hashchange',()=>setTimeout(avEnhance,130));setTimeout(avEnhance,250);


// Study Goals visual dashboard: adds functionality without removing existing goal controls.
const goalPage=pages.goals;
if(goalPage){
 const goalUI=document.createElement('section');
 goalUI.className='sg-dashboard';
 goalUI.innerHTML=`
 <div class="sg-hero"><div><span class="sg-kicker">✦ YOUR PERSONAL GROWTH PLAN</span><h2>Small steps. Big progress.</h2><p>Build a study routine, keep your promises to yourself, and celebrate every win.</p></div><div class="sg-hero-icon">🎯</div></div>
 <div class="sg-overview">
  <article class="sg-progress-card"><div class="sg-ring" id="sgRing"><div><strong id="sgPercent">0%</strong><small>Complete</small></div></div><div class="sg-progress-info"><span class="sg-kicker">STUDY TARGET</span><h3 id="sgTargetLabel">Set your first goal</h3><p id="sgTargetDetail">Choose a goal below to start tracking your sessions.</p><div class="sg-track"><span id="sgTrackFill"></span></div></div></article>
  <article class="sg-mini"><span>📚 Total sessions</span><strong id="sgSessions">0</strong><small>Every session adds up</small></article>
  <article class="sg-mini"><span>🔥 Current streak</span><strong id="sgStreak">0 <em>days</em></strong><small>Keep the momentum</small></article>
 </div>
 <div class="sg-grid">
 <article class="sg-card"><div class="sg-card-title"><div><span class="sg-kicker">TODAY'S FOCUS</span><h3>Daily study checklist</h3><p>Pick three small wins for today.</p></div><span class="sg-icon">✓</span></div><div id="sgChecklist"></div><div class="sg-card-bottom"><span id="sgCheckStatus">0 of 3 completed</span><div class="sg-track"><span id="sgCheckFill"></span></div></div></article>
 <article class="sg-card"><div class="sg-card-title"><div><span class="sg-kicker">UPCOMING MILESTONE</span><h3>Exam countdown</h3><p>Keep your next important date in sight.</p></div><span class="sg-icon">◷</span></div><label class="sg-label" for="sgExamName">Exam or deadline</label><input id="sgExamName" placeholder="e.g. Biology midterm" maxlength="90"><label class="sg-label" for="sgExamDate">Date</label><input id="sgExamDate" type="date"><button id="sgSaveExam" type="button" class="sg-primary">Save countdown</button><div id="sgCountdown" class="sg-countdown">Add a date to see your countdown.</div></article>
 </div>
 <article class="sg-card sg-milestones"><div class="sg-card-title"><div><span class="sg-kicker">YOUR ACHIEVEMENTS</span><h3>Learning milestones</h3><p>Unlock these naturally as you study.</p></div><span class="sg-icon">🏆</span></div><div class="sg-badges" id="sgBadges"></div></article>
 <div class="sg-section-label"><span>⚙</span><div><h3>Set your study target</h3><p>Use your existing goal options below. Your saved goal and progress remain unchanged.</p></div></div>`;
 goalPage.prepend(goalUI);
 const sgRead=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??f}catch{return f}};
 const sgTasks=['Review one topic','Practice with a quiz','Review notes or flashcards'];
 function sgDate(){return new Date().toLocaleDateString('en-CA');}
 function sgRender(){
  const sessions=Math.max(0,Number(localStorage.getItem('studySessions'))||0);
  const streak=Math.max(0,Number(localStorage.getItem('studyStreak'))||0);
  const goalKeys=['studyGoal','studyGoalTarget','studySessionsGoal','goalTarget'];
  let target=0;
  for(const key of goalKeys){const n=Number(localStorage.getItem(key));if(Number.isFinite(n)&&n>0){target=n;break;}}
  const pct=target?Math.min(100,Math.round(sessions/target*100)):0;
  $('sgSessions').textContent=sessions;
  $('sgStreak').innerHTML=`${streak} <em>days</em>`;
  $('sgPercent').textContent=pct+'%';
  $('sgRing').style.setProperty('--sg-pct',pct+'%');
  $('sgTrackFill').style.width=pct+'%';
  $('sgTargetLabel').textContent=target?`${sessions} / ${target} sessions`:'Set your first goal';
  $('sgTargetDetail').textContent=target?(sessions>=target?'Target achieved — great work!':`${Math.max(0,target-sessions)} more sessions to reach your target`):'Choose a goal below to start tracking your sessions.';
  const taskData=sgRead('studyai.goals.daily.v1',{});
  const checked=taskData.date===sgDate()&&Array.isArray(taskData.checked)?taskData.checked:[];
  $('sgChecklist').innerHTML=sgTasks.map((task,i)=>`<label class="sg-task"><input type="checkbox" data-sg-task="${i}" ${checked.includes(i)?'checked':''}><span class="sg-task-mark">✓</span><span>${safe(task)}</span></label>`).join('');
  $('sgCheckStatus').textContent=`${checked.length} of 3 completed`;
  $('sgCheckFill').style.width=(checked.length/3*100)+'%';
  const exam=sgRead('studyai.goals.exam.v1',null);
  if(exam){$('sgExamName').value=exam.name||'';$('sgExamDate').value=exam.date||'';}
  const days=exam?.date?Math.ceil((new Date(exam.date+'T12:00:00')-new Date(new Date().toDateString()+' 12:00:00'))/86400000):null;
  $('sgCountdown').textContent=days===null?'Add a date to see your countdown.':days<0?'This date has passed. Set your next milestone.':days===0?`🎉 ${exam.name||'Your milestone'} is today!`:`${days} day${days===1?'':'s'} until ${exam.name||'your milestone'}`;
  const quizzes=sgRead('quizResults',[]);
  const quizCount=Array.isArray(quizzes)?quizzes.length:0;
  const badges=[['🌱','First step',sessions>=1],['📚','5 sessions',sessions>=5],['🎓','10 sessions',sessions>=10],['🧠','First quiz',quizCount>=1],['⚡','5 quizzes',quizCount>=5],['🔥','3-day streak',streak>=3]];
  $('sgBadges').innerHTML=badges.map(([emoji,title,unlocked])=>`<div class="sg-badge ${unlocked?'unlocked':'locked'}"><span>${emoji}</span><strong>${title}</strong><small>${unlocked?'Unlocked':'Keep going'}</small></div>`).join('');
 }
 goalUI.addEventListener('change',e=>{if(!e.target.matches('[data-sg-task]'))return;const checked=[...goalUI.querySelectorAll('[data-sg-task]:checked')].map(x=>Number(x.dataset.sgTask));localStorage.setItem('studyai.goals.daily.v1',JSON.stringify({date:sgDate(),checked}));sgRender();});
 $('sgSaveExam').addEventListener('click',()=>{const name=$('sgExamName').value.trim(),date=$('sgExamDate').value;if(!date){$('sgExamDate').focus();return;}localStorage.setItem('studyai.goals.exam.v1',JSON.stringify({name,date}));sgRender();});
 window.addEventListener('hashchange',()=>{if(location.hash==='#goals')sgRender();});
 window.addEventListener('storage',sgRender);
 goalPage.addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('.sg-dashboard'))setTimeout(sgRender,120);});
 sgRender();
}

})();
