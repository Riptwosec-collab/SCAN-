const THEME_KEY='riptwosec-scan-theme';
const THEME_META_COLORS={
  carbon:'#080706',
  ivory:'#f8f4eb',
  sage:'#071b14',
  midnight:'#08111f'
};

function applyTheme(theme){
  const selected=THEME_META_COLORS[theme]?theme:'carbon';
  document.body.dataset.theme=selected;
  AppState.theme=selected;
  localStorage.setItem(THEME_KEY,selected);
  applyThemeControlContrast(selected);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',THEME_META_COLORS[selected]);
  const select=document.getElementById('themeSelect');
  if(select)select.value=selected;
}

function applyThemeControlContrast(theme){
  const controlIds=['themeSelect','langSelect','modeSelect','ocrPreset','cleanupLevel','ocrEngine','pdfOrientation','wizardDocType','wizardQuality','wizardLayout'];
  controlIds.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    ['background','background-color','background-image','border-color','color','-webkit-text-fill-color','color-scheme'].forEach(prop=>el.style.removeProperty(prop));
    if(theme==='ivory'){
      el.style.setProperty('background','#fffaf0','important');
      el.style.setProperty('background-color','#fffaf0','important');
      el.style.setProperty('background-image','none','important');
      el.style.setProperty('border-color','rgba(184,135,53,.48)','important');
      el.style.setProperty('color','#241d13','important');
      el.style.setProperty('-webkit-text-fill-color','#241d13','important');
      el.style.setProperty('color-scheme','light','important');
    }
  });
}

function initTheme(){
  const saved=localStorage.getItem(THEME_KEY)||'carbon';
  applyTheme(saved);
  const select=document.getElementById('themeSelect');
  if(!select)return;
  select.addEventListener('change',()=>applyTheme(select.value));
}

document.addEventListener('DOMContentLoaded',initTheme);
