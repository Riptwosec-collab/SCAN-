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
  const prepared=typeof prepareImageForOcr==='function'?prepareImageForOcr(base):base;
  AppState.preparedCanvas=prepared;
  if(typeof renderFileQualityReport==='function')renderFileQualityReport(analyzeCanvasQuality(prepared));
  AppState.processedCanvas=preprocessCanvas(prepared,'auto-preview');
  drawCanvasTo($('processedPreview'),AppState.processedCanvas);
}

function getSmartScale(source,mode='default'){
  const minSide=Math.min(source.width,source.height);
  const maxSide=Math.max(source.width,source.height);
  let scale=$('upscale')?.checked?3:1;
  if(mode==='original')scale=Math.max(scale,1);
  if(mode==='pdf-like'||mode==='doc-clean'||mode==='receipt')scale=Math.max(scale,3.4);
  if(mode==='thai-soft'||mode==='thai-sharp'||mode==='thai-adaptive'||mode==='thai-line')scale=Math.max(scale,4.4);
  if(mode==='ui-detail'||mode==='ui-crisp'||mode==='ui-binary'||mode==='ui-sharp'||mode==='ui-adaptive')scale=Math.max(scale,4.8);
  if(mode==='dark-ui'||mode==='dark-ui-binary'||mode==='dark-ui-adaptive')scale=Math.max(scale,5);
  if(mode==='doc-adaptive')scale=Math.max(scale,3.8);
  if(minSide<900)scale=Math.max(scale,4.2);
  if(minSide<520)scale=Math.max(scale,5);
  if(maxSide>2600)scale=Math.min(scale,2.4);
  return Math.max(1,Math.min(5,scale));
}

function getCanvasBrightness(source){
  const probe=document.createElement('canvas');
  const maxSide=Math.max(source.width,source.height);
  const scale=maxSide>420?420/maxSide:1;
  probe.width=Math.max(1,Math.round(source.width*scale));
  probe.height=Math.max(1,Math.round(source.height*scale));
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(source,0,0,probe.width,probe.height);
  const data=ctx.getImageData(0,0,probe.width,probe.height).data;
  let sum=0,dark=0,light=0;
  for(let i=0;i<data.length;i+=4){
    const gray=.299*data[i]+.587*data[i+1]+.114*data[i+2];
    sum+=gray;
    if(gray<72)dark++;
    if(gray>178)light++;
  }
  const pixels=data.length/4;
  return {avg:sum/pixels,darkRatio:dark/pixels,lightRatio:light/pixels};
}

function isDarkScreenshot(source){
  const stats=getCanvasBrightness(source);
  return stats.avg<105&&stats.darkRatio>.45&&stats.lightRatio>.015;
}

function clampByte(value){
  return Math.max(0,Math.min(255,value));
}

function sharpenImageData(data,width,height,amount=.34){
  const src=new Uint8ClampedArray(data);
  for(let y=1;y<height-1;y++){
    for(let x=1;x<width-1;x++){
      const i=(y*width+x)*4;
      const top=((y-1)*width+x)*4;
      const bottom=((y+1)*width+x)*4;
      const left=(y*width+x-1)*4;
      const right=(y*width+x+1)*4;
      for(let c=0;c<3;c++){
        const edge=(src[i+c]*4-src[top+c]-src[bottom+c]-src[left+c]-src[right+c])*amount;
        data[i+c]=clampByte(src[i+c]+edge);
      }
    }
  }
}

