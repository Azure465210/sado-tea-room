// ---------- rest pose & helpers ----------
const REST_ROT=1.36,ONKAMA_ROT=0.8,DIP_ROT=0.3;   // point the kettle handle toward the right hand for a shallower reach across the chest
const HIP_L=h2s(...HAND.hip(1));        // where the fukusa hangs from the obi: her left hip
// the tucked packet's orientation (P-frame) at the obi: its long side hangs down along the hip, its face toward her left
const FUK_OBI_EULER=(()=>{const a=-20*Math.PI/180,U=new THREE.Vector3(0,-1,0),V=new THREE.Vector3(-Math.sin(a),0,Math.cos(a)),Nn=new THREE.Vector3(-Math.cos(a),0,-Math.sin(a));
  const m=new THREE.Matrix4().makeBasis(U,Nn.clone().negate(),V);const e=new THREE.Euler().setFromRotationMatrix(m);return [e.x,e.y,e.z];})();
// the scoop rides in on the bowl, across its rim, face down, tip to her left (it is taken from the bowl for its wiping)
const CHASHAKU_ON_BOWL=[-0.01,0.082,0.4],CHASHAKU_ON_BOWL_ROT=[0,2.62,Math.PI];   // its node end toward her right hand, so it is taken without a deep bow
const KAMALID_ON_KAMA=[KAMA[0],0.285,KAMA[2]],KAMALID_ON_FUTAOKI=[FUTA[0],0.058,FUTA[2]];
const CHAKIN_IN_BOWL=[-0.02,0.03,0.42],CHAKIN_ON_LID=[FUTA[0],0.072,FUTA[2]-0.01],CHAKIN_ASIDE=[-0.3,0.006,0.27];
const KASHIKI_HOME=[0.36,0,0.36],KASHIKI_SERVED=[0.4,0,0.5];
const REST={
  bowl:{pos:[-0.02,0,0.42],rot:[0,0,0]},
  chasen:{pos:[0.24,0,0.44],rot:[0,0,0]},
  natsume:{pos:[0.12,0,0.42],rot:[0,0,0]},
  lid:{pos:[0.12,0.052,0.42],rot:[0,0,0]},
  chashaku:{pos:[0.12,0.085,0.42],rot:[0,1.25,0]},
  hishaku:{pos:[FUTA[0],0.07,FUTA[2]],rot:[0,REST_ROT,-0.18]},   // on the lid rest, handle toward her left knee, its end on the tatami
  fukusa:{pos:[...HIP_L],rot:FUK_OBI_EULER},
  chakin:{pos:CHAKIN_IN_BOWL,rot:[0,0,0]},
  kamaLid:{pos:KAMALID_ON_KAMA,rot:[0,0,0]},
  kashiki:{pos:KASHIKI_HOME,rot:[0,0,0]},
  handL:{pos:h2s(...HAND.rest(1))},handR:{pos:h2s(...HAND.rest(-1))},
  torso:{rot:[0,0,0]},
  legs:{pos:[0,0,0]},
};
const objs={bowl:O.bowl,chasen:O.chasen,natsume:O.natsume,lid:O.lid,chashaku:O.chashaku,hishaku:O.hishaku,fukusa:O.fukusa,chakin:O.chakin,kamaLid:O.kamaLid,kashiki:O.kashiki,handL:armL,handR:armR,torso,legs:legsObj};
// scene state once the kettle is open and the sweets are out (steps after the lid opening)
const POSE_OPEN={kamaLid:{pos:KAMALID_ON_FUTAOKI},chakin:{pos:CHAKIN_ON_LID},hishaku:{pos:hishakuOnKama_,rot:[0,ONKAMA_ROT,0]},kashiki:{pos:KASHIKI_SERVED}};
const POSE_SWEETS={kashiki:{pos:KASHIKI_SERVED}};
// before the tea making starts, the bowl, the tea container and the whisk wait a little further out (so the host can bow with her hands in front of her knees)
const PRE=0.2,pre=p=>[p[0],p[1],p[2]+PRE];
const POSE_PRE={bowl:{pos:pre(REST.bowl.pos)},natsume:{pos:pre(REST.natsume.pos)},lid:{pos:pre(REST.lid.pos)},chashaku:{pos:pre(CHASHAKU_ON_BOWL),rot:CHASHAKU_ON_BOWL_ROT},chasen:{pos:pre(REST.chasen.pos)},chakin:{pos:pre(CHAKIN_IN_BOWL)}};
const POSE_CLOSED={kashiki:{pos:KASHIKI_SERVED},chakin:{pos:CHAKIN_ASIDE}};
function setPos(o,v){if(o.pos)o.pos.set(v[0],v[1],v[2]);else o.position.set(v[0],v[1],v[2]);}
function getPos(o){return o.pos||o.position;}
function resetRest(){for(const k in REST){const o=objs[k],r=REST[k];if(r.pos)setPos(o,r.pos);if(r.rot&&o.rotation)o.rotation.set(...r.rot);if(r.scale)o.scale.set(...r.scale);}
  armL.look=null;armR.look=null;
  O.water.visible=O.tea.visible=O.froth.visible=O.powder.visible=false;O.powder.scale.set(1,1,1);O.froth.scale.set(1,1,1);}
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);
function sample(keys,t){if(t<keys[0][0])return null;if(t===keys[0][0])return keys[0].slice(1);for(let i=1;i<keys.length;i++){if(t<=keys[i][0]){const a=keys[i-1],b=keys[i];const u=ease((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u);}}return keys[keys.length-1].slice(1);}
function applyTracks(tracks,t,tOsc){if(tOsc==null)tOsc=t;
  for(const tr of tracks){
    const o=objs[tr.o]||O[tr.o];
    if(tr.osc){const s=tr.osc;if(t<s.t0||t>s.t1)continue;const to=Math.max(s.t0,Math.min(s.t1,tOsc));const fade=Math.min(1,(to-s.t0)/0.4,(s.t1-to)/0.4);const v=Math.sin((to-s.t0)*s.freq*Math.PI*2+(s.phase||0))*s.amp*fade;(tr.p==='rot'?o.rotation:getPos(o))[s.axis]+=v;continue;}
    const v=sample(tr.k,t);if(!v)continue;
    if(tr.p==='pos'){const k=tr.k;for(let i=1;i<k.length;i++){if(t<=k[i][0]){const a=k[i-1],b=k[i];if(t>a[0]){const u=(t-a[0])/(b[0]-a[0]);const dx=b[1]-a[1],dz=b[3]-a[3],dist=Math.hypot(dx,dz);if(dist>0.07){v[1]+=Math.sin(u*Math.PI)*Math.min(0.06,dist*0.3);}}break;}}setPos(o,v);}else if(tr.p==='rot')o.rotation.set(v[0],v[1],v[2]);
    else if(tr.p==='vis')o.visible=v[0]>0.5;else if(tr.p==='scale')o.scale.set(v[0],v[1],v[2]);
  }
}
const R=REST,HR=R.handR.pos,HL=R.handL.pos,B=R.bowl.pos,N=R.natsume.pos,KT=[KAMA[0],0.3,KAMA[2]];
// in the purification the natsume stands just in front of her right knee, where the left hand takes it without bowing; it goes to its place N at the end of the step
const N2=[0.07,0,0.3],N2L=[N2[0],0.052,N2[2]],N2C=[N2[0],0.085,N2[2]];
// body-relative hand places (see HAND in the host section), in stage coordinates
const KNL=h2s(...HAND.knee(1)),KNR=h2s(...HAND.knee(-1));     // palms on the knees
const FTL=h2s(...HAND.flat(1)),FTR=h2s(...HAND.flat(-1));     // palms flat on the tatami, index fingers touching: the formal bow (shin)
const TPL=h2s(...HAND.tips(1)),TPR=h2s(...HAND.tips(-1));     // fingertips only, each hand by its own knee: the light bow (so)
const FLL=h2s(...HAND.floor(1)),FLR=h2s(...HAND.floor(-1));   // fingertips on the tatami in front of the knees, index fingers touching
const KZL=h2s(...HAND.kiza(1)),KZR=h2s(...HAND.kiza(-1));     // up on the knees
const STL=h2s(...HAND.stand(1)),STR=h2s(...HAND.stand(-1));   // standing
const NB=-0.12;                                               // moves a mid-air point back toward her body (she sits HOST_Z behind the stage origin)
// kagami-bishaku: the ladle held upright in front of her in the LEFT hand, cup up and facing her like a hand mirror
const KAG=h2s(0.0,0.5,0.3),KAG_ROT=1.57,KAG_TILT=-1.5,KAG_HAND=[KAG[0],KAG[1]-0.17,KAG[2]];
const KAG_OUT=h2s(0.02,0.4,0.5),KAG_OUT_ROT=1.25;             // where the right hand takes it over, level, before scooping
// shift a block of choreography later in time
function later(dt,tracks){return tracks.map(tr=>tr.osc?{...tr,osc:{...tr.osc,t0:tr.osc.t0+dt,t1:tr.osc.t1+dt}}:{...tr,k:tr.k.map(k=>[k[0]+dt,...k.slice(1)])});}
const laterHolds=(dt,hs)=>hs.map(h=>({...h,t0:h.t0+dt,t1:h.t1+dt}));
const laterLines=(dt,ls)=>ls.map(l=>[l[0]+dt,l[1]]);
const hishakuOnKama=hishakuOnKama_; // "oki-bishaku": ladle rests across the kettle mouth, handle toward the host
const HISH_H=GRIP.hishaku.at[0]; // handle length from cup to the right-hand grip
// hand that holds the ladle: cup position + handle direction (rot.y) → grip point
function grip(cup,roty){return [cup[0]+Math.cos(roty)*HISH_H,cup[1]+0.02,cup[2]-Math.sin(roty)*HISH_H];}
// ladle sequence: from `from` (rest spot + rot) to the kettle, scoop, pour over the bowl; with `partly` only part is poured and the rest goes back into the kettle; ends resting across the kettle mouth
function ladleHold(t0,liquid,opts={}){const L=ladle(t0,liquid,opts);return {o:'hishaku',hand:'R',t0:opts.heldFrom?t0:t0+1.2,t1:L.holdEnd,palm:'in'};}
function ladle(t0,liquid,opts={}){const from=opts.from||R.hishaku.pos,fromRot=opts.fromRot==null?R.hishaku.rot[1]:opts.fromRot,yug=!!opts.partly,from2=opts.from2||from,fromRot2=opts.fromRot2==null?fromRot:opts.fromRot2;
  const over=[B[0]+0.01,0.16,B[2]],overRot=1.0;const kettleHigh=[KAMA[0],0.5,KAMA[2]],kettleIn=[KAMA[0],0.24,KAMA[2]],kRot=DIP_ROT;
  const pos=[[t0,...from],[t0+1.6,...from2],[t0+3,...kettleHigh],[t0+4.2,...kettleIn],[t0+5.2,...kettleIn],[t0+6.4,...kettleHigh],[t0+8,...over],[t0+11,...over]];
  const rot=[[t0,0,fromRot,opts.fromTilt||0],[t0+1.6,0,fromRot2,0],[t0+3,0,kRot,0],[t0+8,0,overRot,0],[t0+8.6,0,overRot,0.5],[t0+10.5,0,overRot,0.5],[t0+11,0,overRot,0]];
  let tEnd=t0+11;
  if(yug){rot[4][3]=0.4;rot[5][3]=0.4;pos.push([tEnd+1.5,...kettleHigh],[tEnd+2.5,KAMA[0],0.37,KAMA[2]],[tEnd+3.5,KAMA[0],0.37,KAMA[2]]);rot.push([tEnd+1.5,0,kRot,0],[tEnd+2.2,0,kRot,0.5],[tEnd+3.3,0,kRot,0.5],[tEnd+3.5,0,kRot,0]);tEnd+=3.5;}
  pos.push([tEnd+1.5,...hishakuOnKama]);rot.push([tEnd+1.5,0,ONKAMA_ROT,0]);
  const hand=pos.map((k,i)=>{const ry=(sample(rot,k[0])||rot[0].slice(1))[1];return [k[0],...grip(k.slice(1),ry)];});
  if(!opts.heldFrom){hand.unshift([t0,...HR]);hand[1]=[t0+1.2,...grip(from2,fromRot2)];}hand.push([tEnd+3,...HR]);
  return {tracks:[{o:'hishaku',p:'pos',k:pos},{o:'hishaku',p:'rot',k:rot},{o:'handR',p:'pos',k:hand},{o:liquid,p:'vis',k:[[t0+8.8,0],[t0+8.9,1]]}],end:tEnd+3,holdEnd:tEnd+1.5};}

const STEPS=[
 {title:'Greet the guest',jp:'総礼',ro:'sōrei',gloss:'the bow host and guests make together',dur:16,
  lines:[[2.5,'Welcome. Please sit comfortably.'],[5.2,'Today I will make a bowl of thin tea, usucha, for you.'],[12.6,'First a sweet, then the tea. Press Next whenever you are ready.']],
  tracks:[{o:'legs',p:'pos',k:[[0,1,0,0],[0.8,1,0,0],[3,0,0,0]]},
          {o:'handL',p:'pos',k:[[0,...KZL],[0.8,...KZL],[3,...HL]]},{o:'handR',p:'pos',k:[[0,...KZR],[0.8,...KZR],[3,...HR]]},
          // the formal bow (shin) in three pictures: seiza -> hands to the tatami, index fingers touching -> palms flat and a deep bow -> and back
          {o:'torso',p:'rot',k:[[4.2,0,0,0],[5.4,0.5,0,0],[6.6,0.5,0,0],[7.6,0.95,0,0],[9.6,0.95,0,0],[10.6,0.5,0,0],[11.2,0.5,0,0],[12.4,0,0,0]]},
          {o:'handL',p:'pos',k:[[4.2,...HL],[5.4,...FLL],[6.6,...FLL],[7.6,...FTL],[9.6,...FTL],[10.6,...FLL],[11.2,...FLL],[12.4,...HL]]},
          {o:'handR',p:'pos',k:[[4.2,...HR],[5.4,...FLR],[6.6,...FLR],[7.6,...FTR],[9.6,...FTR],[10.6,...FLR],[11.2,...FLR],[12.4,...HR]]}],
  pose:POSE_PRE,
  poses:[[3.4,'Seiza','正座 seiza','formal sitting: on the heels, hands on the lap'],[6.0,'Hands to the tatami','手をつく te o tsuku','fingertips in front of the knees, index fingers touching'],[8.6,'Formal bow','真のお辞儀 shin no ojigi','palms flat, a deep bow from the hips, back straight']],
  holds:[],
  qs:[['Why does the host bow?','A bow opens and closes every meeting in the tea room. It says: I am glad you came, and I will do my best for you.'],['Where should I sit?','In a real tea room the guests sit in a row on the host\'s right, directly on the tatami. Here your seat is in front of the host, so that you can see everything she does.']]},
 {title:'Serve the sweet',jp:'お菓子',ro:'okashi',gloss:'the sweet, served before the tea',dur:18,
  lines:[[0.5,'Please have a sweet. This is a nerikiri, a soft main sweet of white bean paste, shaped for the season.'],[8,'Take one onto your kaishi paper and cut it with the kuromoji pick. Please finish it before the tea comes.'],[13.5,'With thin tea, light dry sweets, higashi, are also common. Today it is a main sweet, so you need the pick.']],
  tracks:[{o:'handR',p:'pos',k:[[0.5,...HR],[2,0.44,0.03,0.36],[3.5,0.44,0.2,0.36],[6,0.48,0.2,0.5],[7.5,0.48,0.03,0.5],[8.5,...HR]]},
          {o:'handL',p:'pos',k:[[0.5,...HL],[2,0.28,0.03,0.36],[3.5,0.28,0.2,0.36],[6,0.32,0.2,0.5],[7.5,0.32,0.03,0.5],[8.5,...HL]]},
          {o:'kashiki',p:'pos',k:[[2,...KASHIKI_HOME],[3.5,0.36,0.17,0.36],[6,0.4,0.17,0.5],[7.5,...KASHIKI_SERVED]]},
          {o:'torso',p:'rot',k:[[0.5,0,0,0],[2,0.15,0,-0.1],[3.5,0.1,0,-0.1],[6,0.55,0,-0.15],[7.5,0.55,0,-0.15],[8.5,0,0,0],[10,0,0,0],[11.5,0.3,0,0],[13.5,0.3,0,0],[15,0,0,0]]},
          {o:'handL',p:'pos',k:[[10,...HL],[11.5,...TPL],[13.5,...TPL],[15,...HL]]},
          {o:'handR',p:'pos',k:[[10,...HR],[11.5,...TPR],[13.5,...TPR],[15,...HR]]}],
  pose:POSE_PRE,
  poses:[[4.6,'Carrying the sweets','菓子器を運ぶ','the dish is carried with both hands'],[12.6,'Light bow','草のお辞儀 sō no ojigi','fingertips by the knees, a slight bow']],
  holds:[{o:'kashiki',hand:'L',t0:2,t1:7.5,palm:'up'},{o:'kashiki',hand:'R',t0:2,t1:7.5,assist:true}],
  qs:[['Why eat the sweet first?','The sweet lines the mouth with sweetness, so the slightly bitter matcha tastes round and clean. It is never eaten with the tea.'],['What is higashi?','Dry pressed sugar sweets, often shaped like flowers or leaves. They are picked up with the fingers and need no kuromoji; they usually go with thin tea.']]},
 {title:'Purify the tools',jp:'清め',ro:'kiyome',gloss:'purifying the utensils',dur:49,pose:{...POSE_SWEETS,...POSE_PRE},
  lines:[[0.4,'First I bring the bowl, the tea container and the whisk in front of my knees.'],
   [8.5,'My left hand draws the fukusa from my obi; my right lifts the far corner until the diagonal stands upright.'],
   [16.4,'I fold in the loose sail, then turn my left palm up.'],
   [21.4,'I fold it in half over my thumb. My index finger draws a line, then tucks the tail under.'],
   [28.7,'Now the tea container, the natsume: I wipe the lid.'],
   [33.4,'I fold the fukusa again and rest it on my left palm.'],
   [39.1,'Then the bamboo scoop, the chashaku: three wipes.'],
   [42.6,'They are already clean. This is to calm my mind and to show respect to you.']],
  // 9.5–29 and 33.6–39.1 the cloth and both hands are authored by 41-fukusa (fukusaHandling); the tracks below carry the rest
  tracks:[
          // bring the utensils in: bowl (the chakin and the scoop ride on it), natsume (its lid rides on it), whisk
          {o:'handR',p:'pos',k:[[0.3,...HR],[1.4,...pre(B)],[2.6,...B],[3.7,...pre(N)],[4.9,...N2],[5.9,...pre(R.chasen.pos)],[7,...R.chasen.pos],[7.9,...HR],[11.1,...HR],
                                [28.6,0.07,0.38,0.12],[29.0,0.05,0.37,0.11],[33.6,0.06,0.33,0.12],[38.9,0.08,0.36,0.14],[39.1,0.1,0.35,0.13],[43.3,0.1,0.25,0.35],[44.2,...HR],[46.2,...HR],[46.6,N2[0]+0.036,0.04,N2[2]-0.01],[47.8,N[0]+0.036,0.04,N[2]-0.01],[48.6,...HR]]},
          {o:'bowl',p:'pos',k:[[1.4,...pre(B)],[2.6,...B]]},{o:'chakin',p:'pos',k:[[1.4,...pre(CHAKIN_IN_BOWL)],[2.6,...CHAKIN_IN_BOWL]]},
          {o:'natsume',p:'pos',k:[[3.7,...pre(N)],[4.9,...N2],[29.8,...N2],[30.4,0,0.15,0.24],[32.6,0,0.15,0.24],[32.9,...N2],[46.6,...N2],[47.8,...N]]},
          {o:'lid',p:'pos',k:[[3.7,...pre(R.lid.pos)],[4.9,...N2L],[29.8,...N2L],[30.4,0,0.202,0.24],[32.6,0,0.202,0.24],[32.9,...N2L],[46.6,...N2L],[47.8,...R.lid.pos]]},
          {o:'chasen',p:'pos',k:[[5.9,...pre(R.chasen.pos)],[7,...R.chasen.pos]]},
          {o:'chashaku',p:'pos',k:[[1.4,...pre(CHASHAKU_ON_BOWL)],[2.6,...CHASHAKU_ON_BOWL],[39.45,...CHASHAKU_ON_BOWL],[40.05,0.03,0.33,0.12],[42.5,0.03,0.33,0.12],[43.3,...N2C],[46.6,...N2C],[47.8,...R.chashaku.pos]]},
          {o:'chashaku',p:'rot',k:[[0,...CHASHAKU_ON_BOWL_ROT],[39.45,...CHASHAKU_ON_BOWL_ROT],[40.05,0,Math.PI/2,0],[42.5,0,Math.PI/2,0],[43.3,...R.chashaku.rot]]},
          {o:'torso',p:'rot',k:[[0.3,0,0,0],[1.4,0.25,0,0],[7,0.25,0,0],[7.9,0,0,0],[8.5,0,0,0],[9.5,0.05,0,0.04],[11.6,0.04,0,0],[29.0,0.08,0,0],[29.8,0.15,0,0],[30.4,0.08,0,0],[32.3,0.08,0,0],[32.9,0.15,0,0],[33.3,0.05,0,0],[39.1,0.05,0,0],[39.45,0.12,0,0],[40.05,0.05,0,0],[42.5,0.05,0,0],[43.3,0.15,0,0],[44.0,0,0,0],[46.2,0,0,0],[46.6,0.15,0,0],[47.8,0.25,0,0],[48.6,0,0,0]]},
          // the left hand: to the obi's edge, (the folding), to the knee, to the natsume, (the second folding), the pad on its palm, back to the obi
          {o:'handL',p:'pos',k:[[8.5,...HL],[9.5,-0.12,0.52,-0.02],[27.95,-0.12,0.38,0.12],[28.6,...KNL],[29.0,...KNL],[29.8,N2[0]-0.036,0.03,N2[2]-0.01],[32.9,N2[0]-0.036,0.03,N2[2]-0.01],[33.3,-0.06,0.33,0.07],[33.6,-0.06,0.33,0.07],[39.1,-0.02,0.32,0.13],[45.2,...HIP_L],[46.2,...HL]]},
          // the pad (P-frame: its centre, stack top down, わ edge to her right): natsume こ wipe, then the scoop
          {o:'fukusa',p:'pos',k:[[0,...HIP_L],[9.5,...HIP_L],[29.0,0.05,0.36,0.11],[29.8,0.08,0.31,0.17],[30.2,-0.03,0.245,0.258],[30.4,-0.03,0.235,0.258],[31.0,0.03,0.235,0.258],[31.2,-0.03,0.24,0.222],[31.8,0.03,0.235,0.222],[31.95,0,0.235,0.255],[32.3,0,0.235,0.225],[32.6,0.07,0.25,0.24],[33.3,0.06,0.32,0.12],[39.1,0,0.38,0.16],
                                [40.05,0.03,0.3225,0.12],[40.3,0.03,0.3225,0.12],[41.0,-0.05,0.3225,0.12],[41.2,-0.05,0.33,0.1115],[41.5,0.045,0.33,0.1115],[41.8,-0.05,0.33,0.1115],[42.05,-0.05,0.3275,0.12],[42.18,0.03,0.3275,0.12],[42.38,-0.05,0.3225,0.12],[42.43,-0.05,0.3215,0.12],[42.5,-0.05,0.3225,0.15],[43.3,-0.05,0.33,0.15],[45.2,...HIP_L]]},
          {o:'fukusa',p:'rot',k:[[0,...FUK_OBI_EULER],[9.5,...FUK_OBI_EULER],[29.0,0,0,0],[33.3,0,0,0],[39.1,0,0,Math.PI],[41.0,0,0,Math.PI],[41.2,Math.PI/2,0,Math.PI],[41.8,Math.PI/2,0,Math.PI],[42.05,0,0,Math.PI],[43.3,0,0,Math.PI],[45.2,...FUK_OBI_EULER]]}],
  holds:[{o:'bowl',hand:'R',t0:1.4,t1:2.6,grip:'bowlSide'},{o:'chakin',hand:'R',t0:1.4,t1:2.6,rider:true},{o:'chashaku',hand:'R',t0:1.4,t1:2.6,rider:true},
         {o:'natsume',hand:'R',t0:3.7,t1:4.9,grip:'natsumeSide'},{o:'lid',hand:'R',t0:3.7,t1:4.9,rider:true},
         {o:'chasen',hand:'R',t0:5.9,t1:7,noflip:true},
         {o:'fukusa',hand:'L',t0:9.9,t1:16.35},{o:'fukusa',hand:'L',t0:17.3,t1:27.95},{o:'fukusa',hand:'R',t0:12.45,t1:33.8,grip:'fukusaWipe'},
         {o:'natsume',hand:'L',t0:29.8,t1:32.9,grip:'natsumeSide'},{o:'lid',hand:'L',t0:29.8,t1:32.9,rider:true},
         {o:'fukusa',hand:'L',t0:34.1,t1:38.6},{o:'fukusa',hand:'R',t0:34.5,t1:38.5},
         {o:'fukusa',hand:'L',t0:39.1,t1:43.6,grip:'fukusaPalm'},{o:'fukusa',hand:'L',t0:43.6,t1:45.2,grip:'fukusaObi'},
         {o:'chashaku',hand:'R',t0:39.45,t1:43.3},
         {o:'natsume',hand:'R',t0:46.6,t1:47.8,grip:'natsumeSide'},{o:'lid',hand:'R',t0:46.6,t1:47.8,rider:true},{o:'chashaku',hand:'R',t0:46.6,t1:47.8,rider:true}],
  poses:[[2,'Bringing the bowl','茶碗を引く','the bowl comes in front of the knees'],
   [10.9,'Drawing the silk','帛紗を取る','clamped near the left corner; a short tail shows past the fingers'],
   [12.6,'Pinching the far corner','角をつまむ','the right hand comes over the left and pinches 3 cm inside the far corner'],
   [15.7,'Diagonal upright','帛紗を立てる','right hand above, left below: the diagonal stands straight up and the cloth hangs as a triangle'],
   [18.9,'Folding in the sail','折り込む','the left fingers fold the loose corner over; the thumb presses the crease'],
   [21.0,'Thumb at the centre','親指で押さえる','left thumb on the centre, palm turned up'],
   [23.0,'Fold in half','半分に畳む','the far corner comes down onto the near corner over the thumb'],
   [24.5,'The stroke 一','一の字','the right index draws across the top'],
   [25.8,'The curl つ','つの字','the index curls the tail under: four layers'],
   [27.2,'Both palms up','両手で持つ','the pad sits on the midline between the thumbs'],
   [28.4,'Ready to wipe','右手に持つ','left hand to the knee, right palm turns down'],
   [31.0,'Purifying the natsume','棗を清める','the lid is wiped in a こ shape'],
   [36.0,'Folding again','捌き直し','the fukusa is folded once more'],
   [41.0,'Purifying the scoop','茶杓を清める','three wipes from the node to the tip']],
  qs:[['Is the fukusa only for cleaning?','No. The utensils are clean before the ceremony. Wiping them in front of you prepares the heart, not the object.'],['How is the fukusa folded?','Hold the near-left corner with your left hand and pinch just inside the far-right corner with your right. Lift until the diagonal stands straight up and the cloth hangs as a triangle. Fold in the loose sail with the left fingers, put the left thumb on the centre and turn the palm up. Bring the far corner down onto the near corner over the thumb, draw a straight line across with the right index finger, and curl the tail under. The pad then goes into the right hand for wiping.']]},
 {title:'Warm the bowl',jp:'茶碗を温める',ro:'chawan o atatameru',gloss:'warming the bowl',dur:52.5,pose:POSE_SWEETS,
  poses:[[7.2,'Opening the kettle','釜の蓋を取る','ladle upright in the left hand; the right hand lifts the hot lid with the fukusa'],[18.1,'Ladling hot water','湯を汲む','one ladle from the kettle'],[22.7,'Warming the bowl','湯を注ぐ','hot water into the bowl'],[31.1,'Checking the whisk','茶筅通し chasen-tōshi','the whisk is lifted and looked at'],[41.7,'Emptying the bowl','湯を捨てる','into the kensui, with the left hand'],[48,'Wiping the bowl','茶巾で拭く','with the damp linen cloth']],
  lines:[[0.5,'I take the ladle, the hishaku, in my left hand and hold it upright, like a hand mirror. My right hand opens the kettle lid with the fukusa and rests it on the futaoki.'],[11,'The damp linen cloth, the chakin, comes out of the bowl and waits on the lid.'],[14,'Now I warm the bowl: one ladle of hot water from the kettle.'],[25.5,'I rest the ladle on the kettle and check the whisk in the warm water, lifting it to look at the tines.'],[38.5,'Then I pour the water into the waste bowl, the kensui, on my left.'],[42.5,'And I wipe the bowl with the chakin.']],
  get tracks(){const T=13.5;const L=ladle(T,'water',{from:KAG,fromRot:KAG_ROT,fromTilt:KAG_TILT,from2:KAG_OUT,fromRot2:KAG_OUT_ROT});return [
          // kagami-bishaku: the left hand takes the ladle and holds it upright while the right hand opens the kettle
          {o:'handL',p:'pos',k:[[0.5,...HL],[2,...grip(R.hishaku.pos,REST_ROT)],[3.5,...KAG_HAND],[T+0.9,...KAG_HAND],[T+2.2,...HL]]},
          {o:'hishaku',p:'pos',k:[[2,...R.hishaku.pos],[3.5,...KAG],[T,...KAG]]},
          {o:'hishaku',p:'rot',k:[[2,0,REST_ROT,-0.18],[3.5,0,KAG_ROT,KAG_TILT],[T,0,KAG_ROT,KAG_TILT]]},
          // right hand: fukusa from the obi, lift the kettle lid onto the lid rest, fukusa back
          {o:'handR',p:'pos',k:[[2,...HR],[3.5,...HIP_L],[5,KAMA[0],0.35,KAMA[2]],[5.8,KAMA[0],0.35,KAMA[2]],[6.6,KAMA[0],0.47,KAMA[2]],[8,FUTA[0],0.12,FUTA[2]],[8.6,FUTA[0],0.12,FUTA[2]],[10,...HIP_L],[11,...HR]]},
          {o:'fukusa',p:'pos',k:[[3.5,...HIP_L],[5,KAMA[0],0.31,KAMA[2]],[5.8,KAMA[0],0.31,KAMA[2]],[6.6,KAMA[0],0.465,KAMA[2]],[8,FUTA[0],0.085,FUTA[2]],[8.6,FUTA[0],0.085,FUTA[2]],[10,...HIP_L]]},   // the pad stays on the lid while it travels
          {o:'fukusa',p:'rot',k:[[3.5,...FUK_OBI_EULER],[5,0,0,0],[8.6,0,0,0],[10,...FUK_OBI_EULER]]},
          {o:'kamaLid',p:'pos',k:[[5.8,...KAMALID_ON_KAMA],[6.6,KAMA[0],0.44,KAMA[2]],[8,...KAMALID_ON_FUTAOKI]]},
          {o:'torso',p:'rot',k:[[3.5,0,0,0],[5,0.12,0,0.2],[8.6,0.12,0,0.2],[10,0,0,0]]},
          // chakin from the bowl onto the lid, with the right hand
          {o:'handR',p:'pos',k:[[11,...HR],[11.8,B[0],0.09,B[2]],[12.6,FUTA[0],0.12,FUTA[2]],[13.3,...HR]]},
          {o:'chakin',p:'pos',k:[[11.8,...CHAKIN_IN_BOWL],[12.6,...CHAKIN_ON_LID]]},
          ...L.tracks,
          // chasen-toshi: whisk into the bowl, lift & look twice, swish, back to its place
          {o:'handR',p:'pos',k:[[L.end,...HR],[L.end+1,0.24,0.1,0.44],[L.end+2.2,0.0,0.12,0.42],[L.end+3.5,0.0,0.3,0.42],[L.end+4.5,0.0,0.12,0.42],[L.end+5.5,0.0,0.3,0.42],[L.end+6.5,0.0,0.12,0.42],[L.end+9,0.0,0.12,0.42],[L.end+10,0.24,0.1,0.44],[L.end+11,...HR]]},
          {o:'chasen',p:'pos',k:[[L.end+1,...R.chasen.pos],[L.end+1.3,0.24,0.16,0.44],[L.end+1.9,-0.02,0.16,0.42],[L.end+2.2,-0.02,0.04,0.42],[L.end+3.5,-0.02,0.17,0.42],[L.end+4.5,-0.02,0.04,0.42],[L.end+5.5,-0.02,0.17,0.42],[L.end+6.5,-0.02,0.04,0.42],[L.end+9,-0.02,0.04,0.42],[L.end+9.3,-0.02,0.16,0.42],[L.end+9.7,0.24,0.16,0.44],[L.end+10,...R.chasen.pos]]},
          {o:'chasen',p:'rot',k:[[L.end+3,0,0,0],[L.end+3.5,0.3,0,0],[L.end+4.5,0,0,0],[L.end+5.5,0.3,0,0],[L.end+6.5,0,0,0]]},
          {o:'chasen',p:'pos',osc:{axis:'x',amp:0.015,freq:3,t0:L.end+6.8,t1:L.end+9}},
          {o:'handL',p:'pos',k:[[L.end+1,...HL],[L.end+2.2,-0.09,0.08,0.42],[L.end+10,-0.09,0.08,0.42],[L.end+11,...HL]]},
          // discard water into kensui (left), wipe with chakin, bowl back
          {o:'handL',p:'pos',k:[[L.end+11,...HL],[L.end+12,-0.09,0.06,0.42],[L.end+13.5,KENSUI[0]+0.06,0.2,KENSUI[2]],[L.end+15.5,KENSUI[0]+0.06,0.2,KENSUI[2]],[L.end+17,-0.1,0.1,0.42],[L.end+23,-0.1,0.1,0.42],[L.end+24,...HL]]},
          {o:'handR',p:'pos',k:[[L.end+11,...HR],[L.end+12,0.05,0.06,0.42],[L.end+13.2,...HR],[L.end+16,...HR],[L.end+17,FUTA[0],0.12,FUTA[2]],[L.end+18.5,0.0,0.14,0.42],[L.end+22,0.0,0.14,0.42],[L.end+23.5,FUTA[0],0.12,FUTA[2]],[L.end+24.5,...HR]]},
          {o:'bowl',p:'pos',k:[[L.end+12,...B],[L.end+13.5,KENSUI[0]+0.12,0.16,KENSUI[2]],[L.end+15.5,KENSUI[0]+0.12,0.16,KENSUI[2]],[L.end+17,...B]]},
          {o:'torso',p:'rot',k:[[L.end+12,0,0,0],[L.end+13.5,0.25,0,0.18],[L.end+15.5,0.25,0,0.18],[L.end+17,0,0,0]]},
          {o:'bowl',p:'rot',k:[[L.end+13.5,0,0,0],[L.end+14.3,0,0,1.6],[L.end+15.3,0,0,1.6],[L.end+16.5,0,0,0]]},
          {o:'water',p:'vis',k:[[L.end+14.2,1],[L.end+14.3,0]]},
          {o:'chakin',p:'pos',k:[[L.end+17,...CHAKIN_ON_LID],[L.end+18.5,-0.02,0.07,0.42],[L.end+22,-0.02,0.07,0.42],[L.end+23.5,...CHAKIN_ON_LID]]},
          {o:'chakin',p:'pos',osc:{axis:'x',amp:0.03,freq:0.9,t0:L.end+18.7,t1:L.end+22}},{o:'chakin',p:'pos',osc:{axis:'z',amp:0.03,freq:0.9,t0:L.end+18.7,t1:L.end+22,phase:1.57}},
          {o:'handR',p:'pos',osc:{axis:'x',amp:0.03,freq:0.9,t0:L.end+18.7,t1:L.end+22}},{o:'handR',p:'pos',osc:{axis:'z',amp:0.03,freq:0.9,t0:L.end+18.7,t1:L.end+22,phase:1.57}},
          {o:'bowl',p:'rot',osc:{axis:'y',amp:0.4,freq:0.45,t0:L.end+18.7,t1:L.end+22}}];},
  get holds(){const T=13.5;const L=ladle(T,'water',{from:KAG,fromRot:KAG_ROT,fromTilt:KAG_TILT,from2:KAG_OUT,fromRot2:KAG_OUT_ROT});return [
          {o:'hishaku',hand:'L',t0:2,t1:3.5},{o:'hishaku',hand:'L',t0:3.5,t1:T+1.3,grip:'hishakuKagami'},{o:'hishaku',hand:'R',t0:T+1.2,t1:L.holdEnd,palm:'in'},{o:'fukusa',hand:'R',t0:3.5,t1:10,palm:'down'},{o:'kamaLid',hand:'R',t0:5.8,t1:8,palm:'down'},{o:'chakin',hand:'R',t0:11.8,t1:12.6,palm:'down'},
          {o:'chasen',hand:'R',t0:L.end+1,t1:L.end+10,palm:'in'},{o:'bowl',hand:'L',t0:L.end+2.2,t1:L.end+10,assist:true,grip:'bowlSide'},{o:'bowl',hand:'L',t0:L.end+12,t1:L.end+17,grip:'bowlSide'},{o:'chakin',hand:'R',t0:L.end+17,t1:L.end+23.5,palm:'down'}];},
  qs:[['Why lift the whisk?','This is chasen-tōshi: the host checks that no tine is broken, and softens the bamboo in warm water so it does not snap while whisking.'],['Why open the lid with the cloth?','The iron lid is hot. The folded fukusa protects the fingers, and the lid rests on the bamboo futaoki, never on the tatami.']]},
 {title:'Add matcha',jp:'抹茶を入れる',ro:'matcha o ireru',gloss:'putting in the powdered tea',dur:24,pose:POSE_OPEN,
  poses:[[3.6,'Holding the natsume','棗を取る','in the left hand; the right lifts the lid'],[10,'Scooping the matcha','抹茶をすくう','one scoop and a half'],[15.6,'Tapping the scoop','茶杓を打つ','a light tap on the rim']],
  lines:[[0.5,'I hold the tea container, the natsume, in my left hand and lift the lid with my right, resting it beside the bowl.'],[7,'One scoop of matcha, and then half a scoop. One and a half for thin tea.'],[16,'A light tap of the scoop on the rim, then the lid goes back and the natsume returns to its place.']],
  tracks:[{o:'handL',p:'pos',k:[[0.5,...HL],[1.5,0.12,0.05,0.42],[3,0.04,0.2,0.36],[19,0.04,0.2,0.36],[20.5,0.12,0.05,0.42],[22,...HL]]},
          {o:'natsume',p:'pos',k:[[1.5,...N],[3,0.04,0.17,0.36],[19,0.04,0.17,0.36],[20.5,...N]]},
          {o:'lid',p:'pos',k:[[1.5,...R.lid.pos],[3,0.04,0.222,0.36],[4.5,0.04,0.26,0.36],[6,0.16,0.0,0.56],[16.5,0.16,0.0,0.56],[18,0.04,0.26,0.36],[19,0.04,0.222,0.36],[20.5,...R.lid.pos]]},
          {o:'chashaku',p:'pos',k:[[1.5,...R.chashaku.pos],[3,0.04,0.255,0.36],[4.5,0.04,0.3,0.36],[6,0.16,0.04,0.56],[7,0.1,0.28,0.4],[8,0.05,0.2,0.37],[9.5,0.0,0.16,0.45],[10.3,0.0,0.16,0.45],[11.5,0.05,0.2,0.37],[13,0.0,0.16,0.45],[13.8,0.0,0.16,0.45],[15,0.0,0.1,0.47],[16.5,0.0,0.1,0.47],[18,0.04,0.3,0.36],[19,0.04,0.255,0.36],[20.5,...R.chashaku.pos]]},
          {o:'chashaku',p:'rot',k:[[1.5,0,1.25,0],[3,0,1.25,0],[7,0.5,2.74,0],[8,0.9,2.74,0],[9.5,0.5,2.74,0],[10.3,1.4,2.74,0],[11,0.5,2.74,0],[13,0.5,2.74,0],[13.8,1.4,2.74,0],[14.6,0.5,2.74,0],[15,0.2,2.74,0],[16.5,0.2,2.74,0],[18,0,1.25,0],[20.5,0,1.25,0]]},
          {o:'chashaku',p:'pos',osc:{axis:'y',amp:0.012,freq:2.5,t0:15.2,t1:16}},
          {o:'handR',p:'pos',k:[[0.5,...HR],[1.5,0.12,0.12,0.42],[3,0.06,0.3,0.36],[4.5,0.06,0.33,0.36],[6,0.18,0.07,0.56],[7,0.12,0.31,0.4],[8,0.07,0.24,0.37],[9.5,0.02,0.2,0.45],[10.3,0.02,0.2,0.45],[11.5,0.07,0.24,0.37],[13,0.02,0.2,0.45],[13.8,0.02,0.2,0.45],[15,0.02,0.14,0.47],[16.5,0.02,0.14,0.47],[18,0.06,0.33,0.36],[19,0.06,0.3,0.36],[20.5,0.12,0.12,0.42],[22,...HR]]},
          {o:'handR',p:'pos',osc:{axis:'y',amp:0.012,freq:2.5,t0:15.2,t1:16}},
          {o:'torso',p:'rot',k:[[6,0,0,0],[7.5,0.18,0,0],[16.5,0.18,0,0],[18,0,0,0]]},
          {o:'powder',p:'vis',k:[[10.2,0],[10.3,1]]},
          {o:'powder',p:'scale',k:[[10.3,0.75,0.75,0.75],[13.8,0.75,0.75,0.75],[14.3,1,1,1]]}],
  holds:[{o:'natsume',hand:'L',t0:1.5,t1:20.5,palm:'up'},{o:'lid',hand:'R',t0:1.5,t1:6,palm:'down'},{o:'lid',hand:'R',t0:18,t1:20.5,palm:'down'},{o:'chashaku',hand:'R',t0:1.5,t1:20.5,palm:'in'}],
  qs:[['How much matcha is that?','About 2 grams: one full scoop and a half. For thick tea, koicha, the host uses about three scoops per person.'],['Why tap the scoop?','A light tap on the rim drops the last powder from the scoop into the bowl.']]},
 {title:'Pour hot water',jp:'湯を注ぐ',ro:'yu o sosogu',gloss:'pouring hot water',dur:24,pose:POSE_OPEN,
  poses:[[5.2,'Ladling','湯を汲む','a full ladle from the kettle'],[9.8,'Pouring','湯を注ぐ','only part of it goes into the bowl'],[14.4,'Returning the rest','残りを釜に戻す','the rest goes back into the kettle']],
  init:{powder:1},
  lines:[[0.5,'One ladle of hot water from the kettle, but I pour only part of it into the bowl.'],[9,'About sixty millilitres. Too much water makes it watery.'],[13,'The rest goes back into the kettle, so nothing is wasted.']],
  get tracks(){const L=ladle(0.5,'tea',{from:hishakuOnKama,fromRot:ONKAMA_ROT,partly:true});return [...L.tracks,{o:'powder',p:'vis',k:[[9.3,1],[9.4,0]]}];},
  get holds(){return [ladleHold(0.5,'tea',{from:hishakuOnKama,fromRot:ONKAMA_ROT,partly:true})];},
  qs:[['How hot is the water?','Just under the boil in the kettle, about 80 °C by the time it reaches the bowl.'],['Why return water to the kettle?','The host scoops a full ladle so the movement is always the same, then returns what is not needed. Nothing is wasted.']]},
 {title:'Whisk',jp:'点てる',ro:'tateru',gloss:'to whisk, to make tea',dur:24,pose:POSE_OPEN,
  poses:[[2.4,'Taking the whisk','茶筅を取る','the left hand steadies the bowl'],[8,'Whisking','茶を点てる','quickly from the wrist, like the letter M'],[19.6,'Lifting the whisk','茶筅を上げる','a slow circle, then up from the centre']],
  init:{tea:1},
  lines:[[0.5,'Now I whisk. My left hand holds the bowl; the whisk moves quickly from the wrist, like writing the letter M.'],[10,'The foam becomes fine and smooth.'],[15,'At the end I move slowly in a circle and lift the whisk from the centre.']],
  tracks:[{o:'handL',p:'pos',k:[[0.5,...HL],[1.5,-0.09,0.07,0.42],[21,-0.09,0.07,0.42],[22,...HL]]},
          {o:'handR',p:'pos',k:[[0.5,...HR],[1.5,0.24,0.1,0.44],[3,0.0,0.12,0.42],[19,0.0,0.12,0.42],[19.8,0.0,0.22,0.42],[21,0.24,0.1,0.44],[22,...HR]]},
          {o:'chasen',p:'pos',k:[[1.5,...R.chasen.pos],[1.9,0.24,0.16,0.44],[2.65,-0.02,0.16,0.42],[3,-0.02,0.04,0.42],[19,-0.02,0.04,0.42],[19.8,-0.02,0.16,0.42],[20.6,0.24,0.16,0.44],[21,...R.chasen.pos]]},
          {o:'chasen',p:'pos',osc:{axis:'z',amp:0.022,freq:5,t0:3,t1:14}},{o:'handR',p:'pos',osc:{axis:'z',amp:0.022,freq:5,t0:3,t1:14}},
          {o:'chasen',p:'pos',osc:{axis:'x',amp:0.01,freq:5,t0:3,t1:14,phase:1.2}},{o:'chasen',p:'rot',osc:{axis:'x',amp:0.22,freq:5,t0:3,t1:14,phase:1.57}},{o:'chasen',p:'rot',osc:{axis:'x',amp:0.12,freq:0.6,t0:14.5,t1:18.5,phase:1.57}},
          {o:'chasen',p:'pos',osc:{axis:'x',amp:0.02,freq:0.6,t0:14.5,t1:18.5}},{o:'chasen',p:'pos',osc:{axis:'z',amp:0.02,freq:0.6,t0:14.5,t1:18.5,phase:1.57}},
          {o:'handR',p:'pos',osc:{axis:'x',amp:0.02,freq:0.6,t0:14.5,t1:18.5}},{o:'handR',p:'pos',osc:{axis:'z',amp:0.02,freq:0.6,t0:14.5,t1:18.5,phase:1.57}},
          {o:'torso',p:'rot',k:[[1.5,0,0,0],[3,0.2,0,0],[19.8,0.2,0,0],[21.5,0,0,0]]},
          {o:'froth',p:'vis',k:[[6,0],[6.1,1]]},{o:'froth',p:'scale',k:[[6.1,0.3,1,0.3],[13,1,1,1]]}],
  holds:[{o:'chasen',hand:'R',t0:1.5,t1:21,palm:'in'},{o:'bowl',hand:'L',t0:1.5,t1:21,assist:true,grip:'bowlSide'}],
  qs:[['Why so fast?','Fast strokes break the powder into the water and build fine foam. Slow stirring leaves lumps.'],['Does the foam matter?','In Urasenke, yes: a smooth layer of small bubbles. Other schools prefer less foam. Both are correct.']]},
 {title:'Serve the bowl',jp:'お出しする',ro:'o-dashi suru',gloss:'offering the bowl',dur:21.5,pose:POSE_OPEN,
  poses:[[4,'Bowl on the left palm','茶碗を左手にのせる','taken with the right hand, rested on the left palm'],[8.4,'Turning the bowl','茶碗を回す','two quarter turns clockwise, so the front faces the guest'],[13,'Offering the bowl','茶碗を出す','placed in front of the guest'],[17.6,'Light bow','草のお辞儀 sō no ojigi','fingertips by the knees, a slight bow']],
  init:{tea:1,froth:1},
  lines:[[0.5,'Here is your tea. I take the bowl in my right hand and rest it on my left palm.'],[5,'I turn it clockwise twice, a quarter turn each time, so the front faces you.'],[12,'And I place it in front of you. Before you drink, turn it clockwise as I did, so your lips do not touch the front.'],[16.4,'Please enjoy it. I wait quietly while you drink.']],
  tracks:[{o:'handR',p:'pos',k:[[0.5,...HR],[1.5,0.05,0.07,0.42],[3,0.05,0.18,0.46],[11,0.05,0.18,0.46],[13,0.0,0.07,0.46],[14.5,...HR]]},
          {o:'handL',p:'pos',k:[[1.5,...HL],[3,-0.03,0.13,0.46],[11,-0.03,0.13,0.46],[13,-0.09,0.07,0.46],[14.5,...HL]]},
          {o:'bowl',p:'pos',k:[[1.5,...B],[3,0,0.15,0.46],[11,0,0.15,0.46],[13,-0.05,0,0.46]]},
          // the stage is mirrored, so a positive turn here is clockwise as seen from above
          {o:'bowl',p:'rot',k:[[5,0,0,0],[6.5,0,1.57,0],[7.5,0,1.57,0],[9,0,3.14,0]]},
          {o:'torso',p:'rot',k:[[10,0,0,0],[12.5,0.65,0,0],[13.5,0.65,0,0],[14.5,0.1,0,0],[15,0,0,0],[16.5,0.3,0,0],[19,0.3,0,0],[20.5,0,0,0]]},
          {o:'handL',p:'pos',k:[[15,...HL],[16.5,...TPL],[19,...TPL],[20.5,...HL]]},
          {o:'handR',p:'pos',k:[[15,...HR],[16.5,...TPR],[19,...TPR],[20.5,...HR]]}],
  holds:[{o:'bowl',hand:'L',t0:1.5,t1:2.9,grip:'bowlSide'},{o:'bowl',hand:'L',t0:2.9,t1:11.2,palm:'up'},{o:'bowl',hand:'L',t0:11.2,t1:13,grip:'bowlSide'},{o:'bowl',hand:'R',t0:1.5,t1:13,assist:true,grip:'bowlSide'}],
  qs:[['What do I say when I receive it?','Bow slightly and say "Otemae chōdai itashimasu": I gratefully receive your tea. In English, a simple thank you is welcome.'],['How do I drink?','Lift the bowl with your right hand, rest it on your left palm, turn it clockwise twice, and drink in about three sips. Wipe the rim with your fingers, turn the bowl back, and set it down.']]},
 {title:'Your turn: whisk!',jp:'あなたの番',ro:'anata no ban',gloss:'your turn',dur:0,interactive:true,pose:POSE_OPEN,
  init:{tea:1},
  lines:[[0,'In a real gathering only the host whisks. Here you may try it, and then drink as a guest.']],
  tracks:[],holds:[],
  qs:[['What am I doing right?','Keep the whisk upright and move your wrist, not your arm. Quick and light is better than strong.'],['What if the foam is uneven?','Finish with one slow circle and lift the whisk from the centre of the bowl. The big bubbles disappear.']]},
];
// materialise getter-based tracks once
STEPS.forEach(s=>{const tr=s.tracks;Object.defineProperty(s,'tracks',{value:tr,writable:true});const hd=s.holds||[];Object.defineProperty(s,'holds',{value:hd,writable:true});});
