const pairPicker = document.getElementById('pairPick');
for (const [id,pair] of Object.entries(NARRATOR_PAIRS)) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = pair.name + ' · ' + pair.relation;
  pairPicker.appendChild(option);
}
function updatePairPicker() {
  pairPicker.value = intro.pair;
  const pair = NARRATOR_PAIRS[intro.pair];
  document.getElementById('pairStart').hidden = !pair;
  document.getElementById('pairSummary').textContent = pair ? pair.name + ' selected · alternating narration' : '';
  document.getElementById('pairNote').textContent = pair
    ? pair.relation + '. Both stay on screen and take turns speaking. ' + pair.note
    : 'Choose a duo to see both characters and hear them take turns explaining.';
  if (pair) {
    const english = TTS.language === 'en';
    const language = english ? 'in English' : 'in Japanese with English subtitles';
    document.getElementById('introText').textContent = `Shizue-sensei makes the tea while ${pair.name} take turns explaining ${language}.`;
    document.getElementById('voiceLabel').textContent = english ? 'Read both narrators aloud in English' : 'Read both narrators aloud (Japanese voices; English subtitles)';
  }
}
pairPicker.addEventListener('change', () => {
  TTS.cancel();
  intro.pair = pairPicker.value;
  const pair = NARRATOR_PAIRS[intro.pair];
  pickTeacher(pair ? pair.members[0] : intro.pick);
});
document.getElementById('pairStart').addEventListener('click', () => document.getElementById('start').click());
