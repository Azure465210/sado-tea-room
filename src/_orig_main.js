// ---------- renderer, scene, camera ----------
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xe9e3d3);
const camera=new THREE.PerspectiveCamera(50,1,0.05,50);

const cam={target:new THREE.Vector3(0,0.3,0.4),theta:0,phi:1.05,r:2.0,goal:null};
const PRESETS={guest:{target:[0,0.3,0.4],theta:0,phi:1.05,r:2.0},close:{target:[0,0.1,0.42],theta:0.4,phi:0.95,r:0.8},top:{target:[0,0.1,0.3],theta:0,phi:0.25,r:1.8}};
function applyCam(){const s=Math.sin(cam.phi);camera.position.set(cam.target.x+cam.r*s*Math.sin(cam.theta),cam.target.y+cam.r*Math.cos(cam.phi),cam.target.z+cam.r*s*Math.cos(cam.theta));camera.lookAt(cam.target);}
function goCam(name){const p=PRESETS[name];cam.goal={target:new THREE.Vector3(...p.target),theta:p.theta,phi:p.phi,r:p.r};for(const id of ['camGuest','camClose','camTop'])document.getElementById(id).setAttribute('aria-pressed',String(id==='cam'+name[0].toUpperCase()+name.slice(1)));}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xfff4e0,0x8a7a5a,0.75));
const sun=new THREE.DirectionalLight(0xfff1dc,0.9);sun.position.set(-1.5,2.4,1.2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-2;sun.shadow.camera.right=2;sun.shadow.camera.top=2;sun.shadow.camera.bottom=-2;scene.add(sun);
const fill=new THREE.PointLight(0xffe9c8,0.35,6);fill.position.set(0.8,1.6,1.4);scene.add(fill);

// ---------- materials ----------
function tatamiTexture(){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#c9bf8f';g.fillRect(0,0,512,512);for(let y=0;y<512;y+=4){g.fillStyle=y%8?'#bfb482':'#d2c897';g.fillRect(0,y,512,2);}g.fillStyle='#3b3a2f';g.fillRect(0,0,512,14);g.fillRect(0,498,512,14);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;return t;}
function kimonoTexture(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#4a6a3e';g.fillRect(0,0,256,256);g.strokeStyle='rgba(230,225,200,.35)';g.lineWidth=2;for(let i=0;i<8;i++){for(let j=0;j<8;j++){g.beginPath();g.arc(i*32+16,j*32+16,9,0,Math.PI*2);g.stroke();}}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);t.encoding=THREE.sRGBEncoding;return t;}
const M={
  tatami:new THREE.MeshStandardMaterial({map:tatamiTexture(),roughness:1}),
  wall:new THREE.MeshStandardMaterial({color:0xd9cfb5,roughness:1}),
  wood:new THREE.MeshStandardMaterial({color:0x6b4a2e,roughness:.8}),
  darkwood:new THREE.MeshStandardMaterial({color:0x3e2a1c,roughness:.7}),
  paper:new THREE.MeshStandardMaterial({color:0xf6f1e3,roughness:1}),
  skin:new THREE.MeshStandardMaterial({color:0xe8bf9c,roughness:.85}),
  hair:new THREE.MeshStandardMaterial({color:0x2b2222,roughness:.85}),
  kimono:new THREE.MeshStandardMaterial({map:kimonoTexture(),roughness:.95}),
  kimonoPlain:new THREE.MeshStandardMaterial({color:0x4a6a3e,roughness:.95}),
  juban:new THREE.MeshStandardMaterial({color:0xf7f2e6,roughness:1,side:THREE.DoubleSide}),
  obi:new THREE.MeshStandardMaterial({color:0xc9a35c,roughness:.8}),
  obijime:new THREE.MeshStandardMaterial({color:0x8a2f3c,roughness:.7}),
  clay:new THREE.MeshStandardMaterial({color:0x7a4c33,roughness:.75}),
  glaze:new THREE.MeshStandardMaterial({color:0x5a3a2a,roughness:.4,metalness:.05}),
  bamboo:new THREE.MeshStandardMaterial({color:0xd9bb86,roughness:.7}),
  bambooLight:new THREE.MeshStandardMaterial({color:0xe9d7ad,roughness:.7}),
  lacquer:new THREE.MeshStandardMaterial({color:0x1b1212,roughness:.25,metalness:.1}),
  iron:new THREE.MeshStandardMaterial({color:0x2e2e2e,roughness:.6,metalness:.4}),
  silk:new THREE.MeshStandardMaterial({color:0xb03a4a,roughness:.6,side:THREE.DoubleSide}),
  linen:new THREE.MeshStandardMaterial({color:0xf4f1e8,roughness:1,side:THREE.DoubleSide}),
  water:new THREE.MeshStandardMaterial({color:0xcfe3ea,roughness:.2,transparent:true,opacity:.85}),
  tea:new THREE.MeshStandardMaterial({color:0x5f9a3c,roughness:.5}),
  froth:new THREE.MeshStandardMaterial({color:0x9ccf7a,roughness:.9}),
  powder:new THREE.MeshStandardMaterial({color:0x4f8a2e,roughness:1}),
  ash:new THREE.MeshStandardMaterial({color:0x8f8f86,roughness:1}),
  celadon:new THREE.MeshStandardMaterial({color:0x8fb3a0,roughness:.35}),
};
const clickable=[];
const O={}; // animatable objects
function mesh(geo,mat,opts={}){const m=new THREE.Mesh(geo,mat);m.castShadow=opts.shadow!==false;m.receiveShadow=true;if(opts.name){m.userData.name=opts.name;m.userData.desc=opts.desc;m.userData.jp=opts.jp;clickable.push(m);}return m;}
function lathe(points,mat,opts){return mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(p[0],p[1])),32),mat,opts);}

// ---------- room ----------
{
  const floor=mesh(new THREE.PlaneGeometry(2.7,2.7),M.tatami,{shadow:false});floor.rotation.x=-Math.PI/2;scene.add(floor);
  M.tatami.map.repeat.set(1,3);
  const wallH=2.3;
  const back=mesh(new THREE.BoxGeometry(2.7,wallH,0.05),M.wall,{shadow:false});back.position.set(0,wallH/2,-1.35);scene.add(back);
  const left=mesh(new THREE.BoxGeometry(0.05,wallH,2.7),M.wall,{shadow:false});left.position.set(-1.35,wallH/2,0);scene.add(left);
  const right=mesh(new THREE.BoxGeometry(0.05,wallH,2.7),M.wall,{shadow:false});right.position.set(1.35,wallH/2,0);scene.add(right);
  const toko=new THREE.Group();toko.position.set(-0.75,0,-1.3);
  const step=mesh(new THREE.BoxGeometry(1.0,0.12,0.45),M.wood);step.position.set(0,0.06,0.2);toko.add(step);
  const scroll=mesh(new THREE.PlaneGeometry(0.28,1.0),M.paper,{name:'Kakejiku',jp:'掛軸',desc:'A hanging scroll. The host chooses its words for today\'s guest.'});scroll.position.set(0,1.2,0.03);toko.add(scroll);
  const rod=mesh(new THREE.CylinderGeometry(0.012,0.012,0.34,12),M.darkwood);rod.rotation.z=Math.PI/2;rod.position.set(0,0.69,0.04);toko.add(rod);
  const vase=mesh(new THREE.CylinderGeometry(0.04,0.05,0.18,16),M.glaze,{name:'Chabana',jp:'茶花',desc:'One seasonal flower, placed as if it were still in the field.'});vase.position.set(0.3,0.21,0.2);toko.add(vase);
  const stem=mesh(new THREE.CylinderGeometry(0.004,0.004,0.22,6),M.kimonoPlain);stem.position.set(0.3,0.4,0.2);toko.add(stem);
  const bud=mesh(new THREE.SphereGeometry(0.025,12,12),M.silk);bud.position.set(0.3,0.52,0.2);toko.add(bud);
  scene.add(toko);
  const shoji=mesh(new THREE.PlaneGeometry(0.9,1.2),new THREE.MeshStandardMaterial({color:0xfdf8ea,emissive:0xfff3d6,emissiveIntensity:.35,roughness:1}),{shadow:false});shoji.rotation.y=-Math.PI/2;shoji.position.set(1.32,1.1,0.2);scene.add(shoji);
  for(let i=0;i<4;i++){const b=mesh(new THREE.BoxGeometry(0.02,1.2,0.02),M.darkwood,{shadow:false});b.position.set(1.31,1.1,-0.25+i*0.3);scene.add(b);}
  for(let i=0;i<5;i++){const b=mesh(new THREE.BoxGeometry(0.02,0.02,0.9),M.darkwood,{shadow:false});b.position.set(1.31,0.5+i*0.3,0.2);scene.add(b);}
  const zabuton=mesh(new THREE.BoxGeometry(0.55,0.04,0.55),new THREE.MeshStandardMaterial({color:0x8a4b63,roughness:1}));zabuton.position.set(0,0.02,1.35);scene.add(zabuton);
  // guest items: kaishi paper with a sweet, kuromoji pick, folded fan
  const kaishi=mesh(new THREE.BoxGeometry(0.15,0.006,0.1),M.linen,{name:'Kaishi',jp:'懐紙',desc:'Folded paper the guest brings. The sweet is served on it, and a corner wipes the bowl rim after drinking.'});kaishi.position.set(0.1,0.045,1.0);kaishi.rotation.y=0.1;scene.add(kaishi);O.kaishi=kaishi;
  const basami=mesh(new THREE.BoxGeometry(0.12,0.015,0.18),new THREE.MeshStandardMaterial({color:0x6b4f8a,roughness:.7}),{name:'Fukusa-basami',jp:'袱紗ばさみ',desc:'The guest\'s brocade pouch. It holds the kaishi, the kuromoji, the fukusa and the kobukusa; the fan is tucked outside.'});basami.position.set(-0.3,0.05,1.1);basami.rotation.y=0.15;scene.add(basami);O.basami=basami;
  const kobukusa=mesh(new THREE.BoxGeometry(0.15,0.004,0.16),new THREE.MeshStandardMaterial({color:0x8a2f3c,roughness:.6}),{name:'Kobukusa',jp:'古帛紗',desc:'A small square of brocade silk. The guest can rest the bowl on it while looking at it, so the bowl is protected.'});kobukusa.position.set(-0.3,0.06,1.1);kobukusa.rotation.y=0.15;scene.add(kobukusa);O.kobukusa=kobukusa;
  const kuromoji=mesh(new THREE.BoxGeometry(0.004,0.003,0.11),M.bamboo,{name:'Kuromoji',jp:'黒文字',desc:'A small pick cut from spicebush wood, for cutting and eating the sweet.'});kuromoji.position.set(0.17,0.052,1.0);kuromoji.rotation.y=0.1;scene.add(kuromoji);O.kuromoji=kuromoji;
  const sensu=mesh(new THREE.BoxGeometry(0.17,0.012,0.022),M.lacquer,{name:'Sensu',jp:'扇子',desc:'The guest\'s folded fan. It stays closed: laid in front of the knees during a greeting, it marks a polite boundary between host and guest.'});sensu.position.set(-0.12,0.046,1.05);sensu.rotation.y=0.05;scene.add(sensu);O.sensu=sensu;
}

