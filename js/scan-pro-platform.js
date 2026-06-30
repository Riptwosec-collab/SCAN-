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
    recommendedPreset:extra.recommendedPreset||'auto',
    recommendedScale:extra.recommendedScale||null,
    preserveLineBreaks:!!extra.preserveLineBreaks,
    contentType:extra.contentType||'unknown',
    createdAt:new Date().toISOString()
  };
}

function setProcessingState(state,detail=''){
  AppState.processingState=state;
  AppState.processingDetail=detail;
  renderScanProDashboard();
}

function analyzeAdaptiveImage(canvas,analysis={}){
  if(!canvas)return null;
  const quality=typeof analyzeCanvasQuality==='function'?analyzeCanvasQuality(canvas):null;
  const brightness=typeof getCanvasBrightness==='function'?getCanvasBrightness(canvas):null;
  const width=canvas.width;
  const height=canvas.height;
  const minSide=Math.min(width,height);
  const maxSide=Math.max(width,height);
  const name=String(analysis.name||AppState.sourceName||'').toLowerCase();
  const mime=String(analysis.mime||AppState.imageFile?.type||'').toLowerCase();
  const isScreenshot=/png|webp/.test(mime)||/screenshot|screen|capture|line|chat|log/.test(name);
  const darkBackground=(brightness?.avg??quality?.avg??255)<118&&(brightness?.darkRatio??quality?.darkRatio??0)>.32;
  const whiteText=darkBackground&&(brightness?.lightRatio??quality?.lightRatio??0)>.015;
  const lowLight=(brightness?.avg??quality?.avg??255)<86;
  const blurry=(quality?.blur??99)<18;
  const lowContrast=(quality?.contrast??99)<38;
  const smallText=minSide<720||maxSide>2200;
  const aspect=width/Math.max(1,height);
  const landscape=aspect>1.35;
  const tableLike=detectImageTableLike(canvas);
  const listLike=landscape||/schedule|trip|itinerary|list|เวลา|รายการ|เดินทาง/.test(name);
  const receiptLike=/receipt|bill|invoice|slip|ใบเสร็จ|บิล/.test(name);
  const codeLike=/log|config|code|json|yaml|terminal|console|router|switch|vlan|interface/.test(name);
  const posterLike=/menu|poster|sign|ป้าย|เมนู/.test(name);
  const bookLike=/book|page|หนังสือ/.test(name);
  let imageType='raw/unknown';
  if(codeLike)imageType='code-config-log';
  else if(tableLike)imageType='table';
  else if(receiptLike)imageType='receipt';
  else if(darkBackground&&whiteText)imageType=listLike?'list-schedule':'screenshot-dark';
  else if(isScreenshot)imageType='screenshot-light';
  else if(bookLike)imageType='book-page';
  else if(posterLike)imageType='poster/menu/sign';
  else if(smallText)imageType='small-text';
  else if(lowLight)imageType='low-light';
  else if(blurry)imageType='blurry-text';
  else imageType='document-photo';
  if(listLike&&imageType==='screenshot-light')imageType='list-schedule';
  const config=IMAGE_TYPE_CONFIG[imageType]||IMAGE_TYPE_CONFIG['raw/unknown'];
  const warnings=[];
  if(smallText)warnings.push('small text');
  if(lowLight)warnings.push('low light');
  if(blurry)warnings.push('possible blur');
  if(lowContrast)warnings.push('low contrast');
  if(tableLike)warnings.push('table-like lines');
  if(darkBackground)warnings.push('dark background');
  return {
    imageType,
    brightness:Math.round(brightness?.avg??quality?.avg??0),
    contrast:Math.round(quality?.contrast??0),
    blur:Math.round(quality?.blur??0),
    noiseScore:estimateImageNoise(canvas),
    textSize:smallText?'small':'normal',
    resolution:width+'x'+height,
    skewAngle:0,
    screenshot:isScreenshot,
    cameraPhoto:!isScreenshot,
    tableLike,
    denseParagraph:['document-photo','book-page'].includes(imageType),
    listLike,
    codeLike,
    recommendedPreset:config.preset,
    recommendedOcrStrategy:config.strategy,
    cleanupMode:config.cleanup,
    warnings
  };
}

