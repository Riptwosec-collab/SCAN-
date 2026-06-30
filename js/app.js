document.addEventListener('DOMContentLoaded',()=>{
  bindAppEvents();
  bindCropCanvas();
  if(typeof applyScanProSettingsToUi==='function')applyScanProSettingsToUi();
  if(typeof renderScanProDashboard==='function')renderScanProDashboard();
  renderHistory();
  renderCustomRules();
  renderReadyChecklist();
  setStatus('พร้อมใช้งาน','ok');
});

function bindAppEvents(){
  $('tabImg').onclick=()=>switchTab('img');
  $('tabPdf').onclick=()=>switchTab('pdf');
  $('tabBatch').onclick=()=>switchTab('batch');

  $('imgInput').onchange=e=>handleImageFile(e.target.files[0]);
  $('pdfInput').onchange=e=>handlePdfFile(e.target.files[0]);
  $('batchInput').onchange=e=>setBatchFiles(e.target.files);

  bindDropZone($('imgDrop'),file=>handleImageFile(file));
  bindDropZone($('pdfDrop'),file=>handlePdfFile(file));
  bindDropZone($('batchDrop'),fileList=>setBatchFiles(fileList),true);

  document.addEventListener('paste',e=>{
    for(const item of e.clipboardData?.items||[]){
      if(item.type.startsWith('image/')){
        switchTab('img');
        handleImageFile(item.getAsFile());
        break;
      }
    }
  });

  $('allPagesBtn').onclick=()=>{
    if(AppState.pdfPages){
      $('pageFrom').value=1;
      $('pageTo').value=AppState.pdfPages;
      document.querySelectorAll('#pdfThumbs .thumb').forEach(x=>x.classList.add('active'));
    }
  };

  $('enableCropBtn').onclick=()=>{
    AppState.cropEnabled=!AppState.cropEnabled;
    $('enableCropBtn').textContent=AppState.cropEnabled?'ปิด Crop':'เปิด Crop';
    setStatus(AppState.cropEnabled?'เปิด Crop แล้ว':'ปิด Crop แล้ว','ok');
  };
  $('resetCropBtn').onclick=resetCrop;

  $('removeImgBtn').onclick=removeImageFile;
  $('removePdfBtn').onclick=removePdfFile;
  $('removeBatchBtn').onclick=removeBatchFiles;

  $('scanBtn').onclick=scanCurrent;
  $('formatBtn').onclick=()=>showCleanedResult(AppState.rawText||AppState.lastText||$('output').innerText,true);
  $('clearBtn').onclick=clearOutput;
  $('copyBtn').onclick=copyOutput;
  $('txtBtn').onclick=exportTxt;
  $('docBtn').onclick=exportDoc;
  $('csvBtn').onclick=exportCsv;
  $('jsonBtn').onclick=exportJson;
  $('printBtn').onclick=exportPrintPdf;
  $('addRuleBtn').onclick=addCustomRule;
  $('searchBtn').onclick=searchOutput;
  $('clearSearchBtn').onclick=clearSearch;
  $('compareBtn').onclick=toggleComparePanel;
  $('undoCleanBtn').onclick=restoreRawOcr;
  $('goLowBtn').onclick=goToLowConfidence;
  $('highlightSuspiciousBtn').onclick=highlightSuspiciousOutput;
  $('reviewRequiredBtn').onclick=markReviewRequired;
  $('output')?.addEventListener('input',syncEditedOutput);
  $('applyWizardBtn').onclick=applyPresetWizard;
  document.querySelectorAll('[data-sample]').forEach(button=>{
    button.onclick=()=>loadDemoSample(button.dataset.sample);
  });
  document.querySelectorAll('[data-image-sample]').forEach(button=>{
    button.onclick=()=>loadDemoImageSample(button.dataset.imageSample);
  });
  if(typeof bindOcrSkillSelector==='function')bindOcrSkillSelector();
  if(typeof bindPdfSkillSelector==='function')bindPdfSkillSelector();
  if(typeof bindPaddleClientSettings==='function')bindPaddleClientSettings();
  bindQuickModeButtons();
  bindUploadSourceButtons();
  bindNextActions();

  ['upscale','threshold','autoEnhance','autoCropDoc'].forEach(id=>$(id)?.addEventListener('change',updateProcessedPreview));
  ['langSelect','modeSelect','ocrPreset','ocrEngine','cleanupLevel','pdfOrientation','removeNoise','cleanThai','itDictionary','highlightFixes','upscale','threshold','autoEnhance','autoCropDoc','ocrSkillSelect','pdfSkillSelect','skipBlankPdfPages','privacyMode','autoDeleteMinutes','paddleEndpoint'].forEach(id=>{
    $(id)?.addEventListener('change',()=>{
      renderReadyChecklist();
      if(id==='modeSelect')syncQuickModeButtons();
    });
  });
  $('ocrPreset')?.addEventListener('change',()=>{
    AppState.ocrPreset=$('ocrPreset').value;
    applyProfessionalPreset(AppState.ocrPreset);
    updateProcessedPreview();
  });
  $('cleanupLevel')?.addEventListener('change',()=>{
    AppState.cleanupLevel=$('cleanupLevel').value;
    if(AppState.rawText)showCleanedResult(AppState.rawText,true);
  });
  $('ocrEngine')?.addEventListener('change',()=>{
    AppState.ocrEngine=$('ocrEngine').value;
    if(AppState.ocrEngine==='paddle-local')setStatus('ตั้งค่า PaddleOCR Local แล้ว · กด Test Paddle หรือเปิด backend ก่อนสแกน','ok');
    else setStatus('ตั้งค่า OCR Engine: '+$('ocrEngine').selectedOptions[0].textContent,'ok');
  });
  $('pdfOrientation')?.addEventListener('change',()=>{
    AppState.pdfOrientation=$('pdfOrientation').value;
    setStatus('ตั้งค่า PDF เป็น '+($('pdfOrientation').value==='landscape'?'แนวนอน':'แนวตั้ง'),'ok');
  });
  registerPwa();
}

