(function(){
  'use strict';

  function $(id){return document.getElementById(id)}
  function hasInput(){
    if(!window.AppState)return false;
    if(AppState.tab==='img')return !!(AppState.imageFile&&AppState.imageCanvas);
    if(AppState.tab==='pdf')return !!AppState.pdfDoc;
    return !!((AppState.batchFiles||[]).length);
  }
  function getActiveDrop(){
    return AppState?.tab==='pdf'?$('pdfDrop'):AppState?.tab==='batch'?$('batchDrop'):$('imgDrop');
  }
  function getActiveInput(){
    return AppState?.tab==='pdf'?$('pdfInput'):AppState?.tab==='batch'?$('batchInput'):$('imgInput');
  }
  function status(message,type='ok'){
    if(typeof setStatus==='function')setStatus(message,type);
    const hint=$('liveScanHint');
    if(hint)hint.textContent=message;
  }
  function scrollToUpload(openPicker=false){
    const drop=getActiveDrop()||$('tool')||document.body;
    drop.scrollIntoView({block:'center',behavior:'smooth'});
    drop.classList.add('live-attention');
    setTimeout(()=>drop.classList.remove('live-attention'),1400);
    status('อัปโหลดไฟล์ก่อน แล้วกดสแกนอัตโนมัติ','err');
    if(openPicker)setTimeout(()=>getActiveInput()?.click(),350);
  }
  function getResult(){return window.AppState?.multiOcrOqc||null}
  function hasResult(){return !!(getResult()?.finalText||getResult()?.ocrResults?.length)}

  function syncCards(){
    const ready=hasResult();
    document.querySelectorAll('[data-show-ocr]').forEach(button=>{
      button.disabled=!ready;
      button.classList.toggle('disabled',!ready);
      if(!button.dataset.readyLabel)button.dataset.readyLabel=button.textContent.trim()||'ดูผลลัพธ์';
      button.textContent=ready?button.dataset.readyLabel:'รอสแกนก่อน';
      button.title=ready?'ดูข้อความที่ OCR ตัวนี้อ่านได้':'ยังไม่มีผล OCR ให้ดู กดสแกนก่อน';
    });
    const scanBtn=$('startOcrDashboardBtn');
    if(scanBtn)scanBtn.disabled=false;
    const hint=$('liveScanHint');
    if(hint&&!hasInput()&&!ready)hint.textContent='ยังไม่มีไฟล์ · กดอัปโหลด หรือทดสอบด้วยภาพตัวอย่าง';
  }

  function insertActionBar(){
    if($('liveScanActions'))return;
    const firstPanel=document.querySelector('#multiOqcDashboard .multi-panel');
    if(!firstPanel)return;
    const bar=document.createElement('div');
    bar.id='liveScanActions';
    bar.className='live-scan-actions';
    bar.innerHTML=''+
      '<div class="live-scan-copy"><b>พร้อมสแกนจริง</b><span id="liveScanHint">อัปโหลดไฟล์ แล้วกดสแกนอัตโนมัติ</span></div>'+
      '<div class="live-scan-buttons">'+
        '<button class="btn primary" id="startOcrDashboardBtn" type="button">⚡ สแกนอัตโนมัติ</button>'+
        '<button class="btn" id="uploadFromDashboardBtn" type="button">อัปโหลดไฟล์</button>'+
        '<button class="btn subtle" id="demoOcrDashboardBtn" type="button">ทดสอบด้วยภาพตัวอย่าง</button>'+
      '</div>';
    firstPanel.before(bar);

    $('startOcrDashboardBtn').onclick=async()=>{
      if(!hasInput()){
        scrollToUpload(true);
        return;
      }
      status('เริ่ม Multi OCR + OQC จริงจากไฟล์ที่อัปโหลด...','ok');
      await window.runMultiOqcScan?.();
      syncCards();
    };
    $('uploadFromDashboardBtn').onclick=()=>scrollToUpload(true);
    $('demoOcrDashboardBtn').onclick=async()=>{
      if(typeof loadDemoImageSample!=='function'){
        status('ไม่พบ Demo image loader ในหน้านี้','err');
        return;
      }
      status('สร้างภาพตัวอย่างและเริ่ม OCR จริง...','ok');
      loadDemoImageSample('invoice');
      await new Promise(resolve=>setTimeout(resolve,260));
      await window.runMultiOqcScan?.();
      syncCards();
    };
  }

  function guardResultButtons(){
    document.addEventListener('click',event=>{
      const button=event.target.closest?.('[data-show-ocr]');
      if(!button)return;
      if(hasResult())return;
      event.preventDefault();
      event.stopPropagation();
      if(!hasInput())scrollToUpload(false);
      else status('กด “สแกนอัตโนมัติ” ก่อน จึงจะดูผล OCR แต่ละตัวได้','err');
    },true);
  }

  function patchRunScan(){
    if(window.__multiOcrLivePatched)return;
    window.__multiOcrLivePatched=true;
    const original=window.runMultiOqcScan;
    if(typeof original!=='function')return;
    window.runMultiOqcScan=async function(){
      if(!hasInput()){
        scrollToUpload(false);
        throw new Error('ยังไม่ได้อัปโหลดไฟล์');
      }
      document.body.classList.add('is-live-scanning');
      status('OCR #1-#5 กำลังสแกนจริง...','ok');
      try{
        const result=await original.apply(this,arguments);
        status('สแกนเสร็จแล้ว · ดูผลลัพธ์และ export ได้ทันที','ok');
        return result;
      }finally{
        document.body.classList.remove('is-live-scanning');
        setTimeout(syncCards,80);
      }
    };
  }

  function boot(){
    insertActionBar();
    patchRunScan();
    guardResultButtons();
    syncCards();
    const observer=new MutationObserver(()=>{
      insertActionBar();
      syncCards();
    });
    const dashboard=$('multiOqcDashboard');
    if(dashboard)observer.observe(dashboard,{childList:true,subtree:true});
    ['imgInput','pdfInput','batchInput'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(()=>{
      status('เลือกไฟล์แล้ว · กดสแกนอัตโนมัติเพื่อเริ่ม OCR จริง','ok');
      syncCards();
    },300)));
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80));
})();
