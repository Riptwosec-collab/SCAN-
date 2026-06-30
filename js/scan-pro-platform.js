const SCAN_PRO_VERSION='1.0.0-foundation';
const SCAN_PRO_HISTORY_KEY='scan-pro-ai.history.v1';
const SCAN_PRO_SETTINGS_KEY='scan-pro-ai.settings.v1';

const PROCESSING_STATES={
  idle:'idle',
  analyzing:'analyzing',
  preprocessing:'preprocessing',
  renderingPdf:'rendering_pdf',
  recognizing:'recognizing',
  cleaning:'cleaning',
  exporting:'exporting',
  done:'done',
  error:'error',
  cancelled:'cancelled'
};

const DEFAULT_SCAN_PRO_SETTINGS={
  defaultLanguage:'tha+eng',
  defaultOcrMode:'balanced',
  defaultCleanupMode:'safe',
  defaultImagePreset:'auto',
  autoSaveHistory:true,
  maxHistoryItems:50,
  theme:'carbon',
  exportDefaultFormat:'txt',
  pdfDefaultPageRange:'all',
  performanceMode:'balanced'
};

function readJsonStorage(key,fallback){
  try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}
}

function writeJsonStorage(key,value){
  localStorage.setItem(key,JSON.stringify(value));
}

function getScanProSettings(){
  return {...DEFAULT_SCAN_PRO_SETTINGS,...readJsonStorage(SCAN_PRO_SETTINGS_KEY,{})};
}

function saveScanProSettings(patch={}){
  const next={...getScanProSettings(),...patch,updatedAt:new Date().toISOString()};
  writeJsonStorage(SCAN_PRO_SETTINGS_KEY,next);
  return next;
}

function formatBytes(bytes=0){
  if(!bytes)return '0 B';
  const units=['B','KB','MB','GB'];
  let value=bytes;
  let unit=0;
  while(value>=1024&&unit<units.length-1){value/=1024;unit++}
  return (value>=10?value.toFixed(0):value.toFixed(1))+' '+units[unit];
}

function analyzeUploadedFile(file,extra={}){
  if(!file)return null;
  const name=file.name||'clipboard-image';
  const extension=(name.split('.').pop()||'').toLowerCase();
  const type=file.type||'';
  const isPdf=type==='application/pdf'||extension==='pdf';
  const isImage=type.startsWith('image/')||['jpg','jpeg','png','webp'].includes(extension);
  const supported=isPdf||isImage;
  const maxSize=isPdf?80*1024*1024:25*1024*1024;
  const warnings=[];
  if(!supported)warnings.push('unsupported-file-type');
  if(file.size>maxSize)warnings.push('large-file');
  return {
    id:'file_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
    name,
    extension,
    type:isPdf?'pdf':isImage?'image':'unknown',
    mime:type,
    size:file.size||0,
    sizeLabel:formatBytes(file.size||0),
    supported,
    warnings,
    pageCount:extra.pageCount||0,
    orientation:extra.orientation||'unknown',
    brightness:extra.brightness||null,
    likelyKind:isPdf?'pdf':type.includes('png')||type.includes('webp')?'screenshot/image':'image',
    createdAt:new Date().toISOString()
  };
}

function setProcessingState(state,detail=''){
  AppState.processingState=state;
  AppState.processingDetail=detail;
  renderScanProDashboard();
}

function getScanProHistory(){
  return readJsonStorage(SCAN_PRO_HISTORY_KEY,[]);
}