function bindQuickModeButtons(){
  document.querySelectorAll('[data-mode-pick]').forEach(button=>{
    button.onclick=()=>{
      const mode=button.dataset.modePick;
      if($('modeSelect'))$('modeSelect').value=mode;
      syncQuickModeButtons();
      renderReadyChecklist();
      if(AppState.rawText)showCleanedResult(AppState.rawText,true);
      setStatus('ตั้งค่าโหมด: '+button.textContent.trim(),'ok');
    };
  });
  syncQuickModeButtons();
}

function syncQuickModeButtons(){
  const current=$('modeSelect')?.value||'clean';
  document.querySelectorAll('[data-mode-pick]').forEach(button=>{
    button.classList.toggle('active',button.dataset.modePick===current);
  });
}

const DEMO_SAMPLES={
  invoice:{
    preset:'invoice',
    name:'demo-invoice-scan.txt',
    raw:'ใบกาํ กับภาษี\nบริษท ตัวอย่าง จากัด\nเลขประจาํ ตัวผู้เสียภาษี 0105559999999\nจานวนเงิน 12,500.00 บาท\nโทรศัพท 02-123-4567',
  },
  ticket:{
    preset:'ticket',
    name:'demo-ticket-it.txt',
    raw:'Ticket Mo. ฟี-2114909\nรบกรนตรวจสรบ SD WAN link down\nผู้แจ้ง: noc@workd, go th\nเวลาที่พบปัญหา 10:35 น.\nขัตมูลเพ็มเติม: ping gateway ไม่ผ่าน',
  },
  email:{
    preset:'email-alert',
    name:'demo-email-alert.txt',
    raw:'Audi: 17/06/2026 08:44\nจาก: monitor@networkdrd, oo.th\nเรื่อง: ธีเมล Alert CPU High\nรบกรนทตสอบอีกครัง ในโหมด Incognito',
  },
  government:{
    preset:'government',
    name:'demo-government-doc.txt',
    raw:'หนังสือมอมอำนาจ\nเรื่อง สาคัญ ขออนุมตเข้าตรวจสอบระบบ\nที่อยู 120 หมู่ 3\nขอแสดงตวามนับถืต\nคสุณ เจ้าหน้าที่',
  }
};

