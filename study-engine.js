/* StudyAI learning algorithms: no external dependencies. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.StudyEngine=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function nextReview(card,rating,now=Date.now()){
 const n=Number(card.repetitions)||0,ef=Number(card.ease)||2.5,old=Number(card.interval)||0;
 if(!['again','hard','good','easy'].includes(rating))throw Error('Invalid rating');
 let reps=n,interval=old,ease=ef;
 if(rating==='again'){reps=0;interval=1;ease=Math.max(1.3,ef-0.2);}
 else {reps=n+1;ease=Math.max(1.3,ef+(rating==='easy'?0.15:rating==='hard'?-0.15:0));interval=n===0?1:n===1?6:Math.max(1,Math.round(old*ease*(rating==='hard'?0.8:rating==='easy'?1.3:1)));}
 return {...card,repetitions:reps,interval,ease,dueAt:new Date(now+interval*86400000).toISOString(),lastRating:rating,reviewedAt:new Date(now).toISOString()};
}
function plan(examDate,topics,minutes=30,now=new Date()){
 const end=new Date(examDate+'T12:00:00');if(!Number.isFinite(end.getTime()))throw Error('Invalid exam date');
 const days=Math.ceil((end.getTime()-new Date(now.getFullYear(),now.getMonth(),now.getDate(),12).getTime())/86400000);
 if(days<1)throw Error('Choose a future exam date');
 const names=topics.map(s=>s.trim()).filter(Boolean);if(!names.length)throw Error('Add at least one topic');
 return Array.from({length:Math.min(days,90)},(_,i)=>{const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i+1);return {date:[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'),topic:names[i%names.length],minutes:Number(minutes),type:i>=days-2?'Review + practice quiz':'Learn + active recall'};});
}
function accuracy(results){const a=results.reduce((n,r)=>n+(Number(r.correct)||0),0),b=results.reduce((n,r)=>n+(Number(r.total)||0),0);return b?Math.round(100*a/b):0;}
return {nextReview,plan,accuracy};
});
