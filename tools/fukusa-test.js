const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../vendor/three.min.js');
const O={fukusa:new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial())};
const STEPS=[{},{},{}];
const ctx=vm.createContext({THREE,O,STEPS,KNL:[-.1,.2,.24],Float32Array,Math,ease:t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}});
vm.runInContext(fs.readFileSync('src/js/41-fukusa.js','utf8'),ctx);
const D=Math.hypot(.135,.15);
const point=(x,z)=>ctx.foldSilkPoint(x,z,new THREE.Vector3());
const world=(x,z)=>point(x,z).applyQuaternion(O.fukusa.quaternion).add(O.fukusa.position);
function go(t) {
  O.fukusa.position.set(0,.45,.28);
  O.fukusa.rotation.set(0,0,0);
  O.fukusa.scale.set(.27,1,.28);
  ctx.updateFukusa(STEPS[2],t);
}
// A and B stay on the first crease, with the cloth already triangular.
go(15.2);
assert.ok(Math.abs(point(-.135,-.15).distanceTo(point(.135,.15))-2*D)<.0001);
for(let i=0;i<O.fukusa.geometry.attributes.position.count;i++) {
  const a=O.fukusa.geometry.attributes.position;
  assert.ok(a.getZ(i)<.00001,'silk should be on the triangular side of the diagonal');
}
// The right pinch follows the same material point across the lift, regrip and half fold.
for (const t of [12.65, 15.2, 17, 19.55, 21.35, 22.5, 23.55]) {
  go(t);
  assert.ok(world(.105,.15).distanceTo(ctx.fukusaHandPoint('R',t,new THREE.Vector3()))<1e-6);
}
go(17);
assert.ok(ctx.fukusaHandPoint('L',17,new THREE.Vector3()).distanceTo(world(.135,0))>.04);
go(18);
assert.ok(ctx.fukusaHandPoint('L',18,new THREE.Vector3()).distanceTo(world(.135,0))<1e-6);
go(21.35);
assert.ok(point(0,0).length()<1e-6);
go(23.55);
assert.ok(point(.135,.15).distanceTo(point(-.135,-.15))<.045,'rectangle corners should nearly meet');
go(27);
O.fukusa.geometry.computeBoundingBox();
assert.ok(O.fukusa.geometry.boundingBox.getSize(new THREE.Vector3()).x<.17,'tail fold should make a compact pad');
// The mesh remains finite when seeking and keeps the full sheet area
// even when panels overlap after folding.
const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3();
for(const t of [27,12,23,18,29,40,0,14,19,22.15,25.7]) {
 go(t);
 const positions=O.fukusa.geometry.attributes.position;
 assert.ok(positions.count % 3 === 0 && positions.count * 3 <= positions.array.length);
 assert.ok([...positions.array].every(Number.isFinite));
 let area=0;
 for(let i=0;i<positions.count;i+=3) {
   a.fromBufferAttribute(positions,i);
   b.fromBufferAttribute(positions,i+1).sub(a);
   c.fromBufferAttribute(positions,i+2).sub(a);
   area+=b.cross(c).length()/2;
 }
 assert.ok(Math.abs(area-.27*.30)<.002,`cloth surface area changed at ${t}s: ${area}`);
}
vm.runInContext(fs.readFileSync('src/js/20-rig.js','utf8')+';globalThis.testRig=RIG;',ctx);
const pose={legs:0,torso:[0,0,0],snap:true,L:{grip:new THREE.Vector3(.19,.635,.37)},R:{grip:new THREE.Vector3(-.19,.635,.37)}};
const rig=ctx.testRig;
rig.solve(pose);const before=Math.abs(rig.S.arms[-1].elbow.y-rig.S.arms[-1].wrist.y);
pose.R.level=1;rig.solve(pose);
assert.ok(Math.abs(rig.S.arms[-1].elbow.y-rig.S.arms[-1].wrist.y)<before*.35,'raised forearm should be more level');
for(const arm of Object.values(rig.S.arms)) {
 assert.ok(Math.abs(arm.shoulder.distanceTo(arm.elbow)-.29)<.00001);
 assert.ok(Math.abs(arm.elbow.distanceTo(arm.wrist)-.232)<.00001);
}
console.log('PASS: diagonal triangle, fixed inset pinch, release, centre hinge, half fold, compact pad, reverse seeks and rig.');
