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
    pageSize:isLandscape?'297mm 210mm':'210mm 297mm',
    pageWidth:isLandscape?'297mm':'210mm',
    pageMinHeight:isLandscape?'210mm':'297mm'
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
  const items=getExportItems();
  const layout=getOrientationLayout(items[0]?.orientation||getExportOrientation());
  const pages=items.map(item=>
    '<section class="page">'+
      (items.length>1?'<h1>'+escapeHtml(item.filename)+'</h1><div class="meta">แนวเอกสาร: '+layout.label+'</div>':'')+
      '<pre>'+escapeHtml(item.cleanedText||'')+'</pre>'+
    '</section>'
  ).join('');
  const html='<!doctype html><html><head><meta charset="utf-8"><title>RIPTWOSEC.SCAN</title><style>'+
    '@page{size:'+layout.pageSize+';margin:14mm}'+
    'html,body{width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';margin:0;background:#fff}'+
    'body{font-family:Sarabun,Arial;color:#111;line-height:1.7}'+
    '.page{box-sizing:border-box;width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';padding:14mm;page-break-after:always}'+
    '.page:last-child{page-break-after:auto}h1{font-size:18px;margin:0 0 4mm}.meta{font-size:12px;color:#555;margin-bottom:6mm}pre{font-family:Sarabun,Arial;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}'+
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
  const items=getExportItems();
  const layout=getOrientationLayout(items[0]?.orientation||getExportOrientation());
  const pages=items.map(item=>
    '<main class="page">'+
      (items.length>1?'<h1>'+escapeHtml(item.filename)+'</h1><div class="meta">แนวเอกสาร: '+layout.label+'</div>':'')+
      '<pre>'+escapeHtml(item.cleanedText||'')+'</pre>'+
    '</main>'
  ).join('');
  const html='<!doctype html><html><head><meta charset="utf-8"><title>RIPTWOSEC.SCAN PDF</title><style>'+
    '@page{size:'+layout.pageSize+';margin:14mm}'+
    'html,body{width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';margin:0;background:#fff}'+
    'body{font-family:Sarabun,Arial;color:#111;line-height:1.7}'+
    '.page{box-sizing:border-box;width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';padding:14mm;page-break-after:always}'+
    '.page:last-child{page-break-after:auto}h1{font-size:18px;margin:0 0 4mm}.meta{font-size:12px;color:#555;margin-bottom:6mm}pre{font-family:Sarabun,Arial;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}'+
    '@media print{html,body{width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+'}.page{padding:0}}'+
    '</style></head><body>'+pages+'</body></html>';
  downloadFile('riptwosec-scan-print-'+layout.suffix+'.html',html,'text/html');
  setStatus('ดาวน์โหลดไฟล์ HTML แล้ว · PDF '+layout.label+' · '+items.length+' ไฟล์ · เปิดไฟล์และเลือก Print > Save as PDF','ok');
}
