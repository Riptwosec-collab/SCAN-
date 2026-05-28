document.addEventListener('DOMContentLoaded',()=>{
  bindAppEvents();
  renderHistory();
  setStatus('พร้อมใช้งาน','ok');
});

function bindAppEvents(){
  $('tabImg').onclick=()=>switchTab('img');
  $('tabPdf').onclick=()=>switchTab('pdf');

  $('imgInput').onchange=e=>handleImageFile(e.target.files[0]);
  $('pdfInput').onchange=e=>handlePdfFile(e.target.files[0]);

  bindDropZone($('imgDrop'),file=>handleImageFile(file));
  bindDropZone($('pdfDrop'),file=>handlePdfFile(file));

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
    }
  };

  $('scanBtn').onclick=scanCurrent;
  $('formatBtn').onclick=()=>showOutput(cleanText(AppState.lastText||$('output').innerText));
  $('clearBtn').onclick=clearOutput;
  $('copyBtn').onclick=copyOutput;
  $('txtBtn').onclick=exportTxt;
  $('docBtn').onclick=exportDoc;
  $('csvBtn').onclick=exportCsv;
  $('printBtn').onclick=exportPrintPdf;
}

function switchTab(tab){
  AppState.tab=tab;
  $('tabImg').classList.toggle('active',tab==='img');
  $('tabPdf').classList.toggle('active',tab==='pdf');
  $('imgPanel').classList.toggle('hide',tab!=='img');
  $('pdfPanel').classList.toggle('hide',tab!=='pdf');
  setStatus(tab==='img'?'โหมดรูปภาพ':'โหมด PDF','ok');
}

function bindDropZone(zone,callback){
  zone.ondragover=e=>{e.preventDefault();zone.classList.add('drag')};
  zone.ondragleave=()=>zone.classList.remove('drag');
  zone.ondrop=e=>{
    e.preventDefault();
    zone.classList.remove('drag');
    const file=e.dataTransfer.files[0];
    if(file)callback(file);
  };
}

function handleImageFile(file){
  if(!file)return;
  if(!file.type.startsWith('image/')){
    setStatus('กรุณาเลือกไฟล์รูปภาพ','err');
    return;
  }
  AppState.imageFile=file;
  $('imgPreview').src=URL.createObjectURL(file);
  $('imgPreview').style.display='block';
  setStatus('โหลดรูปภาพแล้ว: '+file.name,'ok');
}

async function handlePdfFile(file){
  try{
    if(!file)return;
    if(file.type!=='application/pdf'){
      setStatus('กรุณาเลือกไฟล์ PDF','err');
      return;
    }
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
    else raw=await scanPdf();

    const cleaned=cleanText(raw);
    showOutput(cleaned);
    setProgress(100);
    setStatus('แปลงสำเร็จ','ok');
  }catch(error){
    setStatus('แปลงไม่ได้: '+error.message,'err');
    setProgress(0);
  }
}