function estimateImageNoise(canvas){
  if(!canvas)return 0;
  const quality=typeof getImageStats==='function'?getImageStats(canvas):null;
  const blur=quality?.blur??25;
  const contrast=quality?.contrast??50;
  return Math.max(0,Math.min(100,Math.round((contrast<30?20:0)+(blur<16?25:0))));
}

function detectImageTableLike(canvas){
  if(!canvas)return false;
  const probe=document.createElement('canvas');
  const scale=Math.max(canvas.width,canvas.height)>700?700/Math.max(canvas.width,canvas.height):1;
  probe.width=Math.max(1,Math.round(canvas.width*scale));
  probe.height=Math.max(1,Math.round(canvas.height*scale));
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(canvas,0,0,probe.width,probe.height);
  const data=ctx.getImageData(0,0,probe.width,probe.height).data;
  let horizontal=0,vertical=0;
  for(let y=0;y<probe.height;y+=3){
    let ink=0;
    for(let x=0;x<probe.width;x+=2){
      const i=(y*probe.width+x)*4;
      const g=.299*data[i]+.587*data[i+1]+.114*data[i+2];
      if(g<90||g>210)ink++;
    }
    if(ink>probe.width*.22)horizontal++;
  }
  for(let x=0;x<probe.width;x+=4){
    let ink=0;
    for(let y=0;y<probe.height;y+=2){
      const i=(y*probe.width+x)*4;
      const g=.299*data[i]+.587*data[i+1]+.114*data[i+2];
      if(g<90||g>210)ink++;
    }
    if(ink>probe.height*.18)vertical++;
  }
  return horizontal>=3&&vertical>=2;
}

const IMAGE_TYPE_CONFIG={
  'document-photo':{preset:'document-photo',cleanup:'paragraph-safe',strategy:'multi-pass accurate OCR'},
  'screenshot-light':{preset:'screenshot-light',cleanup:'mixed-thai-eng',strategy:'sparse text OCR'},
  'screenshot-dark':{preset:'screenshot-dark',cleanup:'list-safe',strategy:'line-by-line OCR'},
  receipt:{preset:'receipt',cleanup:'receipt-safe',strategy:'single block + sparse text OCR'},
  table:{preset:'table-image',cleanup:'table-safe',strategy:'table-aware OCR'},
  'book-page':{preset:'book-page',cleanup:'paragraph-safe',strategy:'paragraph-safe OCR'},
  'poster/menu/sign':{preset:'poster-menu-sign',cleanup:'mixed-thai-eng',strategy:'sparse text OCR'},
  'small-text':{preset:'small-text',cleanup:'mixed-thai-eng',strategy:'multi-pass accurate OCR'},
  'low-light':{preset:'low-light',cleanup:'mixed-thai-eng',strategy:'multi-pass accurate OCR'},
  'blurry-text':{preset:'blurry-text',cleanup:'mixed-thai-eng',strategy:'multi-pass accurate OCR'},
  'code-config-log':{preset:'code-config-log',cleanup:'code-config-safe',strategy:'code-safe OCR'},
  'list-schedule':{preset:'list-schedule',cleanup:'list-safe',strategy:'line-by-line OCR'},
  'raw/unknown':{preset:'auto',cleanup:'safe',strategy:'multi-pass accurate OCR'}
};

function setScanProChecked(id,value){
  const el=$(id);
  if(el)el.checked=!!value;
}

function setScanProSelect(id,value){
  const el=$(id);
  if(el&&value!==undefined&&value!==null)el.value=value;
}

