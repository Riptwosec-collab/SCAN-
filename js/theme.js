const THEME_KEY='riptwosec-scan-theme';
const THEME_META_COLORS={
  carbon:'#0b0e11',
  ivory:'#f7f3ea',
  sage:'#eef7f0',
  midnight:'#08111f'
};

function applyTheme(theme){
  const selected=THEME_META_COLORS[theme]?theme:'carbon';
  document.body.dataset.theme=selected;
  AppState.theme=selected;
  localStorage.setItem(THEME_KEY,selected);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',THEME_META_COLORS[selected]);
  const select=document.getElementById('themeSelect');
  if(select)select.value=selected;
}

function initTheme(){
  const saved=localStorage.getItem(THEME_KEY)||'carbon';
  applyTheme(saved);
  const select=document.getElementById('themeSelect');
  if(!select)return;
  select.addEventListener('change',()=>applyTheme(select.value));
}

document.addEventListener('DOMContentLoaded',initTheme);