function loadDemoSample(key){
  const sample=DEMO_SAMPLES[key];
  if(!sample)return;
  clearOutput();
  AppState.sourceName=sample.name;
  AppState.rawText=sample.raw;
  AppState.ocrCandidates=[];
  if($('ocrPreset')){
    $('ocrPreset').value=sample.preset;
    AppState.ocrPreset=sample.preset;
    applyProfessionalPreset(sample.preset);
  }
  showCleanedResult(sample.raw,true);
  setProgress(100);
  setStatus('โหลด Demo sample แล้ว · ทดลอง Compare หรือ Export ได้ทันที','ok');
  scrollToOutputBox();
}

function loadDemoImageSample(key){
  const sample=DEMO_SAMPLES[key]||DEMO_SAMPLES.invoice;
  clearOutput();
  switchTab('img');
  const canvas=document.createElement('canvas');
  canvas.width=1100;
  canvas.height=720;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f8fafc';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#111827';
  ctx.font='700 38px Sarabun, Arial';
  ctx.fillText('ใบกาํ กับภาษี / TAX INVOICE',70,90);
  ctx.font='28px Sarabun, Arial';
  sample.raw.split('\n').forEach((line,index)=>ctx.fillText(line,80,165+(index*62)));
  ctx.strokeStyle='#94a3b8';
  ctx.lineWidth=2;
  for(let y=130;y<650;y+=62){
    ctx.beginPath();
    ctx.moveTo(60,y);
    ctx.lineTo(1040,y);
    ctx.stroke();
  }
  AppState.imageCanvas=canvas;
  AppState.processedCanvas=null;
  AppState.imageFile={name:'demo-invoice-image-mock.png',type:'image/png'};
  AppState.sourceName='demo-invoice-image-mock.png';
  AppState.crop=null;
  if($('ocrPreset')){
    $('ocrPreset').value='invoice';
    AppState.ocrPreset='invoice';
    applyProfessionalPreset('invoice');
  }
  setFileSuccess('imgFileInfo','imgFileName',AppState.imageFile);
  drawImagePreview();
  updateProcessedPreview();
  setStatus('สร้างภาพ Mock แล้ว · กดแปลงเพื่อทดสอบ OCR จากภาพ','ok');
  renderReadyChecklist();
}

function applyPresetWizard(){
  const docType=$('wizardDocType')?.value||'ticket';
  const quality=$('wizardQuality')?.value||'clean';
  const layout=$('wizardLayout')?.value||'normal';
  let preset=docType;
  if(quality==='blur')preset='mobile';
  if(layout==='table')preset='table';
  if(layout==='email')preset='email-alert';
  if($('ocrPreset')){
    $('ocrPreset').value=preset;
    AppState.ocrPreset=preset;
    applyProfessionalPreset(preset);
  }
  if(quality==='blur'||quality==='scan'){
    if($('upscale'))$('upscale').checked=true;
    if($('threshold'))$('threshold').checked=true;
  }
  if(layout==='table'&&$('pdfOrientation')){
    $('pdfOrientation').value='landscape';
    AppState.pdfOrientation='landscape';
  }
  updateProcessedPreview();
  renderReadyChecklist();
  setStatus('Wizard ตั้งค่าให้แล้ว: '+($('ocrPreset')?.selectedOptions?.[0]?.textContent||preset),'ok');
}

function toggleComparePanel(){
  const panel=$('comparePanel');
  if(!panel)return;
  if(panel.classList.contains('hide')){
    renderComparePanel();
    panel.classList.remove('hide');
  }else{
    panel.classList.add('hide');
  }
}