function buildScanProAutoConfig(context={}){
  const analysis=context.analysis||AppState.fileAnalysis||{};
  const quality=context.quality||AppState.fileQuality||{};
  const adaptive=context.adaptive||AppState.adaptiveImageAnalysis||null;
  const fileName=(analysis.name||AppState.sourceName||'').toLowerCase();
  const isPdf=analysis.type==='pdf'||AppState.tab==='pdf';
  const isLandscape=(analysis.orientation||AppState.pdfOrientation)==='landscape';
  const isDark=(quality.avg&&quality.avg<118&&quality.darkRatio>.34)||quality.darkRatio>.52;
  const isLowQuality=(quality.score&&quality.score<72)||quality.blur<18||quality.contrast<38;
  const looksTable=isLandscape||/table|sheet|excel|csv|ตาราง|รายงาน|ราคา|invoice|receipt|bill/.test(fileName);
  const looksTicket=/ticket|incident|noc|network|alert|แจ้งเตือน/.test(fileName);
  const looksEmail=/mail|email|outlook|gmail/.test(fileName);
  let config={
    skill:'general',
    language:'tha+eng',
    preset:'thai-clear',
    mode:'clean',
    cleanup:'safe',
    engine:'auto',
    orientation:isLandscape?'landscape':'portrait',
    upscale:true,
    threshold:!isDark,
    autoEnhance:true,
    autoCropDoc:!isDark,
    cleanThai:true,
    itDictionary:true,
    removeNoise:false,
    reason:'Thai + English cleanup'
  };
  if(adaptive?.recommendedPreset){
    config={
      ...config,
      preset:adaptive.recommendedPreset,
      cleanup:adaptive.cleanupMode||config.cleanup,
      mode:adaptive.imageType==='code-config-log'?'plain':adaptive.imageType==='table'?'table':adaptive.imageType==='list-schedule'?'capture-list':adaptive.denseParagraph?'document':config.mode,
      threshold:!['screenshot-dark','list-schedule','code-config-log'].includes(adaptive.imageType),
      autoCropDoc:['document-photo','book-page','receipt','low-light','blurry-text'].includes(adaptive.imageType),
      itDictionary:adaptive.imageType!=='code-config-log',
      removeNoise:false,
      recommendedScale:['small-text','screenshot-dark','list-schedule'].includes(adaptive.imageType)?3:null,
      preserveLineBreaks:['list-schedule','code-config-log','table'].includes(adaptive.imageType),
      contentType:adaptive.imageType,
      reason:'adaptive image type: '+adaptive.imageType
    };
  }
  if(isPdf){
    config={...config,skill:'searchable-pdf',preset:'document',mode:'document',cleanup:'normal',autoCropDoc:true,reason:'PDF document flow'};
  }
  if(isDark){
    config={...config,skill:'dark-thai-screenshot',preset:'screenshot-dark',mode:'capture-list',cleanup:'list-safe',threshold:false,autoCropDoc:false,itDictionary:false,removeNoise:false,recommendedScale:3,preserveLineBreaks:true,contentType:'itinerary-list',reason:'dark screenshot detected'};
  }else if(looksTable){
    config={...config,skill:'table',preset:'table',mode:'table',cleanup:'normal',orientation:'landscape',threshold:true,reason:'table or landscape layout'};
  }else if(looksTicket){
    config={...config,skill:'screenshot',preset:'ticket',mode:'ticket',cleanup:'strict',threshold:true,reason:'ticket / NOC text'};
  }else if(looksEmail){
    config={...config,skill:'screenshot',preset:'email-alert',mode:'email',cleanup:'strict',threshold:true,reason:'email-like document'};
  }else if(isLowQuality){
    config={...config,skill:'handwriting',preset:'mobile',mode:'clean',cleanup:'light',threshold:true,autoCropDoc:true,reason:'low quality image boost'};
  }
  if(adaptive?.recommendedPreset&&!isPdf){
    config={
      ...config,
      preset:adaptive.recommendedPreset,
      cleanup:adaptive.cleanupMode||config.cleanup,
      mode:adaptive.imageType==='code-config-log'?'plain':adaptive.imageType==='table'?'table':adaptive.imageType==='list-schedule'?'capture-list':adaptive.denseParagraph?'document':config.mode,
      threshold:!['screenshot-dark','list-schedule','code-config-log'].includes(adaptive.imageType),
      autoCropDoc:['document-photo','book-page','receipt','low-light','blurry-text'].includes(adaptive.imageType),
      itDictionary:adaptive.imageType!=='code-config-log',
      removeNoise:false,
      recommendedScale:['small-text','screenshot-dark','list-schedule'].includes(adaptive.imageType)?3:null,
      preserveLineBreaks:['list-schedule','code-config-log','table'].includes(adaptive.imageType),
      contentType:adaptive.imageType,
      reason:'adaptive image type: '+adaptive.imageType
    };
  }
  return config;
}