// ---------- host (tea master, kneeling in seiza) ----------
const host=new THREE.Group();scene.add(host);
const torso=new THREE.Group();torso.position.set(0,0.2,0);host.add(torso); // pivot at hips (20 cm above the floor in seiza) for bowing
{
  // lower legs folded under, thighs forward (seiza)
  // legs are built in setLegs(): hip → knee → ankle chain per side, so the host can sit in seiza, rise onto her knees (kiza) or stand
  const pelvis=mesh(new THREE.SphereGeometry(0.17,24,16),M.kimono);pelvis.scale.set(1,0.55,0.85);pelvis.position.set(0,0.0,0);torso.add(pelvis);
  O.legs={thigh:[],shin:[],foot:[],knee:[]};
  for(const side of [-1,1]){const th=mesh(new THREE.CylinderGeometry(0.075,0.065,1,16),M.kimono);const sh=mesh(new THREE.CylinderGeometry(0.06,0.045,1,16),M.kimono);const ft=mesh(new THREE.BoxGeometry(0.085,0.045,0.22),M.juban);const kn=mesh(new THREE.SphereGeometry(0.07,14,14),M.kimono);
    scene.add(th,sh,ft,kn);O.legs.thigh.push(th);O.legs.shin.push(sh);O.legs.foot.push(ft);O.legs.knee.push(kn);}
  O.legs.skirt=mesh(new THREE.CylinderGeometry(0.19,0.22,1,24,1,true),M.kimono);O.legs.skirt.material=M.kimono.clone();O.legs.skirt.material.side=THREE.DoubleSide;scene.add(O.legs.skirt);
  O.legs.hem=mesh(new THREE.CylinderGeometry(0.2,0.2,0.1,24),M.kimono);scene.add(O.legs.hem);
  // torso
  const body=mesh(new THREE.CylinderGeometry(0.12,0.155,0.4,24),M.kimono);body.position.set(0,0.2,0);torso.add(body);
  const chest=mesh(new THREE.SphereGeometry(0.12,24,16,0,Math.PI*2,0,Math.PI/2),M.kimono);chest.position.set(0,0.4,0);chest.scale.set(1.3,0.6,1);torso.add(chest);
  const obi=mesh(new THREE.CylinderGeometry(0.138,0.153,0.11,24),M.obi);obi.position.set(0,0.13,0);torso.add(obi);
  const obijime=mesh(new THREE.CylinderGeometry(0.142,0.154,0.015,24),M.obijime);obijime.position.set(0,0.13,0);torso.add(obijime);
  const taiko=mesh(new THREE.BoxGeometry(0.2,0.16,0.08),M.obi);taiko.position.set(0,0.16,-0.18);torso.add(taiko);
  // collar: white under-kimono then green collar, crossing left over right
  const eriW=mesh(new THREE.PlaneGeometry(0.035,0.2),M.juban);eriW.position.set(-0.032,0.4,0.125);eriW.rotation.set(-0.3,0,0.42);torso.add(eriW);
  const eriW2=eriW.clone();eriW2.position.x=0.035;eriW2.rotation.set(-0.3,0,-0.42);torso.add(eriW2);
  const eriG=mesh(new THREE.PlaneGeometry(0.04,0.22),new THREE.MeshStandardMaterial({color:0x3f5b35,roughness:.95,side:THREE.DoubleSide}));eriG.position.set(-0.056,0.39,0.12);eriG.rotation.set(-0.3,0,0.42);torso.add(eriG);
  const eriG2=eriG.clone();eriG2.position.x=0.062;eriG2.rotation.set(-0.3,0,-0.42);torso.add(eriG2);
  // neck + head
  const neck=mesh(new THREE.CylinderGeometry(0.038,0.044,0.1,12),M.skin);neck.position.set(0,0.47,0);torso.add(neck);
  const headG=new THREE.Group();headG.position.set(0,0.57,0);torso.add(headG);O.headG=headG;
  const head=mesh(new THREE.SphereGeometry(0.1,28,28),M.skin,{name:'The host',jp:'亭主',desc:'The tea master, teishu. Today the host explains everything in English.'});head.scale.set(0.95,1.05,0.98);headG.add(head);
  const hair=mesh(new THREE.SphereGeometry(0.11,28,28,0,Math.PI*2,0,Math.PI*0.62),M.hair);hair.position.set(0,0.01,-0.01);hair.rotation.x=-0.3;headG.add(hair);
  const bangs=mesh(new THREE.SphereGeometry(0.108,28,28,Math.PI*0.15,Math.PI*0.7,0,Math.PI*0.3),M.hair);bangs.position.set(0,0.012,0.005);bangs.rotation.x=0.15;headG.add(bangs);
  const bun=mesh(new THREE.SphereGeometry(0.045,16,16),M.hair);bun.position.set(0,0.06,-0.09);headG.add(bun);
  const kanzashi=mesh(new THREE.CylinderGeometry(0.004,0.004,0.16,8),M.obijime);kanzashi.rotation.z=Math.PI/2;kanzashi.rotation.y=0.4;kanzashi.position.set(0.02,0.08,-0.09);headG.add(kanzashi);
  const eyeL=mesh(new THREE.SphereGeometry(0.009,8,8),M.hair);eyeL.position.set(-0.035,0.0,0.097);headG.add(eyeL);
  const eyeR=eyeL.clone();eyeR.position.x=0.035;headG.add(eyeR);
  const browL=mesh(new THREE.BoxGeometry(0.03,0.005,0.004),M.hair);browL.position.set(-0.035,0.03,0.099);browL.rotation.z=0.1;headG.add(browL);
  const browR=browL.clone();browR.position.x=0.035;browR.rotation.z=-0.1;headG.add(browR);
  const mouth=mesh(new THREE.BoxGeometry(0.025,0.004,0.004),new THREE.MeshStandardMaterial({color:0xb5636a}));mouth.position.set(0,-0.045,0.1);headG.add(mouth);
  const earL=mesh(new THREE.SphereGeometry(0.018,10,10),M.skin);earL.position.set(-0.1,-0.005,0);headG.add(earL);
  const earR=earL.clone();earR.position.x=0.1;headG.add(earR);
}
// arms: two-bone IK (shoulder → elbow → hand), kimono sleeves hanging from the forearm
const UP=new THREE.Vector3(0,1,0);
function makeArm(side){
  const upper=mesh(new THREE.CylinderGeometry(0.042,0.038,1,14),M.kimono);
  const fore=mesh(new THREE.CylinderGeometry(0.038,0.034,1,14),M.kimono);
  const sleeve=mesh(new THREE.BoxGeometry(0.085,0.2,0.08),M.kimono);
  const sleeveLining=mesh(new THREE.BoxGeometry(0.085,0.012,0.075),M.juban);sleeveLining.visible=false;
  const wrist=mesh(new THREE.CylinderGeometry(0.027,0.027,0.06,12),M.skin);
  const elbow=mesh(new THREE.SphereGeometry(0.037,14,14),M.kimono);const shoulderS=mesh(new THREE.SphereGeometry(0.045,14,14),M.kimono);
  const hand=new THREE.Group();
  const palm=mesh(new THREE.SphereGeometry(1,16,12),M.skin);palm.scale.set(0.036,0.011,0.045);palm.position.z=0.035;hand.add(palm);
  const fingers=new THREE.Group();fingers.position.set(0,0,0.075);hand.add(fingers);
  for(const fx of [-0.024,-0.008,0.008,0.024]){const f=mesh(new THREE.CylinderGeometry(0.0065,0.0055,0.06,8),M.skin);f.rotation.x=Math.PI/2;f.position.set(fx,0,0.03);fingers.add(f);const tip=mesh(new THREE.SphereGeometry(0.0062,8,8),M.skin);tip.position.set(fx,0,0.06);fingers.add(tip);}
  const thumb=mesh(new THREE.CylinderGeometry(0.0075,0.0065,0.05,8),M.skin);thumb.rotation.x=Math.PI/2;thumb.position.set(side*0.038,-0.002,0.045);thumb.rotation.y=side*0.6;hand.add(thumb);
  scene.add(upper,fore,sleeve,sleeveLining,wrist,hand,elbow,shoulderS);
  return {side,upper,fore,sleeve,sleeveLining,wrist,hand,elbow,shoulderS,fingers,thumb,grip:0,prev:new THREE.Vector3(),vel:0,shoulder:new THREE.Vector3(side*0.155,0.42,0.02),pos:new THREE.Vector3(),look:null,tmp:new THREE.Vector3(),tmp2:new THREE.Vector3(),tmp3:new THREE.Vector3()};
}
const armL=makeArm(-1),armR=makeArm(1);
// leg poses: pelvis position, knee (y,z), ankle (y,z); v = 0 seiza, 1 kiza (up on the knees), 2 standing
const LEGP=[{p:[0,0.2,0],k:[0.09,0.38],a:[0.06,0.0]},{p:[0,0.44,0.06],k:[0.09,0.31],a:[0.07,-0.06]},{p:[0,0.86,0],k:[0.46,0.02],a:[0.06,0.0]}];
let legsV=0;const legsObj={position:new THREE.Vector3()};
function segm(m,A,B){const v=B.clone().sub(A);m.position.copy(A).addScaledVector(v,0.5);m.scale.set(1,v.length(),1);m.quaternion.setFromUnitVectors(UP,v.normalize());}
function setLegs(v){v=Math.max(0,Math.min(2,v));legsV=v;const i=v<1?0:1,u=ease(v-i),A=LEGP[i],Bp=LEGP[i+1];const L=(a,b)=>a+(b-a)*u;
  const P=new THREE.Vector3(L(A.p[0],Bp.p[0]),L(A.p[1],Bp.p[1]),L(A.p[2],Bp.p[2]));torso.position.copy(P);
  const ky=L(A.k[0],Bp.k[0]),kz=L(A.k[1],Bp.k[1]),ay=L(A.a[0],Bp.a[0]),az=L(A.a[1],Bp.a[1]);const stand=Math.max(0,v-1);
  O.legs.thigh.forEach((th,n)=>{const side=n?1:-1;const hip=new THREE.Vector3(side*0.09,P.y-0.02,P.z),knee=new THREE.Vector3(side*0.09,ky,kz),ankle=new THREE.Vector3(side*0.09,ay,az);
    segm(th,hip,knee);segm(O.legs.shin[n],knee,ankle);O.legs.knee[n].position.copy(knee);
    const shinDir=ankle.clone().sub(knee).normalize();const footDir=shinDir.clone().lerp(new THREE.Vector3(0,0,1),stand).setY(0).normalize();
    const ft=O.legs.foot[n];ft.position.copy(ankle).addScaledVector(footDir,0.09);ft.position.y=Math.max(0.025,ankle.y-0.02);ft.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),footDir);});
  const kneeMid=new THREE.Vector3(0,ky-0.02,kz+0.02).lerp(new THREE.Vector3(0,ay+0.03,az+0.02),stand);segm(O.legs.skirt,P.clone().add(new THREE.Vector3(0,-0.02,0)),kneeMid);
  O.legs.hem.position.copy(kneeMid).add(new THREE.Vector3(0,-0.03,0));O.legs.hem.scale.set(1,1,1);O.legs.hem.quaternion.copy(O.legs.skirt.quaternion);}
const LU=0.28,LF=0.25; // upper arm 28 cm, forearm 25 cm: real lengths for a 160 cm adult, never stretched
function placeArm(a){
  const S=torso.localToWorld(a.shoulder.clone());const H=a.pos;
  // the lap and knees are solid: a hand over them stays on their surface
  if(legsV<0.5&&Math.abs(H.x)<0.2&&H.z>-0.05&&H.z<0.39&&H.y<0.335)H.y=0.335;
  const d=a.tmp.subVectors(H,S);let len=d.length();const maxLen=LU+LF-0.01;if(len>maxLen){d.multiplyScalar(maxLen/len);len=maxLen;H.copy(S).add(d);}
  const dir=d.clone().normalize();
  const aLen=(LU*LU-LF*LF+len*len)/(2*len);const h=Math.sqrt(Math.max(0,LU*LU-aLen*aLen));
  // elbow hint: outward, down and back
  const hint=a.tmp2.set(a.side*0.5,-0.6,-0.45);const perp=a.tmp3.copy(hint).addScaledVector(dir,-hint.dot(dir)).normalize();
  const E=S.clone().addScaledVector(dir,aLen).addScaledVector(perp,h);
  function seg(m,A,B,r){const v=B.clone().sub(A);m.position.copy(A).addScaledVector(v,0.5);m.scale.set(1,v.length(),1);m.quaternion.setFromUnitVectors(UP,v.normalize());}
  seg(a.upper,S,E);seg(a.fore,E,H);a.elbow.position.copy(E);a.shoulderS.position.copy(S);
  const mid=E.clone().lerp(H,0.45);a.sleeve.position.copy(mid).add(new THREE.Vector3(0,-0.11,0));a.sleeve.quaternion.identity();
  a.sleeveLining.position.copy(a.sleeve.position).add(new THREE.Vector3(0,-0.115,0));
  a.wrist.position.copy(H).addScaledVector(dir,-0.02);a.wrist.quaternion.copy(a.fore.quaternion);
  a.hand.position.copy(H);
  // palm direction: 'down' (back of hand up), 'up' (palm up, as under a bowl), 'in' (palm toward the body, as around a handle)
  const upT=a.palm==='up'?a.tmp2.set(0,-1,0):a.palm==='in'?a.tmp2.set(a.side,0.15,0):a.tmp2.set(0,1,0);
  if(!a.upv)a.upv=new THREE.Vector3(0,1,0);a.upv.lerp(upT,0.12).normalize();a.hand.up.copy(a.upv);
  const look=a.look||H.clone().add(new THREE.Vector3(0,a.palm==='in'?-0.1:-0.3,0.4));a.hand.lookAt(look);
}

