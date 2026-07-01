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
    wordPageSize:isLandscape?'841.95pt 595.35pt':'595.35pt 841.95pt',
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
  const skill=typeof getActiveOcrSkill==='function'?getActiveOcrSkill():null;
  return {
    title:'RIPTWOSEC.SCAN OCR REPORT',
    source,
    exportedAt:exportedAt.toLocaleString('th-TH'),
    orientation:layout.label,
    confidence:AppState.confidence??'-',
    fixedCount:AppState.fixedWords?.length||0,
    fileCount:items.length,
    skillLabel:skill?.label||'General Text',
    skillTitle:skill?.title||'General Text'
  };
}

function renderReportHeader(meta,item,index,total){
  return '<header class="report-head">'+
    '<div><strong>'+escapeHtml(meta.title)+'</strong><span>Local OCR · Browser processed · Report-ready export</span></div>'+
    '<table><tbody>'+
      '<tr><th>Source</th><td>'+escapeHtml(item?.filename||meta.source)+'</td></tr>'+
      '<tr><th>Exported</th><td>'+escapeHtml(meta.exportedAt)+'</td></tr>'+
      '<tr><th>Quality</th><td>Confidence '+escapeHtml(meta.confidence)+'% · Fixed '+escapeHtml(meta.fixedCount)+' จุด</td></tr>'+
      '<tr><th>OCR Skill</th><td>'+escapeHtml(meta.skillLabel)+' · '+escapeHtml(meta.skillTitle)+'</td></tr>'+
      '<tr><th>Page</th><td>'+index+' / '+total+' · '+escapeHtml(meta.orientation)+'</td></tr>'+
    '</tbody></table>'+
  '</header>';
}

function getReportStyles(layout,forPrint=false){
  return '@page{size:'+layout.pageSize+';margin:14mm}'+
    '@page WordSection1{size:'+layout.wordPageSize+';margin:36pt 36pt 36pt 36pt;mso-page-orientation:'+layout.msoOrientation+'}'+
    'html,body{width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';margin:0;background:#fff}'+
    'body{font-family:Sarabun,Arial;color:#111;line-height:1.7}'+
    'div.WordSection1{page:WordSection1}.page{box-sizing:border-box;width:'+layout.pageWidth+';min-height:'+layout.pageMinHeight+';padding:14mm;page-break-after:always;display:flex;flex-direction:column;gap:8mm}'+
    '.landscape{mso-page-orientation:landscape}.portrait{mso-page-orientation:portrait}'+
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
    '<div class="page '+layout.suffix+'">'+
      renderReportHeader(meta,item,item.index,items.length)+
      '<div class="content">'+(items.length>1?'<h1>'+escapeHtml(item.filename)+'</h1>':'')+
      '<pre>'+escapeHtml(item.cleanedText||'')+'</pre></div>'+
      '<footer class="report-foot"><span>Generated by RIPTWOSEC.SCAN</span><span>ตรวจชื่อเฉพาะ ตัวเลข วันที่ และ URL ก่อนใช้งานจริง</span></footer>'+
    '</div>'
  ).join('');
  const html='<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"><meta name="Generator" content="RIPTWOSEC.SCAN"><title>RIPTWOSEC.SCAN</title><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><style>'+
    getReportStyles(layout,false)+
    '</style></head><body><div class="WordSection1 '+layout.suffix+'">'+pages+'</div></body></html>';
  downloadFile('riptwosec-scan-'+layout.suffix+'.doc',html,'application/msword');
  setStatus('ดาวน์โหลด DOC แล้ว · '+layout.label+' · '+items.length+' ไฟล์','ok');
}

function xmlEscape(text){
  return String(text).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}

function crc32(bytes){
  let crc=~0;
  for(let i=0;i<bytes.length;i++){
    crc^=bytes[i];
    for(let j=0;j<8;j++)crc=(crc>>>1)^(0xedb88320&-(crc&1));
  }
  return ~crc>>>0;
}

function dosDateTime(date=new Date()){
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()/2);
  const day=date.getDate();
  const month=date.getMonth()+1;
  const year=Math.max(0,date.getFullYear()-1980);
  return {time:time&0xffff,date:((year<<9)|(month<<5)|day)&0xffff};
}