function saveScanProHistoryRecord(record={}){
  const settings=getScanProSettings();
  if(settings.autoSaveHistory===false||AppState.privacyMode)return null;
  const items=getScanProHistory();
  const text=record.cleanedText||record.rawText||AppState.lastText||AppState.rawText||'';
  if(!String(text).trim())return null;
  const next={
    id:record.id||'ocr_'+Date.now(),
    fileName:record.fileName||AppState.sourceName||'untitled',
    fileType:record.fileType||AppState.fileAnalysis?.type||AppState.tab||'unknown',
    fileSize:record.fileSize??AppState.fileAnalysis?.size??0,
    createdAt:record.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString(),
    pageCount:record.pageCount??AppState.pdfPages??1,
    language:record.language||$('langSelect')?.value||'',
    mode:record.mode||$('modeSelect')?.value||'',
    confidence:record.confidence??AppState.confidence??null,
    charCount:String(text).length,
    wordCount:String(text).trim().split(/\s+/).filter(Boolean).length,
    rawText:record.rawText||AppState.rawText||'',
    cleanedText:record.cleanedText||AppState.lastText||'',
    thumbnail:record.thumbnail||AppState.thumbnail||'',
    exportFormats:record.exportFormats||[],
    processingTime:record.processingTime??AppState.processingTime??null,
    settings:{
      ocrPreset:$('ocrPreset')?.value||AppState.ocrPreset,
      cleanupLevel:$('cleanupLevel')?.value||AppState.cleanupLevel,
      engine:$('ocrEngine')?.value||AppState.ocrEngine,
      pdfOrientation:AppState.pdfOrientation
    }
  };
  const deduped=[next,...items.filter(item=>item.id!==next.id)];
  writeJsonStorage(SCAN_PRO_HISTORY_KEY,deduped.slice(0,settings.maxHistoryItems||50));
  renderScanProDashboard();
  if(typeof renderHistory==='function')renderHistory();
  return next;
}

function deleteScanProHistoryItem(id){
  writeJsonStorage(SCAN_PRO_HISTORY_KEY,getScanProHistory().filter(item=>item.id!==id));
  renderScanProDashboard();
  if(typeof renderHistory==='function')renderHistory();
}

function clearScanProHistory(){
  writeJsonStorage(SCAN_PRO_HISTORY_KEY,[]);
  renderScanProDashboard();
  if(typeof renderHistory==='function')renderHistory();
}

function loadScanProHistoryItem(id){
  const item=getScanProHistory().find(entry=>entry.id===id);
  if(!item)return;
  AppState.sourceName=item.fileName;
  AppState.rawText=item.rawText||'';
  AppState.lastText=item.cleanedText||item.rawText||'';
  AppState.confidence=item.confidence||AppState.confidence;
  if(typeof showOutput==='function')showOutput(AppState.lastText);
  if(typeof renderComparePanel==='function')renderComparePanel();
  setStatus('Loaded history item: '+item.fileName,'ok');
}

function getScanProDashboardStats(){
  const items=getScanProHistory();
  const today=new Date().toISOString().slice(0,10);
  const todayItems=items.filter(item=>String(item.createdAt||'').slice(0,10)===today);
  const totalPages=items.reduce((sum,item)=>sum+(Number(item.pageCount)||0),0);
  const totalChars=items.reduce((sum,item)=>sum+(Number(item.charCount)||0),0);
  const storageBytes=new Blob([JSON.stringify(items)]).size;
  const modes=items.reduce((acc,item)=>{acc[item.mode||'unknown']=(acc[item.mode||'unknown']||0)+1;return acc},{});
  const mostUsedMode=Object.entries(modes).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-';
  return {
    totalToday:todayItems.length,
    totalPages,
    totalCharacters:totalChars,
    recentFiles:items.slice(0,5),
    mostUsedMode,
    storageUsed:formatBytes(storageBytes),
    processingState:AppState.processingState||PROCESSING_STATES.idle,
    processingDetail:AppState.processingDetail||''
  };
}