// ---------- utensils ----------
// chawan group with liquids; the "front" mark faces the host (-z) while tea is made
{
  const g=new THREE.Group();
  const bowl=lathe([[0.035,0],[0.045,0.005],[0.055,0.02],[0.062,0.05],[0.066,0.08],[0.06,0.08],[0.056,0.05],[0.048,0.02],[0.04,0.012]],M.glaze,{name:'Chawan',jp:'茶碗',desc:'The tea bowl. Its "front" is the most beautiful side; the host turns it toward you before serving.'});
  bowl.material=bowl.material.clone();bowl.material.side=THREE.DoubleSide;g.add(bowl);
  const mark=mesh(new THREE.BoxGeometry(0.022,0.035,0.004),M.clay,{shadow:false});mark.position.set(0,0.055,-0.064);g.add(mark);
  const water=mesh(new THREE.CylinderGeometry(0.05,0.045,0.012,24),M.water,{shadow:false});water.position.y=0.03;water.visible=false;g.add(water);
  const tea=mesh(new THREE.CylinderGeometry(0.05,0.045,0.014,24),M.tea,{shadow:false});tea.position.y=0.03;tea.visible=false;g.add(tea);
  const froth=mesh(new THREE.CylinderGeometry(0.049,0.046,0.006,24),M.froth,{shadow:false});froth.position.y=0.04;froth.visible=false;g.add(froth);
  const powder=mesh(new THREE.ConeGeometry(0.02,0.018,16),M.powder,{shadow:false});powder.position.y=0.021;powder.visible=false;g.add(powder);
  O.bowl=g;O.water=water;O.tea=tea;O.froth=froth;O.powder=powder;scene.add(g);
}
// chasen (whisk) — tines spread upward from the handle
{
  const g=new THREE.Group();
  const handle=mesh(new THREE.CylinderGeometry(0.012,0.012,0.055,12),M.bamboo,{name:'Chasen',jp:'茶筅',desc:'The bamboo whisk, cut from one piece of bamboo into about 80 fine tines.'});handle.position.y=0.028;g.add(handle);
  const tines=mesh(new THREE.CylinderGeometry(0.026,0.013,0.05,18,1,true),M.bambooLight);tines.material=tines.material.clone();tines.material.side=THREE.DoubleSide;tines.material.transparent=true;tines.material.opacity=.85;tines.position.y=0.08;g.add(tines);
  const core=mesh(new THREE.CylinderGeometry(0.004,0.01,0.05,8),M.bamboo);core.position.y=0.08;g.add(core);
  const thread=mesh(new THREE.TorusGeometry(0.013,0.002,6,16),M.hair);thread.rotation.x=Math.PI/2;thread.position.y=0.058;g.add(thread);
  O.chasen=g;scene.add(g);
}
// natsume + lid
{
  const body=lathe([[0,0],[0.035,0],[0.038,0.03],[0.036,0.052],[0,0.052]],M.lacquer,{name:'Natsume',jp:'棗',desc:'The lacquered container for thin tea. Its shape is like a jujube fruit (natsume).'});O.natsume=body;scene.add(body);
  const lid=lathe([[0,0],[0.036,0],[0.038,0.01],[0.03,0.026],[0,0.028]],M.lacquer,{name:'Natsume lid',jp:'棗の蓋',desc:'The host lifts the lid and rests it to the right of the bowl while scooping.'});O.lid=lid;scene.add(lid);
}
// chashaku (scoop): lies along local z, scoop tip at -z
{
  const g=new THREE.Group();
  const s=mesh(new THREE.BoxGeometry(0.008,0.004,0.17),M.bamboo,{name:'Chashaku',jp:'茶杓',desc:'The bamboo tea scoop. One and a half scoops of matcha make a bowl of thin tea.'});g.add(s);
  const tip=mesh(new THREE.BoxGeometry(0.012,0.004,0.03),M.bambooLight);tip.position.set(0,0.006,-0.085);tip.rotation.x=0.5;g.add(tip);
  O.chashaku=g;scene.add(g);
}
// furo + kama (host's left front), lid with chakin on top
const KAMA=[-0.4,0,0.14];
{
  const brazier=lathe([[0,0],[0.14,0],[0.15,0.08],[0.13,0.1],[0.11,0.1],[0.11,0.09],[0,0.09]],M.clay,{name:'Furo',jp:'風炉',desc:'The portable brazier used from May to October. Charcoal inside heats the kettle.'});brazier.position.set(...KAMA);scene.add(brazier);
  const ash=mesh(new THREE.CylinderGeometry(0.1,0.1,0.01,16),M.ash,{shadow:false});ash.position.set(KAMA[0],0.095,KAMA[2]);scene.add(ash);
  const kama=mesh(new THREE.SphereGeometry(0.12,24,24),M.iron,{name:'Kama',jp:'釜',desc:'The iron kettle. The sound of the water just under the boil is called matsukaze, "wind in the pines".'});kama.scale.set(1,0.8,1);kama.position.set(KAMA[0],0.19,KAMA[2]);scene.add(kama);
  const lidG=new THREE.Group();
  const lid=mesh(new THREE.CylinderGeometry(0.06,0.065,0.015,20),M.iron,{name:'Kama lid',jp:'釜の蓋',desc:'The kettle lid. It is lifted with the fukusa, because it is hot, and rested on the futaoki.'});lidG.add(lid);
  const knob=mesh(new THREE.SphereGeometry(0.012,10,10),M.iron);knob.position.y=0.015;lidG.add(knob);
  O.kamaLid=lidG;scene.add(lidG);
  const kw=mesh(new THREE.CylinderGeometry(0.078,0.078,0.006,28),new THREE.MeshStandardMaterial({color:0x9fb8bf,roughness:.15,metalness:.1,transparent:true,opacity:.9}),{shadow:false,name:'Hot water',jp:'湯',desc:'The kettle is about two-thirds full. It is kept just under the boil all through the ceremony.'});kw.position.set(KAMA[0],0.268,KAMA[2]);scene.add(kw);O.kamaWater=kw;
  const steam=new THREE.Group();for(let i=0;i<3;i++){const p=mesh(new THREE.SphereGeometry(0.02,8,8),new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.25,roughness:1}),{shadow:false});p.userData.o=i*1.1;steam.add(p);}steam.position.set(KAMA[0]+0.02,0.3,KAMA[2]);scene.add(steam);O.steam=steam;
}
// chakin (linen cloth), folded, rests on the kama lid
{
  const c=mesh(new THREE.BoxGeometry(0.05,0.012,0.03),M.linen,{name:'Chakin',jp:'茶巾',desc:'A small damp linen cloth for wiping the bowl. It comes in inside the bowl and waits on the kettle lid.'});O.chakin=c;scene.add(c);
}
// mizusashi (cold-water jar) to the host's right, behind
{
  const jar=lathe([[0,0],[0.085,0],[0.095,0.1],[0.09,0.17],[0,0.17]],M.celadon,{name:'Mizusashi',jp:'水指',desc:'The cold-water jar. Fresh water is added to the kettle at the end to replace what was used.'});jar.position.set(0.36,0,-0.02);scene.add(jar);
  const lid=mesh(new THREE.CylinderGeometry(0.095,0.095,0.015,24),M.lacquer);lid.position.set(0.36,0.178,-0.02);scene.add(lid);
}
// futaoki (lid rest, bamboo) and hishaku resting on it
{
  const f=mesh(new THREE.CylinderGeometry(0.026,0.026,0.05,16),M.bamboo,{name:'Futaoki',jp:'蓋置',desc:'A short piece of bamboo: the rest for the kettle lid and the ladle.'});f.position.set(-0.2,0.025,0.34);scene.add(f);
  const g=new THREE.Group();
  const cup=mesh(new THREE.CylinderGeometry(0.03,0.028,0.035,16,1,true),M.bamboo,{name:'Hishaku',jp:'柄杓',desc:'The bamboo ladle. It carries hot water from the kettle to the bowl, and spare water back.'});cup.material=cup.material.clone();cup.material.side=THREE.DoubleSide;g.add(cup);
  const bottom=mesh(new THREE.CylinderGeometry(0.028,0.028,0.004,16),M.bamboo);bottom.position.y=-0.016;g.add(bottom);
  const handle=mesh(new THREE.CylinderGeometry(0.006,0.006,0.38,8),M.bamboo);handle.rotation.z=Math.PI/2;handle.position.set(0.21,0.005,0);g.add(handle);
  O.hishaku=g;scene.add(g);
}
// pour stream (shown while the ladle is tilted)
{const st=mesh(new THREE.CylinderGeometry(0.006,0.004,1,8),M.water,{shadow:false});st.visible=false;O.stream=st;scene.add(st);}
// fukusa (silk cloth) tucked at the left hip when not in use
{
  const fg=new THREE.BoxGeometry(1,0.002,1);fg.translate(0,0,0.5); // scaled per state: open 27 x 28 cm, folded pad 9 x 14 cm, tucked strip at the obi
  const f=mesh(fg,M.silk,{name:'Fukusa',jp:'袱紗',desc:'A 27 cm square of silk for purifying the utensils. Before each wipe it is opened, flicked once, and folded in thirds and then in half, into a small pad.'});O.fukusa=f;scene.add(f);
}
// kashiki: lacquer sweet dish with two nerikiri (main sweets) and kuromoji picks, kept at the host's right until served
{
  const g=new THREE.Group();
  const dish=lathe([[0,0],[0.09,0],[0.1,0.012],[0.1,0.02],[0.085,0.02],[0.085,0.008],[0,0.008]],M.lacquer,{name:'Kashiki',jp:'菓子器',desc:'The sweet dish. The host brings it out and places it before the guest; the sweet is eaten before the tea.'});g.add(dish);
  for(const [x,z] of [[-0.035,0.01],[0.035,-0.01]]){const sw=mesh(new THREE.SphereGeometry(0.024,16,12),new THREE.MeshStandardMaterial({color:0xe9a3b4,roughness:.85}),{name:'Nerikiri',jp:'練り切り',desc:'A soft main sweet (omogashi) of white bean paste, shaped for the season. Cut it with the kuromoji and eat it in two or three bites.'});sw.scale.set(1,0.7,1);sw.position.set(x,0.028,z);g.add(sw);(O.sweets=O.sweets||[]).push(sw);
    const lf=mesh(new THREE.SphereGeometry(0.011,8,8),M.kimonoPlain);lf.scale.set(1.6,0.3,1);lf.position.set(x+0.01,0.046,z-0.008);g.add(lf);}
  const pick=mesh(new THREE.BoxGeometry(0.004,0.003,0.12),M.bamboo,{name:'Kuromoji',jp:'黒文字',desc:'Picks of spicebush wood come with the dish, one for each guest: a small knife and fork in one.'});pick.position.set(0.0,0.022,0.07);pick.rotation.y=1.35;g.add(pick);
  const pick2=pick.clone();pick2.position.set(0.0,0.025,0.078);g.add(pick2);
  O.kashiki=g;scene.add(g);
}
// kensui (waste-water bowl) beside the left knee
{
  const k=lathe([[0,0],[0.06,0],[0.07,0.055],[0.06,0.055],[0.05,0.01],[0,0.01]],M.iron,{name:'Kensui',jp:'建水',desc:'The waste-water bowl, kept low beside the host\'s left knee. Used water goes here.'});k.position.set(-0.42,0,0.42);scene.add(k);
}

