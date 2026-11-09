const test=require('node:test');const assert=require('node:assert/strict');const e=require('../study-engine.js');
test('wrong answer resets interval',()=>{const r=e.nextReview({repetitions:5,interval:20,ease:2.5},'again',0);assert.equal(r.interval,1);assert.equal(r.repetitions,0);});
test('easy answers get longer intervals',()=>{const c={repetitions:3,interval:10,ease:2.5};assert.ok(e.nextReview(c,'easy',0).interval>e.nextReview(c,'hard',0).interval);});
test('planner rotates topics',()=>{const d=new Date(2026,10,8);const p=e.plan('2026-11-12',['Biology','Math'],30,d);assert.equal(p.length,4);assert.equal(p[0].topic,'Biology');assert.equal(p[1].topic,'Math');});
test('planner rejects past dates',()=>{assert.throws(()=>e.plan('2026-01-01',['A'],30,new Date(2026,10,8)));});
test('accuracy handles empty data',()=>{assert.equal(e.accuracy([]),0);assert.equal(e.accuracy([{correct:3,total:4}]),75);});
