if(window.pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

async function loadPdfFile(file){
  if(!window.pdfjsLib)throw new Error('โหลด pdf.js ไม่สำเร็จ กรุณาต่ออินเทอร์เน็ต');
  const data=new Uint8Array(await file.arrayBuffer());
  AppState.pdfDoc=await pdfjsLib.getDocument({data}).promise;
  AppState.pdfPages=AppState.pdfDoc.numPages;
  $('pageFrom').value=1;
  $('pageTo').value=AppState.pdfPages;
  $('pageFrom').max=AppState.pdfPages;
  $('pageTo').max=AppState.pdfPages;
  await renderPdfPreview(1);
  setStatus('โหลด PDF แล้ว '+AppState.pdfPages+' หน้า','ok');
}

async function renderPdfPreview(pageNumber){
  const page=await AppState.pdfDoc.getPage(pageNumber);
  const viewport=page.getViewport({scale:1.2});
  const canvas=$('pdfPreview');
  const ctx=canvas.getContext('2d');
  canvas.width=viewport.width;
  canvas.height=viewport.height;
  canvas.style.display='block';
  await page.render({canvasContext:ctx,viewport}).promise;
}

async function extractPdfText(pageNumber){
  const page=await AppState.pdfDoc.getPage(pageNumber);
  const textContent=await page.getTextContent({normalizeWhitespace:false});
  if(!textContent.items||!textContent.items.length)return '';

  const rows=[];
  for(const item of textContent.items){
    if(!item.str)continue;
    const y=Math.round(item.transform[5]);
    let row=rows.find(r=>Math.abs(r.y-y)<3);
    if(!row){row={y,items:[]};rows.push(row)}
    row.items.push({x:item.transform[4],s:item.str});
  }

  return rows
    .sort((a,b)=>b.y-a.y)
    .map(row=>row.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').trim())
    .filter(Boolean)
    .join('\n');
}

async function pdfPageToCanvas(pageNumber){
  const page=await AppState.pdfDoc.getPage(pageNumber);
  const viewport=page.getViewport({scale:2.2});
  const canvas=document.createElement('canvas');
  canvas.width=viewport.width;
  canvas.height=viewport.height;
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  return canvas;
}

async function scanPdf(){
  if(!AppState.pdfDoc){
    setStatus('ยังไม่ได้เลือก PDF','err');
    return '';
  }

  const from=Math.max(1,parseInt($('pageFrom').value)||1);
  const to=Math.min(AppState.pdfPages,parseInt($('pageTo').value)||AppState.pdfPages);
  if(from>to)throw new Error('ช่วงหน้า PDF ไม่ถูกต้อง');

  const parts=[];
  for(let pageNo=from;pageNo<=to;pageNo++){
    const pct=((pageNo-from)/(to-from+1))*100;
    setProgress(pct);
    setStatus('กำลังอ่านหน้า '+pageNo+'/'+to);
    let text=await extractPdfText(pageNo);
    if(!text.trim()){
      setStatus('หน้า '+pageNo+' ไม่มี Text Layer กำลัง OCR จากภาพ...');
      const canvas=await pdfPageToCanvas(pageNo);
      text=await runOcr(preprocessCanvas(canvas),pct,Math.min(95,pct+20));
    }
    if(text.trim())parts.push(text.trim());
  }
  return parts.join('\n\n');
}
