const PADDLE_ENDPOINT_KEY='riptwosec.scan.paddleEndpoint';

function normalizePaddleEndpoint(value){
  return String(value||'http://127.0.0.1:8765').trim().replace(/\/+$/,'');
}

function getPaddleEndpoint(){
  const input=$('paddleEndpoint')?.value;
  const stored=localStorage.getItem(PADDLE_ENDPOINT_KEY);
  const endpoint=normalizePaddleEndpoint(input||stored||AppState.paddleEndpoint);
  AppState.paddleEndpoint=endpoint;
  return endpoint;
}

function getPaddleLang(){
  const lang=$('langSelect')?.value||'tha+eng';
  if(lang==='eng')return 'en';
  return 'th';
}

function ensurePaddleQuickScanButton(){
  if($('paddleScanBtn'))return;
  const healthBtn=$('paddleHealthBtn');
  if(!healthBtn)return;
  const button=document.createElement('button');
  button.className='btn small';
  button.id='paddleScanBtn';
  button.type='button';
  button.textContent='OCR ด้วย Paddle';
  healthBtn.insertAdjacentElement('afterend',button);
}

function bindPaddleClientSettings(){
  const input=$('paddleEndpoint');
  if(input){
    input.value=localStorage.getItem(PADDLE_ENDPOINT_KEY)||AppState.paddleEndpoint||'http://127.0.0.1:8765';
    input.addEventListener('change',()=>{
      const endpoint=normalizePaddleEndpoint(input.value);
      input.value=endpoint;
      AppState.paddleEndpoint=endpoint;
      localStorage.setItem(PADDLE_ENDPOINT_KEY,endpoint);
      setStatus('ตั้งค่า PaddleOCR endpoint: '+endpoint,'ok');
    });
  }
  ensurePaddleQuickScanButton();
  $('paddleHealthBtn')?.addEventListener('click',testPaddleHealth);
  $('paddleScanBtn')?.addEventListener('click',scanWithPaddleLocal);
}

async function testPaddleHealth(){
  const endpoint=getPaddleEndpoint();
  try{
    setStatus('กำลังตรวจ PaddleOCR backend...');
    const response=await fetch(endpoint+'/health',{method:'GET'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    setStatus('PaddleOCR พร้อมใช้ · '+(data.engine||'PaddleOCR')+' · '+(data.ready?'ready':'loaded'),'ok');
  }catch(error){
    setStatus('ต่อ PaddleOCR ไม่ได้: '+error.message+' · เปิด backend ก่อน หรือเปลี่ยนกลับ Engine Auto','err');
  }
}

async function scanWithPaddleLocal(){
  if($('ocrEngine')){
    $('ocrEngine').value='paddle-local';
    AppState.ocrEngine='paddle-local';
  }
  await testPaddleHealth();
  if(typeof scanCurrent==='function')scanCurrent();
}

function canvasToPngBlob(canvas){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('แปลงภาพเป็น PNG ไม่สำเร็จ')),'image/png');
  });
}

function normalizeConfidencePercent(value,fallback=0){
  const n=Number(value);
  if(!Number.isFinite(n))return Math.round(Number(fallback)||0);
  if(n>0&&n<=1)return Math.round(n*100);
  return Math.round(Math.max(0,Math.min(100,n)));
}

function normalizePaddleResponse(data,profile='image'){
  const rawLines=Array.isArray(data.lines)?data.lines:[];
  const lines=rawLines.map((line,index)=>({
    text:String(line.text||'').trim(),
    confidence:normalizeConfidencePercent(line.confidence??line.score??data.confidence_score),
    score:Number(line.score??line.confidence??0),
    bounding_box:line.bounding_box||line.box||null,
    page_number:line.page_number||1,
    line_number:line.line_number||index+1
  })).filter(line=>line.text);
  const text=String(data.text||lines.map(line=>line.text).join('\n')||'').trim();
  const confidence=normalizeConfidencePercent(data.confidence_score,lines.reduce((sum,line)=>sum+line.confidence,0)/Math.max(1,lines.length));
  const words=Array.isArray(data.low_confidence_words)?data.low_confidence_words:(Array.isArray(data.words)?data.words:[]);
  return {
    text,
    confidence,
    mode:'PaddleOCR Local',
    risk:typeof ocrRiskScore==='function'?ocrRiskScore(text):0,
    score:typeof scoreOcrText==='function'?scoreOcrText(text,confidence):confidence,
    lines,
    words,
    layout_blocks:data.layout_blocks||lines.map(line=>({
      type:'text',
      text:line.text,
      bounding_box:line.bounding_box,
      confidence:line.confidence
    })),
    detected_language:data.detected_language||getPaddleLang(),
    profile,
    engine:data.engine||'PaddleOCR Local'
  };
}

async function recognizeWithPaddle(canvas,start=0,end=100,profile='image'){
  const endpoint=getPaddleEndpoint();
  const blob=await canvasToPngBlob(canvas);
  const form=new FormData();
  form.append('file',blob,'scan.png');
  form.append('lang',getPaddleLang());
  form.append('profile',profile);
  form.append('source','browser-canvas');

  setProgress(start+Math.min(5,(end-start)*.08));
  setStatus('PaddleOCR Local · ส่งภาพไปอ่าน...');
  const response=await fetch(endpoint+'/ocr/image',{method:'POST',body:form});
  if(!response.ok){
    let message='HTTP '+response.status;
    try{
      const data=await response.json();
      message=data.detail||data.error||message;
    }catch(error){}
    throw new Error(message);
  }
  const data=await response.json();
  setProgress(end);
  const normalized=normalizePaddleResponse(data,profile);
  AppState.paddleResult=data;
  return normalized;
}
