const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,'src/js',name),'utf8');
const teachers = read('05-teachers.js').replace(/\/\*@TEXT:([^@]+)@\*\//g,(_,p)=>JSON.stringify(fs.readFileSync(path.join(root,p),'utf8')));
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
  vm.runInContext(teachers+'\n'+read('06-tts.js')+`
    const STEPS = TEACHERS.ifu.script.steps.map(s=>({lines:s.lines,qs:s.qs.map(q=>[q[0].en,q[1]])}));
    globalThis.api={TEACHERS,TTS,teacherLines,teacherQs,teacherSays, selected: TEACHER.id,
      select(id){TEACHER=TEACHERS[id]}};`,context);
  return {api:context.api,utterances};
}
const {api,utterances}=fixture();
assert.deepEqual(Object.keys(api.TEACHERS).sort(), ['ifu', 'shizue']);
assert.equal(fixture('#teacher=ifu').api.selected, 'ifu');
assert.equal(fixture('#teacher=zundamon').api.selected, 'shizue');
assert.equal(fixture('#pair=reimu_marisa').api.selected, 'shizue');
api.TTS.on = true;
api.TTS.setLanguage('en');
const fallback = 'Missing script content';
for (const teacher of Object.values(api.TEACHERS)) {
  api.select(teacher.id);
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
assert.equal(api.TTS.plan(api.TEACHERS.ifu).lang,'ja');
console.log('PASS: two instructors, old-link fallback, complete English scripts and English/Japanese routing.');