const hishakuOnKama_=[KAMA[0]+0.02,0.31,KAMA[2]+0.02]; // "oki-bishaku": ladle rests across the open kettle mouth, handle toward the host
// ---------- rest pose & helpers ----------
const HIP_L=[-0.19,0.44,0.1];            // where the fukusa hangs from the obi
const FUK_TUCKED=[0.09,4,0.14],FUK_OPEN=[0.27,1,0.28],FUK_PAD=[0.09,6,0.14];
const KAMALID_ON_KAMA=[KAMA[0],0.285,KAMA[2]],KAMALID_ON_FUTAOKI=[-0.2,0.058,0.34];
const CHAKIN_IN_BOWL=[-0.02,0.03,0.42],CHAKIN_ON_LID=[-0.2,0.072,0.33],CHAKIN_ASIDE=[-0.3,0.006,0.27];
const KASHIKI_HOME=[0.5,0,0.4],KASHIKI_SERVED=[0.32,0,0.6];
const REST={
  bowl:{pos:[-0.02,0,0.42],rot:[0,0,0]},
  chasen:{pos:[0.24,0,0.44],rot:[0,0,0]},
  natsume:{pos:[0.12,0,0.42],rot:[0,0,0]},
  lid:{pos:[0.12,0.052,0.42],rot:[0,0,0]},
  chashaku:{pos:[0.12,0.085,0.42],rot:[0,1.25,0]},
  hishaku:{pos:[-0.2,0.07,0.34],rot:[0,-0.3,0]},
  fukusa:{pos:[...HIP_L],rot:[1.57,0.35,0],scale:FUK_TUCKED},
  chakin:{pos:CHAKIN_IN_BOWL,rot:[0,0,0]},
  kamaLid:{pos:KAMALID_ON_KAMA,rot:[0,0,0]},
  kashiki:{pos:KASHIKI_HOME,rot:[0,0,0]},
  handL:{pos:[-0.12,0.34,0.23]},handR:{pos:[0.12,0.34,0.23]},
  torso:{rot:[0,0,0]},
  legs:{pos:[0,0,0]},
};
const objs={bowl:O.bowl,chasen:O.chasen,natsume:O.natsume,lid:O.lid,chashaku:O.chashaku,hishaku:O.hishaku,fukusa:O.fukusa,chakin:O.chakin,kamaLid:O.kamaLid,kashiki:O.kashiki,handL:armL,handR:armR,torso,legs:legsObj};
// scene state once the kettle is open and the sweets are out (steps after the lid opening)
const POSE_OPEN={kamaLid:{pos:KAMALID_ON_FUTAOKI},chakin:{pos:CHAKIN_ON_LID},hishaku:{pos:hishakuOnKama_,rot:[0,-0.35,0]},kashiki:{pos:KASHIKI_SERVED}};
const POSE_SWEETS={kashiki:{pos:KASHIKI_SERVED}};
const POSE_CLOSED={kashiki:{pos:KASHIKI_SERVED},chakin:{pos:CHAKIN_ASIDE}};
function setPos(o,v){if(o.pos)o.pos.set(v[0],v[1],v[2]);else o.position.set(v[0],v[1],v[2]);}
function getPos(o){return o.pos||o.position;}
function resetRest(){for(const k in REST){const o=objs[k],r=REST[k];if(r.pos)setPos(o,r.pos);if(r.rot&&o.rotation)o.rotation.set(...r.rot);if(r.scale)o.scale.set(...r.scale);}
  armL.look=null;armR.look=null;
  O.water.visible=O.tea.visible=O.froth.visible=O.powder.visible=false;O.powder.scale.set(1,1,1);O.froth.scale.set(1,1,1);}
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);
function sample(keys,t){if(t<keys[0][0])return null;if(t===keys[0][0])return keys[0].slice(1);for(let i=1;i<keys.length;i++){if(t<=keys[i][0]){const a=keys[i-1],b=keys[i];const u=ease((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u);}}return keys[keys.length-1].slice(1);}
function applyTracks(tracks,t){
  for(const tr of tracks){
    const o=objs[tr.o]||O[tr.o];
    if(tr.osc){const s=tr.osc;if(t<s.t0||t>s.t1)continue;const fade=Math.min(1,(t-s.t0)/0.4,(s.t1-t)/0.4);const v=Math.sin((t-s.t0)*s.freq*Math.PI*2+(s.phase||0))*s.amp*fade;(tr.p==='rot'?o.rotation:getPos(o))[s.axis]+=v;continue;}
    const v=sample(tr.k,t);if(!v)continue;
    if(tr.p==='pos'){const k=tr.k;for(let i=1;i<k.length;i++){if(t<=k[i][0]){const a=k[i-1],b=k[i];if(t>a[0]){const u=(t-a[0])/(b[0]-a[0]);const dx=b[1]-a[1],dz=b[3]-a[3],dist=Math.hypot(dx,dz);if(dist>0.07){v[1]+=Math.sin(u*Math.PI)*Math.min(0.06,dist*0.3);}}break;}}setPos(o,v);}else if(tr.p==='rot')o.rotation.set(v[0],v[1],v[2]);
    else if(tr.p==='vis')o.visible=v[0]>0.5;else if(tr.p==='scale')o.scale.set(v[0],v[1],v[2]);
  }
}
const R=REST,HR=R.handR.pos,HL=R.handL.pos,B=R.bowl.pos,N=R.natsume.pos,KT=[KAMA[0],0.3,KAMA[2]];
const hishakuOnKama=hishakuOnKama_; // "oki-bishaku": ladle rests across the kettle mouth, handle toward the host
const HISH_H=0.21; // handle length from cup to grip
// hand that holds the ladle: cup position + handle direction (rot.y) → grip point
function grip(cup,roty){return [cup[0]+Math.cos(roty)*HISH_H,cup[1]+0.02,cup[2]-Math.sin(roty)*HISH_H];}
// ladle sequence: from `from` (rest spot + rot) to kettle, scoop, pour over bowl; pourFrac 1 = all, 0.6 = pour part then return rest to kettle (yugaeshi); ends resting on kettle mouth
function ladleHold(t0,liquid,opts={}){const L=ladle(t0,liquid,opts);return {o:'hishaku',hand:'R',t0:opts.heldFrom?t0:t0+1.2,t1:L.holdEnd,palm:'in'};}
function ladle(t0,liquid,opts={}){const from=opts.from||R.hishaku.pos,fromRot=opts.fromRot==null?R.hishaku.rot[1]:opts.fromRot,yug=!!opts.yugaeshi;
  const over=[B[0]+0.01,0.2,B[2]],overRot=1.0;const kettleHigh=[KAMA[0],0.5,KAMA[2]],kettleIn=[KAMA[0],0.24,KAMA[2]],kRot=-0.4;
  const pos=[[t0,...from],[t0+1.6,...from],[t0+3,...kettleHigh],[t0+4.2,...kettleIn],[t0+5.2,...kettleIn],[t0+6.4,...kettleHigh],[t0+8,...over],[t0+11,...over]];
  const rot=[[t0,0,fromRot,0],[t0+1.6,0,fromRot,0],[t0+3,0,kRot,0],[t0+8,0,overRot,0],[t0+8.6,0,overRot,-1.0],[t0+10.5,0,overRot,-1.0],[t0+11,0,overRot,0]];
  let tEnd=t0+11;
  if(yug){rot[4][3]=-0.55;rot[5][3]=-0.55;pos.push([tEnd+1.5,...kettleHigh],[tEnd+2.5,KAMA[0],0.33,KAMA[2]],[tEnd+3.5,KAMA[0],0.33,KAMA[2]]);rot.push([tEnd+1.5,0,kRot,0],[tEnd+2.2,0,kRot,-1.1],[tEnd+3.3,0,kRot,-1.1],[tEnd+3.5,0,kRot,0]);tEnd+=3.5;}
  pos.push([tEnd+1.5,...hishakuOnKama]);rot.push([tEnd+1.5,0,-0.35,0]);
  const hand=pos.map((k,i)=>{const ry=(sample(rot,k[0])||rot[0].slice(1))[1];return [k[0],...grip(k.slice(1),ry)];});
  if(!opts.heldFrom){hand.unshift([t0,...HR]);hand[1]=[t0+1.2,...grip(from,fromRot)];}hand.push([tEnd+3,...HR]);
  return {tracks:[{o:'hishaku',p:'pos',k:pos},{o:'hishaku',p:'rot',k:rot},{o:'handR',p:'pos',k:hand},{o:liquid,p:'vis',k:[[t0+8.8,0],[t0+8.9,1]]}],end:tEnd+3,holdEnd:tEnd+1.5};}

const STEPS=[
 {title:'Greet the guest',jp:'挨拶',dur:16,
  lines:[[2.5,'Welcome. Please sit comfortably.'],[5.5,'Today I will make a bowl of thin tea, usucha, for you.'],[10.5,'First a sweet, then the tea. Press Next whenever you are ready.']],
  tracks:[{o:'legs',p:'pos',k:[[0,1,0,0],[0.8,1,0,0],[3,0,0,0]]},
          {o:'handL',p:'pos',k:[[0,-0.12,0.58,0.3],[0.8,-0.12,0.58,0.3],[3,...HL]]},{o:'handR',p:'pos',k:[[0,0.12,0.58,0.3],[0.8,0.12,0.58,0.3],[3,...HR]]},
          {o:'torso',p:'rot',k:[[4,0,0,0],[5.5,0.55,0,0],[8,0.55,0,0],[9.5,0,0,0]]},
          {o:'handL',p:'pos',k:[[4,...HL],[5.5,-0.14,0.02,0.4],[8,-0.14,0.02,0.4],[9.5,...HL]]},
          {o:'handR',p:'pos',k:[[4,...HR],[5.5,0.14,0.02,0.4],[8,0.14,0.02,0.4],[9.5,...HR]]}],
  holds:[],
  qs:[['Why does the host bow?','A bow opens and closes every meeting in the tea room. It says: I am glad you came, and I will do my best for you.'],['Where should I sit?','Guests kneel on the tatami facing the host. In this browser version your seat is the cushion in front of the host.']]},
 {title:'Serve the sweet',jp:'お菓子を出す',dur:18,
  lines:[[0.5,'Please have a sweet. This is a nerikiri, a soft main sweet of white bean paste, shaped for the season.'],[8,'Take one onto your kaishi paper and cut it with the kuromoji pick. Please finish it before the tea comes.'],[13.5,'With thin tea, light dry sweets, higashi, are also common. Today it is a main sweet, so you need the pick.']],
  tracks:[{o:'handR',p:'pos',k:[[0.5,...HR],[2,0.58,0.03,0.4],[3.5,0.58,0.2,0.4],[6,0.4,0.2,0.6],[7.5,0.4,0.03,0.6],[8.5,...HR]]},
          {o:'handL',p:'pos',k:[[0.5,...HL],[2,0.42,0.03,0.4],[3.5,0.42,0.2,0.4],[6,0.24,0.2,0.6],[7.5,0.24,0.03,0.6],[8.5,...HL]]},
          {o:'kashiki',p:'pos',k:[[2,...KASHIKI_HOME],[3.5,0.5,0.17,0.4],[6,0.32,0.17,0.6],[7.5,...KASHIKI_SERVED]]},
          {o:'torso',p:'rot',k:[[0.5,0,0,0],[2,0.15,0,-0.25],[3.5,0.1,0,-0.2],[6,0.55,0,-0.15],[7.5,0.55,0,-0.15],[8.5,0,0,0],[10,0,0,0],[11.5,0.5,0,0],[13.5,0.5,0,0],[15,0,0,0]]},
          {o:'handL',p:'pos',k:[[10,...HL],[11.5,-0.14,0.02,0.4],[13.5,-0.14,0.02,0.4],[15,...HL]]},
          {o:'handR',p:'pos',k:[[10,...HR],[11.5,0.14,0.02,0.4],[13.5,0.14,0.02,0.4],[15,...HR]]}],
  holds:[{o:'kashiki',hand:'L',t0:2,t1:7.5,palm:'up'}],
  qs:[['Why eat the sweet first?','The sweet lines the mouth with sweetness, so the slightly bitter matcha tastes round and clean. It is never eaten with the tea.'],['What is higashi?','Dry pressed sugar sweets, often shaped like flowers or leaves. They are picked up with the fingers and need no kuromoji; they usually go with thin tea.']]},
 {title:'Purify the tools',jp:'清め',dur:26,pose:POSE_SWEETS,
  lines:[[0.5,'I take the silk cloth, the fukusa, from my obi, open it and give it one flick to clear it.'],[5,'Folded in thirds and in half, it becomes a small pad. With it I purify the tea container.'],[10,'Then the bamboo scoop, the chashaku: three wipes along it.'],[17,'They are already clean. This is to calm my mind and to show respect to you.']],
  tracks:[{o:'handR',p:'pos',k:[[0.5,...HR],[1.5,-0.16,0.42,0.14],[3,0.06,0.52,0.3],[4.6,0.06,0.52,0.3],[6,0.14,0.13,0.42],[8.5,0.14,0.13,0.42],[10.5,0.1,0.42,0.34],[15.5,0.1,0.42,0.34],[17,0.12,0.12,0.42],[18.5,0.08,0.5,0.3],[20,-0.16,0.42,0.14],[21.5,...HR]]},
          {o:'fukusa',p:'pos',k:[[1.5,...HIP_L],[3,0.06,0.5,0.3],[4.6,0.06,0.5,0.3],[6,0.13,0.085,0.38],[8.5,0.13,0.085,0.38],[10.5,0.1,0.39,0.34],[15.5,0.1,0.39,0.34],[17,0.12,0.09,0.38],[18.5,0.08,0.48,0.3],[20,...HIP_L]]},
          {o:'fukusa',p:'rot',k:[[1.5,1.57,0.35,0],[3,1.57,0,0],[4.6,1.57,0,0],[6,0,0,0],[8.5,0,0,0],[10.5,-0.3,0,0],[15.5,-0.3,0,0],[17,0,0,0],[18.5,1.57,0,0],[20,1.57,0.35,0]]},
          {o:'fukusa',p:'scale',k:[[1.5,...FUK_TUCKED],[3,...FUK_OPEN],[4.6,...FUK_OPEN],[5.3,0.09,3,0.28],[6,...FUK_PAD],[18,...FUK_PAD],[18.5,...FUK_OPEN],[19.6,...FUK_TUCKED]]},
          {o:'fukusa',p:'rot',osc:{axis:'z',amp:0.3,freq:2,t0:3.2,t1:4.4}},
          {o:'torso',p:'rot',k:[[4.5,0,0,0],[6,0.32,0,0.05],[8.5,0.32,0,0.05],[10,0.12,0,0],[15.5,0.12,0,0],[17,0.26,0,0.05],[18.5,0,0,0]]},
          {o:'fukusa',p:'pos',osc:{axis:'x',amp:0.015,freq:1.5,t0:6,t1:8.5}},{o:'handR',p:'pos',osc:{axis:'x',amp:0.015,freq:1.5,t0:6,t1:8.5}},
          {o:'handL',p:'pos',k:[[5,...HL],[6,0.06,0.04,0.42],[8.5,0.06,0.04,0.42],[9,...HL],[9.5,0.12,0.11,0.42],[10.5,0.0,0.4,0.34],[15.5,0.0,0.4,0.34],[17,0.12,0.11,0.42],[18,...HL]]},
          {o:'chashaku',p:'pos',k:[[9.5,...R.chashaku.pos],[10.5,0.06,0.4,0.34],[15.5,0.06,0.4,0.34],[17,...R.chashaku.pos]]},
          {o:'chashaku',p:'rot',k:[[9.5,0,1.25,0],[10.5,0,1.57,0],[15.5,0,1.57,0],[17,0,1.25,0]]},
          {o:'fukusa',p:'pos',osc:{axis:'x',amp:0.05,freq:0.6,t0:10.8,t1:15.5}},{o:'handR',p:'pos',osc:{axis:'x',amp:0.05,freq:0.6,t0:10.8,t1:15.5}}],
  holds:[{o:'fukusa',hand:'R',t0:1.5,t1:20,palm:'down'},{o:'chashaku',hand:'L',t0:9.5,t1:17,palm:'in'}],
  qs:[['Is the fukusa only for cleaning?','No. The utensils are clean before the ceremony. Wiping them in front of you prepares the heart, not the object.'],['How is the fukusa folded?','Held by two corners, opened, flicked once (chiri-uchi), then folded in thirds lengthwise and in half: a pad about 9 by 14 centimetres that fits the hand.']]},
 {title:'Warm the bowl',jp:'茶碗を温める',dur:50,pose:POSE_SWEETS,
  lines:[[0.5,'I take the ladle, the hishaku, and hold it while my left hand opens the kettle lid with the fukusa. The lid rests on the futaoki.'],[9,'The damp linen cloth, the chakin, comes out of the bowl and waits on the lid.'],[12.5,'Now I warm the bowl: one ladle of hot water from the kettle.'],[21.5,'I rest the ladle on the kettle and check the whisk in the warm water, lifting it to look at the tines.'],[34,'Then I pour the water into the waste bowl, the kensui, on my left.'],[41,'And I wipe the bowl with the chakin.']],
  get tracks(){const T=12,HELD=[0.12,0.33,0.3],HR0=-0.3;const L=ladle(T,'water',{from:HELD,fromRot:HR0,heldFrom:true});return [
          // kagami-bishaku: the ladle is taken first and held while the lid is opened
          {o:'handR',p:'pos',k:[[0.5,...HR],[2,...grip(R.hishaku.pos,HR0)],[3.5,...grip(HELD,HR0)],[T,...grip(HELD,HR0)]]},
          {o:'hishaku',p:'pos',k:[[2,...R.hishaku.pos],[3.5,...HELD],[T,...HELD]]},
          {o:'hishaku',p:'rot',k:[[2,0,HR0,0],[3.5,0,HR0,0]]},
          // left hand: fukusa from the obi, lift the kettle lid onto the lid rest, fukusa back
          {o:'handL',p:'pos',k:[[2,...HL],[3.5,-0.17,0.44,0.14],[5,KAMA[0],0.35,KAMA[2]],[5.8,KAMA[0],0.35,KAMA[2]],[6.6,KAMA[0],0.47,KAMA[2]],[8,-0.2,0.12,0.34],[8.6,-0.2,0.12,0.34],[10,-0.17,0.44,0.14],[11,...HL]]},
          {o:'fukusa',p:'pos',k:[[3.5,...HIP_L],[5,KAMA[0],0.31,KAMA[2]],[8.6,-0.2,0.085,0.34],[10,...HIP_L]]},
          {o:'fukusa',p:'rot',k:[[3.5,1.57,0.35,0],[5,0,0,0],[8.6,0,0,0],[10,1.57,0.35,0]]},
          {o:'fukusa',p:'scale',k:[[3.5,...FUK_TUCKED],[5,...FUK_PAD],[8.6,...FUK_PAD],[10,...FUK_TUCKED]]},
          {o:'kamaLid',p:'pos',k:[[5.8,...KAMALID_ON_KAMA],[6.6,KAMA[0],0.44,KAMA[2]],[8,...KAMALID_ON_FUTAOKI]]},
          {o:'torso',p:'rot',k:[[3.5,0,0,0],[5,0.12,0,0.2],[8.6,0.12,0,0.2],[10,0,0,0]]},
          // chakin from the bowl onto the lid
          {o:'handL',p:'pos',k:[[11,...HL],[11.7,B[0],0.09,B[2]],[12.5,-0.2,0.12,0.34],[13.2,...HL]]},
          {o:'chakin',p:'pos',k:[[11.7,...CHAKIN_IN_BOWL],[12.5,...CHAKIN_ON_LID]]},
          ...L.tracks,
          // chasen-toshi: whisk into the bowl, lift & look twice, swish, back to its place
          {o:'handR',p:'pos',k:[[L.end,...HR],[L.end+1,0.24,0.1,0.44],[L.end+2.2,0.0,0.12,0.42],[L.end+3.5,0.0,0.3,0.42],[L.end+4.5,0.0,0.12,0.42],[L.end+5.5,0.0,0.3,0.42],[L.end+6.5,0.0,0.12,0.42],[L.end+9,0.0,0.12,0.42],[L.end+10,0.24,0.1,0.44],[L.end+11,...HR]]},
          {o:'chasen',p:'pos',k:[[L.end+1,...R.chasen.pos],[L.end+2.2,-0.02,0.04,0.42],[L.end+3.5,-0.02,0.17,0.42],[L.end+4.5,-0.02,0.04,0.42],[L.end+5.5,-0.02,0.17,0.42],[L.end+6.5,-0.02,0.04,0.42],[L.end+9,-0.02,0.04,0.42],[L.end+10,...R.chasen.pos]]},
          {o:'chasen',p:'rot',k:[[L.end+3,0,0,0],[L.end+3.5,0.3,0,0],[L.end+4.5,0,0,0],[L.end+5.5,0.3,0,0],[L.end+6.5,0,0,0]]},
          {o:'chasen',p:'pos',osc:{axis:'x',amp:0.015,freq:3,t0:L.end+6.8,t1:L.end+9}},
          {o:'handL',p:'pos',k:[[L.end+1,...HL],[L.end+2.2,-0.09,0.08,0.42],[L.end+10,-0.09,0.08,0.42],[L.end+11,...HL]]},
          // discard water into kensui (left), wipe with chakin, bowl back
          {o:'handL',p:'pos',k:[[L.end+11,...HL],[L.end+12,-0.09,0.06,0.42],[L.end+13.5,-0.36,0.18,0.42],[L.end+15.5,-0.36,0.18,0.42],[L.end+17,-0.1,0.1,0.42],[L.end+23,-0.1,0.1,0.42],[L.end+24,...HL]]},
          {o:'handR',p:'pos',k:[[L.end+11,...HR],[L.end+12,0.05,0.06,0.42],[L.end+13.5,-0.24,0.2,0.42],[L.end+15.5,-0.24,0.2,0.42],[L.end+17,-0.2,0.12,0.34],[L.end+18.5,0.0,0.14,0.42],[L.end+22,0.0,0.14,0.42],[L.end+23.5,-0.2,0.12,0.34],[L.end+24.5,...HR]]},
          {o:'bowl',p:'pos',k:[[L.end+12,...B],[L.end+13.5,-0.3,0.14,0.42],[L.end+15.5,-0.3,0.14,0.42],[L.end+17,...B]]},
          {o:'torso',p:'rot',k:[[L.end+12,0,0,0],[L.end+13.5,0.25,0,0.18],[L.end+15.5,0.25,0,0.18],[L.end+17,0,0,0]]},
          {o:'bowl',p:'rot',k:[[L.end+13.5,0,0,0],[L.end+14.3,0,0,1.6],[L.end+15.3,0,0,1.6],[L.end+16.5,0,0,0]]},
          {o:'water',p:'vis',k:[[L.end+14.2,1],[L.end+14.3,0]]},
          {o:'chakin',p:'pos',k:[[L.end+17,...CHAKIN_ON_LID],[L.end+18.5,-0.02,0.07,0.42],[L.end+22,-0.02,0.07,0.42],[L.end+23.5,...CHAKIN_ON_LID]]},
          {o:'chakin',p:'pos',osc:{axis:'x',amp:0.03,freq:0.9,t0:L.end+18.7,t1:L.end+22}},{o:'chakin',p:'pos',osc:{axis:'z',amp:0.03,freq:0.9,t0:L.end+18.7,t1:L.end+22,phase:1.57}},
          {o:'handR',p:'pos',osc:{axis:'x',amp:0.03,freq:0.9,t0:L.end+18.7,t1:L.end+22}},{o:'handR',p:'pos',osc:{axis:'z',amp:0.03,freq:0.9,t0:L.end+18.7,t1:L.end+22,phase:1.57}},
          {o:'bowl',p:'rot',osc:{axis:'y',amp:0.4,freq:0.45,t0:L.end+18.7,t1:L.end+22}}];},
  get holds(){const T=12,HELD=[0.12,0.33,0.3];const L=ladle(T,'water',{from:HELD,fromRot:-0.3,heldFrom:true});return [
          {o:'hishaku',hand:'R',t0:2,t1:L.holdEnd,palm:'in'},{o:'fukusa',hand:'L',t0:3.5,t1:10,palm:'down'},{o:'kamaLid',hand:'L',t0:5.8,t1:8,palm:'down'},{o:'chakin',hand:'L',t0:11.7,t1:12.5,palm:'down'},
          {o:'chasen',hand:'R',t0:L.end+1,t1:L.end+10,palm:'in'},{o:'bowl',hand:'L',t0:L.end+12,t1:L.end+17,palm:'up'},{o:'chakin',hand:'R',t0:L.end+17,t1:L.end+23.5,palm:'down'}];},
  qs:[['Why lift the whisk?','This is chasen-tōshi: the host checks that no tine is broken, and softens the bamboo in warm water so it does not snap while whisking.'],['Why open the lid with the cloth?','The iron lid is hot. The folded fukusa protects the fingers, and the lid rests on the bamboo futaoki, never on the tatami.']]},
 {title:'Add matcha',jp:'抹茶を入れる',dur:24,pose:POSE_OPEN,
  lines:[[0.5,'I hold the natsume in my left hand and lift the lid with my right, resting it beside the bowl.'],[7,'One scoop of matcha, and then half a scoop. One and a half for thin tea.'],[16,'A light tap of the scoop on the rim, then the lid goes back and the natsume returns to its place.']],
  tracks:[{o:'handL',p:'pos',k:[[0.5,...HL],[1.5,0.12,0.05,0.42],[3,0.04,0.2,0.36],[19,0.04,0.2,0.36],[20.5,0.12,0.05,0.42],[22,...HL]]},
          {o:'natsume',p:'pos',k:[[1.5,...N],[3,0.04,0.17,0.36],[19,0.04,0.17,0.36],[20.5,...N]]},
          {o:'lid',p:'pos',k:[[1.5,...R.lid.pos],[3,0.04,0.222,0.36],[4.5,0.04,0.26,0.36],[6,0.16,0.0,0.56],[16.5,0.16,0.0,0.56],[18,0.04,0.26,0.36],[19,0.04,0.222,0.36],[20.5,...R.lid.pos]]},
          {o:'chashaku',p:'pos',k:[[1.5,...R.chashaku.pos],[3,0.04,0.255,0.36],[4.5,0.04,0.3,0.36],[6,0.16,0.04,0.56],[7,0.1,0.28,0.4],[8,0.05,0.2,0.37],[9.5,0.0,0.16,0.45],[10.3,0.0,0.16,0.45],[11.5,0.05,0.2,0.37],[13,0.0,0.16,0.45],[13.8,0.0,0.16,0.45],[15,0.0,0.1,0.47],[16.5,0.0,0.1,0.47],[18,0.04,0.3,0.36],[19,0.04,0.255,0.36],[20.5,...R.chashaku.pos]]},
          {o:'chashaku',p:'rot',k:[[1.5,0,1.25,0],[3,0,1.25,0],[7,0.5,0.4,0],[8,0.9,0.4,0],[9.5,0.5,0.4,0],[10.3,1.4,0.4,0],[11,0.5,0.4,0],[13,0.5,0.4,0],[13.8,1.4,0.4,0],[14.6,0.5,0.4,0],[15,0.2,0.4,0],[16.5,0.2,0.4,0],[18,0,1.25,0],[20.5,0,1.25,0]]},
          {o:'chashaku',p:'pos',osc:{axis:'y',amp:0.012,freq:2.5,t0:15.2,t1:16}},
          {o:'handR',p:'pos',k:[[0.5,...HR],[1.5,0.12,0.12,0.42],[3,0.06,0.3,0.36],[4.5,0.06,0.33,0.36],[6,0.18,0.07,0.56],[7,0.12,0.31,0.4],[8,0.07,0.24,0.37],[9.5,0.02,0.2,0.45],[10.3,0.02,0.2,0.45],[11.5,0.07,0.24,0.37],[13,0.02,0.2,0.45],[13.8,0.02,0.2,0.45],[15,0.02,0.14,0.47],[16.5,0.02,0.14,0.47],[18,0.06,0.33,0.36],[19,0.06,0.3,0.36],[20.5,0.12,0.12,0.42],[22,...HR]]},
          {o:'handR',p:'pos',osc:{axis:'y',amp:0.012,freq:2.5,t0:15.2,t1:16}},
          {o:'torso',p:'rot',k:[[6,0,0,0],[7.5,0.18,0,0],[16.5,0.18,0,0],[18,0,0,0]]},
          {o:'powder',p:'vis',k:[[10.2,0],[10.3,1]]},
          {o:'powder',p:'scale',k:[[10.3,0.75,0.75,0.75],[13.8,0.75,0.75,0.75],[14.3,1,1,1]]}],
  holds:[{o:'natsume',hand:'L',t0:1.5,t1:20.5,palm:'up'},{o:'lid',hand:'R',t0:1.5,t1:6,palm:'down'},{o:'lid',hand:'R',t0:18,t1:20.5,palm:'down'},{o:'chashaku',hand:'R',t0:1.5,t1:20.5,palm:'in'}],
  qs:[['How much matcha is that?','About 2 grams: one full scoop and a half. For thick tea, koicha, the host uses about three scoops per person.'],['Why tap the scoop?','A light tap on the rim drops the last powder from the scoop into the bowl.']]},
 {title:'Pour hot water',jp:'湯を注ぐ',dur:24,pose:POSE_OPEN,
  init:{powder:1},
  lines:[[0.5,'One ladle of hot water from the kettle, but I pour only part of it into the bowl.'],[9,'About sixty millilitres. Too much water makes thin, weak tea.'],[13,'The rest goes back into the kettle. This is called yugaeshi.']],
  get tracks(){const L=ladle(0.5,'tea',{from:hishakuOnKama,fromRot:-0.35,yugaeshi:true});return [...L.tracks,{o:'powder',p:'vis',k:[[9.3,1],[9.4,0]]}];},
  get holds(){return [ladleHold(0.5,'tea',{from:hishakuOnKama,fromRot:-0.35,yugaeshi:true})];},
  qs:[['How hot is the water?','Just under the boil in the kettle, about eighty degrees by the time it reaches the bowl.'],['Why return water to the kettle?','The host scoops a full ladle so the movement is always the same, then returns what is not needed. Nothing is wasted.']]},
 {title:'Whisk',jp:'点てる',dur:24,pose:POSE_OPEN,
  init:{tea:1},
  lines:[[0.5,'Now I whisk. My left hand holds the bowl; the whisk moves quickly from the wrist, like writing the letter M.'],[10,'Listen to the sound. The foam becomes fine and smooth.'],[15,'At the end I move slowly in a circle and lift the whisk from the centre.']],
  tracks:[{o:'handL',p:'pos',k:[[0.5,...HL],[1.5,-0.09,0.07,0.42],[21,-0.09,0.07,0.42],[22,...HL]]},
          {o:'handR',p:'pos',k:[[0.5,...HR],[1.5,0.24,0.1,0.44],[3,0.0,0.12,0.42],[19,0.0,0.12,0.42],[19.8,0.0,0.22,0.42],[21,0.24,0.1,0.44],[22,...HR]]},
          {o:'chasen',p:'pos',k:[[1.5,...R.chasen.pos],[3,-0.02,0.04,0.42],[19,-0.02,0.04,0.42],[19.8,-0.02,0.14,0.42],[21,...R.chasen.pos]]},
          {o:'chasen',p:'pos',osc:{axis:'z',amp:0.022,freq:5,t0:3,t1:14}},{o:'handR',p:'pos',osc:{axis:'z',amp:0.022,freq:5,t0:3,t1:14}},
          {o:'chasen',p:'pos',osc:{axis:'x',amp:0.01,freq:5,t0:3,t1:14,phase:1.2}},{o:'chasen',p:'rot',osc:{axis:'x',amp:0.22,freq:5,t0:3,t1:14,phase:1.57}},{o:'chasen',p:'rot',osc:{axis:'x',amp:0.12,freq:0.6,t0:14.5,t1:18.5,phase:1.57}},
          {o:'chasen',p:'pos',osc:{axis:'x',amp:0.02,freq:0.6,t0:14.5,t1:18.5}},{o:'chasen',p:'pos',osc:{axis:'z',amp:0.02,freq:0.6,t0:14.5,t1:18.5,phase:1.57}},
          {o:'handR',p:'pos',osc:{axis:'x',amp:0.02,freq:0.6,t0:14.5,t1:18.5}},{o:'handR',p:'pos',osc:{axis:'z',amp:0.02,freq:0.6,t0:14.5,t1:18.5,phase:1.57}},
          {o:'torso',p:'rot',k:[[1.5,0,0,0],[3,0.2,0,0],[19.8,0.2,0,0],[21.5,0,0,0]]},
          {o:'froth',p:'vis',k:[[6,0],[6.1,1]]},{o:'froth',p:'scale',k:[[6.1,0.3,1,0.3],[13,1,1,1]]}],
  holds:[{o:'chasen',hand:'R',t0:1.5,t1:21,palm:'in'}],
  qs:[['Why so fast?','Fast strokes break the powder into the water and build fine foam. Slow stirring leaves lumps.'],['Does the foam matter?','In Urasenke, yes: a smooth layer of small bubbles. Other schools prefer less foam. Both are correct.']]},
 {title:'Serve the bowl',jp:'お出しする',dur:41,pose:POSE_OPEN,
  init:{tea:1,froth:1},
  lines:[[0.5,'Here is your tea. I take the bowl in my right hand and rest it on my left palm.'],[5,'I turn it clockwise twice, a quarter turn each time, so the front faces you.'],[12,'And I place it in front of you. When you drink, turn it back a little, so your lips do not touch the front.'],[21.5,'While you drink, I close the kettle: the chakin aside, the lid back with the fukusa, and the ladle rests on the futaoki again.'],[34.5,'Then I rise onto my knees and stand, to bring fresh water and collect your bowl when you have finished.']],
  tracks:[{o:'handR',p:'pos',k:[[0.5,...HR],[1.5,0.05,0.07,0.42],[3,0.05,0.18,0.46],[11,0.05,0.18,0.46],[13,0.0,0.07,0.6],[14.5,...HR]]},
          {o:'handL',p:'pos',k:[[1.5,...HL],[3,-0.03,0.13,0.46],[11,-0.03,0.13,0.46],[13,-0.09,0.07,0.6],[14.5,...HL]]},
          {o:'bowl',p:'pos',k:[[1.5,...B],[3,0,0.15,0.46],[11,0,0.15,0.46],[13,-0.05,0,0.6]]},
          {o:'bowl',p:'rot',k:[[5,0,0,0],[6.5,0,-1.57,0],[7.5,0,-1.57,0],[9,0,-3.14,0]]},
          {o:'torso',p:'rot',k:[[10,0,0,0],[12.5,0.65,0,0],[13.5,0.65,0,0],[14.5,0.1,0,0],[15,0,0,0],[16.5,0.5,0,0],[19,0.5,0,0],[20.5,0,0,0]]},
          {o:'handL',p:'pos',k:[[15,...HL],[16.5,-0.14,0.02,0.4],[19,-0.14,0.02,0.4],[20.5,...HL]]},
          {o:'handR',p:'pos',k:[[15,...HR],[16.5,0.14,0.02,0.4],[19,0.14,0.02,0.4],[20.5,...HR]]},
          // closing: ladle held, chakin aside, lid back onto the kettle with the fukusa, ladle onto the futaoki
          {o:'handR',p:'pos',k:[[20.5,...HR],[22,...grip(hishakuOnKama,-0.35)],[23.5,...grip([0.12,0.33,0.3],-0.3)],[31,...grip([0.12,0.33,0.3],-0.3)],[32.5,...grip(R.hishaku.pos,-0.3)],[34,...HR]]},
          {o:'hishaku',p:'pos',k:[[22,...hishakuOnKama],[23.5,0.12,0.33,0.3],[31,0.12,0.33,0.3],[32.5,...R.hishaku.pos]]},
          {o:'hishaku',p:'rot',k:[[22,0,-0.35,0],[23.5,0,-0.3,0]]},
          {o:'handL',p:'pos',k:[[22,...HL],[23,-0.2,0.12,0.34],[24,-0.3,0.05,0.27],[25,-0.17,0.44,0.14],[26.5,-0.2,0.1,0.34],[27.5,KAMA[0],0.47,KAMA[2]],[28.5,KAMA[0],0.35,KAMA[2]],[29.5,KAMA[0],0.35,KAMA[2]],[31,-0.17,0.44,0.14],[32,...HL]]},
          {o:'chakin',p:'pos',k:[[23,...CHAKIN_ON_LID],[24,...CHAKIN_ASIDE]]},
          {o:'fukusa',p:'pos',k:[[25,...HIP_L],[26.5,-0.2,0.075,0.34],[28.5,KAMA[0],0.31,KAMA[2]],[29.5,KAMA[0],0.31,KAMA[2]],[31,...HIP_L]]},
          {o:'fukusa',p:'rot',k:[[25,1.57,0.35,0],[26.5,0,0,0],[29.5,0,0,0],[31,1.57,0.35,0]]},
          {o:'fukusa',p:'scale',k:[[25,...FUK_TUCKED],[26.5,...FUK_PAD],[29.5,...FUK_PAD],[31,...FUK_TUCKED]]},
          {o:'kamaLid',p:'pos',k:[[26.5,...KAMALID_ON_FUTAOKI],[27.5,KAMA[0],0.44,KAMA[2]],[28.5,...KAMALID_ON_KAMA]]},
          {o:'torso',p:'rot',k:[[25,0,0,0],[26.5,0.12,0,0.2],[29.5,0.12,0,0.2],[31,0,0,0]]},
          {o:'legs',p:'pos',k:[[34.5,0,0,0],[36.5,1,0,0],[37.5,1,0,0],[40,2,0,0]]},
          {o:'handL',p:'pos',k:[[34.5,...HL],[36.5,-0.12,0.58,0.3],[37.5,-0.12,0.58,0.3],[40,-0.18,0.8,0.06]]},{o:'handR',p:'pos',k:[[34.5,...HR],[36.5,0.12,0.58,0.3],[37.5,0.12,0.58,0.3],[40,0.18,0.8,0.06]]},
          {o:'torso',p:'rot',k:[[34.5,0,0,0],[35.5,0.15,0,0],[36.5,0,0,0],[38.5,0.12,0,0],[40,0,0,0]]}],
  holds:[{o:'bowl',hand:'L',t0:1.5,t1:13,palm:'up'},{o:'hishaku',hand:'R',t0:22,t1:32.5,palm:'in'},{o:'chakin',hand:'L',t0:23,t1:24,palm:'down'},{o:'fukusa',hand:'L',t0:25,t1:31,palm:'down'},{o:'kamaLid',hand:'L',t0:26.5,t1:28.5,palm:'down'}],
  qs:[['What do I say when I receive it?','Bow slightly and say "Otemae chōdai itashimasu": I gratefully receive your tea. In English, a simple thank you is welcome.'],['How do I drink?','Lift the bowl with your right hand, rest it on your left palm, turn it a little clockwise, and drink in about three sips. Turn it back and return it.']]},
 {title:'Your turn: whisk!',jp:'あなたの番',dur:0,interactive:true,pose:POSE_CLOSED,
  init:{tea:1},
  lines:[[0,'Now you try. Move your pointer quickly over the bowl to whisk the tea until the foam is smooth.']],
  tracks:[],holds:[],
  qs:[['What am I doing right?','Keep the whisk upright and move your wrist, not your arm. Quick and light is better than strong.'],['What if the foam is uneven?','Finish with one slow circle and lift the whisk from the centre of the bowl. The big bubbles disappear.']]},
];
// materialise getter-based tracks once
STEPS.forEach(s=>{const tr=s.tracks;Object.defineProperty(s,'tracks',{value:tr,writable:true});const hd=s.holds||[];Object.defineProperty(s,'holds',{value:hd,writable:true});});

// ---------- step player ----------
const ui={pills:document.getElementById('pills'),title:document.getElementById('stepTitle'),jp:document.getElementById('stepJp'),line:document.getElementById('line'),hint:document.getElementById('hint'),prog:document.getElementById('prog'),next:document.getElementById('next'),back:document.getElementById('back'),repeat:document.getElementById('repeat'),qs:document.getElementById('qs'),meter:document.getElementById('meter'),meterFill:document.getElementById('meterFill'),meterText:document.getElementById('meterText')};
let step=0,t=0,playing=false,lineIdx=0,voiceOn=false,finished=false;
const game={meter:0,done:false,lastP:null,drinking:false,drinkT:0,thanked:false};
STEPS.forEach((s,i)=>{const b=document.createElement('button');b.className='pill';b.textContent=i+1;b.title=s.title;b.setAttribute('role','listitem');b.addEventListener('click',()=>loadStep(i));ui.pills.appendChild(b);});
function speak(text){if(!voiceOn||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=0.92;const v=speechSynthesis.getVoices().find(v=>/en/i.test(v.lang));if(v)u.voice=v;speechSynthesis.speak(u);}catch(e){}}
function applyInit(s){if(s.init){for(const k in s.init)O[k].visible=!!s.init[k];}if(s.pose){for(const k in s.pose){const q=s.pose[k];if(q.pos)setPos(objs[k],q.pos);if(q.rot)objs[k].rotation.set(...q.rot);}}}
// hold offsets: where the object sits relative to the hand at the moment it is picked up
function prepareHolds(s){for(const h of s.holds){if(h.off)continue;resetRest();applyInit(s);applyTracks(s.tracks,h.t0);const arm=h.hand==='L'?armL:armR;h.off=O[h.o].position.clone().sub(arm.pos);}resetRest();}
function applyHolds(s,time){if(s.interactive)return;for(const h of s.holds){if(time>=h.t0&&time<=h.t1&&h.off){const arm=h.hand==='L'?armL:armR;O[h.o].position.copy(arm.pos).add(h.off);}}}
function setPalms(s,time){armL.palm='down';armR.palm='down';if(s.interactive){armR.palm='in';return;}for(const h of s.holds){if(time>=h.t0&&time<=h.t1&&h.palm){(h.hand==='L'?armL:armR).palm=h.palm;}}}
function loadStep(i){
  step=Math.max(0,Math.min(STEPS.length-1,i));const s=STEPS[step];t=0;lineIdx=0;playing=!s.interactive;finished=false;
  const d=document.getElementById('drink');if(d)d.remove();seqI=-1;seqBtn=null;sipN=0;pose=[0,0,0];poseFrom=[0,0,0];poseT=1;phase=-1;setGlow(null);tweens.length=0;busy=false;if(Object.keys(GUEST_HOME).length){for(const k in GUEST_HOME){O[k].position.copy(GUEST_HOME[k].pos);O[k].rotation.copy(GUEST_HOME[k].rot);}O.sweets.forEach(sw=>{if(sw.parent!==O.kashiki)O.kashiki.attach(sw);sw.visible=true;sw.scale.set(1,0.7,1);sw.position.set(sw.userData.hx,0.028,sw.userData.hz);});}
  prepareHolds(s);resetRest();applyInit(s);
  if(s.interactive){O.bowl.position.set(-0.05,0,0.62);O.bowl.rotation.set(0,Math.PI,0);O.chasen.position.set(0.07,0,0.66);game.meter=0;game.done=false;game.drinking=false;game.thanked=false;ui.meter.classList.add('on');ui.meterFill.style.width='0%';goCam('close');cam.goal.target.set(-0.05,0.08,0.75);cam.goal.r=0.95;cam.goal.phi=1.0;ui.next.textContent='Start again';ui.next.classList.remove('pulse');startGuest();}
  else{ui.meter.classList.remove('on');ui.next.textContent='Next';ui.next.classList.remove('pulse');}
  ui.title.textContent=`Step ${step+1} · ${s.title}`;ui.jp.textContent=s.jp;ui.line.textContent='';ui.prog.style.width='0%';ui.hint.textContent='Drag to look around · scroll or pinch to zoom';
  [...ui.pills.children].forEach((p,j)=>{p.toggleAttribute('aria-current',false);if(j===step)p.setAttribute('aria-current','step');p.classList.toggle('done',j<step);});
  ui.back.disabled=step===0;
  ui.qs.innerHTML='';for(const [q,a] of s.qs){const dq=document.createElement('div');dq.className='q';const b=document.createElement('button');b.textContent=q;const ans=document.createElement('div');ans.className='a';ans.textContent=a;ans.hidden=true;b.addEventListener('click',()=>{ans.hidden=!ans.hidden;if(!ans.hidden)speak(a);});dq.append(b,ans);ui.qs.appendChild(dq);}
  try{speechSynthesis&&speechSynthesis.cancel();}catch(e){}
  if(s.interactive){setPhase(0);}
}
ui.next.addEventListener('click',()=>{if(STEPS[step].interactive){loadStep(0);goCam('guest');}else loadStep(step+1);});
ui.back.addEventListener('click',()=>loadStep(step-1));
ui.repeat.addEventListener('click',()=>loadStep(step));
document.getElementById('camGuest').addEventListener('click',()=>goCam('guest'));
document.getElementById('camClose').addEventListener('click',()=>goCam('close'));
document.getElementById('camTop').addEventListener('click',()=>goCam('top'));
const voiceBtn=document.getElementById('voice');
voiceBtn.addEventListener('click',()=>{voiceOn=!voiceOn;voiceBtn.setAttribute('aria-pressed',String(voiceOn));voiceBtn.textContent='Voice: '+(voiceOn?'on':'off');if(!voiceOn){try{speechSynthesis.cancel();}catch(e){}}else if(!('speechSynthesis'in window)){voiceBtn.textContent='Voice: not available';}});
document.getElementById('askToggle').addEventListener('click',()=>document.getElementById('ask').classList.toggle('open'));
const guestPanel=document.getElementById('guest');
document.getElementById('guestToggle').addEventListener('click',()=>{guestPanel.hidden=!guestPanel.hidden;});
document.getElementById('guestClose').addEventListener('click',()=>{guestPanel.hidden=true;});
document.getElementById('start').addEventListener('click',()=>{document.getElementById('intro').hidden=true;loadStep(0);});
addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON'&&e.key!=='Escape')return;if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();ui.next.click();}else if(e.key==='ArrowLeft'){ui.back.click();}else if(e.key.toLowerCase()==='r'){ui.repeat.click();}});

// ---------- pointer: orbit, tap-to-identify, whisk game ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),tip=document.getElementById('tip');
let drag=null,pinch=null,moved=0;
function pointerNDC(e){const r=canvas.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,id:e.pointerId};moved=0;canvas.classList.add('grabbing');tip.hidden=true;});
canvas.addEventListener('pointermove',e=>{
  if(STEPS[step].interactive&&phase===2&&!game.done)whiskInput(e);
  if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;
  if(STEPS[step].interactive&&phase===2&&!game.done)return;
  cam.goal=null;cam.theta-=dx*0.005;cam.phi=Math.max(0.2,Math.min(1.45,cam.phi-dy*0.005));});