function adaptiveThresholdImageData(data,width,height,radius=14,bias=8){
  const gray=new Uint8ClampedArray(width*height);
  for(let i=0,p=0;i<data.length;i+=4,p++)gray[p]=Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2]);
  const integral=new Uint32Array((width+1)*(height+1));
  for(let y=1;y<=height;y++){
    let row=0;
    for(let x=1;x<=width;x++){
      row+=gray[(y-1)*width+(x-1)];
      integral[y*(width+1)+x]=integral[(y-1)*(width+1)+x]+row;
    }
  }
  for(let y=0;y<height;y++){
    const y1=Math.max(0,y-radius),y2=Math.min(height-1,y+radius);
    for(let x=0;x<width;x++){
      const x1=Math.max(0,x-radius),x2=Math.min(width-1,x+radius);
      const area=(x2-x1+1)*(y2-y1+1);
      const sum=integral[(y2+1)*(width+1)+(x2+1)]-integral[y1*(width+1)+(x2+1)]-integral[(y2+1)*(width+1)+x1]+integral[y1*(width+1)+x1];
      const threshold=(sum/area)-bias;
      const v=gray[y*width+x]>threshold?255:0;
      const i=(y*width+x)*4;
      data[i]=data[i+1]=data[i+2]=v;
    }
  }
}

function preprocessCanvas(source,mode='default'){
  const scale=getSmartScale(source,mode);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(source.width*scale));
  canvas.height=Math.max(1,Math.round(source.height*scale));
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(source,0,0,canvas.width,canvas.height);

  const shouldProcess=mode==='original'?false:($('threshold')?.checked||mode!=='default');
  if(!shouldProcess)return canvas;

  const img=ctx.getImageData(0,0,canvas.width,canvas.height);
  const d=img.data;
  let sum=0;
  for(let i=0;i<d.length;i+=4){
    const gray=.299*d[i]+.587*d[i+1]+.114*d[i+2];
    sum+=gray;
  }
  const avg=sum/(d.length/4);
  const darkMode=mode==='dark-ui'||mode==='dark-ui-binary'||mode==='dark-ui-adaptive';

  for(let i=0;i<d.length;i+=4){
    let v=.299*d[i]+.587*d[i+1]+.114*d[i+2];
    if(darkMode)v=255-v;

    if(mode==='soft'||mode==='auto-preview'){
      v=(v-128)*1.35+128;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,v));
    }else if(mode==='dark-ui'){
      v=(v-128)*2.15+128;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
    }else if(mode==='dark-ui-binary'){
      v=(v-128)*2.3+128;
      v=v>138?255:0;
      d[i]=d[i+1]=d[i+2]=v;
    }else if(mode==='dark-ui-adaptive'){
      v=(v-128)*1.75+128;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
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
    }else if(mode==='denoise'){
      v=(v-128)*1.22+128;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
    }else if(mode==='shadow-clean'){
      v=(v-avg)*1.48+176;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
    }else if(mode==='sharpen-gray'){
      v=(v-132)*1.58+132;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
    }else if(mode==='thai-soft'){
      v=(v-136)*1.48+136;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
    }else if(mode==='thai-sharp'){
      v=(v-128)*1.72+128;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
    }else if(mode==='thai-line'){
      v=(v-126)*1.88+126;
      const threshold=Math.max(122,Math.min(178,avg*.9));
      v=v>threshold?255:0;
      d[i]=d[i+1]=d[i+2]=v;
    }else if(mode==='thai-adaptive'){
      v=(v-132)*1.36+132;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
    }else if(mode==='ui-detail'){
      v=(v-150)*1.75+150;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,v));
    }else if(mode==='ui-crisp'||mode==='ui-sharp'){
      v=(v-142)*2.05+142;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,v));
    }else if(mode==='ui-binary'){
      v=(v-132)*1.85+132;
      const threshold=Math.max(118,Math.min(182,avg*.88));
      v=v>threshold?255:0;
      d[i]=d[i+1]=d[i+2]=v;
    }else if(mode==='ui-adaptive'||mode==='doc-adaptive'){
      v=(v-128)*1.42+128;
      d[i]=d[i+1]=d[i+2]=clampByte(v);
    }else if(mode==='pdf-like'){
      v=(v-132)*1.72+132;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,v));
    }else if(mode==='doc-clean'){
      v=(v-120)*1.9+120;
      const threshold=Math.max(128,Math.min(188,avg*.92));
      v=v>threshold?255:0;
      d[i]=d[i+1]=d[i+2]=v;
    }else if(mode==='receipt'){
      v=(v-145)*1.62+145;
      v=Math.max(0,Math.min(255,v));
      d[i]=d[i+1]=d[i+2]=v;
    }
  }
  if(mode==='ui-sharp'||mode==='thai-sharp'||mode==='sharpen-gray')sharpenImageData(d,canvas.width,canvas.height,.42);
  if(mode==='dark-ui'||mode==='dark-ui-binary')sharpenImageData(d,canvas.width,canvas.height,.5);
  if(mode==='ui-adaptive')adaptiveThresholdImageData(d,canvas.width,canvas.height,16,7);
  if(mode==='dark-ui-adaptive')adaptiveThresholdImageData(d,canvas.width,canvas.height,18,9);
  if(mode==='thai-adaptive')adaptiveThresholdImageData(d,canvas.width,canvas.height,20,6);
  if(mode==='doc-adaptive')adaptiveThresholdImageData(d,canvas.width,canvas.height,18,9);
  if(mode==='shadow-clean')adaptiveThresholdImageData(d,canvas.width,canvas.height,22,5);
  ctx.putImageData(img,0,0);
  return canvas;
}

