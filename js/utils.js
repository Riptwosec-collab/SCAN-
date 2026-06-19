const $=id=>document.getElementById(id);
let outputSuccessTimer=null;
let autoDeleteTimer=null;

function setStatus(message,type=''){
  const el=$('status');
  if(!el)return;
  el.textContent=message;
  el.className='status '+type;
}

function getReadyItems(){
  const hasInput=AppState.tab==='img'?!!AppState.imageFile:AppState.tab==='pdf'?!!AppState.pdfDoc:(AppState.batchFiles||[]).length>0;
  const preset=$('ocrPreset')?.value||AppState.ocrPreset||'auto';
  const engine=$('ocrEngine')?.value||AppState.ocrEngine||'auto';
  const cleanup=$('cleanupLevel')?.value||AppState.cleanupLevel||'normal';
  const dictionary=$('itDictionary')?.checked;
  const contrast=$('threshold')?.checked;
  const upscale=$('upscale')?.checked;
  return [
    {ok:hasInput,label:'เลือกไฟล์แล้ว',hint:hasInput?'พร้อมอ่านจาก '+(AppState.tab==='batch'?(AppState.batchFiles.length+' ไฟล์'):AppState.tab.toUpperCase()):'เลือกไฟล์ก่อนเริ่มแปลง'},
    {ok:engine!=='native'||('TextDetector' in window),label:'OCR Engine',hint:engine==='native'?(('TextDetector' in window)?'Browser Native พร้อมใช้':'Browser นี้ไม่รองรับ Native OCR'):(engine==='auto'?'Auto: Native + Tesseract':'ใช้ '+engine)},
    {ok:preset!=='auto'||contrast||upscale,label:'ภาพพร้อม OCR',hint:preset==='auto'?'Auto + '+(contrast?'Contrast':'ไม่เปิด Contrast'):'Preset '+preset},
    {ok:cleanup!=='raw',label:'เปิด Cleanup',hint:cleanup==='raw'?'Raw OCR ไม่ช่วยแก้คำ':'ระดับ '+cleanup},
    {ok:dictionary,label:'Dictionary เฉพาะทาง',hint:dictionary?'IT/NOC + บัญชี/ภาษี/ราชการ':'ปิดคลังคำเฉพาะทาง'}
  ];
}

function renderReadyChecklist(){
  const box=$('readyChecklist');
  if(!box)return;
  const items=getReadyItems();
  const score=items.filter(item=>item.ok).length;
  box.className='ready-card '+(score>=4?'ready-good':score>=2?'ready-warn':'ready-bad');
  box.innerHTML='<div class="ready-head"><b>Ready Check</b><span>'+score+'/'+items.length+'</span></div>'+
    '<div class="ready-list">'+items.map(item=>
      '<div class="ready-item '+(item.ok?'ok':'wait')+'"><i>'+(item.ok?'✓':'!')+'</i><span><b>'+escapeHtml(item.label)+'</b><small>'+escapeHtml(item.hint)+'</small></span></div>'
    ).join('')+'</div>';
}

function setProgress(value){
  const el=$('progressBar');
  if(!el)return;
  el.style.width=Math.max(0,Math.min(100,value))+'%';
}

function escapeHtml(text){
  return String(text).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
}

function setOutputProcessing(){
  const output=$('output');
  if(!output)return;
  if(outputSuccessTimer){clearTimeout(outputSuccessTimer);outputSuccessTimer=null;}
  output.classList.remove('output-success','output-done-pulse','output-success-hide');
  output.classList.add('output-processing');
}

function setOutputSuccess(){
  const output=$('output');
  if(!output)return;
  if(outputSuccessTimer){clearTimeout(outputSuccessTimer);outputSuccessTimer=null;}
  output.classList.remove('output-processing','output-success-hide');
  output.classList.add('output-success','output-done-pulse');
  setTimeout(()=>output.classList.remove('output-done-pulse'),900);
  outputSuccessTimer=setTimeout(()=>{
    output.classList.add('output-success-hide');
    setTimeout(()=>{
      output.classList.remove('output-success','output-success-hide','output-done-pulse');
      outputSuccessTimer=null;
    },760);
  },5000);
}

function clearOutputState(){
  const output=$('output');
  if(!output)return;
  if(outputSuccessTimer){clearTimeout(outputSuccessTimer);outputSuccessTimer=null;}
  output.classList.remove('output-processing','output-success','output-done-pulse','output-success-hide');
}

function showOutput(text){
  AppState.lastText=(text||'').trim();
  $('output').textContent=AppState.lastText||'ไม่พบข้อความ';
  AppState.privacyMode=!!$('privacyMode')?.checked;
  if(AppState.lastText&&!AppState.privacyMode)saveHistory(AppState.lastText);
  showNextActions();
}

function showNextActions(){
  const panel=$('nextActions');
  if(panel)panel.classList.toggle('hide',!AppState.lastText);
}

