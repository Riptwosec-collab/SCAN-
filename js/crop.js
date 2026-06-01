let cropDrag=null;

function injectCropUi(){
  if($('cropControls'))return;
  const resetBtn=$('resetCropBtn');
  if(!resetBtn)return;

  const style=document.createElement('style');
  style.textContent=`
    .crop-control-panel{margin-top:10px;border:1px solid rgba(183,255,74,.18);background:rgba(183,255,74,.045);border-radius:14px;padding:10px;display:grid;gap:8px}
    .crop-control-panel .crop-mini-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    .crop-control-panel label{font-size:11px;color:#7f8b96;text-transform:uppercase;letter-spacing:1px;display:grid;gap:4px}
    .crop-control-panel input{width:100%;padding:8px 9px;text-align:center}
    .crop-control-panel .crop-actions{display:flex;gap:8px;flex-wrap:wrap}
    .crop-control-panel .crop-actions .btn{flex:1;min-height:38px}
    #imgPreview.crop-ready{cursor:crosshair;box-shadow:0 0 0 1px rgba(183,255,74,.25),0 0 22px rgba(183,255,74,.08)}
    @media(max-width:640px){.crop-control-panel .crop-mini-grid{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(style);

  const panel=document.createElement('div');
  panel.id='cropControls';
  panel.className='crop-control-panel';
  panel.innerHTML=`
    <div class="crop-mini-grid">
      <label>X %<input id="cropX" type="number" min="0" max="100" value="0"></label>
      <label>Y %<input id="cropY" type="number" min="0" max="100" value="0"></label>
      <label>W %<input id="cropW" type="number" min="1" max="100" value="100"></label>
      <label>H %<input id="cropH" type="number" min="1" max="100" value="100"></label>
    </div>
    <div class="crop-actions">
      <button class="btn" id="applyCropBtn" type="button">ใช้ค่า Crop</button>
      <button class="btn" id="fullCropBtn" type="button">เลือกทั้งภาพ</button>
    </div>
  `;

  const row=resetBtn.closest('.row')||resetBtn.parentElement;
  row.insertAdjacentElement('afterend',panel);

  $('applyCropBtn').onclick=applyCropFromInputs;
  $('fullCropBtn').onclick=selectFullImageCrop;
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
  if(!AppState.imageCanvas||!AppState.crop)return;
  const {x,y,w,h}=AppState.crop;
  $('cropX').value=Math.round((x/AppState.imageCanvas.width)*100);
  $('cropY').value=Math.round((y/AppState.imageCanvas.height)*100);
  $('cropW').value=Math.round((w/AppState.imageCanvas.width)*100);
  $('cropH').value=Math.round((h/AppState.imageCanvas.height)*100);
}

function applyCropFromInputs(){
  if(!AppState.imageCanvas){setStatus('ยังไม่ได้เลือกรูปภาพ','err');return;}
  const px=n=>Math.max(0,Math.min(100,Number(n)||0));
  const xPct=px($('cropX').value);
  const yPct=px($('cropY').value);
  const wPct=Math.max(1,Math.min(100,Number($('cropW').value)||100));
  const hPct=Math.max(1,Math.min(100,Number($('cropH').value)||100));
  AppState.crop=clampCrop({
    x:AppState.imageCanvas.width*xPct/100,
    y:AppState.imageCanvas.height*yPct/100,
    w:AppState.imageCanvas.width*wPct/100,
    h:AppState.imageCanvas.height*hPct/100
  });
  AppState.cropEnabled=true;
  $('enableCropBtn').textContent='ปิด Crop';
  updateCropInputsFromState();
  drawImagePreview();
  updateProcessedPreview();
  setStatus('ใช้ค่า Crop แล้ว · OCR จะอ่านเฉพาะส่วนนี้','ok');
}

function selectFullImageCrop(){
  if(!AppState.imageCanvas){setStatus('ยังไม่ได้เลือกรูปภาพ','err');return;}
  AppState.crop={x:0,y:0,w:AppState.imageCanvas.width,h:AppState.imageCanvas.height};
  updateCropInputsFromState();
  drawImagePreview();
  updateProcessedPreview();
  setStatus('เลือกทั้งภาพแล้ว','ok');
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
  ['cropX','cropY'].forEach(id=>{if($(id))$(id).value=0});
  ['cropW','cropH'].forEach(id=>{if($(id))$(id).value=100});
  setStatus('Reset Crop แล้ว · กลับไป OCR ทั้งภาพ','ok');
  drawImagePreview();
  updateProcessedPreview();
}
