function setBatchFiles(files){
  AppState.batchFiles=[...files];
  AppState.batchResults=[];
  renderBatchList();
  if(AppState.batchFiles.length){
    const label=AppState.batchFiles.length+' ไฟล์ · '+AppState.batchFiles.map(f=>f.name).slice(0,3).join(', ')+(AppState.batchFiles.length>3?' ...':'');
    setFileSuccess('batchFileInfo','batchFileName',label,'batch');
    setStatus('อัปโหลด Batch สำเร็จ: '+AppState.batchFiles.length+' ไฟล์','ok');
  }
}

function renderBatchList(){
  const box=$('batchList');
  if(!box)return;
  box.innerHTML='';
  if(!AppState.batchFiles.length){box.innerHTML='<div class="hint">ยังไม่มีไฟล์ Batch</div>';return;}
  AppState.batchFiles.forEach((file,index)=>{
    const div=document.createElement('div');
    div.className='batch-item file-success batch-uploaded';
    div.innerHTML='<span class="file-check">✓</span><span>'+(index+1)+'. '+escapeHtml(file.name)+'</span><span class="hint">'+escapeHtml(file.type||'file')+'</span>';
    box.appendChild(div);
  });
}

async function scanBatch(){
  if(!AppState.batchFiles.length){setStatus('ยังไม่ได้เลือกไฟล์ Batch','err');return '';}
  AppState.batchResults=[];
  const all=[];
  for(let i=0;i<AppState.batchFiles.length;i++){
    const file=AppState.batchFiles[i];
    setProgress((i/AppState.batchFiles.length)*100);
    setStatus('Batch OCR '+(i+1)+'/'+AppState.batchFiles.length+' · '+file.name);
    let raw='';
    const fileLine='████████████████████████████████████\nไฟล์: '+file.name+'\n████████████████████████████████████';
    if(file.type.startsWith('image/')){
      const canvas=await imageFileToCanvas(file);
      const text=await runOcr(preprocessCanvas(canvas),(i/AppState.batchFiles.length)*100,((i+1)/AppState.batchFiles.length)*100);
      raw=fileLine+'\n\n'+formatPageBlock(1,text.trim()||'ไม่พบข้อความในรูปภาพ','ภาพ');
    }else if(file.type==='application/pdf'){
      const data=new Uint8Array(await file.arrayBuffer());
      const previousDoc=AppState.pdfDoc;
      const previousPages=AppState.pdfPages;
      const previousInfo=AppState.pdfPageInfo;
      AppState.pdfDoc=await pdfjsLib.getDocument({data}).promise;
      AppState.pdfPages=AppState.pdfDoc.numPages;
      const parts=[];
      for(let p=1;p<=AppState.pdfPages;p++){
        setStatus('Batch OCR '+file.name+' · หน้า '+p+'/'+AppState.pdfPages);
        const meta=await extractPdfTextMeta(p);
        let text=(meta.text||'').trim();
        if(!isTextLayerUsable(text)){
          const canvas=await pdfPageToCanvas(p);
          text=await runOcr(preprocessCanvas(canvas));
        }
        if($('skipBlankPdfPages')?.checked!==false&&typeof isPdfBlankText==='function'&&isPdfBlankText(text))continue;
        parts.push(formatPageBlock(p,text.trim()||'ไม่พบข้อความในหน้านี้'));
      }
      raw=fileLine+'\n\n'+parts.join('\n\n');
      AppState.pdfDoc=previousDoc;
      AppState.pdfPages=previousPages;
      AppState.pdfPageInfo=previousInfo;
    }
    const cleaned=cleanText(raw);
    AppState.batchResults.push({filename:file.name,rawText:raw,cleanedText:cleaned,fixedWords:[...AppState.fixedWords],confidence:AppState.confidence});
    all.push(cleaned);
  }
  return all.join('\n\n');
}