function hideNextActions(){
  const panel=$('nextActions');
  if(panel)panel.classList.add('hide');
}

function getQualityTips(raw,cleaned,score){
  const tips=[];
  const suspicious=typeof findSuspiciousOcrTokens==='function'?findSuspiciousOcrTokens(cleaned||''):[];
  const weird=((raw||'').match(/[�ƟθϴƩΣÉÊÈË○●$ํ]/g)||[]).length;
  if(score<70)tips.push('ลอง Crop ให้เหลือเฉพาะช่องข้อความ แล้วแปลงใหม่');
  if(score<80&&(!$('threshold')?.checked||!$('upscale')?.checked))tips.push('เปิด ขยายภาพ และ Contrast เพื่อเพิ่มความคมก่อน OCR');
  if((AppState.ocrCandidates||[]).length>1)tips.push('ตรวจ OCR Candidates ถ้าผลหลักอ่านเพี้ยน ให้เลือก candidate ที่ใกล้กว่า');
  if(suspicious.length)tips.push('ตรวจจุดต้องสงสัย: '+suspicious.slice(0,4).map(item=>item.name).join(', '));
  if(weird>2)tips.push('ภาพต้นฉบับมีสัญลักษณ์/รอยขยะเยอะ ควรตัดพื้นหลังหรือเส้นตารางออก');
  if(AppState.fixedWords.length>30)tips.push('มีการแก้คำหลายจุด ควรอ่านทวนก่อนส่งออกเป็น DOC/PDF');
  if(!tips.length)tips.push('คุณภาพอยู่ในเกณฑ์พร้อมใช้งานต่อ ตรวจชื่อเฉพาะ/ตัวเลขสำคัญอีกครั้งก่อนส่งออก');
  return tips.slice(0,5);
}

function renderQualityGate(raw,cleaned,score){
  const box=$('qualityGate');
  if(!box)return;
  if(!cleaned){
    box.classList.add('hide');
    box.innerHTML='';
    return;
  }
  const level=score>=85?'good':score>=70?'warn':'bad';
  const label=score>=85?'พร้อมใช้งาน':score>=70?'ควรตรวจทวน':'ต้องปรับภาพ/ตัวเลือก';
  const rawLen=(raw||'').replace(/\s/g,'').length;
  const cleanLen=(cleaned||'').replace(/\s/g,'').length;
  const tips=getQualityTips(raw,cleaned,score);
  box.className='quality-gate '+level;
  box.innerHTML='<div class="quality-main"><span class="quality-score">'+score+'%</span><span><b>'+label+'</b><small>Fixed '+AppState.fixedWords.length+' จุด · Raw '+rawLen+' ตัว · Clean '+cleanLen+' ตัว</small></span></div>'+
    '<div class="quality-tips">'+tips.map(tip=>'<span>'+escapeHtml(tip)+'</span>').join('')+'</div>';
}

function setFileSuccess(infoId,nameId,fileOrText,mode='single'){
  const info=$(infoId);
  const name=$(nameId);
  if(!info||!name)return;
  const label=typeof fileOrText==='string'?fileOrText:(fileOrText?.name||'เลือกไฟล์แล้ว');
  info.classList.remove('hide','file-pending','file-error');
  info.classList.add('file-success');
  name.innerHTML='<span class="file-check">✓</span><span class="file-main">อัปโหลดสำเร็จ</span><span class="file-name">'+escapeHtml(label)+'</span>';
  if(mode==='batch')name.innerHTML='<span class="file-check">✓</span><span class="file-main">อัปโหลดสำเร็จ</span><span class="file-name">'+escapeHtml(label)+'</span>';
  renderReadyChecklist();
}

function clearFileSuccess(infoId,nameId,defaultText){
  const info=$(infoId);
  const name=$(nameId);
  if(info)info.classList.remove('file-success','file-pending','file-error');
  if(name)name.textContent=defaultText;
}

function clearOutput(){
  AppState.lastText='';
  AppState.rawText='';
  AppState.ocrCandidates=[];
  AppState.selectedCandidateIndex=0;
  AppState.fixedWords=[];
  AppState.confidence=null;
  AppState.batchResults=[];
  AppState.pdfPageInfo=[];
  AppState.pdfCompareResult=null;
  AppState.reviewRequired=false;
  if(typeof renderPdfPageResults==='function')renderPdfPageResults();

  const output=$('output');
  if(output)output.textContent='ผลลัพธ์จะแสดงที่นี่';
  clearOutputState();
  hideNextActions();

  const fixReport=$('fixReport');
  if(fixReport)fixReport.textContent='ยังไม่มีรายการคำที่แก้';

  const confidence=$('confidenceBox');
  if(confidence){
    confidence.className='confidence';
    confidence.textContent='Confidence: -';
  }

  const search=$('searchInput');
  if(search)search.value='';

  const candidates=$('candidateBox');
  if(candidates){
    candidates.classList.add('hide');
    candidates.innerHTML='';
  }
  const quality=$('qualityGate');
  if(quality){
    quality.classList.add('hide');
    quality.innerHTML='';
  }

  setProgress(0);
  setStatus('ล้างผลลัพธ์แล้ว','ok');
  renderReadyChecklist();
}