function renderScanProDashboard(){
  const box=$('scanProDashboard');
  if(!box)return;
  const stats=getScanProDashboardStats();
  const file=AppState.fileAnalysis;
  const recent=stats.recentFiles.map(item=>
    '<button type="button" data-pro-history="'+escapeHtml(item.id)+'"><b>'+escapeHtml(item.fileName)+'</b><span>'+new Date(item.createdAt).toLocaleString('th-TH')+' · '+(item.charCount||0)+' chars</span></button>'
  ).join('');
  box.innerHTML=
    '<div class="pro-stat"><b>'+stats.totalToday+'</b><span>Total OCR Today</span></div>'+
    '<div class="pro-stat"><b>'+stats.totalPages+'</b><span>Total Pages</span></div>'+
    '<div class="pro-stat"><b>'+stats.totalCharacters+'</b><span>Total Characters</span></div>'+
    '<div class="pro-stat"><b>'+escapeHtml(stats.mostUsedMode)+'</b><span>Most Used Mode</span></div>'+
    '<div class="pro-stat"><b>'+stats.storageUsed+'</b><span>Storage Used</span></div>'+
    '<div class="pro-stat"><b>'+escapeHtml(stats.processingState)+'</b><span>'+escapeHtml(stats.processingDetail||'Processing State')+'</span></div>'+
    '<div class="pro-file-intel"><b>File Intelligence</b><span>'+(file?escapeHtml(file.name)+' · '+escapeHtml(file.type)+' · '+escapeHtml(file.sizeLabel):'No file selected')+'</span>'+(file?.warnings?.length?'<em>'+file.warnings.map(escapeHtml).join(', ')+'</em>':'')+'</div>'+
    '<div class="pro-recent"><b>Recent Files</b><div>'+(recent||'<span class="hint">No OCR history yet</span>')+'</div></div>'+
    '<div class="pro-actions"><button type="button" data-pro-action="scan-image">Scan Image</button><button type="button" data-pro-action="scan-pdf">Scan PDF</button><button type="button" data-pro-action="paste">Paste Screenshot</button><button type="button" data-pro-action="export-history">Export History</button><button type="button" data-pro-action="clear-history">Clear History</button></div>';
  box.querySelectorAll('[data-pro-history]').forEach(button=>button.onclick=()=>loadScanProHistoryItem(button.dataset.proHistory));
  bindScanProDashboardActions(box);
}

function bindScanProDashboardActions(root=document){
  root.querySelectorAll('[data-pro-action]').forEach(button=>{
    button.onclick=()=>{
      const action=button.dataset.proAction;
      if(action==='scan-image'){switchTab?.('img');$('imgInput')?.click()}
      if(action==='scan-pdf'){switchTab?.('pdf');$('pdfInput')?.click()}
      if(action==='paste')setStatus('Press Ctrl+V to paste a screenshot from clipboard','ok');
      if(action==='export-history')downloadFile('scan-pro-history.json',JSON.stringify(getScanProHistory(),null,2),'application/json');
      if(action==='clear-history')clearScanProHistory();
    };
  });
}

function applyScanProSettingsToUi(){
  const settings=getScanProSettings();
  if($('langSelect'))$('langSelect').value=settings.defaultLanguage;
  if($('cleanupLevel'))$('cleanupLevel').value=settings.defaultCleanupMode;
  if($('ocrPreset'))$('ocrPreset').value=settings.defaultImagePreset;
  AppState.cleanupLevel=settings.defaultCleanupMode;
  AppState.ocrPreset=settings.defaultImagePreset;
}

function collectExportMetadata(format){
  return {
    platform:'SCAN PRO AI',
    version:SCAN_PRO_VERSION,
    fileName:AppState.sourceName||'scan-pro-ai',
    fileType:AppState.fileAnalysis?.type||AppState.tab,
    createdAt:new Date().toISOString(),
    pages:AppState.pdfPageInfo||[],
    rawText:AppState.rawText||'',
    cleanedText:AppState.lastText||$('output')?.innerText||'',
    language:$('langSelect')?.value||'',
    confidence:AppState.confidence,
    blocks:AppState.layoutBlocks||[],
    settings:getScanProSettings(),
    format,
    processingTime:AppState.processingTime||null
  };
}
