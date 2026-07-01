const THEME_KEY='riptwosec-scan-theme';
const THEME_META_COLORS={
  carbon:'#080706',
  ivory:'#efe3cf',
  pearl:'#edf4f6',
  sage:'#071b14',
  midnight:'#08111f'
};
const SIMPLE_THEME_OPTIONS=[
  {value:'pearl',label:'Light'},
  {value:'carbon',label:'Dark'},
  {value:'midnight',label:'Pro Gold'}
];
const SIMPLE_PRESET_OPTIONS=[
  {value:'document',label:'เอกสารทั่วไป'},
  {value:'invoice',label:'ใบเสร็จ / ใบกำกับภาษี'},
  {value:'mobile',label:'ภาพจากมือถือ'},
  {value:'table',label:'ตาราง / ฟอร์ม'}
];

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
  document.dispatchEvent(new CustomEvent('riptwosec:themechange',{detail:{theme:selected}}));
}

function applyThemeControlContrast(theme){
  const controlIds=['themeSelect','ocrSkillSelect','pdfSkillSelect','autoDeleteMinutes','paddleEndpoint','langSelect','modeSelect','ocrPreset','cleanupLevel','ocrEngine','pdfOrientation','wizardDocType','wizardQuality','wizardLayout'];
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

function setSelectOptions(select,items,fallback){
  if(!select)return fallback;
  const current=select.value;
  select.innerHTML=items.map(item=>'<option value="'+item.value+'">'+item.label+'</option>').join('');
  const values=items.map(item=>item.value);
  const next=values.includes(current)?current:fallback;
  select.value=next;
  return next;
}

function initTheme(){
  const select=document.getElementById('themeSelect');
  const saved=localStorage.getItem(THEME_KEY)||'carbon';
  const allowed=SIMPLE_THEME_OPTIONS.map(item=>item.value);
  if(select)setSelectOptions(select,SIMPLE_THEME_OPTIONS,allowed.includes(saved)?saved:'carbon');
  applyTheme(allowed.includes(saved)?saved:'carbon');
  if(!select)return;
  select.addEventListener('change',()=>applyTheme(select.value));
}

document.addEventListener('DOMContentLoaded',initTheme);

function makeUiDrawer(id,title){
  let drawer=document.getElementById(id);
  if(drawer)return drawer;
  drawer=document.createElement('details');
  drawer.id=id;
  drawer.className='advanced-ui-drawer';
  drawer.style.marginTop='10px';
  drawer.style.border='1px solid rgba(148,163,184,.22)';
  drawer.style.borderRadius='16px';
  drawer.style.padding='10px';
  drawer.style.background='rgba(255,255,255,.05)';
  drawer.innerHTML='<summary style="cursor:pointer;font-weight:800">'+title+'</summary><div class="advanced-ui-body" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>';
  return drawer;
}

function moveButtonsToDrawer(buttons,drawer){
  const body=drawer.querySelector('.advanced-ui-body');
  buttons.forEach(button=>{
    if(button&&body&&!body.contains(button))body.appendChild(button);
  });
}

function simplifyPresetOptions(){
  const preset=document.getElementById('ocrPreset');
  const value=setSelectOptions(preset,SIMPLE_PRESET_OPTIONS,'document');
  if(window.AppState)AppState.ocrPreset=value;
}

function simplifyTopExports(){
  ['csvBtn','jsonBtn'].forEach(id=>{
    const button=document.getElementById(id);
    if(button)button.style.display='none';
  });
  const doc=document.getElementById('docBtn');
  if(doc){
    doc.innerHTML='<span aria-hidden="true">DX</span>DOCX';
    doc.onclick=()=>typeof exportDocx==='function'?exportDocx():exportDoc?.();
  }
}

function simplifyNextActions(){
  const grid=document.querySelector('#nextActions .next-grid');
  if(!grid)return;
  const advancedValues=['doc','csv','json','excel','markdown','searchpdf'];
  const advancedButtons=advancedValues.map(value=>document.querySelector('[data-next-action="'+value+'"]')).filter(Boolean);
  if(!advancedButtons.length)return;
  const drawer=makeUiDrawer('advancedExportDrawer','Advanced Export: CSV / JSON / XLS / MD / Searchable PDF');
  if(!drawer.parentNode)grid.after(drawer);
  moveButtonsToDrawer(advancedButtons,drawer);
}

function simplifySearchTools(){
  const row=document.querySelector('.search-row');
  if(!row)return;
  const buttons=['compareBtn','undoCleanBtn','goLowBtn','highlightSuspiciousBtn','reviewRequiredBtn'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!buttons.length)return;
  const drawer=makeUiDrawer('advancedToolsDrawer','เครื่องมือขั้นสูง');
  if(!drawer.parentNode)row.after(drawer);
  moveButtonsToDrawer(buttons,drawer);
}

function simplifyPrivacyAndPdfTools(){
  const pdfCompare=document.getElementById('pdfCompareBox');
  if(pdfCompare)pdfCompare.style.display='none';

  const autoDelete=document.getElementById('autoDeleteMinutes');
  if(autoDelete){
    autoDelete.value='0';
    const row=autoDelete.closest('.row');
    if(row)row.style.display='none';
  }

  if(!document.getElementById('globalPrivacyRow')){
    const oldPrivacy=document.getElementById('privacyMode');
    const anchor=document.getElementById('readyChecklist')||document.querySelector('.input-panel');
    const row=document.createElement('label');
    row.id='globalPrivacyRow';
    row.className='privacy-lite-toggle';
    row.style.display='flex';
    row.style.alignItems='center';
    row.style.gap='8px';
    row.style.margin='12px 0';
    row.innerHTML='<input id="globalPrivacyMode" type="checkbox"> <span>ไม่บันทึกประวัติ</span>';
    anchor?.after(row);
    const global=document.getElementById('globalPrivacyMode');
    if(global&&oldPrivacy){
      global.checked=oldPrivacy.checked;
      global.onchange=()=>{
        oldPrivacy.checked=global.checked;
        if(window.AppState)AppState.privacyMode=global.checked;
      };
    }
  }
}

function simplifyEngineAndScan(){
  const engine=document.getElementById('ocrEngine');
  if(engine)engine.value='auto';
  const scan=document.getElementById('scanBtn');
  if(scan)scan.textContent='⚡ สแกนอัตโนมัติ';
  const advanced=document.querySelector('.advanced-options summary');
  if(advanced)advanced.textContent='เครื่องมือขั้นสูง';
}

function simplifyScanUi(){
  const theme=document.getElementById('themeSelect');
  if(theme&&theme.options.length>3){
    const next=setSelectOptions(theme,SIMPLE_THEME_OPTIONS,['pearl','carbon','midnight'].includes(theme.value)?theme.value:'carbon');
    if(typeof applyTheme==='function')applyTheme(next);
  }
  simplifyPresetOptions();
  simplifyTopExports();
  simplifyNextActions();
  simplifySearchTools();
  simplifyPrivacyAndPdfTools();
  simplifyEngineAndScan();
}

function loadCssOnce(href,id){
  if(document.getElementById(id))return;
  const link=document.createElement('link');
  link.id=id;
  link.rel='stylesheet';
  link.href=href;
  document.head.appendChild(link);
}

function loadScriptOnce(src,id){
  if(document.getElementById(id))return;
  const script=document.createElement('script');
  script.id=id;
  script.src=src;
  script.defer=true;
  document.body.appendChild(script);
}

function ensureLiveOcrAssets(){
  loadCssOnce('css/multi-ocr-live-ui.css?v=2','multiOcrLiveCss');
  loadScriptOnce('js/multi-ocr-live-ui.js?v=1','multiOcrLiveScript');
}

function ensureOcrFormatterAssets(){
  loadCssOnce('css/ocr-layout-formatter.css?v=1','ocrLayoutFormatterCss');
  loadScriptOnce('js/ocr-layout-formatter.js?v=1','ocrLayoutFormatterScript');
}

function ensureOqcStrictAssets(){
  loadScriptOnce('js/oqc-strict-review.js?v=1','oqcStrictReviewScript');
}

function ensureCyberAiTheme(){
  loadCssOnce('css/cyber-ai-theme.css?v=1','cyberAiThemeCss');
}

window.simplifyScanUi=simplifyScanUi;
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(simplifyScanUi,0);
  setTimeout(ensureCyberAiTheme,20);
  setTimeout(ensureLiveOcrAssets,40);
  setTimeout(ensureOcrFormatterAssets,80);
  setTimeout(ensureOqcStrictAssets,120);
});
document.addEventListener('riptwosec:themechange',()=>setTimeout(simplifyScanUi,0));
