// Exercise the actual lesson scheduler without a renderer or voice installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/js/90-main.js'), 'utf8');
const scheduler = source.slice(source.indexOf('function advance(dt)'), source.indexOf('  const tt = Math.min(t, s.dur)')) + '}';
function fixture(voiceOn = true) {
  const spoken = [];
  const c = {step:0,t:0,playing:true,paused:false,lineIdx:0,voiceOn,finished:false,
    STEPS:[{dur:4,lines:[[1,'first'],[2,'second'],[3,'last']]},{}],
    TTS:{busy:false,talking:false,prefetch(){}},
    ui:{prog:{style:{}},next:{classList:{add(){}}},hint:{}},
    teacherLines:()=>c.STEPS[0].lines,showLine(){},lineTalk(){},
    speak(line){if(c.voiceOn){assert.equal(c.TTS.busy,false,'must not interrupt a pending job');c.TTS.busy=true;}spoken.push(line);}};
  vm.createContext(c);vm.runInContext(scheduler,c);
  return {c,spoken};
}
{
  const {c,spoken}=fixture();
  c.advance(1);assert.deepEqual(spoken,['first']);
  c.advance(20);assert.equal(c.t,2);assert.equal(c.lineIdx,1);
  // Synthesis is pending although no audible speech has started.
  assert.equal(c.TTS.talking,false);c.advance(20);assert.equal(c.lineIdx,1);
  // Audible speech and inter-sentence silence must also keep the job pending.
  c.TTS.talking=true;c.advance(20);assert.equal(c.lineIdx,1);
  c.TTS.talking=false;c.advance(20);assert.equal(c.lineIdx,1);
  c.TTS.busy=false;c.advance(0.05);assert.deepEqual(spoken,['first','second']);
  c.advance(20);assert.equal(c.t,3);assert.equal(c.lineIdx,2);
  c.TTS.busy=false;c.advance(0.05);assert.deepEqual(spoken,['first','second','last']);
  c.advance(20);assert.equal(c.t,4);assert.equal(c.finished,false);
  c.TTS.busy=false;c.advance(0.05);assert.equal(c.finished,true);
}
{
  const {c,spoken}=fixture(false);c.advance(10);
  assert.deepEqual(spoken,['first','second','last']);assert.equal(c.finished,true);
}
{
  const {c}=fixture();c.advance(1);c.advance(20);
  c.voiceOn=false;c.TTS.busy=false;c.advance(10);assert.equal(c.finished,true);
}
{
  const {c,spoken}=fixture();c.paused=true;c.advance(10);assert.equal(c.t,0);assert.deepEqual(spoken,[]);
}
console.log('PASS: slow synthesis, speech, sentence gaps, final-line completion, muted playback, voice-off recovery, pause.');
