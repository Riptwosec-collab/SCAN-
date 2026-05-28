async function imageFileToCanvas(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth;
      canvas.height=img.naturalHeight;
      canvas.getContext('2d').drawImage(img,0,0);
      resolve(canvas);
    };
    img.onerror=reject;
    img.src=URL.createObjectURL(file);
  });
}

function drawCanvasTo(target,source){
  target.width=source.width;
  target.height=source.height;
  target.style.display='block';
  target.getContext('2d').drawImage(source,0,0);
}

function drawImagePreview(){
  if(!AppState.imageCanvas)return;
  drawCanvasTo($('imgPreview'),AppState.imageCanvas);
  if(AppState.crop){
    const c=$('imgPreview');
    const ctx=c.getContext('2d');
    ctx.save();
    ctx.strokeStyle='#b7ff4a';
    ctx.lineWidth=Math.max(3,c.width/260);
    ctx.setLineDash([14,8]);
    ctx.strokeRect(AppState.crop.x,AppState.crop.y,AppState.crop.w,AppState.crop.h);
    ctx.restore();
  }
  drawCanvasTo($('sourceCompare'),AppState.imageCanvas);
}

function updateProcessedPreview(){
  if(!AppState.imageCanvas)return;
  const base=cropCanvas(AppState.imageCanvas);
  AppState.processedCanvas=preprocessCanvas(base);
  drawCanvasTo($('processedPreview'),AppState.processedCanvas);
}

function preprocessCanvas(source){
  const scale=$('upscale')?.checked?2:1;
  const canvas=document.createElement('canvas');
  canvas.width=source.width*scale;
  canvas.height=source.height*scale;
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(source,0,0,canvas.width,canvas.height);

  if($('threshold')?.checked){
    const img=ctx.getImageData(0,0,canvas.width,canvas.height);
    const d=img.data;
    for(let i=0;i<d.length;i+=4){
      let v=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      v=(v-128)*1.45+128;
      v=v>150?255:0;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,v));
    }
    ctx.putImageData(img,0,0);
  }
  return canvas;
}

async function runOcr(canvas,start=0,end=100){
  if(!window.Tesseract)throw new Error('โหลด Tesseract.js ไม่สำเร็จ กรุณาต่ออินเทอร์เน็ต');
  const lang=$('langSelect')?.value||'tha+eng';
  const result=await Tesseract.recognize(canvas,lang,{
    logger:m=>{
      if(m.progress!==undefined)setProgress(start+(m.progress*(end-start)));
      if(m.status)setStatus(m.status+' '+Math.round((m.progress||0)*100)+'%');
    }
  });
  AppState.confidence=extractAverageConfidence(result);
  return result.data.text||'';
}

function extractAverageConfidence(result){
  const words=result?.data?.words||[];
  if(!words.length)return null;
  const usable=words.map(w=>Number(w.confidence)).filter(n=>Number.isFinite(n));
  if(!usable.length)return null;
  return Math.round(usable.reduce((a,b)=>a+b,0)/usable.length);
}

async function scanImage(){
  if(!AppState.imageFile||!AppState.imageCanvas){
    setStatus('ยังไม่ได้เลือกรูปภาพ','err');
    return '';
  }
  setStatus('กำลัง OCR รูปภาพ...');
  const base=cropCanvas(AppState.imageCanvas);
  const processed=preprocessCanvas(base);
  AppState.processedCanvas=processed;
  drawCanvasTo($('processedPreview'),processed);
  return runOcr(processed,5,95);
}
