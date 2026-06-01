async function copyOutput(){
  const text=AppState.lastText||$('output').innerText;
  if(!text.trim())return;
  await navigator.clipboard.writeText(text);
  setStatus('คัดลอกแล้ว','ok');
}

function exportTxt(){
  if(AppState.pdfPageInfo?.length&&$('separatePages')?.checked){
    const text=AppState.pdfPageInfo.map(p=>'[หน้า '+p.page+']\n'+p.text).join('\n\n');
    downloadFile('riptwosec-scan-pages.txt',text,'text/plain');
    return;
  }
  downloadFile('riptwosec-scan.txt',AppState.lastText||$('output').innerText,'text/plain');
}

function exportDoc(){
  const body='<pre style="font-family:Sarabun,Arial;white-space:pre-wrap;line-height:1.7">'+escapeHtml(AppState.lastText||$('output').innerText)+'</pre>';
  const html='<!doctype html><meta charset="utf-8"><title>RIPTWOSEC.SCAN</title>'+body;
  downloadFile('riptwosec-scan.doc',html,'application/msword');
}

function exportCsv(){
  const text=AppState.lastText||$('output').innerText;
  const csv=text.split('\n').map(line=>'"'+line.replace(/"/g,'""')+'"').join('\n');
  downloadFile('riptwosec-scan.csv',csv,'text/csv');
}

function exportJson(){
  const payload={
    app:'RIPTWOSEC.SCAN',
    sourceName:AppState.sourceName||'',
    uploadSource:AppState.uploadSource||'local',
    language:$('langSelect')?.value||'',
    mode:$('modeSelect')?.value||'',
    pdfOrientation:$('pdfOrientation')?.value||AppState.pdfOrientation||'portrait',
    confidence:AppState.confidence,
    rawText:AppState.rawText||'',
    cleanedText:AppState.lastText||$('output').innerText,
    fixedWords:AppState.fixedWords||[],
    pdfPages:AppState.pdfPageInfo||[],
    batchResults:AppState.batchResults||[],
    exportedAt:new Date().toISOString()
  };
  downloadFile('riptwosec-scan.json',JSON.stringify(payload,null,2),'application/json');
}

function exportPrintPdf(){
  const orientation=$('pdfOrientation')?.value||AppState.pdfOrientation||'portrait';
  AppState.pdfOrientation=orientation;
  const isLandscape=orientation==='landscape';
  const pageSize=isLandscape?'297mm 210mm':'210mm 297mm';
  const pageWidth=isLandscape?'297mm':'210mm';
  const pageMinHeight=isLandscape?'210mm':'297mm';
  const fileSuffix=isLandscape?'landscape':'portrait';
  const text=escapeHtml(AppState.lastText||$('output').innerText);
  const html='<!doctype html><html><head><meta charset="utf-8"><title>RIPTWOSEC.SCAN PDF</title><style>'+
    '@page{size:'+pageSize+';margin:14mm}'+
    'html,body{width:'+pageWidth+';min-height:'+pageMinHeight+';margin:0;background:#fff}'+
    'body{font-family:Sarabun,Arial;color:#111;line-height:1.7}'+
    '.page{box-sizing:border-box;width:'+pageWidth+';min-height:'+pageMinHeight+';padding:14mm;white-space:pre-wrap;overflow-wrap:anywhere}'+
    '@media print{html,body{width:'+pageWidth+';min-height:'+pageMinHeight+'}.page{padding:0}}'+
    '</style></head><body><main class="page">'+text+'</main></body></html>';
  downloadFile('riptwosec-scan-print-'+fileSuffix+'.html',html,'text/html');
  setStatus('ดาวน์โหลดไฟล์ HTML แล้ว · PDF '+(isLandscape?'แนวนอน':'แนวตั้ง')+' · เปิดไฟล์และเลือก Print > Save as PDF','ok');
}
