if(window.pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

function formatPageBlock(pageNumber,text,title='หน้า'){
  const pageTitle=title+' '+pageNumber;
  const line='━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  return line+'\n'+pageTitle+'\n'+line+'\n'+(text||'').trim();
}

function getPdfStrategy(){
  return (typeof getActivePdfSkill==='function'?getActivePdfSkill().config.strategy:'auto')||'auto';
}

async function loadPdfFile(file){
  if(!window.pdfjsLib)throw new Error('โหลด pdf.js ไม่สำเร็จ กรุณาต่ออินเทอร์เน็ต');
  const data=new Uint8Array(await file.arrayBuffer());
  AppState.pdfDoc=await pdfjsLib.getDocument({data}).promise;
  AppState.pdfPages=AppState.pdfDoc.numPages;
  AppState.sourceName=file.name;
  AppState.pdfPageInfo=[];
  $('pageFrom').value=1;
  $('pageTo').value=AppState.pdfPages;
  $('pageFrom').max=AppState.pdfPages;
  $('pageTo').max=AppState.pdfPages;
  const separate=$('separatePages');
  if(separate)separate.checked=true;
  await renderPdfPreview(1);
  await renderPdfThumbnails();
  if(typeof renderPdfPageResults==='function')renderPdfPageResults();
  setStatus('โหลด PDF แล้ว '+AppState.pdfPages+' หน้า · ระบบจะตรวจ Text Layer / Scan แบบรายหน้า','ok');
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
  const source=$('sourceCompare');
  if(source)drawCanvasTo(source,canvas);
}

async function renderPdfThumbnails(){
  const box=$('pdfThumbs');
  box.innerHTML='';
  const max=Math.min(AppState.pdfPages,40);
  for(let i=1;i<=max;i++){
    const div=document.createElement('div');
    div.className='thumb active';
    div.dataset.page=i;
    div.innerHTML='<b>หน้า '+i+'</b><div class="hint">เลือก OCR</div>';
    div.onclick=()=>{
      div.classList.toggle('active');
      renderPdfPreview(i);
    };
    box.appendChild(div);
  }
}

function getSelectedPdfPages(){
  const selected=[...document.querySelectorAll('#pdfThumbs .thumb.active')].map(x=>Number(x.dataset.page));
  if(selected.length)return selected;
  const from=Math.max(1,parseInt($('pageFrom').value)||1);
  const to=Math.min(AppState.pdfPages,parseInt($('pageTo').value)||AppState.pdfPages);
  const pages=[];
  for(let p=from;p<=to;p++)pages.push(p);
  return pages;
}

async function extractPdfTextMeta(pageNumber,doc=AppState.pdfDoc){
  const page=await doc.getPage(pageNumber);
  const textContent=await page.getTextContent({normalizeWhitespace:false});
  if(!textContent.items||!textContent.items.length)return {text:'',items:[],rows:[]};

  const rows=[];
  for(const item of textContent.items){
    if(!item.str)continue;
    const y=Math.round(item.transform[5]);
    let row=rows.find(r=>Math.abs(r.y-y)<3);
    if(!row){row={y,items:[]};rows.push(row)}
    row.items.push({x:item.transform[4],y,s:item.str,width:item.width||0,height:item.height||0});
  }

  const text=rows
    .sort((a,b)=>b.y-a.y)
    .map(row=>row.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').trim())
    .filter(Boolean)
    .join('\n');
  return {text,items:rows.flatMap(row=>row.items),rows};
}

async function extractPdfText(pageNumber){
  return (await extractPdfTextMeta(pageNumber)).text;
}

async function pdfPageToCanvas(pageNumber,scale=2.8,doc=AppState.pdfDoc){
  const page=await doc.getPage(pageNumber);
  const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');
  canvas.width=viewport.width;
  canvas.height=viewport.height;
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  return canvas;
}

function isTextLayerUsable(text){
  const compact=(text||'').replace(/\s/g,'');
  const meaningful=(compact.match(/[A-Za-z0-9ก-ฮ]/g)||[]).length;
  return meaningful>=12;
}

function cleanPdfPagePreview(text){
  if(!text)return '';
  const fixedBackup=[...(AppState.fixedWords||[])];
  const confidenceBackup=AppState.confidence;
  try{
    return cleanText(text);
  }finally{
    AppState.fixedWords=fixedBackup;
    AppState.confidence=confidenceBackup;
  }
}

function shouldOcrPdfPage({strategy,hadTextLayer,textUsable}){
  if(strategy==='text-first')return !textUsable;
  if(strategy==='ocr')return true;
  if(strategy==='compare')return !textUsable;
  const forceAllOcr=$('ocrOnlyNoText')?.checked===false;
  if(forceAllOcr)return true;
  return !hadTextLayer||!textUsable;
}

function getPdfMethodLabel(method){
  return method==='text-layer'?'Text Layer':method==='ocr'?'Scanned OCR':method==='mixed'?'Mixed Best Page':method==='blank'?'Blank Skipped':'PDF';
}

async function getPdfPageImageData(pageNumber,scale=1.3,doc=AppState.pdfDoc){
  const canvas=await pdfPageToCanvas(pageNumber,scale,doc);
  return canvas.toDataURL('image/jpeg',.86);
}

async function scanPdf(){
  if(!AppState.pdfDoc){
    setStatus('ยังไม่ได้เลือก PDF','err');
    return '';
  }

  const pages=getSelectedPdfPages();
  if(!pages.length)throw new Error('ยังไม่ได้เลือกหน้า PDF');

  AppState.pdfPageInfo=[];
  const parts=[];
  const splitPages=$('separatePages')?.checked!==false;
  const skill=typeof getActivePdfSkill==='function'?getActivePdfSkill():null;
  const strategy=getPdfStrategy();
  const skipBlank=$('skipBlankPdfPages')?.checked!==false;
  const storeImages=!!skill?.config?.store_images;
  for(let i=0;i<pages.length;i++){
    const pageNo=pages[i];
    const pct=(i/pages.length)*100;
    setProgress(pct);
    setStatus('กำลังตรวจ PDF หน้า '+pageNo+' ('+(i+1)+'/'+pages.length+') · '+(skill?.label||'Auto PDF'));
    const meta=await extractPdfTextMeta(pageNo);
    const textLayer=(meta.text||'').trim();
    const hadTextLayer=!!textLayer;
    const textUsable=isTextLayerUsable(textLayer);
    let method=textUsable?'text-layer':'ocr';
    let text=textLayer;
    let confidence=textUsable?98:0;
    let usedOcr=false;
    const needOcr=shouldOcrPdfPage({strategy,hadTextLayer,textUsable});
    if(needOcr){
      setStatus('หน้า '+pageNo+' ใช้ OCR จากภาพ · '+(hadTextLayer?'text layer สั้น/เลือก OCR ซ้ำ':'ไม่มี text layer'));
      const canvas=await pdfPageToCanvas(pageNo);
      const previousPdfPage=AppState.currentPdfPage;
      AppState.currentPdfPage=pageNo;
      let ocrText='';
      try{
        ocrText=await runOcr(canvas,pct,Math.min(96,pct+(100/pages.length)),'pdf');
      }finally{
        AppState.currentPdfPage=previousPdfPage;
      }
      const ocrConfidence=AppState.confidence||0;
      usedOcr=true;
      if(textUsable&&strategy==='auto'){
        const textScore=scoreOcrText(textLayer,98);
        const ocrScore=scoreOcrText(ocrText,ocrConfidence);
        if(ocrScore>textScore+12){
          text=ocrText;
          confidence=ocrConfidence;
          method='mixed';
        }else{
          text=textLayer;
          confidence=98;
          method='text-layer';
        }
      }else{
        text=ocrText;
        confidence=ocrConfidence;
        method='ocr';
      }
    }
    const rawPageText=text.trim();
    const blank=typeof isPdfBlankText==='function'?isPdfBlankText(rawPageText):!rawPageText;
    const layout=typeof detectPdfLayout==='function'?detectPdfLayout(rawPageText,meta.items):'plain';
    const language=typeof detectTextLanguage==='function'?detectTextLanguage(rawPageText):'';
    const lowConfidence=typeof buildPageConfidence==='function'?buildPageConfidence(rawPageText,confidence,method):{lowWords:[],lowLines:[]};
    const cleanedText=cleanPdfPagePreview(rawPageText);
    const pageInfo={
      page:pageNo,
      text:rawPageText,
      rawText:rawPageText,
      cleanedText,
      hadTextLayer,
      usedOcr,
      method,
      methodLabel:getPdfMethodLabel(blank?'blank':method),
      confidence,
      language,
      layout,
      charCount:rawPageText.replace(/\s/g,'').length,
      lowConfidence,
      skippedBlank:blank&&skipBlank
    };
    if(storeImages&&!pageInfo.skippedBlank){
      try{pageInfo.imageDataUrl=await getPdfPageImageData(pageNo)}catch(error){}
    }
    AppState.pdfPageInfo.push(pageInfo);
    if(typeof renderPdfPageResults==='function')renderPdfPageResults();
    if(pageInfo.skippedBlank)continue;
    if(rawPageText){
      parts.push(splitPages?formatPageBlock(pageNo,rawPageText):rawPageText);
    }else if(splitPages){
      parts.push(formatPageBlock(pageNo,'ไม่พบข้อความในหน้านี้'));
    }
  }
  return parts.join('\n\n');
}

function updatePdfCleanedPages(){
  if(!AppState.pdfPageInfo?.length)return;
  AppState.pdfPageInfo=AppState.pdfPageInfo.map(page=>({
    ...page,
    cleanedText:page.skippedBlank?'':cleanPdfPagePreview(page.rawText||page.text||'')
  }));
}

async function handlePdfCompareFile(file){
  if(!file)return;
  if(file.type!=='application/pdf'){
    setStatus('กรุณาเลือก PDF สำหรับเปรียบเทียบ','err');
    return;
  }
  AppState.pdfCompareFile=file;
  const result=$('pdfCompareResult');
  if(result)result.innerHTML='<b>Compare file:</b> '+escapeHtml(file.name);
  setStatus('เลือกไฟล์เปรียบเทียบแล้ว: '+file.name,'ok');
}

async function extractPdfDocText(doc,label='PDF'){
  const pages=[];
  const total=Math.min(doc.numPages,80);
  for(let p=1;p<=total;p++){
    setStatus('กำลังอ่าน '+label+' หน้า '+p+'/'+total+' เพื่อเปรียบเทียบ');
    const meta=await extractPdfTextMeta(p,doc);
    let text=(meta.text||'').trim();
    let confidence=isTextLayerUsable(text)?98:0;
    if(!isTextLayerUsable(text)){
      const canvas=await pdfPageToCanvas(p,2.2,doc);
      const previousPdfPage=AppState.currentPdfPage;
      AppState.currentPdfPage=p;
      try{
        text=await runOcr(canvas,0,100,'pdf');
      }finally{
        AppState.currentPdfPage=previousPdfPage;
      }
      confidence=AppState.confidence||0;
    }
    if(!isPdfBlankText(text))pages.push({page:p,text,confidence});
  }
  return pages;
}

function comparePdfTexts(leftPages,rightPages){
  const leftLines=leftPages.flatMap(page=>page.text.split('\n').map(line=>({page:page.page,line:line.trim()}))).filter(item=>item.line);
  const rightLines=rightPages.flatMap(page=>page.text.split('\n').map(line=>({page:page.page,line:line.trim()}))).filter(item=>item.line);
  const rightSet=new Set(rightLines.map(item=>item.line));
  const leftSet=new Set(leftLines.map(item=>item.line));
  const onlyLeft=leftLines.filter(item=>!rightSet.has(item.line)).slice(0,60);
  const onlyRight=rightLines.filter(item=>!leftSet.has(item.line)).slice(0,60);
  return {leftLines:leftLines.length,rightLines:rightLines.length,onlyLeft,onlyRight};
}

async function comparePdfWithSelected(){
  if(!AppState.pdfDoc){
    setStatus('เลือก PDF หลักก่อน','err');
    return;
  }
  if(!AppState.pdfCompareFile){
    setStatus('เลือก PDF ไฟล์ที่สองก่อน','err');
    return;
  }
  const data=new Uint8Array(await AppState.pdfCompareFile.arrayBuffer());
  const compareDoc=await pdfjsLib.getDocument({data}).promise;
  const leftPages=AppState.pdfPageInfo?.length?AppState.pdfPageInfo.filter(page=>!page.skippedBlank).map(page=>({page:page.page,text:page.rawText||page.text||'',confidence:page.confidence})):await extractPdfDocText(AppState.pdfDoc,'PDF หลัก');
  const rightPages=await extractPdfDocText(compareDoc,'PDF เปรียบเทียบ');
  const diff=comparePdfTexts(leftPages,rightPages);
  AppState.pdfCompareResult={leftPages,rightPages,diff,compareFile:AppState.pdfCompareFile.name};
  const box=$('pdfCompareResult');
  if(box){
    box.innerHTML='<b>ผลเปรียบเทียบ</b><span>PDF หลัก '+diff.leftLines+' บรรทัด · PDF ที่สอง '+diff.rightLines+' บรรทัด</span>'+
      '<span>ต่างจากไฟล์หลัก: '+diff.onlyLeft.length+' บรรทัด · เพิ่มในไฟล์สอง: '+diff.onlyRight.length+' บรรทัด</span>';
  }
  const report='PDF Compare: '+(AppState.sourceName||'current')+' vs '+AppState.pdfCompareFile.name+'\n\n'+
    'เฉพาะ PDF หลัก:\n'+diff.onlyLeft.map(item=>'- หน้า '+item.page+': '+item.line).join('\n')+
    '\n\nเฉพาะ PDF ที่สอง:\n'+diff.onlyRight.map(item=>'- หน้า '+item.page+': '+item.line).join('\n');
  AppState.rawText=report;
  await showCleanedResult(report,true);
  setStatus('เปรียบเทียบ PDF เสร็จแล้ว','ok');
}
