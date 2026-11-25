// The guest works on the paper in front of the fan, clear of the tea bowl.
const SWEET_Z = 0.88;
const PAPER_TOP = 0.006;
const PICK_HALF_LENGTH = 0.055;
const pickAxis = new THREE.Vector3(0, 0, 1);
const sweetFilling = new THREE.MeshStandardMaterial({ color: 0xffe3bd, roughness: 0.92 });
let sweetPieces;

function resetSweetPieces() {
  if (sweetPieces) Object.values(sweetPieces).forEach(piece => { piece.visible = false; });
}

function prepareSweetPieces(sweet) {
  if (!sweetPieces) {
    sweetPieces = {};
    for (const [name, left, right] of [
      ['left', -SWEET_RADIUS, -SWEET_CUT], ['joined', -SWEET_CUT, SWEET_RADIUS],
      ['middle', -SWEET_CUT, SWEET_CUT], ['right', SWEET_CUT, SWEET_RADIUS],
    ]) {
      const piece = mesh(nerikiriGeometry(left, right), [sweet.material, sweetFilling]);
      piece.userData.biteX = (left + right) / 2;
      stage.add(piece);
      sweetPieces[name] = piece;
    }
    sweetPieces.middle.add(sweet.userData.leaf.clone());
  }
  for (const piece of Object.values(sweetPieces)) {
    piece.position.set(0, PAPER_TOP, SWEET_Z);
    piece.visible = false;
  }
  return sweetPieces;
}

function movePick(tipTarget, pitch, duration, done, carriedPiece) {
  const pick = O.kuromoji;
  const fromQ = pick.quaternion.clone();
  const toQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch);
  const axis = new THREE.Vector3();
  const fromTip = pick.position.clone().addScaledVector(axis.copy(pickAxis).applyQuaternion(fromQ), -PICK_HALF_LENGTH);
  const toTip = new THREE.Vector3(...tipTarget);
  const tip = new THREE.Vector3();
  const pieceStart = carriedPiece?.position.clone();
  tweens.push({ t: 0, dur: duration, done, update(u) {
    pick.quaternion.slerpQuaternions(fromQ, toQ, u);
    tip.lerpVectors(fromTip, toTip, u);
    axis.copy(pickAxis).applyQuaternion(pick.quaternion);
    pick.position.copy(tip).addScaledVector(axis, PICK_HALF_LENGTH);
    if (carriedPiece) carriedPiece.position.copy(pieceStart).add(tip).sub(fromTip);
  } });
}

function animateSweetCut(done) {
  const sweet = O.sweets[0];
  setGlow(null);
  const pieces = prepareSweetPieces(sweet);
  stopDrinkView();
  masterView = false;
  document.documentElement.classList.add('sweet-cut');
  cam.goal = { target: new THREE.Vector3(0, 0.01, SWEET_Z + 0.027), theta: 0.43, phi: 0.60, r: 0.29 };
  ui.meterText.textContent = 'Move the nerikiri onto the kaishi.';

  function cut(x, reveal, next) {
    ui.meterText.textContent = 'Press and draw the kuromoji through the sweet.';
    const blade = 0.72;
    movePick([x, PAPER_TOP + SWEET_HEIGHT + 0.008, SWEET_Z - 0.006], blade, 0.55, () => {
      movePick([x, PAPER_TOP + 0.002, SWEET_Z - 0.006], blade, 0.60, () => {
        movePick([x, PAPER_TOP + 0.002, SWEET_Z + 0.026], blade, 0.28, () => {
          reveal();
          movePick([x, PAPER_TOP + SWEET_HEIGHT + 0.012, SWEET_Z + 0.026], blade, 0.35, next);
        });
      });
    });
  }

  function liftBite(index) {
    const piece = [pieces.left, pieces.middle, pieces.right][index];
    const x = piece.position.x + piece.userData.biteX;
    const biteHeight = index === 1 ? 0.027 : 0.023;
    ui.meterText.textContent = `Lift bite ${index + 1} of 3.`;
    movePick([x, PAPER_TOP + SWEET_HEIGHT + 0.014, SWEET_Z], 0.85, 0.32, () => {
      movePick([x, PAPER_TOP + biteHeight, SWEET_Z], 0.85, 0.25, () => {
        movePick([x, 0.10, SWEET_Z + 0.038], 0.48, 0.55, () => {
          movePick([x, 0.20, SWEET_Z + 0.095], 0.35, 0.36, () => {
            piece.visible = false;
            if (index < 2) liftBite(index + 1);
            else movePick([0.091, 0.0015, SWEET_Z - PICK_HALF_LENGTH], 0, 0.72, () => {
              document.documentElement.classList.remove('sweet-cut');
              done();
            });
          }, piece);
        }, piece);
      });
    });
  }

  tween(O.kaishi, { pos: [0, 0.003, SWEET_Z], rot: [0, 0, 0], arc: 0.025 }, 0.75, () => {
    stage.attach(sweet);
    tween(sweet, { pos: [0, PAPER_TOP, SWEET_Z], arc: 0.11 }, 0.92, () => {
      cut(-SWEET_CUT, () => {
        sweet.visible = false;
        pieces.left.visible = pieces.joined.visible = true;
        tween(pieces.left, { pos: [-0.006, PAPER_TOP, SWEET_Z] }, 0.28);
      }, () => {
        cut(SWEET_CUT, () => {
          pieces.joined.visible = false;
          pieces.middle.visible = pieces.right.visible = true;
          tween(pieces.right, { pos: [0.006, PAPER_TOP, SWEET_Z] }, 0.28);
        }, () => liftBite(0));
      });
    });
  });
}