function renderComparePanel(){
  const panel=$('comparePanel');
  if(!panel)return;
  const raw=AppState.rawText||'ยังไม่มี Raw OCR';
  const clean=AppState.lastText||$('output')?.innerText||'ยังไม่มี Cleaned Output';
  panel.innerHTML='<div class="compare-col"><b>Raw OCR</b><pre>'+escapeHtml(raw)+'</pre></div>'+
    '<div class="compare-col"><b>Cleaned Output</b><pre>'+escapeHtml(clean)+'</pre></div>';
}

function restoreRawOcr(){
  if(!AppState.rawText){
    setStatus('ยังไม่มี Raw OCR ให้ย้อนกลับ','err');
    return;
  }
  AppState.lastText=AppState.rawText;
  showOutput(AppState.rawText);
  renderComparePanel();
  setStatus('แสดง Raw OCR แล้ว · กดจัดข้อความใหม่เพื่อกลับไป Cleaned Output','ok');
}

function registerPwa(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
}

function applyProfessionalPreset(preset){
  const map={
    invoice:{mode:'document',cleanup:'strict',orientation:'portrait'},
    ticket:{mode:'ticket',cleanup:'strict',orientation:'portrait'},
    'email-alert':{mode:'email',cleanup:'strict',orientation:'portrait'},
    government:{mode:'document',cleanup:'strict',orientation:'portrait'},
    table:{mode:'table',cleanup:'normal',orientation:'landscape'},
    document:{mode:'document',cleanup:'normal',orientation:'portrait'},
    screenshot:{mode:'capture-list',cleanup:'normal',orientation:'portrait'},
    mobile:{mode:'clean',cleanup:'normal',orientation:'portrait'}
  };
  const config=map[preset];
  if(!config)return;
  if($('modeSelect'))$('modeSelect').value=config.mode;
  if($('cleanupLevel'))$('cleanupLevel').value=config.cleanup;
  if($('pdfOrientation'))$('pdfOrientation').value=config.orientation;
  if($('ocrEngine')&&$('ocrEngine').value==='native')$('ocrEngine').value='auto';
  AppState.cleanupLevel=config.cleanup;
  AppState.pdfOrientation=config.orientation;
  AppState.ocrEngine=$('ocrEngine')?.value||AppState.ocrEngine||'auto';
  syncQuickModeButtons();
  renderReadyChecklist();
  setStatus('ตั้งค่า Preset: '+($('ocrPreset')?.selectedOptions?.[0]?.textContent||preset),'ok');
}

function getActiveFileInput(){
  if(AppState.tab==='pdf')return $('pdfInput');
  if(AppState.tab==='batch')return $('batchInput');
  return $('imgInput');
}

function bindUploadSourceButtons(){
  const externalSources={
    drive:'https://drive.google.com/drive/my-drive',
    dropbox:'https://www.dropbox.com/home'
  };
  document.querySelectorAll('[data-upload-source]').forEach(button=>{
    button.onclick=()=>{
      const source=button.dataset.uploadSource||'local';
      AppState.uploadSource=source;
      document.querySelectorAll('[data-upload-source]').forEach(item=>item.classList.toggle('active',item===button));
      const labels={local:'เครื่อง',drive:'Google Drive',dropbox:'Dropbox'};
      if(source==='local'){
        setStatus('เลือกแหล่งอัปโหลด: '+labels[source],'ok');
        getActiveFileInput()?.click();
        return;
      }
      window.open(externalSources[source],'_blank','noopener,noreferrer');
      setStatus('เปิด '+labels[source]+' แล้ว','ok');
    };
  });
}

function bindNextActions(){
  const actions={
    copy:copyOutput,
    txt:exportTxt,
    doc:exportDoc,
    docx:exportDocx,
    csv:exportCsv,
    json:exportJson,
    pdf:exportPrintPdf,
    excel:exportExcel,
    markdown:exportMarkdown,
    searchpdf:exportSearchablePdf
  };
  document.querySelectorAll('[data-next-action]').forEach(button=>{
    button.onclick=()=>actions[button.dataset.nextAction]?.();
  });
}