function scheduleAutoDelete(){
  if(autoDeleteTimer){clearTimeout(autoDeleteTimer);autoDeleteTimer=null;}
  const minutes=Number($('autoDeleteMinutes')?.value||AppState.autoDeleteMinutes||0);
  AppState.autoDeleteMinutes=minutes;
  if(!minutes)return;
  autoDeleteTimer=setTimeout(()=>{
    autoDeleteTimer=null;
    resetAll();
    setStatus('ลบไฟล์และผลลัพธ์อัตโนมัติแล้วตาม Privacy setting','ok');
  },minutes*60*1000);
  setStatus('ตั้ง auto-delete ใน '+minutes+' นาที','ok');
}

function clearCanvas(id){
  const canvas=$(id);
  if(!canvas)return;
  const ctx=canvas.getContext?.('2d');
  if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
  canvas.width=0;
  canvas.height=0;
  canvas.style.display='none';
}

function removeImageFile(){
  clearOutput();
  AppState.imageFile=null;
  AppState.imageCanvas=null;
  AppState.processedCanvas=null;
  AppState.preparedCanvas=null;
  AppState.fileQuality=null;
  AppState.crop=null;
  AppState.cropEnabled=false;
  AppState.sourceName='';
  const input=$('imgInput');
  if(input)input.value='';
  clearCanvas('imgPreview');
  clearCanvas('processedPreview');
  if(typeof renderFileQualityReport==='function')renderFileQualityReport(null);
  const info=$('imgFileInfo');
  if(info){info.classList.remove('file-success','file-pending','file-error');info.classList.add('hide');}
  clearFileSuccess('imgFileInfo','imgFileName','ยังไม่ได้เลือกไฟล์');
  const cropBtn=$('enableCropBtn');
  if(cropBtn)cropBtn.textContent='เปิด Crop';
  setStatus('ยกเลิกไฟล์รูปภาพแล้ว สามารถอัปโหลดใหม่ได้','ok');
  renderReadyChecklist();
}

function removePdfFile(){
  clearOutput();
  AppState.pdfDoc=null;
  AppState.pdfPages=0;
  AppState.pdfPageInfo=[];
  AppState.pdfCompareFile=null;
  AppState.pdfCompareResult=null;
  AppState.sourceName='';
  const input=$('pdfInput');
  if(input)input.value='';
  clearCanvas('pdfPreview');
  const thumbs=$('pdfThumbs');
  if(thumbs)thumbs.innerHTML='';
  const compareInput=$('pdfCompareInput');
  if(compareInput)compareInput.value='';
  const compareResult=$('pdfCompareResult');
  if(compareResult)compareResult.innerHTML='';
  const info=$('pdfFileInfo');
  if(info){info.classList.remove('file-success','file-pending','file-error');info.classList.add('hide');}
  clearFileSuccess('pdfFileInfo','pdfFileName','ยังไม่ได้เลือกไฟล์');
  $('pageFrom').value=1;
  $('pageTo').value=1;
  setStatus('ยกเลิกไฟล์ PDF แล้ว สามารถอัปโหลดใหม่ได้','ok');
  renderReadyChecklist();
}

function removeBatchFiles(){
  clearOutput();
  AppState.batchFiles=[];
  AppState.batchResults=[];
  AppState.sourceName='';
  const input=$('batchInput');
  if(input)input.value='';
  const list=$('batchList');
  if(list)list.innerHTML='';
  const info=$('batchFileInfo');
  if(info){info.classList.remove('file-success','file-pending','file-error');info.classList.add('hide');}
  clearFileSuccess('batchFileInfo','batchFileName','ยังไม่ได้เลือกไฟล์');
  setStatus('ยกเลิกไฟล์ Batch แล้ว สามารถอัปโหลดใหม่ได้','ok');
  renderReadyChecklist();
}

function resetAll(){
  removeImageFile();
  removePdfFile();
  removeBatchFiles();
  clearOutput();
  ['sourceCompare'].forEach(clearCanvas);
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

function loadDeferredScriptOnce(id,src){
  if(document.getElementById(id))return;
  const script=document.createElement('script');
  script.id=id;
  script.src=src;
  script.defer=true;
  document.head.appendChild(script);
}

loadDeferredScriptOnce('accuracyUpgradeScript','js/accuracy-upgrade.js?v=10');
loadDeferredScriptOnce('phase1115Script','js/phase11-15.js?v=1');

window.addEventListener('error',e=>setStatus('Error: '+e.message,'err'));
window.addEventListener('unhandledrejection',e=>setStatus('Error: '+((e.reason&&e.reason.message)||e.reason),'err'));
