let cropDrag=null;

function injectCropUi(){
  const style=document.createElement('style');
  style.textContent=`
    #imgPreview.crop-ready{cursor:crosshair;box-shadow:0 0 0 1px rgba(183,255,74,.25),0 0 22px rgba(183,255,74,.08)}
  `;
  document.head.appendChild(style);
}

function bindCropCanvas(){
  injectCropUi();
  const canvas=$('imgPreview');
  if(!canvas)return;

  const start=e=>{
    if(!AppState.cropEnabled||!AppState.imageCanvas)return;
    e.preventDefault();
    const point=getCanvasPoint(e,canvas);
    cropDrag={startX:point.x,startY:point.y,endX:point.x,endY:point.y};
    canvas.classList.add('crop-ready');
    drawImagePreview();
    drawCropOverlay(cropDrag);
  };

  const move=e=>{
    if(!cropDrag)return;
    e.preventDefault();
    const point=getCanvasPoint(e,canvas);
    cropDrag.endX=point.x;
    cropDrag.endY=point.y;
    drawImagePreview();
    drawCropOverlay(cropDrag);
  };

  const end=()=>{
    if(!cropDrag||!AppState.imageCanvas)return;
    const crop=displaySelectionToImageCrop(cropDrag,canvas);
    if(crop.w>20&&crop.h>20){
      AppState.crop=crop;
      updateCropInputsFromState();
      setStatus('เลือก Crop แล้ว · กดแปลงเพื่อ OCR เฉพาะส่วนที่เลือก','ok');
    }else{
      setStatus('กรอบ Crop เล็กเกินไป กรุณาลากใหม่','err');
    }
    cropDrag=null;
    drawImagePreview();
    updateProcessedPreview();
  };

  canvas.addEventListener('mousedown',start);
  canvas.addEventListener('mousemove',move);
  window.addEventListener('mouseup',end);

  canvas.addEventListener('touchstart',start,{passive:false});
  canvas.addEventListener('touchmove',move,{passive:false});
  window.addEventListener('touchend',end);
}

function getCanvasPoint(e,canvas){
  const touch=e.touches&&e.touches[0];
  const clientX=touch?touch.clientX:e.clientX;
  const clientY=touch?touch.clientY:e.clientY;
  const rect=canvas.getBoundingClientRect();
  return {
    x:Math.max(0,Math.min(rect.width,clientX-rect.left)),
    y:Math.max(0,Math.min(rect.height,clientY-rect.top))
  };
}

function displaySelectionToImageCrop(selection,canvas){
  const rect=canvas.getBoundingClientRect();
  const sx=AppState.imageCanvas.width/rect.width;
  const sy=AppState.imageCanvas.height/rect.height;
  const x=Math.min(selection.startX,selection.endX)*sx;
  const y=Math.min(selection.startY,selection.endY)*sy;
  const w=Math.abs(selection.endX-selection.startX)*sx;
  const h=Math.abs(selection.endY-selection.startY)*sy;
  return clampCrop({x,y,w,h});
}

function clampCrop(crop){
  if(!AppState.imageCanvas)return crop;
  const maxW=AppState.imageCanvas.width;
  const maxH=AppState.imageCanvas.height;
  const x=Math.max(0,Math.min(maxW-1,crop.x));
  const y=Math.max(0,Math.min(maxH-1,crop.y));
  const w=Math.max(1,Math.min(maxW-x,crop.w));
  const h=Math.max(1,Math.min(maxH-y,crop.h));
  return {x,y,w,h};
}

function updateCropInputsFromState(){
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
  ctx.fillStyle='rgba(0,0,0,.32)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.clearRect(x*sx,y*sy,w*sx,h*sy);
  ctx.strokeStyle='#b7ff4a';
  ctx.lineWidth=Math.max(3,canvas.width/360);
  ctx.setLineDash([10,6]);
  ctx.strokeRect(x*sx,y*sy,w*sx,h*sy);
  ctx.restore();
}

function cropCanvas(source){
  if(!AppState.crop)return source;
  const {x,y,w,h}=clampCrop(AppState.crop);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(w));
  canvas.height=Math.max(1,Math.round(h));
  canvas.getContext('2d').drawImage(source,x,y,w,h,0,0,canvas.width,canvas.height);
  return canvas;
}

function resetCrop(){
  AppState.crop=null;
  AppState.cropEnabled=false;
  const btn=$('enableCropBtn');
  if(btn)btn.textContent='เปิด Crop';
  const canvas=$('imgPreview');
  if(canvas)canvas.classList.remove('crop-ready');
  setStatus('Reset Crop แล้ว · กลับไป OCR ทั้งภาพ','ok');
  drawImagePreview();
  updateProcessedPreview();
}