function switchTab(tab){
  AppState.tab=tab;
  $('tabImg').classList.toggle('active',tab==='img');
  $('tabPdf').classList.toggle('active',tab==='pdf');
  $('tabBatch').classList.toggle('active',tab==='batch');
  $('imgPanel').classList.toggle('hide',tab!=='img');
  $('pdfPanel').classList.toggle('hide',tab!=='pdf');
  $('batchPanel').classList.toggle('hide',tab!=='batch');
  setStatus(tab==='img'?'โหมดรูปภาพ':tab==='pdf'?'โหมด PDF':'โหมด Batch','ok');
}

function bindDropZone(zone,callback,multiple=false){
  zone.ondragover=e=>{e.preventDefault();zone.classList.add('drag')};
  zone.ondragleave=()=>zone.classList.remove('drag');
  zone.ondrop=e=>{
    e.preventDefault();
    zone.classList.remove('drag');
    if(multiple)callback(e.dataTransfer.files);
    else{
      const file=e.dataTransfer.files[0];
      if(file)callback(file);
    }
  };
}

async function handleImageFile(file){
  try{
    if(!file)return;
    if(!file.type.startsWith('image/')){
      setStatus('กรุณาเลือกไฟล์รูปภาพ','err');
      return;
    }
    clearOutput();
    if(typeof setProcessingState==='function')setProcessingState(PROCESSING_STATES.analyzing,'Analyzing image file');
    AppState.imageFile=file;
    AppState.sourceName=file.name;
    AppState.imageCanvas=await imageFileToCanvas(file);
    const orientation=AppState.imageCanvas.width>=AppState.imageCanvas.height?'landscape':'portrait';
    const brightness=typeof getCanvasBrightness==='function'?Math.round(getCanvasBrightness(AppState.imageCanvas)):null;
    if(typeof analyzeUploadedFile==='function')AppState.fileAnalysis=analyzeUploadedFile(file,{orientation,brightness});
    AppState.crop=null;
    setFileSuccess('imgFileInfo','imgFileName',file);
    drawImagePreview();
    updateProcessedPreview();
    if(typeof setProcessingState==='function')setProcessingState(PROCESSING_STATES.preprocessing,'Image ready for OCR');
    setStatus('อัปโหลดรูปภาพสำเร็จ: '+file.name,'ok');
  }catch(error){
    setStatus('โหลดรูปไม่ได้: '+error.message,'err');
  }
}

async function handlePdfFile(file){
  try{
    if(!file)return;
    if(file.type!=='application/pdf'){
      setStatus('กรุณาเลือกไฟล์ PDF','err');
      return;
    }
    clearOutput();
    setFileSuccess('pdfFileInfo','pdfFileName',file);
    setStatus('กำลังโหลด PDF...');
    if(typeof setProcessingState==='function')setProcessingState(PROCESSING_STATES.analyzing,'Analyzing PDF file');
    if(typeof analyzeUploadedFile==='function')AppState.fileAnalysis=analyzeUploadedFile(file);
    await loadPdfFile(file);
    if(AppState.fileAnalysis)AppState.fileAnalysis={...AppState.fileAnalysis,pageCount:AppState.pdfPages||0};
    if(typeof setProcessingState==='function')setProcessingState(PROCESSING_STATES.renderingPdf,'PDF ready: '+(AppState.pdfPages||0)+' pages');
    setFileSuccess('pdfFileInfo','pdfFileName',file);
  }catch(error){
    setStatus('โหลด PDF ไม่ได้: '+error.message,'err');
  }
}

function scrollToOutputBox(){
  const panel=document.querySelector('.output-panel')||$('output');
  if(panel)panel.scrollIntoView(true);
}

