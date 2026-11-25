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
