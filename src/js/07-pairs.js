// Curated co-narrators. Each turn uses that character's existing lesson script.
// Relationship sources: https://aivoice.jp/character/kotonoha/
// https://greenfunding.jp/pub/projects/774 (SSS, the Tohoku characters' creator).
const NARRATOR_PAIRS = {
  reimu_marisa: { members: ['reimu', 'marisa'], name: 'Reimu + Marisa', relation: 'Yukkuri duo', note: 'Browser voices with different pitch and pacing; original AquesTalk voices are not connected.',
    hello: [
      {ja:'魔理沙、今日は二人でお茶の時間をご案内しましょう。',yomi:'まりさ、きょうはふたりでおちゃのじかんをごあんないしましょう。',en:'Marisa, let’s guide everyone through tea time together.'},
      {ja:'任せてくれ、霊夢。私も順番に解説するぜ。',yomi:'まかせてくれ、れいむ。わたしもじゅんばんにかいせつするぜ。',en:'Leave it to me, Reimu. I’ll take a turn explaining too.'}] },
  akane_aoi: { members: ['akane', 'aoi'], name: 'Akane + Aoi', relation: 'Kotonoha twin sisters', note: 'Browser voices; the A.I.VOICE engine is not connected.',
    hello: [
      {ja:'葵、今日は一緒にお茶のこと、案内しよか。',yomi:'あおい、きょうはいっしょにおちゃのこと、あんないしよか。',en:'Aoi, shall we guide everyone through tea together today?'},
      {ja:'うん、お姉ちゃん。私も順番に説明するね。',yomi:'うん、おねえちゃん。わたしもじゅんばんにせつめいするね。',en:'Yes, big sister. I’ll take a turn explaining too.'}] },
  zunko_kiritan: { members: ['zunko', 'kiritan'], name: 'Zunko + Kiritan', relation: 'Tohoku sisters · middle and youngest', note: 'Uses their VOICEVOX voices when available; otherwise browser voices.',
    hello: [
      {ja:'きりたん、今日は一緒にお茶をご案内しましょう。',yomi:'きりたん、きょうはいっしょにおちゃをごあんないしましょう。',en:'Kiritan, let’s guide everyone through tea together today.'},
      {ja:'はい、ずん姉さま。わたくしも順番に解説します。',yomi:'はい、ずんねえさま。わたくしもじゅんばんにかいせつします。',en:'Of course, Zunko. I’ll take a turn explaining too.'}] },
  itako_zunko: { members: ['itako', 'zunko'], name: 'Itako + Zunko', relation: 'Tohoku sisters · eldest and middle', note: 'Uses their VOICEVOX voices when available; otherwise browser voices.',
    hello: [
      {ja:'ずん子、今日は二人でお茶をご案内しますわ。',yomi:'ずんこ、きょうはふたりでおちゃをごあんないしますわ。',en:'Zunko, today we’ll guide everyone through tea together.'},
      {ja:'はい、お姉ちゃん。私も順番に説明しますね。',yomi:'はい、おねえちゃん。わたしもじゅんばんにせつめいしますね。',en:'Yes, big sister. I’ll take a turn explaining too.'}] },
  itako_kiritan: { members: ['itako', 'kiritan'], name: 'Itako + Kiritan', relation: 'Tohoku sisters · eldest and youngest', note: 'Uses their VOICEVOX voices when available; otherwise browser voices.',
    hello: [
      {ja:'きりたん、今日は一緒にお茶をご案内しますわ。',yomi:'きりたん、きょうはいっしょにおちゃをごあんないしますわ。',en:'Kiritan, let’s guide everyone through tea together today.'},
      {ja:'はい、タコねえさま。解説は交代で進めましょう。',yomi:'はい、たこねえさま。かいせつはこうたいですすめましょう。',en:'Yes, Itako. Let’s take turns explaining.'}] },
};
let PAIR_ID = '';
{
  const params = new URLSearchParams(location.hash.slice(1));
  let saved = '';
  try { saved = localStorage.getItem('sado.pair') || ''; } catch(e) {}
  const id = params.has('pair') ? params.get('pair') : params.has('teacher') ? '' : saved;
  if (NARRATOR_PAIRS[id]) {
    PAIR_ID = id;
    TEACHER = TEACHERS[NARRATOR_PAIRS[id].members[0]];
  }
}
function activePair() {
  const p = NARRATOR_PAIRS[PAIR_ID];
  return p && p.members[0] === TEACHER.id ? p : null;
}
function narratorForTurn(k) {
  const p = activePair();
  return p ? TEACHERS[p.members[k % 2]] : TEACHER;
}
function narratedUnit(u, teacher) {
  return activePair() && unitOk(u) ? Object.assign({},u,{speaker:teacher.id}) : u;
}
function pairIntro(u,i,k) {
  const p = activePair();
  if (!p || i !== 0 || k > 1 || !unitOk(u)) return u;
  const hello = p.hello[k];
  return Object.assign({},u,{ja:hello.ja + u.ja,yomi:hello.yomi + u.yomi,en:hello.en + ' ' + u.en});
}
