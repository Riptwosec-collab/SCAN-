const $=id=>document.getElementById(id);

function setStatus(message,type=''){
  const el=$('status');
  if(!el)return;
  el.textContent=message;
  el.className='status '+type;
}

function setProgress(value){
  const el=$('progressBar');
  if(!el)return;
  el.style.width=Math.max(0,Math.min(100,value))+'%';
}

function escapeHtml(text){
  return String(text).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
}

function showOutput(text){
  AppState.lastText=(text||'').trim();
  $('output').textContent=AppState.lastText||'ไม่พบข้อความ';
  if(AppState.lastText)saveHistory(AppState.lastText);
}

function clearOutput(){
  AppState.lastText='';
  AppState.rawText='';
  AppState.fixedWords=[];
  AppState.confidence=null;
  AppState.batchResults=[];

  const output=$('output');
  if(output)output.textContent='ผลลัพธ์จะแสดงที่นี่';

  const fixReport=$('fixReport');
  if(fixReport)fixReport.textContent='ยังไม่มีรายการคำที่แก้';

  const confidence=$('confidenceBox');
  if(confidence){
    confidence.className='confidence';
    confidence.textContent='Confidence: -';
  }

  const search=$('searchInput');
  if(search)search.value='';

  setProgress(0);
  setStatus('ล้างผลลัพธ์แล้ว','ok');
}

function resetAll(){
  clearOutput();
  AppState.imageFile=null;
  AppState.imageCanvas=null;
  AppState.processedCanvas=null;
  AppState.crop=null;
  AppState.cropEnabled=false;
  AppState.pdfDoc=null;
  AppState.pdfPages=0;
  AppState.pdfPageInfo=[];
  AppState.batchFiles=[];
  AppState.batchResults=[];
  AppState.sourceName='';

  ['imgInput','pdfInput','batchInput'].forEach(id=>{const el=$(id);if(el)el.value='';});
  ['imgPreview','processedPreview','pdfPreview','sourceCompare'].forEach(id=>{
    const canvas=$(id);
    if(canvas){
      const ctx=canvas.getContext?.('2d');
      if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
      canvas.style.display='none';
    }
  });

  const pdfThumbs=$('pdfThumbs');
  if(pdfThumbs)pdfThumbs.innerHTML='';
  const batchList=$('batchList');
  if(batchList)batchList.innerHTML='';
  const cropBtn=$('enableCropBtn');
  if(cropBtn)cropBtn.textContent='เปิด Crop';
  setStatus('ล้างข้อมูลทั้งหมดแล้ว','ok');
}

function downloadFile(filename,content,mime){
  const blob=new Blob([content||''],{type:mime+';charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),800);
}

function dataUrlToImage(url){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=url;
  });
}

window.addEventListener('error',e=>setStatus('Error: '+e.message,'err'));
window.addEventListener('unhandledrejection',e=>setStatus('Error: '+((e.reason&&e.reason.message)||e.reason),'err'));