function thaiReadabilityScore(text){
  const value=text||'';
  const thai=(value.match(/[ก-ฮะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  if(!thai)return 0;
  const knownWords=typeof OCR_CORRECT_WORDS!=='undefined'?OCR_CORRECT_WORDS:[
    'ข้อมูล','ตรวจสอบ','เอกสาร','จำนวนเงิน','ใบกำกับภาษี','บริษัท','จำกัด','วันที่','เรื่อง','รบกวน','อีเมล','โทรศัพท์'
  ];
  const knownCount=knownWords.reduce((sum,word)=>{
    if(!/[ก-ฮ]/.test(word))return sum;
    return sum+((value.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length);
  },0);
  const floatingMarks=(value.match(/(^|\s)[ะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  const splitThai=(value.match(/[เแโใไ]\s+[ก-ฮ]|[ก-ฮ]\s+[ะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  const badTone=(value.match(/[่้๊๋์]{2,}|[่้๊๋์][ะาำิีึืุูั็]/g)||[]).length;
  const thaiWordLike=(value.match(/[ก-ฮ][ะาำิีึืุูั็่้๊๋์ก-ฮ]{2,}/g)||[]).length;
  return Math.min(110,knownCount*12)+Math.min(55,thaiWordLike*2.4)+Math.min(35,thai*.18)-floatingMarks*12-splitThai*8-badTone*10;
}

function scoreOcrText(text,confidence){
  const value=text||'';
  const thai=(value.match(/[ก-ฮะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  const eng=(value.match(/[A-Za-z]/g)||[]).length;
  const nums=(value.match(/[0-9]/g)||[]).length;
  const ipLike=(value.match(/\b\d{1,3}[\.\s]\d{1,3}[\.\s]\d{1,3}[\.\s]\d{1,3}\b/g)||[]).length;
  const networkTerms=(value.match(/DHCP|IPv4|Subnet|Mask|Gateway|DNS|Ethernet|Wireless|Network|Connection|Details|Intel/gi)||[]).length;
  const docTerms=(value.match(/ใบกำกับ|ภาษี|หนังสือ|บริษัท|จำกัด|จำนวนเงิน|ใบเสร็จ|สัญญา|เลขประจำตัว|วันที่|เรื่อง|จาก|ถึง|Ticket|อีเมล|โครงการ|ระบบ|ตรวจสอบ/gi)||[]).length;
  const uiTerms=(value.match(/Options|Preset|Cleanup|Contrast|Dictionary|OCR|Auto|Balanced|Raw|Light|Strict|Search|Clear|Copy|PDF|Batch|Output|แปลง|ภาษา|ไทย|อังกฤษ|ช่องว่าง|อักษร|รายการ|แก้|ขยายภาพ/gi)||[]).length;
  const uiControlTerms=(value.match(/ไทย\s*\+\s*อังกฤษ|ลบช่องว่าง\/อักษรแปลก|Preset:\s*Auto|Cleanup:\s*Balanced|PDF:\s*แนว(?:ตั้ง|นอน)|ลบอักษรแปลก|รวมคำไทยผิดช่องว่าง|Dictionary(?:\s+IT\/NOC|:\s*IT\/NOC|หลายสาย)|รายการคำที่แก้|ขยายภาพ|Contrast/gi)||[]).length;
  const captureTerms=(value.match(/Ready\s*Check|cleanup\/dictionary\/contrast|เรียงตามภาพ|ล้างคำ|เอกสาร|bump\s+cache|v\d+|dropdown|wireframe|Three\.?js|scan-3d\.js|requestAnimationFrame|theme-contrast\.css/gi)||[]).length;
  const captureNoise=(value.match(/เฮอฮา|ตาบม|ต่วน|ไมไ่|ซั้ง|โซช้งาน|อยี่|fcontrast|vz\d|LEA/g)||[]).length;
  const lineCount=value.split('\n').filter(x=>x.trim().length>2).length;
  const weird=(value.match(/[�ƟθϴƩΣÉÊÈË|{}<>~`_^«»]/g)||[]).length;
  const shortNoise=(value.match(/\b[a-zA-Z]{1,2}\b/g)||[]).length;
  const repeated=(value.match(/(.)\1{4,}/g)||[]).length;
  const len=value.replace(/\s/g,'').length;
  const suspiciousIp=(value.match(/\b(?:0\.0\.\d{1,3}\.\d{1,3}|0\.100\.\d{1,3}\.\d{1,3}|0\.0\.100\.100)\b/g)||[]).length;
  let score=0;
  score+=Math.min(90,thai*1.65);
  score+=thaiReadabilityScore(value);
  score+=Math.min(25,eng*.55);
  score+=Math.min(18,nums*.35);
  score+=Math.min(35,lineCount*3);
  score+=ipLike*28;
  score+=networkTerms*18;
  score+=docTerms*22;
  score+=Math.min(70,uiTerms*10);
  score+=Math.min(80,uiControlTerms*16);
  score+=Math.min(90,captureTerms*18);
  score+=confidence?confidence*.85:0;
  score-=weird*14;
  score-=shortNoise*1.15;
  score-=repeated*12;
  if(suspiciousIp&&networkTerms<2)score-=suspiciousIp*42;
  score-=captureNoise*18;
  if(len<8)score-=40;
  if(thai===0&&eng>20&&networkTerms<2&&docTerms<2)score-=15;
  score-=ocrRiskScore(value)*2.2;
  return score;
}

function ocrRiskScore(text){
  const value=text||'';
  const len=Math.max(1,value.replace(/\s/g,'').length);
  const weird=(value.match(/[�ƟθϴƩΣÉÊÈË|{}<>~`_^«»]/g)||[]).length;
  const floatingMarks=(value.match(/\s+[ะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  const splitThai=(value.match(/[เแโใไ]\s+[ก-ฮ]|[ก-ฮ]\s+[ะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  const repeated=(value.match(/(.)\1{5,}/g)||[]).length;
  const junkLines=value.split('\n').filter(line=>{
    const compact=line.replace(/\s/g,'');
    return compact.length>12&&(/^(.)\1+$/.test(compact)||/^[^\wก-ฮ]+$/.test(compact));
  }).length;
  const symbolRatio=((value.match(/[|{}<>~`_^=+*\\/]/g)||[]).length/len)*100;
  const danglingUi=(value.match(/[”"']\s*$|^\s*[-,vV]\s*$/gm)||[]).length;
  const suspiciousIp=(value.match(/\b(?:0\.0\.\d{1,3}\.\d{1,3}|0\.100\.\d{1,3}\.\d{1,3}|0\.0\.100\.100)\b/g)||[]).length;
  return Math.round((weird*3)+(floatingMarks*2)+(splitThai*1.4)+(repeated*4)+(junkLines*5)+(danglingUi*2)+(suspiciousIp*4)+symbolRatio);
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

async function recognizeOnce(canvas,progressStart,progressEnd,label,psm='6',extra={}){
  const lang=$('langSelect')?.value||'tha+eng';
  const thaiLang=/\btha\b|^th\b|thai/i.test(lang);
  const whitelist=thaiLang?undefined:extra.whitelist;
  const result=await Tesseract.recognize(canvas,lang,{
    logger:m=>{
      if(m.progress!==undefined)setProgress(progressStart+(m.progress*(progressEnd-progressStart)));
      if(m.status)setStatus(label+' · '+m.status+' '+Math.round((m.progress||0)*100)+'%');
    },
    tessedit_pageseg_mode:psm,
    preserve_interword_spaces:extra.preserveSpaces===false?'0':'1',
    user_defined_dpi:extra.dpi||'300',
    tessedit_do_invert:'0',
    tessedit_char_whitelist:whitelist||undefined
  });
  const confidence=extractAverageConfidence(result);
  return {text:getTesseractLineText(result)||result.data.text||'',confidence};
}

function getTesseractLineText(result){
  const lines=(result?.data?.lines||[])
    .map(line=>String(line.text||'').trim())
    .filter(Boolean);
  if(lines.length<2)return '';
  const joined=lines.join('\n');
  const raw=String(result?.data?.text||'').trim();
  if(!raw)return joined;
  const rawLineCount=raw.split('\n').filter(line=>line.trim()).length;
  return lines.length>rawLineCount?joined:raw;
}

async function recognizeNativeText(canvas,start=0,end=100){
  if(!('TextDetector' in window))return null;
  setStatus('Browser Native OCR · กำลังตรวจข้อความ...');
  setProgress(start+((end-start)*.25));
  const detector=new TextDetector();
  const bitmap=await createImageBitmap(canvas);
  const results=await detector.detect(bitmap);
  bitmap.close?.();
  setProgress(end);
  if(!results?.length)return {text:'',confidence:0,mode:'Browser Native'};
  const lines=results
    .slice()
    .sort((a,b)=>(a.boundingBox?.top??a.boundingBox?.y??0)-(b.boundingBox?.top??b.boundingBox?.y??0)||((a.boundingBox?.left??a.boundingBox?.x??0)-(b.boundingBox?.left??b.boundingBox?.x??0)))
    .map(item=>item.rawValue||item.text||'')
    .filter(Boolean);
  return {text:lines.join('\n'),confidence:86,mode:'Browser Native'};
}

function createImageOcrPasses(canvas){
  const preset=$('ocrPreset')?.value||AppState.ocrPreset||'auto';
  const engine=$('ocrEngine')?.value||AppState.ocrEngine||'auto';
  const darkScreenshot=canvas?isDarkScreenshot(canvas):false;
  const darkPasses=[
    {name:'Dark Screenshot Line OCR',mode:'dark-ui',psm:'6',dpi:'420'},
    {name:'Dark Screenshot Binary',mode:'dark-ui-binary',psm:'6',dpi:'420'},
    {name:'Dark Screenshot Sparse',mode:'dark-ui-adaptive',psm:'11',dpi:'420'},
    {name:'Dark Screenshot Single Block',mode:'dark-ui',psm:'4',dpi:'420'}
  ];
  const sets={
    'thai-clear':[
      {name:'Thai Clear Original',mode:'original',psm:'6',dpi:'360'},
      {name:'Thai Clear Gray',mode:'gray',psm:'6',dpi:'360'},
      {name:'Thai Clear Soft',mode:'thai-soft',psm:'6',dpi:'380'},
      {name:'Thai Clear Light Sharpen',mode:'sharpen-gray',psm:'6',dpi:'380'},
      {name:'Thai Clear Sparse Symbols',mode:'gray',psm:'11',dpi:'380'}
    ],
    invoice:[
      {name:'Invoice Thai Sharp',mode:'thai-sharp',psm:'6'},
      {name:'Invoice Thai Adaptive',mode:'thai-adaptive',psm:'6'},
      {name:'Invoice Document',mode:'pdf-like',psm:'6'},
      {name:'Invoice Table Lines',mode:'gray',psm:'6'},
      {name:'Invoice Clean Binary',mode:'doc-clean',psm:'6'},
      {name:'Invoice Dense Amounts',mode:'pdf-like',psm:'4'},
      {name:'Invoice Sparse Detail',mode:'ui-detail',psm:'11'}
    ],
    ticket:[
      {name:'Ticket Thai Sharp',mode:'thai-sharp',psm:'6'},
      {name:'Ticket IT Screenshot',mode:'ui-sharp',psm:'6'},
      {name:'Ticket Adaptive UI',mode:'ui-adaptive',psm:'6'},
      {name:'Ticket Dense Details',mode:'pdf-like',psm:'4'},
      {name:'Ticket Sparse Fields',mode:'ui-detail',psm:'11'},
      {name:'Ticket Clean Binary',mode:'doc-clean',psm:'6'}
    ],
    'email-alert':[
      {name:'Email Thai Text',mode:'thai-soft',psm:'6'},
      {name:'Email Header Read',mode:'pdf-like',psm:'6'},
      {name:'Email Body Dense',mode:'pdf-like',psm:'4'},
      {name:'Email Screenshot Sharp',mode:'ui-sharp',psm:'6'},
      {name:'Email Sparse Links',mode:'gray',psm:'11'},
      {name:'Email Clean Text',mode:'doc-clean',psm:'6'}
    ],
    government:[
      {name:'Government Thai Sharp',mode:'thai-sharp',psm:'6'},
      {name:'Government Thai Adaptive',mode:'thai-adaptive',psm:'4'},
      {name:'Government Form',mode:'pdf-like',psm:'6'},
      {name:'Government Dense Thai',mode:'pdf-like',psm:'4'},
      {name:'Government Clean Scan',mode:'doc-clean',psm:'6'},
      {name:'Government Adaptive',mode:'doc-adaptive',psm:'6'},
      {name:'Government Sparse Stamp',mode:'gray',psm:'11'}
    ],
    document:[
      {name:'Document Thai Sharp',mode:'thai-sharp',psm:'6'},
      {name:'Document Balanced',mode:'pdf-like',psm:'6'},
      {name:'Document Shadow Clean',mode:'shadow-clean',psm:'6'},
      {name:'Document Sharpen Gray',mode:'sharpen-gray',psm:'6'},
      {name:'Document Binary',mode:'doc-clean',psm:'6'},
      {name:'Dense Paragraph',mode:'pdf-like',psm:'4'},
      {name:'Gray Document',mode:'gray',psm:'6'}
    ],
    screenshot:[
      ...darkPasses,
      {name:'UI Sharp Read',mode:'ui-sharp',psm:'6'},
      {name:'UI Adaptive Read',mode:'ui-adaptive',psm:'6'},
      {name:'UI Crisp Text',mode:'ui-crisp',psm:'6'},
      {name:'UI Sparse Text',mode:'ui-detail',psm:'11'},
      {name:'UI Binary Text',mode:'ui-binary',psm:'6'},
      {name:'Screenshot Gray',mode:'gray',psm:'11'},
      {name:'Screenshot Soft',mode:'soft',psm:'6'},
      {name:'Network Document',mode:'pdf-like',psm:'6'}
    ],
    mobile:[
      {name:'Mobile Thai Soft',mode:'thai-soft',psm:'6'},
      {name:'Mobile Thai Sharp',mode:'thai-sharp',psm:'6'},
      {name:'Mobile Soft',mode:'soft',psm:'6'},
      {name:'Mobile Receipt',mode:'receipt',psm:'4'},
      {name:'Mobile Gray',mode:'gray',psm:'11'},
      {name:'Mobile Binary',mode:'doc-clean',psm:'6'}
    ],
    table:[
      {name:'Table Thai Line',mode:'thai-line',psm:'6'},
      {name:'Table Shadow Clean',mode:'shadow-clean',psm:'6'},
      {name:'Table Dense',mode:'gray',psm:'6'},
      {name:'Table Sparse',mode:'ui-detail',psm:'11'},
      {name:'Table Clean',mode:'doc-clean',psm:'6'},
      {name:'Table Soft',mode:'soft',psm:'4'}
    ]
  };
  const selected=sets[preset]||[
    ...(darkScreenshot?darkPasses:[]),
    {name:'Auto Thai Sharp',mode:'thai-sharp',psm:'6'},
    {name:'Auto Thai Adaptive',mode:'thai-adaptive',psm:'6'},
    {name:'Auto Thai Dense',mode:'thai-soft',psm:'4'},
    {name:'Auto UI Sharp',mode:'ui-sharp',psm:'6'},
    {name:'Auto UI Adaptive',mode:'ui-adaptive',psm:'6'},
    {name:'Auto UI Crisp',mode:'ui-crisp',psm:'6'},
    {name:'PDF-like Document',mode:'pdf-like',psm:'6'},
    {name:'Document Clean',mode:'doc-clean',psm:'6'},
    {name:'Document Adaptive',mode:'doc-adaptive',psm:'6'},
    {name:'Shadow Clean Document',mode:'shadow-clean',psm:'6'},
    {name:'Sharpen Gray Document',mode:'sharpen-gray',psm:'6'},
    {name:'Denoise Text',mode:'denoise',psm:'6'},
    {name:'Thai Dense Text',mode:'pdf-like',psm:'4'},
    {name:'Sparse UI/Text',mode:'ui-detail',psm:'11'},
    {name:'Soft Contrast',mode:'soft',psm:'6'},
    {name:'Gray Detail',mode:'gray',psm:'11'},
    {name:'Receipt Detail',mode:'receipt',psm:'4'},
    {name:'Invert Check',mode:'invert',psm:'11'}
  ];
  const skillSorted=typeof applySkillPassPriority==='function'?applySkillPassPriority(selected,darkPasses):selected;
  if(engine==='tesseract-fast')return skillSorted.slice(0,Math.min(3,skillSorted.length));
  return skillSorted;
}

function createPdfOcrPasses(){
  const preset=$('ocrPreset')?.value||AppState.ocrPreset||'auto';
  const passes=preset==='thai-clear'?[
    {name:'PDF Thai Clear Original',mode:'original',psm:'6',dpi:'360'},
    {name:'PDF Thai Clear Gray',mode:'gray',psm:'6',dpi:'380'},
    {name:'PDF Thai Clear Soft',mode:'thai-soft',psm:'6',dpi:'400'},
    {name:'PDF Thai Clear Light Sharpen',mode:'sharpen-gray',psm:'6',dpi:'400'}
  ]:[
    {name:'PDF Page OCR',mode:'pdf-like',psm:'6'},
    {name:'PDF Clean OCR',mode:'doc-clean',psm:'6'},
    {name:'PDF Dense OCR',mode:'pdf-like',psm:'4'},
    {name:'PDF Sparse OCR',mode:'gray',psm:'11'}
  ];
  const engine=$('ocrEngine')?.value||AppState.ocrEngine||'auto';
  const skillSorted=typeof applySkillPassPriority==='function'?applySkillPassPriority(passes,[]):passes;
  return engine==='tesseract-fast'?skillSorted.slice(0,2):skillSorted;
}

async function runOcr(canvas,start=0,end=100,profile='image'){
  const engine=$('ocrEngine')?.value||AppState.ocrEngine||'auto';
  AppState.ocrEngine=engine;
  if(engine==='paddle-local'){
    if(typeof recognizeWithPaddle!=='function')throw new Error('PaddleOCR client ยังไม่พร้อม');
    const paddle=await recognizeWithPaddle(canvas,start,end,profile);
    AppState.ocrCandidates=[paddle];
    AppState.selectedCandidateIndex=0;
    AppState.confidence=paddle.confidence;
    setStatus('PaddleOCR อ่านเสร็จ · confidence '+(paddle.confidence??'-')+'%','ok');
    return paddle.text||'';
  }
  if(engine==='native'){
    const nativeOnly=await recognizeNativeText(canvas,start,end);
    if(!nativeOnly)throw new Error('Browser นี้ยังไม่รองรับ Native OCR (TextDetector) กรุณาเลือก Engine: Auto หรือ Tesseract');
    AppState.ocrCandidates=[{text:nativeOnly.text,confidence:nativeOnly.confidence,score:scoreOcrText(nativeOnly.text,nativeOnly.confidence),mode:nativeOnly.mode,risk:ocrRiskScore(nativeOnly.text)}];
    AppState.selectedCandidateIndex=0;
    AppState.confidence=nativeOnly.confidence;
    return nativeOnly.text;
  }

  if(!window.Tesseract)throw new Error('โหลด Tesseract.js ไม่สำเร็จ กรุณาต่ออินเทอร์เน็ต');

  const passes=profile==='pdf'?createPdfOcrPasses():createImageOcrPasses(canvas);
  let best={text:'',confidence:0,score:-Infinity,mode:''};
  const candidates=[];
  if(engine==='auto'){
    try{
      const nativeResult=await recognizeNativeText(canvas,start,Math.min(end,start+8));
      if(nativeResult?.text?.trim()){
        const nativeScore=scoreOcrText(nativeResult.text,nativeResult.confidence)-ocrRiskScore(nativeResult.text);
        candidates.push({text:nativeResult.text,confidence:nativeResult.confidence,score:nativeScore,mode:nativeResult.mode,risk:ocrRiskScore(nativeResult.text)});
        best={text:nativeResult.text,confidence:nativeResult.confidence,score:nativeScore,mode:nativeResult.mode,risk:ocrRiskScore(nativeResult.text)};
      }
    }catch(error){
      setStatus('Native OCR ใช้ไม่ได้ใน browser นี้ · ใช้ Tesseract ต่อ','ok');
    }
  }
  for(let i=0;i<passes.length;i++){
    const pass=passes[i];
    const from=start+((end-start)*i/passes.length);
    const to=start+((end-start)*(i+1)/passes.length);
    setStatus('กำลังตรวจ OCR หลายโหมด: '+pass.name+' ('+(i+1)+'/'+passes.length+')');
    const processed=preprocessCanvas(canvas,pass.mode);
    const result=await recognizeOnce(processed,from,to,pass.name,pass.psm,pass);
    const normalized=normalizeNetworkOcrText(result.text);
    const extracted=extractNetworkConnectionDetails(normalized);
    const candidateText=extracted||normalized||result.text;
    const risk=ocrRiskScore(candidateText);
    const reviewedForScore=typeof normalizeDocumentEmailAndDomains==='function'?normalizeDocumentEmailAndDomains(candidateText):candidateText;
    const normalizedForScore=typeof fixScreenshotLikeOcr==='function'?fixScreenshotLikeOcr(reviewedForScore):reviewedForScore;
    const symbolScore=typeof symbolPreservationScore==='function'?symbolPreservationScore(result.text,candidateText).score:100;
    const fieldScore=typeof validateImportantFields==='function'?Math.max(0,30-(validateImportantFields(candidateText).issues.length*10)):20;
    const score=scoreOcrText(normalizedForScore,result.confidence)+(symbolScore*.35)+fieldScore-risk*.8+(extracted?120:0);
    candidates.push({text:candidateText,confidence:result.confidence,score,mode:pass.name,risk,canvas:processed});
    if(score>best.score){
      best={text:candidateText,confidence:result.confidence,score,mode:pass.name,risk,canvas:processed};
    }
    if(extracted&&result.confidence>=55)break;
    if(result.confidence>=88&&score>230)break;
  }

  AppState.ocrCandidates=candidates
    .filter(item=>(item.text||'').trim())
    .sort((a,b)=>b.score-a.score)
    .slice(0,4);
  AppState.selectedCandidateIndex=0;
  if(AppState.ocrCandidates.length)best=AppState.ocrCandidates[0];
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
  setStatus('กำลัง OCR รูปภาพแบบ PDF-grade...');
  const base=cropCanvas(AppState.imageCanvas);
  const prepared=typeof prepareImageForOcr==='function'?prepareImageForOcr(base):base;
  AppState.preparedCanvas=prepared;
  if(typeof renderFileQualityReport==='function')renderFileQualityReport(analyzeCanvasQuality(prepared));
  const preview=preprocessCanvas(prepared,'pdf-like');
  AppState.processedCanvas=preview;
  drawCanvasTo($('processedPreview'),preview);
  return runOcr(prepared,5,95,'image');
}
