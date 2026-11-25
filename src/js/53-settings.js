// Secondary lesson controls stay behind a single gear; questions stay in the footer.
const settingsPanel = document.getElementById('settingsPanel');
const settingsToggle = document.getElementById('settingsToggle');
function closeSettings(restoreFocus = true) {
  if (settingsPanel.hidden) return;
  settingsPanel.hidden = true;
  settingsToggle.setAttribute('aria-expanded','false');
  if (restoreFocus) settingsToggle.focus({preventScroll:true});
  navPlace();
}
settingsToggle.addEventListener('click',()=>{
  if (!settingsPanel.hidden) return closeSettings();
  settingsPanel.hidden = false;
  settingsToggle.setAttribute('aria-expanded','true');
  document.getElementById('settingsClose').focus({preventScroll:true});
  navPlace();
});
document.getElementById('settingsClose').addEventListener('click',()=>closeSettings());
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && !settingsPanel.hidden){e.preventDefault();closeSettings();}
});
document.addEventListener('pointerdown',e=>{
  if(!settingsPanel.hidden && !settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) closeSettings(false);
});
for(const id of ['teacherBtn','guestToggle']) document.getElementById(id).addEventListener('click',()=>closeSettings(false));
// Keep focus on the selected control while trying camera/audio settings.
