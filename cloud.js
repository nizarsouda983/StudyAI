/* Optional cloud sync. Enabled only after you configure cloud-config.js and SQL RLS. */
(async()=>{'use strict';const cfg=window.STUDYAI_SUPABASE;if(!cfg?.url||!cfg?.anonKey||cfg.url.includes('YOUR_PROJECT'))return;
const page=document.querySelector('[data-page="dashboard"]');if(!page)return;
const box=document.createElement('section');box.className='pro-panel';box.innerHTML='<h2>☁️ Cloud account</h2><p>Sign in with Google to sync your personal study data across devices.</p><button class="pro-btn" id="cloudLogin">Sign in with Google</button><button class="pro-btn alt" id="cloudLogout" hidden>Sign out</button><button class="pro-btn alt" id="cloudSync" hidden>Sync now</button><p id="cloudStatus" class="pro-status" role="status"></p>';page.append(box);
const status=s=>document.getElementById('cloudStatus').textContent=s;
try{
 if(!window.supabase){status('Supabase library unavailable. Check your internet connection.');return;}
 const client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true}});
 const keys=['studyai.personalNotes.v1','studyai.plans.v1','studyai.cards.v1','studyai.focusMinutes','quizResults','studyHistory','studySessions','studyGoal','studyStreak','lastStudyDate'];
 const session=()=>client.auth.getSession().then(r=>r.data.session);
 async function refresh(){const s=await session();document.getElementById('cloudLogin').hidden=!!s;document.getElementById('cloudLogout').hidden=!s;document.getElementById('cloudSync').hidden=!s;status(s?'Signed in as '+s.user.email+'. Cloud sync is opt-in.':'Not signed in. Data stays on this device.');}
 async function sync(){const s=await session();if(!s){status('Sign in first.');return;}status('Syncing…');for(const key of keys){const local=localStorage.getItem(key);const {data,error}=await client.from('studyai_data').select('value,updated_at').eq('user_id',s.user.id).eq('key',key).maybeSingle();if(error)throw error;if(data){if(local===null){localStorage.setItem(key,data.value);continue;}const localChanged=Number(localStorage.getItem('studyai.changed.'+key)||0);if(new Date(data.updated_at).getTime()>localChanged){localStorage.setItem(key,data.value);continue;}}if(local!==null){const {error:writeErr}=await client.from('studyai_data').upsert({user_id:s.user.id,key,value:local,updated_at:new Date().toISOString()},{onConflict:'user_id,key'});if(writeErr)throw writeErr;}}
 status('Sync complete. Refresh the page to display any downloaded records.');}
 document.getElementById('cloudLogin').onclick=async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname+'#dashboard'}});if(error)status(error.message);};
 document.getElementById('cloudLogout').onclick=async()=>{await client.auth.signOut();await refresh();};
 document.getElementById('cloudSync').onclick=()=>sync().catch(e=>status('Sync failed: '+e.message));
 window.addEventListener('studyai:data-changed',e=>{localStorage.setItem('studyai.changed.'+e.detail.key,String(Date.now()));});
 await refresh();
}catch(e){status('Cloud setup error: '+e.message);}
})();
