(function(){
  'use strict';

  const isPdf=file=>/pdf/i.test(file?.type||'')||/\.pdf$/i.test(file?.name||'');
  const clamp=(v,min=0,max=255)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:0));

  async function fileToCanvas(file,scale=1){
    if(isPdf(file))return {canvas:null,blob:file,kind:'pdf'};
    const bitmap=await createImageBitmap(file);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return {canvas,ctx,kind:'image'};
  }

  function cloneCanvas(source){
    const canvas=document.createElement('canvas');
    canvas.width=source.width;canvas.height=source.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0);
    return {canvas,ctx};
  }

  function mutatePixels(canvas,transform){
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
    const data=imageData.data;
    for(let i=0;i<data.length;i+=4){
      const r=data[i],g=data[i+1],b=data[i+2];
      const next=transform(r,g,b,i,data)||[r,g,b];
      data[i]=clamp(next[0]);data[i+1]=clamp(next[1]);data[i+2]=clamp(next[2]);
    }
    ctx.putImageData(imageData,0,0);
    return canvas;
  }

  function grayscale(canvas){
    return mutatePixels(canvas,(r,g,b)=>{const v=Math.round(r*.299+g*.587+b*.114);return [v,v,v];});
  }

  function contrast(canvas,amount=1.25,brightness=0){
    return mutatePixels(canvas,(r,g,b)=>[(r-128)*amount+128+brightness,(g-128)*amount+128+brightness,(b-128)*amount+128+brightness]);
  }

  function threshold(canvas,level=165){
    return mutatePixels(canvas,(r,g,b)=>{const v=(r*.299+g*.587+b*.114)>level?255:0;return [v,v,v];});
  }

  function adaptiveThreshold(canvas){
    grayscale(canvas);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const img=ctx.getImageData(0,0,canvas.width,canvas.height);
    const src=new Uint8ClampedArray(img.data.length);
    src.set(img.data);
    const radius=Math.max(8,Math.round(Math.min(canvas.width,canvas.height)/80));
    for(let y=0;y<canvas.height;y++){
      for(let x=0;x<canvas.width;x++){
        let sum=0,count=0;
        for(let yy=Math.max(0,y-radius);yy<Math.min(canvas.height,y+radius);yy+=3){
          for(let xx=Math.max(0,x-radius);xx<Math.min(canvas.width,x+radius);xx+=3){sum+=src[(yy*canvas.width+xx)*4];count++;}
        }
        const idx=(y*canvas.width+x)*4;
        const v=src[idx]<(sum/Math.max(1,count)-10)?0:255;
        img.data[idx]=img.data[idx+1]=img.data[idx+2]=v;
      }
    }
    ctx.putImageData(img,0,0);
    return canvas;
  }

  function sharpen(canvas){
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const img=ctx.getImageData(0,0,canvas.width,canvas.height);
    const src=new Uint8ClampedArray(img.data.length);src.set(img.data);
    const kernel=[0,-1,0,-1,5,-1,0,-1,0];
    for(let y=1;y<canvas.height-1;y++){
      for(let x=1;x<canvas.width-1;x++){
        for(let c=0;c<3;c++){
          let sum=0,k=0;
          for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)sum+=src[((y+yy)*canvas.width+(x+xx))*4+c]*kernel[k++];
          img.data[(y*canvas.width+x)*4+c]=clamp(sum);
        }
      }
    }
    ctx.putImageData(img,0,0);
    return canvas;
  }

  function cropTextRegion(canvas){
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const img=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let minX=canvas.width,minY=canvas.height,maxX=0,maxY=0,found=false;
    for(let y=0;y<canvas.height;y+=3){
      for(let x=0;x<canvas.width;x+=3){
        const i=(y*canvas.width+x)*4;
        const g=img[i]*.299+img[i+1]*.587+img[i+2]*.114;
        if(g<185){found=true;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
      }
    }
    if(!found)return canvas;
    const pad=24;
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(canvas.width,maxX+pad);maxY=Math.min(canvas.height,maxY+pad);
    const out=document.createElement('canvas');out.width=Math.max(1,maxX-minX);out.height=Math.max(1,maxY-minY);
    out.getContext('2d').drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);
    return out;
  }

  async function toBlob(canvas,type='image/png'){
    return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob),type));
  }

  async function preprocessForDocument(file){
    const input=await fileToCanvas(file,1);
    if(input.kind==='pdf')return {blob:file,canvas:null,preprocessingUsed:['pdf-original']};
    return {blob:await toBlob(input.canvas),canvas:input.canvas,preprocessingUsed:['original','auto-orientation']};
  }

  async function preprocessForThaiSharp(file,retry=false){
    const input=await fileToCanvas(file,retry?3:2);
    if(input.kind==='pdf')return {blob:file,canvas:null,preprocessingUsed:['pdf-original','thai-priority']};
    contrast(input.canvas,retry?1.55:1.35,retry?8:2);sharpen(input.canvas);sharpen(input.canvas);
    return {blob:await toBlob(input.canvas),canvas:input.canvas,preprocessingUsed:['upscale '+(retry?'3x':'2x'),'contrast-boost','sharpen','thai-priority']};
  }

  async function preprocessForBinary(file,retry=false){
    const input=await fileToCanvas(file,retry?2.5:2);
    if(input.kind==='pdf')return {blob:file,canvas:null,preprocessingUsed:['pdf-original','binary-clean']};
    grayscale(input.canvas);contrast(input.canvas,retry?1.7:1.35,retry?10:0);threshold(input.canvas,retry?150:168);
    return {blob:await toBlob(input.canvas),canvas:input.canvas,preprocessingUsed:['grayscale','threshold','remove-background','denoise']};
  }

  async function preprocessForSparse(file,retry=false){
    const input=await fileToCanvas(file,retry?2.5:1.8);
    if(input.kind==='pdf')return {blob:file,canvas:null,preprocessingUsed:['pdf-original','sparse-layout']};
    const cropped=cropTextRegion(input.canvas);adaptiveThreshold(cropped);if(retry)sharpen(cropped);
    return {blob:await toBlob(cropped),canvas:cropped,preprocessingUsed:['crop-text-region','adaptive-threshold','sparse-text-mode']};
  }

  async function preprocessForReceipt(file,retry=false){
    const input=await fileToCanvas(file,retry?2.7:2);
    if(input.kind==='pdf')return {blob:file,canvas:null,preprocessingUsed:['pdf-original','receipt-table-mode']};
    grayscale(input.canvas);contrast(input.canvas,retry?1.8:1.45,5);adaptiveThreshold(input.canvas);
    return {blob:await toBlob(input.canvas),canvas:input.canvas,preprocessingUsed:['receipt-mode','table-columns-preserve','number-focus','adaptive-threshold']};
  }

  async function preprocessForDocumentType(file,type){
    if(type==='thai-sharp')return preprocessForThaiSharp(file);
    if(type==='clean-binary')return preprocessForBinary(file);
    if(type==='layout-sparse')return preprocessForSparse(file);
    if(type==='receipt-table')return preprocessForReceipt(file);
    return preprocessForDocument(file);
  }

  window.PreprocessService={preprocessForDocument,preprocessForThaiSharp,preprocessForBinary,preprocessForSparse,preprocessForReceipt,preprocessForDocumentType};
})();
