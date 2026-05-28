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
  return result.data.text||'';
}

async function scanImage(){
  if(!AppState.imageFile){
    setStatus('ยังไม่ได้เลือกรูปภาพ','err');
    return '';
  }
  setStatus('กำลัง OCR รูปภาพ...');
  const canvas=await imageFileToCanvas(AppState.imageFile);
  const processed=preprocessCanvas(canvas);
  return runOcr(processed,5,95);
}
