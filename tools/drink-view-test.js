const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const THREE=require('../vendor/three.min.js');
const src=fs.readFileSync(path.join(__dirname,'../src/js/30-utensils.js'),'utf8');
const M=Object.fromEntries(['glaze','clay','water','tea','froth','powder'].map(k=>[k,new THREE.MeshBasicMaterial()]));
const O={},stage=new THREE.Group();stage.scale.x=-1;
const ctx=vm.createContext({THREE,M,O,stage,
  mesh:(g,m)=>new THREE.Mesh(g,m),
  lathe:(pts,m)=>new THREE.Mesh(new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(...p)),32),m)});
vm.runInContext(src.slice(0,src.indexOf('// chasen (whisk)')),ctx);
for(const tilt of [0,-0.5,-0.6])for(const fill of [1,2/3,1/3]) {
  ctx.setTeaFill(fill);O.bowl.position.set(-0.05,0.24,0.62);O.bowl.rotation.set(tilt,Math.PI+1.2,0);
  stage.updateMatrixWorld(true);
  const target=O.bowl.localToWorld(new THREE.Vector3(0,0.04,0));
  const eye=target.clone().add(new THREE.Vector3(0,0.36*Math.cos(0.18),0.36*Math.sin(0.18)));
  const ray=new THREE.Raycaster(eye,target.clone().sub(eye).normalize());
  const hits=ray.intersectObjects(O.bowl.children.filter(o=>o.visible));
  assert.ok(hits.length);assert.ok([O.tea,O.froth].includes(hits[0].object),`liquid must be visible: tilt=${tilt}, fill=${fill}, hit=${O.bowl.children.indexOf(hits[0].object)}`);
}
ctx.setTeaFill(0);assert.equal(O.tea.visible,false);assert.equal(O.froth.visible,false);
ctx.resetTeaContents();assert.equal(O.tea.position.y,0.03);assert.equal(O.tea.userData.fill,1);assert.equal(O.tea.scale.y,1);
console.log('PASS: tea visible through rim at all sip tilts/levels; last sip empties bowl; fresh lesson restores liquid geometry.');