canvas.addEventListener('pointerup',e=>{canvas.classList.remove('grabbing');if(drag&&moved<6){pointerNDC(e);ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects(clickable,false)[0];if(hit&&STEPS[step].interactive&&guestClick(hit.object)){drag=null;return;}if(hit){const u=hit.object.userData;tip.innerHTML=`<b>${u.name} <span style="font-weight:400">${u.jp}</span></b><small>${u.desc}</small>`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.hidden=false;speak(u.name+'. '+u.desc);}}drag=null;});
canvas.addEventListener('pointercancel',()=>{drag=null;canvas.classList.remove('grabbing');});
canvas.addEventListener('wheel',e=>{e.preventDefault();cam.goal=null;cam.r=Math.max(0.4,Math.min(3.5,cam.r*(1+e.deltaY*0.001)));},{passive:false});
canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);}},{passive:true});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinch){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);cam.goal=null;cam.r=Math.max(0.4,Math.min(3.5,cam.r*(pinch/d)));pinch=d;drag=null;}},{passive:true});
canvas.addEventListener('touchend',()=>{pinch=null;},{passive:true});
const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-0.05),hitP=new THREE.Vector3();
function whiskInput(e){pointerNDC(e);ray.setFromCamera(ndc,camera);if(!ray.ray.intersectPlane(plane,hitP))return;const cx=O.bowl.position.x,cz=O.bowl.position.z;let dx=hitP.x-cx,dz=hitP.z-cz;const d=Math.hypot(dx,dz);if(d>0.045){dx*=0.045/d;dz*=0.045/d;}
  O.chasen.position.set(cx+dx,0.045,cz+dz);armR.pos.set(cx+dx+0.02,0.17,cz+dz);
  if(game.lastP){const sp=Math.hypot(hitP.x-game.lastP.x,hitP.z-game.lastP.z);if(d<0.07)game.meter=Math.min(1,game.meter+sp*1.6);}game.lastP=hitP.clone();
  ui.meterFill.style.width=(game.meter*100).toFixed(0)+'%';O.froth.visible=game.meter>0.08;O.froth.scale.set(Math.min(1,game.meter*1.1),1,Math.min(1,game.meter*1.1));
  if(game.meter>=1&&!game.done){game.done=true;ui.meterText.textContent='Beautiful foam. Now drink: turn the bowl a little and take three sips.';ui.line.textContent='Well done. Turn the bowl slightly clockwise, drink in three sips, and turn it back.';speak(ui.line.textContent);const b=document.createElement('button');b.className='btn primary';b.textContent='Drink';b.id='drink';b.addEventListener('click',()=>{startDrinkSeq();});document.querySelector('.ctrl').prepend(b);}}