function makeZip(files){
  const encoder=new TextEncoder();
  const chunks=[];
  const central=[];
  let offset=0;
  const stamp=dosDateTime();
  const write16=(arr,value)=>{arr.push(value&255,(value>>>8)&255)};
  const write32=(arr,value)=>{arr.push(value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255)};
  files.forEach(file=>{
    const name=encoder.encode(file.name);
    const data=encoder.encode(file.content);
    const crc=crc32(data);
    const local=[];
    write32(local,0x04034b50);write16(local,20);write16(local,0);write16(local,0);write16(local,stamp.time);write16(local,stamp.date);
    write32(local,crc);write32(local,data.length);write32(local,data.length);write16(local,name.length);write16(local,0);
    chunks.push(new Uint8Array(local),name,data);
    const centralPart=[];
    write32(centralPart,0x02014b50);write16(centralPart,20);write16(centralPart,20);write16(centralPart,0);write16(centralPart,0);write16(centralPart,stamp.time);write16(centralPart,stamp.date);
    write32(centralPart,crc);write32(centralPart,data.length);write32(centralPart,data.length);write16(centralPart,name.length);write16(centralPart,0);write16(centralPart,0);write16(centralPart,0);write16(centralPart,0);write32(centralPart,0);write32(centralPart,offset);
    central.push(new Uint8Array(centralPart),name);
    offset+=local.length+name.length+data.length;
  });
  const centralOffset=offset;
  const centralSize=central.reduce((sum,part)=>sum+part.length,0);
  const end=[];
  write32(end,0x06054b50);write16(end,0);write16(end,0);write16(end,files.length);write16(end,files.length);write32(end,centralSize);write32(end,centralOffset);write16(end,0);
  return new Blob([...chunks,...central,new Uint8Array(end)],{type:'application/zip'});
}

function exportDocx(){
  if(!exportReviewReady())return;
  const items=getExportItems();
  const paragraphs=[];
  paragraphs.push('RIPTWOSEC.SCAN OCR REPORT');
  paragraphs.push('Source: '+(AppState.sourceName||items.map(item=>item.filename).join(', ')));
  paragraphs.push('Exported: '+new Date().toLocaleString('th-TH'));
  if(typeof getActivePdfSkill==='function')paragraphs.push('PDF Skill: '+getActivePdfSkill().label+' / '+getActivePdfSkill().title);
  if(typeof getActiveOcrSkill==='function')paragraphs.push('OCR Skill: '+getActiveOcrSkill().label+' / '+getActiveOcrSkill().title);
  items.forEach(item=>{
    paragraphs.push('');
    paragraphs.push(item.filename||'OCR Output');
    (item.cleanedText||'').split('\n').forEach(line=>paragraphs.push(line));
  });
  const body=paragraphs.map(line=>'<w:p><w:r><w:t xml:space="preserve">'+xmlEscape(line)+'</w:t></w:r></w:p>').join('');
  const files=[
    {name:'[Content_Types].xml',content:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},
    {name:'_rels/.rels',content:'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},
    {name:'word/document.xml',content:'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>'}
  ];
  const blob=makeZip(files);
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='riptwosec-scan.docx';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),800);
  setStatus('ดาวน์โหลด DOCX แล้ว','ok');
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
    ocrSkill:typeof getActiveOcrSkill==='function'?getActiveOcrSkill():null,
    pdfSkill:typeof getActivePdfSkill==='function'?getActivePdfSkill():null,
    sourceName:AppState.sourceName||'',
    uploadSource:AppState.uploadSource||'local',
    language:$('langSelect')?.value||'tha+eng',
    mode:$('modeSelect')?.value||'clean',
    pdfOrientation:orientation,
    pdfOrientationLabel:getOrientationLabel(orientation),
    confidence:AppState.confidence,
    rawText:AppState.rawText||'',
    cleanedText:AppState.lastText||$('output').innerText,
    fixedWords:AppState.fixedWords||[],
    pdfPages:AppState.pdfPageInfo||[],
    pdfCompare:AppState.pdfCompareResult||null,
    privacyMode:!!AppState.privacyMode,
    files:items,
    batchResults:items,
    exportedAt:new Date().toISOString()
  };
  downloadFile('riptwosec-scan-'+(orientation==='landscape'?'landscape':'portrait')+'.json',JSON.stringify(payload,null,2),'application/json');
}