function applyScanProAutoConfig(config,reason='auto background'){
  if(!config||AppState.scanProAutoMode===false)return null;
  AppState.autoTuning={...config,reason,appliedAt:new Date().toISOString()};
  if(AppState.fileAnalysis){
    AppState.fileAnalysis={
      ...AppState.fileAnalysis,
      recommendedPreset:config.preset,
      recommendedScale:config.recommendedScale||AppState.fileAnalysis.recommendedScale,
      preserveLineBreaks:!!config.preserveLineBreaks,
      contentType:config.contentType||AppState.fileAnalysis.contentType
    };
  }
  if(config.skill&&typeof applyOcrSkill==='function')applyOcrSkill(config.skill,{silent:true});
  setScanProSelect('langSelect',config.language);
  setScanProSelect('ocrPreset',config.preset);
  setScanProSelect('modeSelect',config.mode);
  setScanProSelect('cleanupLevel',config.cleanup);
  setScanProSelect('ocrEngine',config.engine);
  setScanProSelect('pdfOrientation',config.orientation);
  setScanProChecked('upscale',config.upscale);
  setScanProChecked('threshold',config.threshold);
  setScanProChecked('autoEnhance',config.autoEnhance);
  setScanProChecked('autoCropDoc',config.autoCropDoc);
  setScanProChecked('cleanThai',config.cleanThai);
  setScanProChecked('itDictionary',config.itDictionary);
  setScanProChecked('removeNoise',config.removeNoise);
  setScanProChecked('highlightFixes',true);
  AppState.ocrPreset=config.preset;
  AppState.cleanupLevel=config.cleanup;
  AppState.ocrEngine=config.engine;
  AppState.pdfOrientation=config.orientation;
  if(typeof syncQuickModeButtons==='function')syncQuickModeButtons();
  if(typeof renderReadyChecklist==='function')renderReadyChecklist();
  renderScanProDashboard();
  return AppState.autoTuning;
}

function runScanProBackgroundAuto(context={}){
  if(AppState.scanProAutoMode===false)return null;
  const config=buildScanProAutoConfig(context);
  const applied=applyScanProAutoConfig(config,config.reason);
  if(applied&&typeof setStatus==='function')setStatus('Auto background tuned: '+config.reason,'ok');
  return applied;
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
    autoTuning:record.autoTuning||AppState.autoTuning||null,
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
    processingDetail:AppState.processingDetail||'',
    autoTuning:AppState.autoTuning||null
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
    '<div class="pro-auto"><b>Auto Background</b><span>'+(stats.autoTuning?escapeHtml(stats.autoTuning.reason)+' · '+escapeHtml(stats.autoTuning.preset)+' · '+escapeHtml(stats.autoTuning.cleanup):'Waiting for file analysis')+'</span></div>'+
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
    autoTuning:AppState.autoTuning||null,
    settings:getScanProSettings(),
    format,
    processingTime:AppState.processingTime||null
  };
}
