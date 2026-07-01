(function(){
  'use strict';

  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:0));
  const isPdf=file=>/pdf/i.test(file?.type||'')||/\.pdf$/i.test(file?.name||'');

  async function fileToImageBitmap(file){
    if(!file||isPdf(file))return null;
    const blob=file instanceof Blob?file:null;
    if(!blob)return null;
    try{return await createImageBitmap(blob);}catch(error){return null;}
  }

  function getCanvasPixels(bitmap,maxSize=1200){
    if(!bitmap)return null;
    const scale=Math.min(1,maxSize/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*scale));
    const height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(bitmap,0,0,width,height);
    const imageData=ctx.getImageData(0,0,width,height);
    return {canvas,ctx,imageData,width,height};
  }

  function analyzePixels(imageData,width,height){
    const data=imageData.data;
    let sum=0,sumSq=0,edge=0,textLike=0,dark=0,bright=0;
    const gray=new Uint8ClampedArray(width*height);
    for(let i=0,p=0;i<data.length;i+=4,p++){
      const g=Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114);
      gray[p]=g;
      sum+=g;sumSq+=g*g;
      if(g<95)dark++;
      if(g>225)bright++;
    }
    const total=gray.length||1;
    const mean=sum/total;
    const variance=Math.max(0,sumSq/total-mean*mean);
    const contrast=clamp(Math.sqrt(variance)/80*100);
    for(let y=1;y<height-1;y+=2){
      for(let x=1;x<width-1;x+=2){
        const idx=y*width+x;
        const dx=Math.abs(gray[idx+1]-gray[idx-1]);
        const dy=Math.abs(gray[idx+width]-gray[idx-width]);
        const mag=dx+dy;
        if(mag>55)edge++;
        if(gray[idx]<155&&mag>28)textLike++;
      }
    }
    const sampleCount=Math.max(1,Math.floor((width-2)*(height-2)/4));
    const edgeDensity=edge/sampleCount;
    const textDensity=clamp(textLike/sampleCount*280);
    const blur=clamp(100-edgeDensity*260);
    const brightness=clamp(mean/255*100);
    return {blur,brightness,contrast,textDensity,darkRatio:dark/total,brightRatio:bright/total,gray};
  }

  function detectTableFromPixels(gray,width,height){
    if(!gray)return false;
    let horizontal=0,vertical=0;
    for(let y=0;y<height;y+=Math.max(1,Math.floor(height/90))){
      let run=0,maxRun=0;
      for(let x=0;x<width;x++){
        if(gray[y*width+x]<125){run++;maxRun=Math.max(maxRun,run);}else run=0;
      }
      if(maxRun>width*.42)horizontal++;
    }
    for(let x=0;x<width;x+=Math.max(1,Math.floor(width/90))){
      let run=0,maxRun=0;
      for(let y=0;y<height;y++){
        if(gray[y*width+x]<125){run++;maxRun=Math.max(maxRun,run);}else run=0;
      }
      if(maxRun>height*.32)vertical++;
    }
    return horizontal>=2&&vertical>=2;
  }

  function guessSkewAngle(gray,width,height){
    if(!gray||width<60||height<60)return 0;
    const angles=[-6,-4,-2,0,2,4,6];
    let best={angle:0,score:-Infinity};
    angles.forEach(angle=>{
      const rad=angle*Math.PI/180;
      const tan=Math.tan(rad);
      const bins=new Map();
      for(let y=0;y<height;y+=3){
        for(let x=0;x<width;x+=3){
          const g=gray[y*width+x];
          if(g<105){
            const key=Math.round(y-x*tan);
            bins.set(key,(bins.get(key)||0)+1);
          }
        }
      }
      let score=0;
      bins.forEach(v=>{if(v>6)score+=v*v;});
      if(score>best.score)best={angle,score};
    });
    return Math.abs(best.angle)<=1?0:best.angle;
  }

  async function analyzeImageQuality(file){
    const warnings=[];
    const pdf=isPdf(file);
    const result={
      fileType:pdf?'pdf-scan':'image',
      documentTypeHint:'general',
      quality:{blur:0,brightness:0,contrast:0,skewAngle:0,textDensity:0,hasTable:false,hasThaiText:true,hasEnglishText:true},
      recommendedPasses:['base-document','thai-sharp','clean-binary','layout-sparse','receipt-table'],
      warnings
    };
    if(pdf){
      result.warnings.push('PDF จะถูกตรวจว่าเป็น text layer หรือ scan จาก pipeline PDF เดิม หาก text layer อ่านไม่ได้จะใช้ OCR scan');
      return result;
    }
    const bitmap=await fileToImageBitmap(file);
    const pixels=getCanvasPixels(bitmap);
    if(!pixels){warnings.push('ไม่สามารถวิเคราะห์ภาพได้ก่อน OCR');return result;}
    const metrics=analyzePixels(pixels.imageData,pixels.width,pixels.height);
    const hasTable=detectTableFromPixels(metrics.gray,pixels.width,pixels.height);
    const skewAngle=guessSkewAngle(metrics.gray,pixels.width,pixels.height);
    result.quality={
      blur:Math.round(metrics.blur),
      brightness:Math.round(metrics.brightness),
      contrast:Math.round(metrics.contrast),
      skewAngle,
      textDensity:Math.round(metrics.textDensity),
      hasTable,
      hasThaiText:true,
      hasEnglishText:true
    };
    if(metrics.blur>68)warnings.push('ภาพอาจเบลอ ระบบจะ retry ด้วย sharpen/upscale');
    if(metrics.brightness<28)warnings.push('ภาพมืด ระบบจะเพิ่ม brightness/contrast');
    if(metrics.brightness>88)warnings.push('ภาพสว่างมาก ระบบจะลด background noise');
    if(metrics.contrast<28)warnings.push('contrast ต่ำ ระบบจะแปลง binary/threshold');
    if(Math.abs(skewAngle)>=2)warnings.push('ภาพเอียงประมาณ '+skewAngle+'° ระบบจะใช้ sparse/deskew pass');
    if(metrics.textDensity>62||hasTable)result.documentTypeHint='table';
    if(/receipt|invoice|tax|bill|ใบเสร็จ|ใบกำกับ/i.test(file?.name||''))result.documentTypeHint='receipt';
    if(/ticket|incident|network|it/i.test(file?.name||''))result.documentTypeHint='ticket';
    result.recommendedPasses=recommendOCRPasses(result);
    return result;
  }

  function detectDocumentTypeHint(input){
    const name=String(input?.name||input||'').toLowerCase();
    if(/receipt|invoice|tax|ใบเสร็จ|ใบกำกับ/.test(name))return 'receipt';
    if(/ticket|incident|network|it/.test(name))return 'ticket';
    if(/email|mail/.test(name))return 'email';
    if(/report|รายงาน/.test(name))return 'report';
    if(/table|ตาราง|xlsx|csv/.test(name))return 'table';
    return 'general';
  }

  function recommendOCRPasses(analysis){
    const q=analysis?.quality||{};
    const passes=['base-document'];
    if(q.blur>45||q.contrast<45||q.hasThaiText)passes.push('thai-sharp');
    if(q.contrast<55||analysis?.fileType==='pdf-scan')passes.push('clean-binary');
    if(Math.abs(q.skewAngle||0)>=2||analysis?.documentTypeHint==='ticket'||analysis?.documentTypeHint==='email')passes.push('layout-sparse');
    if(q.hasTable||['receipt','invoice','table'].includes(analysis?.documentTypeHint))passes.push('receipt-table');
    ['base-document','thai-sharp','clean-binary','layout-sparse','receipt-table'].forEach(pass=>{if(!passes.includes(pass))passes.push(pass);});
    return passes.slice(0,5);
  }

  window.ImageAnalyzer={analyzeImageQuality,detectDocumentTypeHint,recommendOCRPasses};
})();