// ---------- guest phases: fan greeting → sweet → whisk → drink ----------
const tweens=[];
function tween(o,to,dur,done){const from={pos:o.position.clone(),rot:o.rotation.clone(),scale:o.scale.clone()};tweens.push({o,from,to,dur,t:0,done});}
function runTweens(dt){for(let i=tweens.length-1;i>=0;i--){const w=tweens[i];w.t=Math.min(1,w.t+dt/w.dur);const u=ease(w.t);const o=w.o;
  if(w.to.pos){o.position.lerpVectors(w.from.pos,new THREE.Vector3(...w.to.pos),u);if(w.to.arc)o.position.y+=Math.sin(u*Math.PI)*w.to.arc;}
  if(w.to.rot){o.rotation.set(w.from.rot.x+(w.to.rot[0]-w.from.rot.x)*u,w.from.rot.y+(w.to.rot[1]-w.from.rot.y)*u,w.from.rot.z+(w.to.rot[2]-w.from.rot.z)*u);}
  if(w.to.scale){o.scale.set(w.from.scale.x+(w.to.scale[0]-w.from.scale.x)*u,w.from.scale.y+(w.to.scale[1]-w.from.scale.y)*u,w.from.scale.z+(w.to.scale[2]-w.from.scale.z)*u);}
  if(w.t>=1){tweens.splice(i,1);if(w.done)w.done();}}}