async function scanCurrent(){
  const startedAt=performance.now();
  try{
    setProgress(0);
    setOutputProcessing();
    if(typeof setProcessingState==='function')setProcessingState(PROCESSING_STATES.recognizing,'OCR running');
    setStatus('กำลังแปลง... กำลังพาไปที่กล่อง Output','ok');
    scrollToOutputBox();
    let raw='';
    if(AppState.tab==='img')raw=await scanImage();
    else if(AppState.tab==='pdf')raw=await scanPdf();
    else raw=await scanBatch();

    AppState.rawText=raw;
    await showCleanedResult(raw,true);
    AppState.processingTime=Math.round(performance.now()-startedAt);
    if(typeof saveScanProHistoryRecord==='function'){
      saveScanProHistoryRecord({
        rawText:raw,
        cleanedText:AppState.lastText,
        processingTime:AppState.processingTime,
        confidence:AppState.confidence
      });
    }
    if(typeof setProcessingState==='function')setProcessingState(PROCESSING_STATES.done,'Completed in '+AppState.processingTime+' ms');
    setProgress(100);
    setStatus('แปลงสำเร็จ · ตรวจละเอียดก่อนแสดงผลแล้ว','ok');
    if(typeof scheduleAutoDelete==='function')scheduleAutoDelete();
    setTimeout(scrollToOutputBox,120);
  }catch(error){
    clearOutputState();
    if(typeof setProcessingState==='function')setProcessingState(PROCESSING_STATES.error,error.message);
    setStatus('แปลงไม่ได้: '+error.message,'err');
    setProgress(0);
  }
}

async function showCleanedResult(raw,animate=false){
  if(typeof setProcessingState==='function')setProcessingState(PROCESSING_STATES.cleaning,'Cleaning OCR text');
  let cleaned=cleanText(raw);
  const level=$('cleanupLevel')?.value||AppState.cleanupLevel||'normal';
  AppState.cleanupLevel=level;
  if(level==='strict'&&typeof finalOcrReview==='function')cleaned=finalOcrReview(cleaned);
  AppState.lastText=cleaned;
  showOutput(cleaned);
  showNextActions();
  if(animate)setOutputSuccess();
  renderOcrCandidates();
  if(typeof renderOcrReview==='function')renderOcrReview(raw,cleaned);
  else renderFixReport();
  const finalScore=AppState.confidence??calculateConfidence(raw,cleaned);
  AppState.confidence=finalScore;
  renderConfidence(finalScore);
  renderQualityGate(raw,cleaned,finalScore);
  if(!$('comparePanel')?.classList.contains('hide'))renderComparePanel();
  if(typeof renderOcrSkillResult==='function')renderOcrSkillResult();
  if(typeof updatePdfCleanedPages==='function')updatePdfCleanedPages();
  if(typeof renderPdfPageResults==='function')renderPdfPageResults();
}

function renderOcrCandidates(){
  const box=$('candidateBox');
  if(!box)return;
  const items=AppState.ocrCandidates||[];
  if(items.length<2){
    box.classList.add('hide');
    box.innerHTML='';
    return;
  }
  box.classList.remove('hide');
  box.innerHTML='<div class="candidate-title"><b>OCR Candidates</b><span>Choose another read if the top one looks off.</span></div>'+
    items.slice(0,4).map((item,index)=>{
      const active=index===AppState.selectedCandidateIndex?' active':'';
      const confidence=item.confidence??'-';
      const score=Math.round(item.score||0);
      const risk=item.risk??0;
      const sample=escapeHtml((item.text||'').replace(/\s+/g,' ').trim().slice(0,120));
      return '<button class="candidate-card'+active+'" data-candidate="'+index+'" type="button">'+
        '<span class="candidate-rank">#'+(index+1)+'</span>'+
        '<span class="candidate-main"><b>'+escapeHtml(item.mode||'OCR')+'</b><small>confidence '+confidence+'% · score '+score+' · risk '+risk+'</small><em>'+sample+'</em></span>'+
      '</button>';
    }).join('');
  box.querySelectorAll('[data-candidate]').forEach(button=>{
    button.onclick=()=>selectOcrCandidate(Number(button.dataset.candidate));
  });
}

function selectOcrCandidate(index){
  const item=(AppState.ocrCandidates||[])[index];
  if(!item)return;
  AppState.selectedCandidateIndex=index;
  AppState.rawText=item.text||'';
  AppState.confidence=item.confidence;
  showCleanedResult(AppState.rawText,true);
  setStatus('Switched OCR candidate #'+(index+1)+' · '+(item.mode||'OCR'),'ok');
}
