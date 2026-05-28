function setBatchFiles(files){
  AppState.batchFiles=[...files];
  AppState.batchResults=[];
  renderBatchList();
}

function renderBatchList(){
  const box=$('batchList');
  if(!box)return;
  box.innerHTML='';
  if(!AppState.batchFiles.length){box.innerHTML='<div class="hint">ยังไม่มีไฟล์ Batch</div>';return;}
  AppState.batchFiles.forEach((file,index)=>{
    const div=document.createElement('div');
    div.className='batch-item';
    div.textContent=(index+1)+'. '+file.name+' · '+file.type;
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
    if(file.type.startsWith('image/')){
      const canvas=await imageFileToCanvas(file);
      raw=await runOcr(preprocessCanvas(canvas),(i/AppState.batchFiles.length)*100,((i+1)/AppState.batchFiles.length)*100);
    }else if(file.type==='application/pdf'){
      const data=new Uint8Array(await file.arrayBuffer());
      const previousDoc=AppState.pdfDoc;
      const previousPages=AppState.pdfPages;
      AppState.pdfDoc=await pdfjsLib.getDocument({data}).promise;
      AppState.pdfPages=AppState.pdfDoc.numPages;
      const parts=[];
      for(let p=1;p<=AppState.pdfPages;p++){
        let text=await extractPdfText(p);
        if(!text.trim()){
          const canvas=await pdfPageToCanvas(p);
          text=await runOcr(preprocessCanvas(canvas));
        }
        if(text.trim())parts.push('[หน้า '+p+']\n'+text.trim());
      }
      raw=parts.join('\n\n');
      AppState.pdfDoc=previousDoc;
      AppState.pdfPages=previousPages;
    }
    const cleaned=cleanText(raw);
    AppState.batchResults.push({filename:file.name,rawText:raw,cleanedText:cleaned,fixedWords:[...AppState.fixedWords],confidence:AppState.confidence});
    all.push('===== '+file.name+' =====\n'+cleaned);
  }
  return all.join('\n\n');
}