const GUEST_HOME={};let phase=-1,phaseBtn=null,glow=null;
const PHASES=[
 {text:'You are the guest now. First the greeting: lay your closed fan in front of your knees and bow to the host.',btn:'Greet with the fan',item:'sensu',say:'Yoroshiku onegai itashimasu.'},
 {text:'Now the sweet. Take one nerikiri from the dish onto your kaishi, cut it with the kuromoji and eat it in three bites.',btn:'Take the sweet',item:'sweet'},
 {text:'Now you whisk. Move your pointer quickly over the bowl until the foam is smooth.',btn:null,item:null}];
function startGuest(){for(const k of ['sensu','kaishi','kuromoji','kobukusa'])if(!GUEST_HOME[k])GUEST_HOME[k]={pos:O[k].position.clone(),rot:O[k].rotation.clone()};
  for(const k in GUEST_HOME){O[k].position.copy(GUEST_HOME[k].pos);O[k].rotation.copy(GUEST_HOME[k].rot);}
  O.sweets.forEach(sw=>{if(sw.parent!==O.kashiki){O.kashiki.attach(sw);}sw.visible=true;sw.scale.set(1,0.7,1);sw.position.set(sw.userData.hx??(sw.userData.hx=sw.position.x),0.028,sw.userData.hz??(sw.userData.hz=sw.position.z));});
  tweens.length=0;busy=false;}
let busy=false;
function setGlow(o){if(glow){glow.material.emissive.setHex(0);glow=null;}if(o){if(!o.userData.ownMat){o.material=o.material.clone();o.userData.ownMat=true;}o.material.emissive.setHex(0x3a6a2a);glow=o;}}
function setPhase(i){phase=i;const ph=PHASES[i];const old=document.getElementById('drink');if(old)old.remove();phaseBtn=null;
  ui.line.textContent=ph.text;speak(ph.text);ui.meter.querySelector('.bar').style.display=i===2?'':'none';ui.meterText.textContent=i===2?'Move your pointer quickly over the bowl to whisk.':'Tap the glowing item, or use the button.';
  if(ph.btn){phaseBtn=document.createElement('button');phaseBtn.className='btn primary';phaseBtn.id='drink';phaseBtn.textContent=ph.btn;phaseBtn.addEventListener('click',()=>doPhase());document.querySelector('.ctrl').prepend(phaseBtn);}
  setGlow(i===0?O.sensu:i===1?O.sweets[0]:null);
  if(i===2){cam.goal={target:new THREE.Vector3(-0.05,0.05,0.62),theta:0.4,phi:0.9,r:0.7};}}
