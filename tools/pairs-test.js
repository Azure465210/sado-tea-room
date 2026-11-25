const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,'src/js',name),'utf8');
const teachers = read('05-teachers.js').replace(/\/\*@TEXT:([^@]+)@\*\//g,(_,p)=>JSON.stringify(fs.readFileSync(path.join(root,p),'utf8')));
const pairs = read('07-pairs.js');
function fixture(hash='') {
  const utterances=[];
  const context = vm.createContext({
    location:{hash,protocol:'http:',hostname:'127.0.0.1'},URLSearchParams,
    localStorage:{getItem:()=>null,setItem(){}},
    document:{getElementById:()=>null,querySelector:()=>null},
    window:{speechSynthesis:{},SpeechSynthesisUtterance:function(){}},
    speechSynthesis:{getVoices:()=>[{name:'Microsoft Haruka',lang:'ja-JP'},{name:'Microsoft Zira',lang:'en-US'},{name:'Microsoft George',lang:'en-GB'}],addEventListener(){},cancel(){},speak(u){utterances.push(u)}},
    SpeechSynthesisUtterance:function(text){this.text=text},
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},console,
  });
  vm.runInContext(teachers+'\n'+read('06-tts.js')+'\n'+pairs+`
    const STEPS = TEACHERS.reimu.script.steps.map(s=>({lines:s.lines,qs:s.qs.map(q=>[q[0].en,q[1]])}));
    globalThis.api={TEACHERS,NARRATOR_PAIRS,TTS,teacherLines,teacherQs,teacherSays,activePair,
      select(id){PAIR_ID=id;TEACHER=TEACHERS[NARRATOR_PAIRS[id].members[0]]},
      solo(id){PAIR_ID='';TEACHER=TEACHERS[id]}};`,context);
  return {api:context.api,utterances};
}
const {api,utterances}=fixture();
for(const [id,pair] of Object.entries(api.NARRATOR_PAIRS)) {
  api.select(id);
  for(let i=0;i<9;i++) {
    for(const [k,line] of api.teacherLines(i).entries()) {
      const member=pair.members[k%2];
      const original=api.TEACHERS[member].script.steps[i].lines[k];
      assert.equal(line[0],original[0]);assert.equal(line[1].speaker,member);
      for(const field of ['ja','en','yomi'])assert.ok(line[1][field].endsWith(original[1][field]),'tea content preserved');
    }
    api.teacherQs(i).forEach((q,k)=>assert.equal(q[1].speaker,pair.members[k%2]));
  }
  ['guestIntro','guestDrink'].forEach(key=>{
    api.TEACHERS[pair.members[0]].script[key].forEach((_,k)=>assert.equal(api.teacherSays(key,k,'').speaker,pair.members[k%2]));
  });
  api.TTS.on=true;
  const lines=api.teacherLines(0);
  api.TTS.say(lines[0][1]);assert.equal(api.TTS.status.current,pair.members[0]);assert.equal(api.TTS.busy,true);
  const pitch=utterances.at(-1).pitch;
  api.TTS.cancel();assert.equal(api.TTS.busy,false);
  api.TTS.say(lines[1][1]);assert.equal(api.TTS.status.current,pair.members[1]);
  assert.notEqual(utterances.at(-1).pitch,pitch,'fallback voices remain distinguishable');
  api.TTS.cancel();
}
api.solo('reimu');assert.equal(api.teacherLines(0)[0][1].speaker,undefined);
assert.equal(api.teacherLines(0)[0][1].ja,api.TEACHERS.reimu.script.steps[0].lines[0][1].ja);
assert.equal(fixture('#pair=reimu_marisa').api.activePair().name,'Reimu + Marisa');
assert.equal(fixture('#pair=invalid').api.activePair(),null);
api.TTS.setLanguage('en');
const fallback = 'Missing script content';
for (const teacher of Object.values(api.TEACHERS)) {
  api.solo(teacher.id);
  assert.equal(api.TTS.route(teacher).engine,'browser');
  assert.equal(api.TTS.plan(teacher).lang,'en');
  assert.ok(api.TTS.voicesFor(teacher).every(voice=>voice.lang.startsWith('en')));
  const greeting = teacher.script.greeting;
  assert.ok(greeting.en.trim(),teacher.id);
  api.TTS.say(greeting);
  assert.ok(utterances.at(-1).lang.startsWith('en'));
  assert.ok(greeting.en.includes(utterances.at(-1).text));
  api.TTS.cancel();
  teacher.script.steps.forEach((step,i)=>{
    assert.ok(api.teacherLines(i).every((line,j)=>line[1].en===step.lines[j][1].en && line[1].en.trim()));
    assert.ok(api.teacherQs(i).every((q,j)=>q[1].en===step.qs[j][1].en && q[1].en.trim()));
  });
  for (const field of ['guestIntro','guestDrink','whiskDone']) {
    const expected = teacher.script[field];
    if (Array.isArray(expected)) expected.forEach((unit,i)=>assert.equal(api.teacherSays(field,i,fallback).en,unit.en));
    else assert.equal(api.teacherSays(field,0,fallback).en,expected.en);
  }
}
api.TTS.setLanguage('original');
assert.equal(api.TTS.plan(api.TEACHERS.zundamon).lang,'ja');
console.log('PASS: all five pairs, all lesson lines, preserved tea content/timing, Q&A, guest instructions, voice routing, cancellation, solo mode, saved URLs.');
console.log('PASS: English dialogue and browser narration route for all 12 instructors.');
