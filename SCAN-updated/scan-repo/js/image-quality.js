function getImageStats(canvas){
  const probe=document.createElement('canvas');
  const maxSide=Math.max(canvas.width,canvas.height);
  const scale=maxSide>520?520/maxSide:1;
  probe.width=Math.max(1,Math.round(canvas.width*scale));
  probe.height=Math.max(1,Math.round(canvas.height*scale));
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(canvas,0,0,probe.width,probe.height);
  const data=ctx.getImageData(0,0,probe.width,probe.height).data;
  let sum=0,sum2=0,dark=0,light=0;
  const gray=[];
  for(let i=0;i<data.length;i+=4){
    const value=Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2]);
    gray.push(value);
    sum+=value;
    sum2+=value*value;
    if(value<72)dark++;
    if(value>218)light++;
  }
  const pixels=gray.length||1;
  const avg=sum/pixels;
  const variance=Math.max(0,(sum2/pixels)-(avg*avg));
  let laplace=0,count=0;
  for(let y=1;y<probe.height-1;y++){
    for(let x=1;x<probe.width-1;x++){
      const i=y*probe.width+x;
      const edge=Math.abs((gray[i]*4)-gray[i-1]-gray[i+1]-gray[i-probe.width]-gray[i+probe.width]);
      laplace+=edge;
      count++;
    }
  }
  return {
    width:canvas.width,
    height:canvas.height,
    avg,
    contrast:Math.sqrt(variance),
    blur:laplace/Math.max(1,count),
    darkRatio:dark/pixels,
    lightRatio:light/pixels
  };
}

function analyzeCanvasQuality(canvas){
  if(!canvas)return null;
  const stats=getImageStats(canvas);
  const warnings=[];
  let score=100;
  const minSide=Math.min(stats.width,stats.height);
  if(minSide<700){warnings.push('ความละเอียดต่ำ');score-=16;}
  if(stats.blur<18){warnings.push('ภาพอาจเบลอ');score-=18;}
  if(stats.avg<82){warnings.push('ภาพมืด');score-=14;}
  if(stats.avg>218){warnings.push('ภาพสว่างเกิน');score-=12;}
  if(stats.contrast<38){warnings.push('contrast ต่ำ');score-=14;}
  if(stats.darkRatio>.55){warnings.push('พื้นหลังมืดมาก');score-=10;}
  if(stats.lightRatio>.82&&stats.contrast<44){warnings.push('กระดาษขาวจาง อาจต้องเพิ่ม contrast');score-=8;}
  const level=score>=82?'good':score>=64?'warn':'bad';
  return {...stats,score:Math.max(35,Math.min(99,Math.round(score))),level,warnings};
}

function renderFileQualityReport(report){
  AppState.fileQuality=report||null;
  const box=$('fileQualityPanel');
  if(!box)return;
  box.classList.toggle('hide',!report);
  if(!report){box.innerHTML='';return;}
  const label=report.level==='good'?'พร้อม OCR':report.level==='warn'?'ควรปรับภาพ':'เสี่ยงอ่านผิด';
  const warnings=report.warnings.length?report.warnings.map(item=>'<span>'+escapeHtml(item)+'</span>').join(''):'<span>คุณภาพภาพดี</span>';
  box.className='file-quality-panel '+report.level;
  box.innerHTML='<div><b>File Quality</b><strong>'+report.score+'%</strong><small>'+label+' · '+report.width+'x'+report.height+' · blur '+Math.round(report.blur)+' · contrast '+Math.round(report.contrast)+'</small></div><p>'+warnings+'</p>';
}

function autoCropDocumentCanvas(source){
  if(!source)return source;
  const probe=document.createElement('canvas');
  const maxSide=Math.max(source.width,source.height);
  const scale=maxSide>900?900/maxSide:1;
  probe.width=Math.max(1,Math.round(source.width*scale));
  probe.height=Math.max(1,Math.round(source.height*scale));
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(source,0,0,probe.width,probe.height);
  const img=ctx.getImageData(0,0,probe.width,probe.height);
  const data=img.data;
  let minX=probe.width,minY=probe.height,maxX=0,maxY=0,seen=0;
  for(let y=0;y<probe.height;y++){
    for(let x=0;x<probe.width;x++){
      const i=(y*probe.width+x)*4;
      const gray=.299*data[i]+.587*data[i+1]+.114*data[i+2];
      if(gray<242){
        minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);seen++;
      }
    }
  }
  if(seen<probe.width*probe.height*.08)return source;
  const pad=Math.round(Math.min(probe.width,probe.height)*.025);
  minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(probe.width-1,maxX+pad);maxY=Math.min(probe.height-1,maxY+pad);
  const cropW=maxX-minX+1,cropH=maxY-minY+1;
  if(cropW<probe.width*.45||cropH<probe.height*.45)return source;
  if(cropW>probe.width*.985&&cropH>probe.height*.985)return source;
  const sx=minX/scale,sy=minY/scale,sw=cropW/scale,sh=cropH/scale;
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(sw);
  canvas.height=Math.round(sh);
  canvas.getContext('2d').drawImage(source,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  return canvas;
}

function prepareImageForOcr(source){
  return autoCropDocumentCanvas(source);
}

function syncEditedOutput(){
  const output=$('output');
  if(!output)return;
  AppState.lastText=output.innerText.trim();
}

function goToLowConfidence(){
  const target=document.querySelector('.low-confidence mark,.low-confidence code,.quality-gate.bad,.quality-gate.warn');
  if(target){
    target.scrollIntoView({block:'center',behavior:'smooth'});
    target.classList.add('review-pulse');
    setTimeout(()=>target.classList.remove('review-pulse'),1300);
    setStatus('เลื่อนไปยังจุดที่ควรตรวจแล้ว','ok');
  }else{
    setStatus('ยังไม่พบจุด low confidence ในผลลัพธ์นี้','ok');
  }
}

function highlightSuspiciousOutput(){
  const output=$('output');
  if(!output)return;
  const text=output.innerText||AppState.lastText||'';
  const issues=typeof findSuspiciousOcrTokens==='function'?findSuspiciousOcrTokens(text):[];
  if(!issues.length){
    setStatus('ไม่พบคำ/รูปแบบน่าสงสัยให้ไฮไลต์','ok');
    return;
  }
  let html=escapeHtml(text);
  const samples=[...new Set(issues.flatMap(issue=>issue.sample||[]).filter(Boolean))].slice(0,30);
  for(const sample of samples){
    const escaped=escapeHtml(sample).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    html=html.replace(new RegExp(escaped,'g'),'<mark class="suspicious-mark">'+escapeHtml(sample)+'</mark>');
  }
  output.innerHTML=html;
  setStatus('ไฮไลต์จุดน่าสงสัยแล้ว · ตรวจทานก่อน export','ok');
}

function markReviewRequired(){
  AppState.reviewRequired=true;
  const quality=$('qualityGate');
  if(quality)quality.classList.add('review-required');
  setStatus('ตั้งสถานะ Review Required แล้ว · ตรวจเลข วันที่ ยอดเงิน URL และชื่อเฉพาะก่อนใช้จริง','err');
}
