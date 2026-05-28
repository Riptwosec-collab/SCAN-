let cropDrag=null;

function bindCropCanvas(){
  const canvas=$('imgPreview');
  if(!canvas)return;
  canvas.addEventListener('mousedown',e=>{
    if(!AppState.cropEnabled||!AppState.imageCanvas)return;
    const rect=canvas.getBoundingClientRect();
    cropDrag={startX:e.clientX-rect.left,startY:e.clientY-rect.top,endX:e.clientX-rect.left,endY:e.clientY-rect.top,rect};
  });
  canvas.addEventListener('mousemove',e=>{
    if(!cropDrag)return;
    cropDrag.endX=e.clientX-cropDrag.rect.left;
    cropDrag.endY=e.clientY-cropDrag.rect.top;
    drawImagePreview();
    drawCropOverlay(cropDrag);
  });
  window.addEventListener('mouseup',()=>{
    if(!cropDrag||!AppState.imageCanvas)return;
    const display=$('imgPreview').getBoundingClientRect();
    const sx=AppState.imageCanvas.width/display.width;
    const sy=AppState.imageCanvas.height/display.height;
    const x=Math.min(cropDrag.startX,cropDrag.endX)*sx;
    const y=Math.min(cropDrag.startY,cropDrag.endY)*sy;
    const w=Math.abs(cropDrag.endX-cropDrag.startX)*sx;
    const h=Math.abs(cropDrag.endY-cropDrag.startY)*sy;
    if(w>20&&h>20)AppState.crop={x,y,w,h};
    cropDrag=null;
    drawImagePreview();
    updateProcessedPreview();
  });
}

function drawCropOverlay(selection){
  const canvas=$('imgPreview');
  const ctx=canvas.getContext('2d');
  const x=Math.min(selection.startX,selection.endX);
  const y=Math.min(selection.startY,selection.endY);
  const w=Math.abs(selection.endX-selection.startX);
  const h=Math.abs(selection.endY-selection.startY);
  const sx=canvas.width/canvas.getBoundingClientRect().width;
  const sy=canvas.height/canvas.getBoundingClientRect().height;
  ctx.save();
  ctx.strokeStyle='#b7ff4a';
  ctx.lineWidth=2;
  ctx.setLineDash([8,5]);
  ctx.strokeRect(x*sx,y*sy,w*sx,h*sy);
  ctx.restore();
}

function cropCanvas(source){
  if(!AppState.crop)return source;
  const {x,y,w,h}=AppState.crop;
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(w));
  canvas.height=Math.max(1,Math.round(h));
  canvas.getContext('2d').drawImage(source,x,y,w,h,0,0,canvas.width,canvas.height);
  return canvas;
}

function resetCrop(){
  AppState.crop=null;
  AppState.cropEnabled=false;
  setStatus('Reset Crop แล้ว','ok');
  drawImagePreview();
  updateProcessedPreview();
}
