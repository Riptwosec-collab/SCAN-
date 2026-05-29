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
  if(!target||!source)return;
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
  if($('sourceCompare'))drawCanvasTo($('sourceCompare'),AppState.imageCanvas);
}

function updateProcessedPreview(){
  if(!AppState.imageCanvas)return;
  const base=cropCanvas(AppState.imageCanvas);
  AppState.processedCanvas=preprocessCanvas(base,'auto-preview');
  drawCanvasTo($('processedPreview'),AppState.processedCanvas);
}

function preprocessCanvas(source,mode='default'){
  const scale=$('upscale')?.checked?3:1;
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(source.width*scale));
  canvas.height=Math.max(1,Math.round(source.height*scale));
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(source,0,0,canvas.width,canvas.height);

  const shouldProcess=$('threshold')?.checked||mode!=='default';
  if(!shouldProcess)return canvas;

  const img=ctx.getImageData(0,0,canvas.width,canvas.height);
  const d=img.data;
  let sum=0;
  for(let i=0;i<d.length;i+=4){
    const gray=.299*d[i]+.587*d[i+1]+.114*d[i+2];
    sum+=gray;
  }
  const avg=sum/(d.length/4);

  for(let i=0;i<d.length;i+=4){
    let v=.299*d[i]+.587*d[i+1]+.114*d[i+2];

    if(mode==='soft'||mode==='auto-preview'){
      v=(v-128)*1.35+128;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,v));
    }else if(mode==='binary'||mode==='default'){
      v=(v-128)*1.55+128;
      v=v>Math.max(135,Math.min(175,avg*.95))?255:0;
      d[i]=d[i+1]=d[i+2]=v;
    }else if(mode==='invert'){
      v=255-v;
      v=(v-128)*1.45+128;
      v=v>150?255:0;
      d[i]=d[i+1]=d[i+2]=v;
    }else if(mode==='gray'){
      d[i]=d[i+1]=d[i+2]=v;
    }else if(mode==='ui-detail'){
      v=(v-150)*1.75+150;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,v));
    }
  }
  ctx.putImageData(img,0,0);
  return canvas;
}

