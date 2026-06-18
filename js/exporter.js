async function copyOutput(){
  const text=AppState.lastText||$('output').innerText;
  if(!text.trim())return;
  await navigator.clipboard.writeText(text);
  setStatus('คัดลอกแล้ว','ok');
}

function getExportOrientation(){
  const orientation=$('pdfOrientation')?.value||AppState.pdfOrientation||'portrait';
  AppState.pdfOrientation=orientation;
  return orientation==='landscape'?'landscape':'portrait';
}

function getOrientationLabel(orientation){
  return orientation==='landscape'?'แนวนอน':'แนวตั้ง';
}

function getOrientationLayout(orientation){
  const isLandscape=orientation==='landscape';
  return {
    isLandscape,
    label:getOrientationLabel(orientation),
    suffix:isLandscape?'landscape':'portrait',
    pageSize:isLandscape?'A4 landscape':'A4 portrait',
    pageWidth:isLandscape?'297mm':'210mm',
    pageMinHeight:isLandscape?'210mm':'297mm',
    msoOrientation:isLandscape?'landscape':'portrait'
  };
}

function getExportItems(){
  const orientation=getExportOrientation();
  const batch=(AppState.batchResults||[]).filter(item=>(item.cleanedText||item.rawText||'').trim());
  if(batch.length){
    return batch.map((item,index)=>({
      index:index+1,
      filename:item.filename||('file-'+(index+1)),
      rawText:item.rawText||'',
      cleanedText:item.cleanedText||'',
      fixedWords:item.fixedWords||[],
      confidence:item.confidence,
      orientation
    }));
  }
  return [{
    index:1,
    filename:AppState.sourceName||'riptwosec-scan',
    rawText:AppState.rawText||'',
    cleanedText:AppState.lastText||$('output').innerText,
    fixedWords:AppState.fixedWords||[],
    confidence:AppState.confidence,
    orientation
  }];
}

function renderTextItems(items){
  if(items.length===1)return items[0].cleanedText||'';
  return items.map(item=>'[ไฟล์ '+item.index+': '+item.filename+' · '+getOrientationLabel(item.orientation)+']\n'+(item.cleanedText||'')).join('\n\n');
}

function exportReviewReady(){
  const checks=[...document.querySelectorAll('[data-review-check]')];
  if(!checks.length)return true;
  const missing=checks.filter(check=>!check.checked).length;
  const panel=$('exportReview');
  if(missing){
    panel?.classList.add('review-required');
    setStatus('กรุณาติ๊ก Review Checklist ก่อนส่งออก DOC/PDF · เหลือ '+missing+' รายการ','err');
    panel?.scrollIntoView({block:'center'});
    return false;
  }
  panel?.classList.remove('review-required');
  return true;
}

function getExportReportMeta(layout,items){
  const exportedAt=new Date();
  const source=AppState.sourceName||items.map(item=>item.filename).join(', ')||'riptwosec-scan';
  return {
    title:'RIPTWOSEC.SCAN OCR REPORT',
    source,
    exportedAt:exportedAt.toLocaleString('th-TH'),
    orientation:layout.label,
    confidence:AppState.confidence??'-',
    fixedCount:AppState.fixedWords?.length||0,
    fileCount:items.length
  };
}

function renderReportHeader(meta,item,index,total){
  return '<header class="report-head">'+
    '<div><strong>'+escapeHtml(meta.title)+'</strong><span>Local OCR · Browser processed · Report-ready export</span></div>'+
    '<table><tbody>'+
      '<tr><th>Source</th><td>'+escapeHtml(item?.filename||meta.source)+'</td></tr>'+
      '<tr><th>Exported</th><td>'+escapeHtml(meta.exportedAt)+'</td></tr>'+
      '<tr><th>Quality</th><td>Confidence '+escapeHtml(meta.confidence)+'% · Fixed '+escapeHtml(meta.fixedCount)+' จุด</td></tr>'+
      '<tr><th>Page</th><td>'+index+' / '+total+' · '+escapeHtml(meta.orientation)+'</td></tr>'+
    '</tbody></table>'+
  '</header>';
}

function getReportStyles(layout,forPrint=false){
  return '@page{size:'+layout.pageSize+';margin:14mm}'+
    '@page WordSection1{size:'+layout.pageSize+';margin:14mm;mso-page-orientation:'+layout.msoOrientation+'}'+
    'html,body{width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';margin:0;background:#fff}'+
    'body{font-family:Sarabun,Arial;color:#111;line-height:1.7}'+
    '.page{box-sizing:border-box;width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';padding:14mm;page-break-after:always;display:flex;flex-direction:column;gap:8mm;mso-element:para-border-div}'+
    '.landscape{page:WordSection1;mso-page-orientation:landscape}.portrait{page:WordSection1;mso-page-orientation:portrait}'+
    '.page:last-child{page-break-after:auto}.report-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10mm;align-items:start;border-bottom:1px solid #d6dde5;padding-bottom:6mm}'+
    '.report-head strong{display:block;font-size:15px;letter-spacing:.4px}.report-head span{display:block;color:#5b6470;font-size:11px;margin-top:1mm}.report-head table{border-collapse:collapse;font-size:10.5px;color:#26313d}.report-head th{text-align:left;color:#697481;font-weight:700;padding:1mm 4mm 1mm 0}.report-head td{padding:1mm 0}'+
    '.content{flex:1}.content h1{font-size:18px;margin:0 0 4mm}.content pre{font-family:Sarabun,Arial;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.report-foot{margin-top:auto;border-top:1px solid #e5e7eb;padding-top:3mm;color:#667085;font-size:10px;display:flex;justify-content:space-between;gap:8mm}'+
    (forPrint?'@media print{@page{size:'+layout.pageSize+';margin:14mm}html,body{width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+'}.page{width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';padding:0}}':'');
}