function guestClick(obj){if(busy)return false;
  if(phase===0&&obj===O.sensu){doPhase();return true;}
  if(phase===1&&(obj===O.kaishi||obj===O.kuromoji||O.sweets.includes(obj)||obj.userData.name==='Kashiki')){doPhase();return true;}
  if(seqI===6&&obj===O.kobukusa&&!game.kobukusaUsed){useKobukusa();return true;}
  return false;}
function doPhase(){if(busy)return;busy=true;if(phaseBtn)phaseBtn.disabled=true;
  if(phase===0){const ph=PHASES[0];cam.goal={target:new THREE.Vector3(0,0.1,0.85),theta:0,phi:1.0,r:0.9};
    tween(O.sensu,{pos:[0,0.012,0.98],rot:[0,0,0],arc:0.08},1.2,()=>{speak(ph.say);let b=0;const nod=setInterval(()=>{b+=0.05;cam.goal=null;cam.phi=1.0+Math.sin(Math.min(1,b)*Math.PI)*0.3;if(b>=1){clearInterval(nod);busy=false;setPhase(1);}},40);});}
  else if(phase===1){const sw=O.sweets[0];scene.attach(sw);
    tween(O.kaishi,{pos:[0.02,0.045,0.9],rot:[0,0,0],arc:0.05},0.9,()=>{
      tween(sw,{pos:[0.02,0.07,0.9],arc:0.12},1.1,()=>{
        tween(O.kuromoji,{pos:[0.02,0.1,0.86],rot:[0.9,0,0],arc:0.06},0.8,()=>{let bite=0;const eat=()=>{bite++;
          tween(O.kuromoji,{pos:[0.02,0.078,0.9]},0.35,()=>{tween(sw,{scale:[1-bite*0.33,0.7*(1-bite*0.3),1-bite*0.33]},0.3,()=>{
            tween(O.kuromoji,{pos:[0.02,0.16,0.84]},0.45,()=>{if(bite<3)eat();else{sw.visible=false;tween(O.kuromoji,{pos:[0.1,0.052,0.92],rot:[0,0.1,0]},0.7,()=>{busy=false;setPhase(2);});}});});});};eat();});});});}}
function useKobukusa(){game.kobukusaUsed=true;setGlow(null);tween(O.kobukusa,{pos:[-0.05,0.004,0.62],rot:[0,0,0],arc:0.06},0.9,()=>{poseFrom=pose.slice();pose=[0.008,0,0];poseT=0;ui.line.textContent='The bowl rests on your kobukusa. Hold it low over your knees and look at the glaze, the foot, the front. Then return it with a bow.';speak(ui.line.textContent);});}
// guided guest sequence: each stage = prompt text, button label, and a bowl pose (y lift, x tilt toward guest, extra y rotation)
const DRINK=[
  {text:'First, bow to the host and say: “Otemae chōdai itashimasu” – I gratefully receive your tea.',btn:'Bow',pose:[0,0,0],say:'Otemae chōdai itashimasu.'},
  {text:'Pick the bowl up with your right hand, rest it on your left palm, and raise it a little in thanks.',btn:'Lift the bowl',pose:[0.18,0,0]},
  {text:'Turn the bowl clockwise, two small turns, so you do not drink from its front.',btn:'Turn it',pose:[0.18,0,-1.2]},
  {text:'Drink in about three sips. On the last sip, a small slurp tells the host you have finished.',btn:'Sip',pose:[0.24,-0.5,-1.2],sips:3},
  {text:'Wipe the rim where your lips touched with your thumb and finger, then wipe your fingers on your kaishi.',btn:'Wipe the rim',pose:[0.18,0,-1.2]},
  {text:'Turn the bowl back so the front faces the host again.',btn:'Turn it back',pose:[0.18,0,0]},
  {text:'Place it down outside the edge of your mat. For haiken, tap your kobukusa to put it under the bowl, then look at the glaze and the foot.',btn:'Place and admire',pose:[0,0,0],glow:'kobukusa'},
  {text:'Thank you for the tea. Gochisōsama deshita. That is the end of the ceremony.',btn:null,pose:[0,0,0]}];
let seqI=-1,seqBtn=null,sipN=0,pose=[0,0,0],poseFrom=[0,0,0],poseT=1;
function startDrinkSeq(){setGlow(null);seqI=-1;sipN=0;cam.goal={target:new THREE.Vector3(-0.05,0.2,0.62),theta:0.2,phi:1.3,r:0.6};const d=document.getElementById('drink');if(d)d.remove();ui.meter.classList.remove('on');seqBtn=document.createElement('button');seqBtn.className='btn primary';seqBtn.id='drink';seqBtn.addEventListener('click',advanceSeq);document.querySelector('.ctrl').prepend(seqBtn);advanceSeq();}
function advanceSeq(){const cur=DRINK[seqI];if(cur&&cur.sips&&sipN<cur.sips-1){sipN++;poseFrom=pose.slice();pose=[cur.pose[0],cur.pose[1]-0.05*sipN,cur.pose[2]];poseT=0;seqBtn.textContent=`Sip ${sipN+1} of ${cur.sips}`;if(sipN===cur.sips-1)seqBtn.textContent='Last sip (slurp)';return;}
  seqI++;sipN=0;const st=DRINK[seqI];if(!st)return;ui.line.textContent=st.text;speak(st.say||st.text);poseFrom=pose.slice();pose=st.pose.slice();poseT=0;setGlow(st.glow?O[st.glow]:null);if(seqI===6)game.kobukusaUsed=false;
  if(st.btn){seqBtn.textContent=st.sips?'Sip 1 of 3':st.btn;}else{seqBtn.remove();seqBtn=null;game.thanked=true;ui.meterText.textContent='';ui.next.classList.add('pulse');ui.hint.textContent='Press Start again to watch the whole procedure once more.';}}

// ---------- secondary motion: gaze, lean, breathing, grip, pouring ----------
const focus=new THREE.Vector3(0,0.15,0.45),focusGoal=new THREE.Vector3(),headQ=new THREE.Quaternion(),headTarget=new THREE.Object3D(),tools=[];
let breath=0,lean=new THREE.Vector2();
function toolList(){if(!tools.length)tools.push(O.chasen,O.chashaku,O.hishaku,O.fukusa,O.chakin,O.lid,O.natsume,O.bowl);return tools;}
function secondary(dt){
  // hand velocities → the busier hand is where the host looks
  for(const a of [armL,armR]){a.vel=a.prev.distanceTo(a.pos)/Math.max(dt,1e-3);a.prev.copy(a.pos);}
  const busy=armR.vel>armL.vel?armR:armL;const moving=busy.vel>0.03;
  const s=STEPS[step];
  if(s.interactive){focusGoal.set(O.bowl.position.x,O.bowl.position.y+0.05,O.bowl.position.z);}
  else if(moving||busy.pos.y<0.26){focusGoal.copy(busy.pos);}
  else{focusGoal.set(0,0.1,0.55);} // resting: eyes toward the utensils, slightly down
  if(torso.rotation.x>0.2)focusGoal.set(0,-0.2,0.4); // bowing: eyes down
  focus.lerp(focusGoal,1-Math.pow(0.02,dt));
  // head: look at focus, limited to a natural range
  const hg=O.headG;hg.getWorldPosition(headTarget.position);headTarget.lookAt(focus);
  const parentQ=torso.getWorldQuaternion(new THREE.Quaternion());const localQ=parentQ.invert().multiply(headTarget.quaternion);
  headQ.identity().slerp(localQ,0.55);hg.quaternion.slerp(headQ,1-Math.pow(0.01,dt));
  // torso lean toward the work, added on top of any bow in the tracks
  const lx=Math.max(-0.08,Math.min(0.14,(focus.z-0.3)*0.35)),lz=Math.max(-0.1,Math.min(0.1,-focus.x*0.25));
  lean.x+=(lx-lean.x)*(1-Math.pow(0.02,dt));lean.y+=(lz-lean.y)*(1-Math.pow(0.02,dt));
  torso.rotation.x+=lean.x;torso.rotation.z+=lean.y;
  // breathing
  breath+=dt;torso.scale.set(1,1+Math.sin(breath*1.1)*0.006,1);
  // grip: fingers close when a tool is in the hand
  for(const a of [armL,armR]){let near=0;for(const o of toolList()){const d=a.pos.distanceTo(o.position);if(d<0.09)near=Math.max(near,1-Math.max(0,d-0.04)/0.05);}
    a.grip+=(near-a.grip)*(1-Math.pow(0.001,dt));a.fingers.rotation.x=0.25+a.grip*1.2;a.thumb.rotation.y=a.side*(0.6+a.grip*0.7);}
  // pour stream: while the ladle is tilted over something, water falls from the cup
  const h=O.hishaku,tilt=Math.abs(h.rotation.z);const st=O.stream;
  if(tilt>0.45&&!s.interactive){const over=h.position.z>0.3?O.bowl.position:new THREE.Vector3(KAMA[0],0.26,KAMA[2]);const top=h.position.y-0.02,bottom=Math.max(over.y+0.03,top-0.25);st.visible=true;st.position.set(h.position.x-0.015,(top+bottom)/2,h.position.z);st.scale.set(1,Math.max(0.01,top-bottom),1);st.material.opacity=0.7*Math.min(1,(tilt-0.45)/0.3);}
  else st.visible=false;
  // liquids rise instead of appearing
  for(const o of [O.water,O.tea]){if(o.visible){o.userData.r=Math.min(1,(o.userData.r||0.1)+dt*1.6);o.scale.set(1,o.userData.r,1);o.position.y=0.024+0.006*o.userData.r;}else o.userData.r=0.1;}
}

// ---------- main loop ----------
const clock=new THREE.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),0.05);const s=STEPS[step];
  if(playing){t+=dt;const d=s.dur;ui.prog.style.width=Math.min(100,t/d*100)+'%';
    while(lineIdx<s.lines.length&&t>=s.lines[lineIdx][0]){ui.line.textContent=s.lines[lineIdx][1];speak(s.lines[lineIdx][1]);lineIdx++;}
    resetRest();applyInit(s);applyTracks(s.tracks,t);
    if(t>=d){playing=false;finished=true;if(step<STEPS.length-1)ui.next.classList.add('pulse');ui.hint.textContent=step<STEPS.length-1?'Press Next for the next step, or Repeat to watch again.':'';}
  }else if(finished){resetRest();applyInit(s);applyTracks(s.tracks,s.dur);}
  else if(s.interactive){armL.pos.set(...HL);if(!game.done&&!game.lastP)armR.pos.set(...HR);}
  if(s.interactive&&seqI>=0){poseT=Math.min(1,poseT+dt/0.9);const u=ease(poseT);const L=(a,b)=>a+(b-a)*u;O.bowl.position.y=L(poseFrom[0],pose[0]);O.bowl.rotation.x=L(poseFrom[1],pose[1]);O.bowl.rotation.y=Math.PI+L(poseFrom[2],pose[2]);
    if(DRINK[seqI]&&DRINK[seqI].btn==='Bow'){const bowU=Math.sin(Math.min(1,poseT)*Math.PI);cam.phi=Math.min(1.45,1.3+bowU*0.12);}}
  runTweens(dt);
  O.kamaWater.scale.set(1+Math.sin(performance.now()/400)*0.01,1,1-Math.sin(performance.now()/400)*0.01);
  O.steam.children.forEach((p,i)=>{const k=((performance.now()/1000)*0.5+p.userData.o)%1;p.position.set(Math.sin(k*6+i)*0.02,k*0.25,0);p.material.opacity=0.25*(1-k);p.scale.setScalar(0.6+k);});
  if(cam.goal){const g=cam.goal,k=1-Math.pow(0.001,dt);cam.target.lerp(g.target,k);cam.theta+=(g.theta-cam.theta)*k;cam.phi+=(g.phi-cam.phi)*k;cam.r+=(g.r-cam.r)*k;if(Math.abs(cam.r-g.r)<0.002&&cam.target.distanceTo(g.target)<0.002)cam.goal=null;}
  applyCam();
  setLegs(legsObj.position.x);secondary(dt);setPalms(s,Math.min(t,s.dur));
  placeArm(armL);placeArm(armR);
  if(playing||finished)applyHolds(s,Math.min(t,s.dur));
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
resize();resetRest();applyCam();loadStep(0);playing=false;frame();
window.__sado={go:(i,time)=>{loadStep(i);if(time!=null){t=time;}},cam,dbg:()=>({phase,busy,tw:tweens.length,sw:O.sweets[0].position.toArray(),ka:O.kaishi.position.toArray()})};