function scoreOcrText(text,confidence){
  const value=text||'';
  const thai=(value.match(/[ก-ฮะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  const eng=(value.match(/[A-Za-z]/g)||[]).length;
  const nums=(value.match(/[0-9]/g)||[]).length;
  const ipLike=(value.match(/\b\d{1,3}[\.\s]\d{1,3}[\.\s]\d{1,3}[\.\s]\d{1,3}\b/g)||[]).length;
  const networkTerms=(value.match(/DHCP|IPv4|Subnet|Mask|Gateway|DNS|Ethernet|Wireless|Network|Connection|Details|Intel/gi)||[]).length;
  const weird=(value.match(/[�ƟθϴƩΣÉÊÈË|{}<>~`_^«»]/g)||[]).length;
  const shortNoise=(value.match(/\b[a-zA-Z]{1,2}\b/g)||[]).length;
  const repeated=(value.match(/(.)\1{4,}/g)||[]).length;
  const len=value.replace(/\s/g,'').length;
  let score=0;
  score+=Math.min(70,thai*1.5);
  score+=Math.min(25,eng*.55);
  score+=Math.min(15,nums*.35);
  score+=ipLike*28;
  score+=networkTerms*18;
  score+=confidence?confidence*.8:0;
  score-=weird*13;
  score-=shortNoise*1.2;
  score-=repeated*8;
  if(len<8)score-=40;
  if(thai===0&&eng>20&&networkTerms<2)score-=15;
  return score;
}

function normalizeNetworkOcrText(text){
  let out=text||'';
  out=out
    .replace(/tPv4|IPV4|lPv4|1Pv4|IPvA/g,'IPv4')
    .replace(/1กหร|Subnet\s+Mas[kK]?|รบnet\s+Mask/gi,'Subnet Mask')
    .replace(/DHCP\s+Enabled\s+Yes/gi,'DHCP Enabled: Yes')
    .replace(/DHCP\s+Enabled\s+No/gi,'DHCP Enabled: No')
    .replace(/Lease\s+Obtained/gi,'Lease Obtained:')
    .replace(/Lease\s+Expires/gi,'Lease Expires:')
    .replace(/Default\s+Gateway|เศห4\s*บิต์ธนพ!\s*gateway|gateway/gi,'Default Gateway:')
    .replace(/Network\s+Connection\s+Details/gi,'Network Connection Details')
    .replace(/Intel\(R\)\s+Wireless\s*-?\s*AC\s*9260/gi,'Intel(R) Wireless-AC 9260');

  out=out.replace(/(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/g,'$1.$2.$3.$4');
  out=out.replace(/\b(\d{1,3})\s*\.\s*(\d{1,3})\s*\.\s*(\d{1,3})\s*\.\s*(\d{1,3})\b/g,'$1.$2.$3.$4');
  out=out.replace(/\s{2,}/g,' ').replace(/\n\s+/g,'\n').trim();
  return out;
}

function extractNetworkConnectionDetails(text){
  const src=normalizeNetworkOcrText(text||'');
  const hasNetwork=/DHCP|IPv4|Subnet Mask|Gateway|Wireless|Ethernet|Network Connection Details|Intel\(R\)/i.test(src);
  if(!hasNetwork)return '';

  const lines=[];
  const add=(label,value)=>{if(value&&!lines.some(x=>x.startsWith(label+':')))lines.push(label+': '+value.trim())};
  const ip=src.match(/(?:IPv4\s+Address|Address)[:\s]+(\d{1,3}(?:\.\d{1,3}){3})/i)||src.match(/\b(10\d?\.\d{1,3}\.\d{1,3}\.\d{1,3}|100\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/);
  const mask=src.match(/(?:Subnet\s+Mask)[:\s]+(\d{1,3}(?:\.\d{1,3}){3})/i)||src.match(/\b255\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  const gw=src.match(/(?:Default\s+Gateway)[:\s]+(\d{1,3}(?:\.\d{1,3}){3})/i);
  const adapter=src.match(/Intel\(R\)\s+Wireless-AC\s+9260[^\n]*/i)||src.match(/(?:Wireless|Ethernet)[^\n]{0,70}/i);
  const dhcp=src.match(/DHCP\s+Enabled[:\s]+(Yes|No)/i)||src.match(/DHCP[^\n]{0,24}(Yes|No)/i);
  const obtained=src.match(/Lease\s+Obtained:?[\s]+([^\n|]{6,60})/i);
  const expires=src.match(/Lease\s+Expires:?[\s]+([^\n|]{6,60})/i);

  lines.push('Network Connection Details');
  if(adapter)add('Adapter',adapter[0]);
  if(dhcp)add('DHCP Enabled',dhcp[1]);
  if(ip)add('IPv4 Address',ip[1]);
  if(mask)add('Subnet Mask',mask[1]||mask[0]);
  if(gw)add('Default Gateway',gw[1]);
  if(obtained)add('Lease Obtained',obtained[1]);
  if(expires)add('Lease Expires',expires[1]);

  if(lines.length<=1)return '';
  return lines.join('\n')+'\n\n--- Raw OCR ---\n'+src;
}

async function recognizeOnce(canvas,progressStart,progressEnd,label,psm='6'){
  const lang=$('langSelect')?.value||'tha+eng';
  const result=await Tesseract.recognize(canvas,lang,{
    logger:m=>{
      if(m.progress!==undefined)setProgress(progressStart+(m.progress*(progressEnd-progressStart)));
      if(m.status)setStatus(label+' · '+m.status+' '+Math.round((m.progress||0)*100)+'%');
    },
    tessedit_pageseg_mode:psm,
    preserve_interword_spaces:'1'
  });
  const confidence=extractAverageConfidence(result);
  return {text:result.data.text||'',confidence};
}

async function runOcr(canvas,start=0,end=100){
  if(!window.Tesseract)throw new Error('โหลด Tesseract.js ไม่สำเร็จ กรุณาต่ออินเทอร์เน็ต');

  const passes=[
    {name:'UI Detail',mode:'ui-detail',psm:'11'},
    {name:'Auto Sharp',mode:'binary',psm:'6'},
    {name:'Soft Contrast',mode:'soft',psm:'6'},
    {name:'Gray Detail',mode:'gray',psm:'11'},
    {name:'Invert Check',mode:'invert',psm:'11'}
  ];

  let best={text:'',confidence:0,score:-Infinity,mode:''};
  for(let i=0;i<passes.length;i++){
    const pass=passes[i];
    const from=start+((end-start)*i/passes.length);
    const to=start+((end-start)*(i+1)/passes.length);
    setStatus('กำลังตรวจ OCR หลายโหมด: '+pass.name+' ('+(i+1)+'/'+passes.length+')');
    const processed=preprocessCanvas(canvas,pass.mode);
    const result=await recognizeOnce(processed,from,to,pass.name,pass.psm);
    const normalized=normalizeNetworkOcrText(result.text);
    const extracted=extractNetworkConnectionDetails(normalized);
    const candidateText=extracted||normalized||result.text;
    const score=scoreOcrText(candidateText,result.confidence)+(extracted?120:0);
    if(score>best.score){
      best={text:candidateText,confidence:result.confidence,score,mode:pass.name,canvas:processed};
    }
    if(extracted&&result.confidence>=55)break;
    if(result.confidence>=83&&score>160)break;
  }

  AppState.confidence=best.confidence;
  if(best.canvas){
    AppState.processedCanvas=best.canvas;
    drawCanvasTo($('processedPreview'),best.canvas);
  }
  setStatus('เลือกผล OCR ที่ดีที่สุด: '+best.mode+' · confidence '+(best.confidence??'-')+'%','ok');
  return best.text||'';
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
  setStatus('กำลัง OCR รูปภาพแบบละเอียด...');
  const base=cropCanvas(AppState.imageCanvas);
  const preview=preprocessCanvas(base,'auto-preview');
  AppState.processedCanvas=preview;
  drawCanvasTo($('processedPreview'),preview);
  return runOcr(base,5,95);
}