function exportTxt(){
  const items=getExportItems();
  if(AppState.pdfPageInfo?.length&&$('separatePages')?.checked){
    const orientation=getExportOrientation();
    const text='[แนวเอกสาร: '+getOrientationLabel(orientation)+']\n\n'+AppState.pdfPageInfo.map(p=>'[หน้า '+p.page+']\n'+p.text).join('\n\n');
    downloadFile('riptwosec-scan-pages.txt',text,'text/plain');
    return;
  }
  const suffix=items[0]?.orientation==='landscape'?'landscape':'portrait';
  downloadFile('riptwosec-scan-'+suffix+'.txt',renderTextItems(items),'text/plain');
}

function exportDoc(){
  if(!exportReviewReady())return;
  const items=getExportItems();
  const layout=getOrientationLayout(items[0]?.orientation||getExportOrientation());
  const meta=getExportReportMeta(layout,items);
  const pages=items.map(item=>
    '<section class="page '+layout.suffix+'">'+
      renderReportHeader(meta,item,item.index,items.length)+
      '<div class="content">'+(items.length>1?'<h1>'+escapeHtml(item.filename)+'</h1>':'')+
      '<pre>'+escapeHtml(item.cleanedText||'')+'</pre></div>'+
      '<footer class="report-foot"><span>Generated by RIPTWOSEC.SCAN</span><span>ตรวจชื่อเฉพาะ ตัวเลข วันที่ และ URL ก่อนใช้งานจริง</span></footer>'+
    '</section>'
  ).join('');
  const html='<!doctype html><html><head><meta charset="utf-8"><title>RIPTWOSEC.SCAN</title><style>'+
    getReportStyles(layout,false)+
    '</style></head><body>'+pages+'</body></html>';
  downloadFile('riptwosec-scan-'+layout.suffix+'.doc',html,'application/msword');
  setStatus('ดาวน์โหลด DOC แล้ว · '+layout.label+' · '+items.length+' ไฟล์','ok');
}

function exportCsv(){
  const items=getExportItems();
  const rows=[['file','orientation','line','text']];
  items.forEach(item=>{
    (item.cleanedText||'').split('\n').forEach((line,index)=>{
      rows.push([item.filename,getOrientationLabel(item.orientation),String(index+1),line]);
    });
  });
  const csv=rows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\n');
  const suffix=items[0]?.orientation==='landscape'?'landscape':'portrait';
  downloadFile('riptwosec-scan-'+suffix+'.csv',csv,'text/csv');
}

function exportJson(){
  const items=getExportItems();
  const orientation=items[0]?.orientation||getExportOrientation();
  const payload={
    app:'RIPTWOSEC.SCAN',
    sourceName:AppState.sourceName||'',
    uploadSource:AppState.uploadSource||'local',
    language:$('langSelect')?.value||'',
    mode:$('modeSelect')?.value||'',
    pdfOrientation:orientation,
    pdfOrientationLabel:getOrientationLabel(orientation),
    confidence:AppState.confidence,
    rawText:AppState.rawText||'',
    cleanedText:AppState.lastText||$('output').innerText,
    fixedWords:AppState.fixedWords||[],
    pdfPages:AppState.pdfPageInfo||[],
    files:items,
    batchResults:items,
    exportedAt:new Date().toISOString()
  };
  downloadFile('riptwosec-scan-'+(orientation==='landscape'?'landscape':'portrait')+'.json',JSON.stringify(payload,null,2),'application/json');
}

function exportPrintPdf(){
  if(!exportReviewReady())return;
  const items=getExportItems();
  const layout=getOrientationLayout(items[0]?.orientation||getExportOrientation());
  const meta=getExportReportMeta(layout,items);
  const pages=items.map(item=>
    '<main class="page '+layout.suffix+'">'+
      renderReportHeader(meta,item,item.index,items.length)+
      '<div class="content">'+(items.length>1?'<h1>'+escapeHtml(item.filename)+'</h1>':'')+
      '<pre>'+escapeHtml(item.cleanedText||'')+'</pre></div>'+
      '<footer class="report-foot"><span>Generated by RIPTWOSEC.SCAN</span><span>Local OCR · No cloud review · Verify critical fields</span></footer>'+
    '</main>'
  ).join('');
  const html='<!doctype html><html><head><meta charset="utf-8"><title>RIPTWOSEC.SCAN PDF</title><style>'+
    getReportStyles(layout,true)+
    '</style></head><body>'+pages+'</body></html>';
  downloadFile('riptwosec-scan-print-'+layout.suffix+'.html',html,'text/html');
  setStatus('ดาวน์โหลดไฟล์ HTML แล้ว · PDF '+layout.label+' · '+items.length+' ไฟล์ · เปิดไฟล์และเลือก Print > Save as PDF','ok');
}