function exportMarkdown(){
  const text=typeof buildPdfMarkdown==='function'?buildPdfMarkdown():('# RIPTWOSEC.SCAN OCR\n\n'+renderTextItems(getExportItems()));
  downloadFile('riptwosec-scan.md',text,'text/markdown');
  setStatus('ดาวน์โหลด Markdown แล้ว','ok');
}

function getPdfTableRows(){
  const rows=[['file','page','method','confidence','language','layout','line','text']];
  if(AppState.pdfPageInfo?.length){
    AppState.pdfPageInfo.forEach(page=>{
      const layout=Array.isArray(page.layout)?page.layout.join(', '):(page.layout||'');
      (page.cleanedText||page.text||'').split('\n').forEach((line,index)=>{
        if(line.trim())rows.push([AppState.sourceName||'',page.page,page.methodLabel||page.method||'',page.confidence??'',page.language||'',layout,index+1,line]);
      });
    });
    return rows;
  }
  getExportItems().forEach(item=>{
    (item.cleanedText||'').split('\n').forEach((line,index)=>{
      if(line.trim())rows.push([item.filename,'',getOrientationLabel(item.orientation),item.confidence??'','','',index+1,line]);
    });
  });
  return rows;
}

function exportExcel(){
  const rows=getPdfTableRows();
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body><table>'+
    rows.map((row,rowIndex)=>'<tr>'+row.map(cell=>(rowIndex?'<td>':'<th>')+escapeHtml(cell)+(rowIndex?'</td>':'</th>')).join('')+'</tr>').join('')+
    '</table></body></html>';
  downloadFile('riptwosec-scan-excel.xls',html,'application/vnd.ms-excel');
  setStatus('ดาวน์โหลด Excel-compatible XLS แล้ว','ok');
}

async function ensurePdfPageImages(){
  if(!AppState.pdfDoc||!AppState.pdfPageInfo?.length)return;
  for(const page of AppState.pdfPageInfo){
    if(page.skippedBlank||page.imageDataUrl)continue;
    try{
      page.imageDataUrl=await getPdfPageImageData(page.page,1.2);
    }catch(error){}
  }
}

async function exportSearchablePdf(){
  if(AppState.pdfPageInfo?.length)await ensurePdfPageImages();
  const pages=(AppState.pdfPageInfo||[]).filter(page=>!page.skippedBlank);
  if(!pages.length){
    exportPrintPdf();
    return;
  }
  const pageHtml=pages.map(page=>{
    const text=escapeHtml(page.cleanedText||page.text||'');
    const image=page.imageDataUrl?'<img src="'+page.imageDataUrl+'" alt="หน้า '+page.page+'">':'';
    return '<section class="search-page">'+image+'<pre>'+text+'</pre></section>';
  }).join('');
  const html='<!doctype html><html><head><meta charset="utf-8"><title>Searchable PDF</title><style>'+
    '@page{size:A4;margin:0}body{margin:0;background:#fff;font-family:Sarabun,Arial;color:#111}.search-page{position:relative;box-sizing:border-box;width:210mm;min-height:297mm;page-break-after:always;overflow:hidden;background:#fff}.search-page:last-child{page-break-after:auto}.search-page img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.search-page pre{position:absolute;left:12mm;right:12mm;top:12mm;white-space:pre-wrap;overflow-wrap:anywhere;font:10px/1.45 Sarabun,Arial;color:rgba(0,0,0,.01)}@media screen{body{background:#222}.search-page{margin:16px auto;box-shadow:0 0 0 1px #ddd}}'+
    '</style></head><body>'+pageHtml+'</body></html>';
  downloadFile('riptwosec-searchable-pdf.html',html,'text/html');
  setStatus('ดาวน์โหลด Searchable PDF HTML แล้ว · เปิดไฟล์แล้ว Print > Save as PDF','ok');
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
