document.addEventListener('DOMContentLoaded',()=>{
  bindAppEvents();
  bindCropCanvas();
  renderHistory();
  renderCustomRules();
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
    setStatus(AppState.cropEnabled?'เปิด Crop แล้ว ลากกรอบบนรูป Original':'ปิด Crop แล้ว','ok');
  };
  $('resetCropBtn').onclick=resetCrop;

  $('removeImgBtn').onclick=removeImageFile;
  $('removePdfBtn').onclick=removePdfFile;
  $('removeBatchBtn').onclick=removeBatchFiles;

  $('scanBtn').onclick=scanCurrent;
  $('formatBtn').onclick=()=>showCleanedResult(AppState.rawText||AppState.lastText||$('output').innerText);
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

  ['upscale','threshold'].forEach(id=>$(id).addEventListener('change',updateProcessedPreview));
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
    $('imgFileName').textContent=file.name;
    $('imgFileInfo').classList.remove('hide');
    drawImagePreview();
    updateProcessedPreview();
    setStatus('โหลดรูปภาพแล้ว: '+file.name,'ok');
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
    $('pdfFileName').textContent=file.name;
    $('pdfFileInfo').classList.remove('hide');
    setStatus('กำลังโหลด PDF...');
    await loadPdfFile(file);
  }catch(error){
    setStatus('โหลด PDF ไม่ได้: '+error.message,'err');
  }
}

async function scanCurrent(){
  try{
    setProgress(0);
    let raw='';
    if(AppState.tab==='img')raw=await scanImage();
    else if(AppState.tab==='pdf')raw=await scanPdf();
    else raw=await scanBatch();

    AppState.rawText=raw;
    showCleanedResult(raw);
    setProgress(100);
    setStatus('แปลงสำเร็จ','ok');
  }catch(error){
    setStatus('แปลงไม่ได้: '+error.message,'err');
    setProgress(0);
  }
}

function showCleanedResult(raw){
  const cleaned=cleanText(raw);
  showOutput(cleaned);
  renderFixReport();
  const finalScore=AppState.confidence??calculateConfidence(raw,cleaned);
  AppState.confidence=finalScore;
  renderConfidence(finalScore);
}
