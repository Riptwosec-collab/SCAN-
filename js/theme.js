const THEME_KEY='riptwosec-scan-theme';
const THEME_META_COLORS={
  carbon:'#080706',
  ivory:'#efe3cf',
  pearl:'#edf4f6',
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
    if(theme==='ivory' || theme==='pearl'){
      const isPearl=theme==='pearl';
      el.style.setProperty('background',isPearl?'#f4fbfb':'#f4ead8','important');
      el.style.setProperty('background-color',isPearl?'#f4fbfb':'#f4ead8','important');
      el.style.setProperty('background-image','none','important');
      el.style.setProperty('border-color',isPearl?'rgba(57,112,135,.46)':'rgba(166,116,38,.50)','important');
      el.style.setProperty('color',isPearl?'#15242b':'#241b10','important');
      el.style.setProperty('-webkit-text-fill-color',isPearl?'#15242b':'#241b10','important');
      el.style.setProperty('color-scheme','light','important');
    }else{
      const palette={
        carbon:{bg:'#181510',border:'rgba(231,195,112,.46)',text:'#fff8e8'},
        sage:{bg:'#0a2b20',border:'rgba(220,182,86,.46)',text:'#f4fff8'},
        midnight:{bg:'#0f1e2f',border:'rgba(230,195,106,.42)',text:'#eef5fb'}
      }[theme]||{bg:'#111820',border:'rgba(180,190,200,.22)',text:'#f8fafc'};
      el.style.setProperty('background',palette.bg,'important');
      el.style.setProperty('background-color',palette.bg,'important');
      el.style.setProperty('background-image','none','important');
      el.style.setProperty('border-color',palette.border,'important');
      el.style.setProperty('color',palette.text,'important');
      el.style.setProperty('-webkit-text-fill-color',palette.text,'important');
      el.style.setProperty('color-scheme','dark','important');
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
