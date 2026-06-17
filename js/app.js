document.addEventListener('DOMContentLoaded',()=>{
  bindAppEvents();
  bindCropCanvas();
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
  bindUploadSourceButtons();
  bindNextActions();

  ['upscale','threshold'].forEach(id=>$(id).addEventListener('change',updateProcessedPreview));
  ['langSelect','modeSelect','ocrPreset','cleanupLevel','pdfOrientation','removeNoise','cleanThai','itDictionary','highlightFixes','upscale','threshold'].forEach(id=>{
    $(id)?.addEventListener('change',renderReadyChecklist);
  });
  $('ocrPreset')?.addEventListener('change',()=>{
    AppState.ocrPreset=$('ocrPreset').value;
    updateProcessedPreview();
  });
  $('cleanupLevel')?.addEventListener('change',()=>{
    AppState.cleanupLevel=$('cleanupLevel').value;
    if(AppState.rawText)showCleanedResult(AppState.rawText,true);
  });
  $('pdfOrientation')?.addEventListener('change',()=>{
    AppState.pdfOrientation=$('pdfOrientation').value;
    setStatus('ตั้งค่า PDF เป็น '+($('pdfOrientation').value==='landscape'?'แนวนอน':'แนวตั้ง'),'ok');
  });
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
    csv:exportCsv,
    json:exportJson,
    pdf:exportPrintPdf
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
    AppState.imageFile=file;
    AppState.sourceName=file.name;
    AppState.imageCanvas=await imageFileToCanvas(file);
    AppState.crop=null;
    setFileSuccess('imgFileInfo','imgFileName',file);
    drawImagePreview();
    updateProcessedPreview();
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
    await loadPdfFile(file);
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
  try{
    setProgress(0);
    setOutputProcessing();
    setStatus('กำลังแปลง... กำลังพาไปที่กล่อง Output','ok');
    scrollToOutputBox();
    let raw='';
    if(AppState.tab==='img')raw=await scanImage();
    else if(AppState.tab==='pdf')raw=await scanPdf();
    else raw=await scanBatch();

    AppState.rawText=raw;
    await showCleanedResult(raw,true);
    setProgress(100);
    setStatus('แปลงสำเร็จ · ตรวจละเอียดก่อนแสดงผลแล้ว','ok');
    setTimeout(scrollToOutputBox,120);
  }catch(error){
    clearOutputState();
    setStatus('แปลงไม่ได้: '+error.message,'err');
    setProgress(0);
  }
}

async function showCleanedResult(raw,animate=false){
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
