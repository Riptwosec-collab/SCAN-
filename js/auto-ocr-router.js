function analyzeImageForOcr(canvas){
  const width=canvas.width;
  const height=canvas.height;
  const probe=document.createElement('canvas');
  const scale=Math.min(1,900/Math.max(width,height));
  probe.width=Math.max(1,Math.round(width*scale));
  probe.height=Math.max(1,Math.round(height*scale));
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(canvas,0,0,probe.width,probe.height);
  const img=ctx.getImageData(0,0,probe.width,probe.height);
  const data=img.data;
  let sum=0,dark=0,light=0,blue=0,edge=0;
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2];
    const gray=.299*r+.587*g+.114*b;
    sum+=gray;
    if(gray<80)dark++;
    if(gray>178)light++;
    if(b>110&&b>r*1.25&&b>g*.9)blue++;
  }
  for(let y=1;y<probe.height;y+=3){
    for(let x=1;x<probe.width;x+=3){
      const i=(y*probe.width+x)*4;
      const prev=(y*probe.width+x-1)*4;
      if(Math.abs(data[i]-data[prev])+Math.abs(data[i+1]-data[prev+1])+Math.abs(data[i+2]-data[prev+2])>95)edge++;
    }
  }
  const pixels=data.length/4;
  const avgBrightness=sum/pixels;
  const darkRatio=dark/pixels;
  const lightRatio=light/pixels;
  const hasBlueLinkPixels=(blue/pixels)>.002;
  const prepared=(typeof prepareDarkScreenshotForOcr==='function'?prepareDarkScreenshotForOcr(canvas):typeof prepareDarkThaiScreenshotCanvas==='function'?prepareDarkThaiScreenshotCanvas(canvas):canvas);
  const lineBoxes=typeof segmentScreenshotTextLines==='function'?segmentScreenshotTextLines(prepared):typeof segmentTextLines==='function'?segmentTextLines(prepared):[];
  const likelyUrlLineIndexes=lineBoxes.filter(line=>line.visualType==='url-like').map(line=>line.index);
  const likelyThaiLineIndexes=lineBoxes.filter(line=>line.visualType!=='url-like').map(line=>line.index);
  return {
    width,height,avgBrightness,darkRatio,lightRatio,
    contrast:edge/Math.max(1,pixels/9),
    isDarkScreenshot:avgBrightness<120&&darkRatio>.35&&lightRatio>.01,
    hasBlueLinkPixels,
    hasUnderlineLikeLine:lineBoxes.some(line=>line.stats?.underlineLike),
    estimatedTextLines:lineBoxes.length,
    lineBoxes,
    likelyUrlLineIndexes,
    likelyThaiLineIndexes,
    background:avgBrightness<120?'dark':'light'
  };
}

function segmentScreenshotTextLines(canvas){
  const width=canvas.width;
  const height=canvas.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const img=ctx.getImageData(0,0,width,height);
  const data=img.data;
  const rows=[];
  for(let y=0;y<height;y++){
    let ink=0,blue=0,dark=0;
    for(let x=0;x<width;x+=2){
      const i=(y*width+x)*4;
      const r=data[i],g=data[i+1],b=data[i+2];
      const gray=.299*r+.587*g+.114*b;
      if(gray<190)ink++;
      if(gray<120)dark++;
      if(b>110&&b>r*1.2&&b>g*.85)blue++;
    }
    rows.push({ink,blue,dark});
  }
  const threshold=Math.max(2,Math.round(width*.0055));
  const ranges=[];
  let start=null;
  for(let y=0;y<height;y++){
    if(rows[y].ink>=threshold&&start===null)start=y;
    if((rows[y].ink<threshold||y===height-1)&&start!==null){
      const end=rows[y].ink<threshold?y-1:y;
      if(end-start>Math.max(8,height*.005))ranges.push({start,end});
      start=null;
    }
  }
  const merged=[];
  const gapLimit=Math.max(8,Math.round(height*.012));
  for(const range of ranges){
    const prev=merged[merged.length-1];
    if(prev&&range.start-prev.end<=gapLimit)prev.end=range.end;
    else merged.push({...range});
  }
  return merged.filter(range=>range.end-range.start>=12).slice(0,20).map((range,index)=>{
    const pad=Math.max(10,Math.round((range.end-range.start)*.55));
    const y=Math.max(0,range.start-pad);
    const h=Math.min(height-y,range.end-range.start+1+(pad*2));
    const line=document.createElement('canvas');
    line.width=width;
    line.height=h;
    line.getContext('2d').drawImage(canvas,0,y,width,h,0,0,width,h);
    const stats=analyzeLineVisualStats(line);
    const aspect=width/Math.max(1,h);
    const visualType=(index>0&&(stats.blueRatio>.002||stats.underlineLike||aspect>10))?'url-like':'thai-title';
    return {index,x:0,y,width,height:h,canvas:line,visualType,stats};
  });
}

function analyzeLineVisualStats(lineCanvas){
  const width=lineCanvas.width,height=lineCanvas.height;
  const ctx=lineCanvas.getContext('2d',{willReadFrequently:true});
  const data=ctx.getImageData(0,0,width,height).data;
  let blue=0,ink=0,total=width*height;
  const rowInk=new Array(height).fill(0);
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x+=2){
      const i=(y*width+x)*4;
      const r=data[i],g=data[i+1],b=data[i+2];
      const gray=.299*r+.587*g+.114*b;
      if(gray<190){ink++;rowInk[y]++}
      if(b>110&&b>r*1.2&&b>g*.85)blue++;
    }
  }
  const lowerRows=rowInk.slice(Math.floor(height*.68));
  const underlineLike=lowerRows.some(v=>v>width*.28);
  return {blueRatio:blue/Math.max(1,total/2),inkRatio:ink/Math.max(1,total/2),underlineLike};
}

function chooseOcrProfileFromImageAnalysis(analysis){
  const reasons=[];
  if(analysis.isDarkScreenshot)reasons.push('dark background');
  if(analysis.hasBlueLinkPixels)reasons.push('blue link-like pixels');
  if(analysis.hasUnderlineLikeLine)reasons.push('underline-like line');
  if(analysis.estimatedTextLines)reasons.push(analysis.estimatedTextLines+' text lines');
  if(analysis.likelyUrlLineIndexes.length)reasons.push('long URL-like line');

  const strongUrlVisual=analysis.likelyUrlLineIndexes.length||analysis.hasBlueLinkPixels||analysis.hasUnderlineLikeLine;
  if(analysis.isDarkScreenshot&&analysis.estimatedTextLines<=5&&strongUrlVisual){
    return {
      profile:'thai-url-screenshot',
      confidence:95,
      reasons,
      recommendedPreprocess:'dark-thai-screenshot',
      recommendedLayout:'line-order',
      recommendedCleanup:'safe',
      lineMode:true,
      preserveSymbols:true,
      noGuessMode:true
    };
  }
  if(analysis.isDarkScreenshot){
    return {profile:'dark-thai-screenshot',confidence:82,reasons,recommendedPreprocess:'dark-thai-screenshot',recommendedLayout:'line-order',recommendedCleanup:'safe',lineMode:true,preserveSymbols:true,noGuessMode:true};
  }
  if(analysis.background==='light'){
    return {profile:'thai-clear',confidence:70,reasons:['light background'],recommendedPreprocess:'thai-clear',recommendedLayout:'line-order',recommendedCleanup:'safe',lineMode:false,preserveSymbols:true,noGuessMode:false};
  }
  return {profile:'unknown',confidence:40,reasons,recommendedPreprocess:'auto',recommendedLayout:'auto',recommendedCleanup:'safe',lineMode:false,preserveSymbols:true,noGuessMode:true};
}

function autoDetectOcrProfile(input){
  const analysis=input?.canvas?analyzeImageForOcr(input.canvas):analyzeImageForOcr(input);
  const profile=chooseOcrProfileFromImageAnalysis(analysis);
  return {...profile,analysis};
}

function prepareDarkScreenshotForOcr(canvas){
  if(typeof prepareDarkThaiScreenshotCanvas==='function')return prepareDarkThaiScreenshotCanvas(canvas);
  return canvas;
}

async function runUrlLineOcr(lineCanvas,progressStart=0,progressEnd=100){
  const whitelist='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/.-_?=&%#+~@';
  const result=await Tesseract.recognize(lineCanvas,'eng',{
    logger:m=>{
      if(m.progress!==undefined&&typeof setProgress==='function')setProgress(progressStart+(m.progress*(progressEnd-progressStart)));
    },
    tessedit_pageseg_mode:'7',
    preserve_interword_spaces:'0',
    user_defined_dpi:'520',
    tessedit_do_invert:'0',
    tessedit_char_whitelist:whitelist
  });
  const confidence=typeof extractAverageConfidence==='function'?extractAverageConfidence(result):null;
  return {text:postprocessUrlOcr(result.data.text||''),confidence,mode:'URL line OCR'};
}

async function runThaiLineOcr(lineCanvas,progressStart=0,progressEnd=100){
  const result=await Tesseract.recognize(lineCanvas,'tha+eng',{
    logger:m=>{
      if(m.progress!==undefined&&typeof setProgress==='function')setProgress(progressStart+(m.progress*(progressEnd-progressStart)));
    },
    tessedit_pageseg_mode:'7',
    preserve_interword_spaces:'1',
    user_defined_dpi:'520',
    tessedit_do_invert:'0'
  });
  let text=(typeof getTesseractLineText==='function'?getTesseractLineText(result):result.data.text||'').trim();
  if(typeof safeThaiNormalize==='function')text=safeThaiNormalize(text);
  if(typeof applyTravelHotelCorrections==='function')text=applyTravelHotelCorrections(text);
  const confidence=typeof extractAverageConfidence==='function'?extractAverageConfidence(result):null;
  return {text,confidence,mode:'Thai line OCR'};
}

function postprocessUrlOcr(text){
  return String(text||'')
    .replace(/\s+/g,'')
    .replace(/https?:\/{1,2}/i,match=>match.toLowerCase().startsWith('https')?'https://':'http://')
    .replace(/https?:\/\/+/i,match=>match.toLowerCase().startsWith('https')?'https://':'http://')
    .replace(/www\./i,'www.')
    .replace(/\.(com|html|th|net|org)\b/gi,(_,ext)=>'.'+ext.toLowerCase())
    .replace(/\/th-?th\//i,'/th-th/')
    .replace(/[|]+/g,'/')
    .replace(/[?？]+$/,'?');
}

function validateUrlOcr(url){
  const value=String(url||'');
  const issues=[];
  if(!/\.[A-Za-z]{2,}/.test(value))issues.push('missing-domain-dot');
  if(/^https?/i.test(value)&&!/^https?:\/\//i.test(value))issues.push('missing-protocol-slashes');
  if(/html/i.test(value)&&!/\.html/i.test(value))issues.push('bad-html-extension');
  if(/[\u0e00-\u0e7f]/.test(value))issues.push('thai-mixed-in-url');
  return {ok:issues.length===0,issues};
}

function applyTravelHotelCorrections(text){
  const rules=[
    [/บ้านพ้ก/g,'บ้านพัก'],
    [/ปานพัก/g,'บ้านพัก'],
    [/พูลวิลลา(?!่)/g,'พูลวิลล่า'],
    [/พูลวิลล่(?!า)/g,'พูลวิลล่า'],
    [/นครนยก/g,'นครนายก'],
    [/นครนาย(?!ก)/g,'นครนายก'],
    [/Agoda/gi,'Agoda']
  ];
  let out=String(text||'');
  for(const [pattern,replacement] of rules)out=out.replace(pattern,replacement);
  return out;
}

function isGarbageOcrResult(text,profile='unknown'){
  const value=String(text||'');
  const bad=(value.match(/ทไกไร|ระดดลัก|โลกกาทร|ออต|LEE\s+TOT|TREAT|Fyn|TT|[�]/gi)||[]).length;
  const urlLines=value.split('\n').filter(line=>/https?|www\.|\.com|\/th/i.test(line));
  const badUrl=urlLines.filter(line=>/[\u0e00-\u0e7f]/.test(line)||(!/:\/\//.test(line)&&/https?/i.test(line))).length;
  const score=bad*30+badUrl*35+(profile.includes('url')&&!/https?:\/\/.+\..+/.test(value)?40:0);
  return {garbage:score>=40,score,bad,badUrl};
}

async function runThaiUrlScreenshotOcr(canvas,options={}){
  const route=options.route||autoDetectOcrProfile(canvas);
  const prepared=prepareDarkScreenshotForOcr(canvas);
  const lines=segmentScreenshotTextLines(prepared);
  const parts=[];
  const report={profile:'thai-url-screenshot',route,lineReports:[],warnings:[],fallbackUsed:false};
  if(typeof setStatus==='function')setStatus('Auto ตรวจพบ: Thai + URL Screenshot → ใช้ OCR รายบรรทัด + URL mode','ok');
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const start=options.start??0;
    const end=options.end??100;
    const from=start+((end-start)*i/Math.max(1,lines.length));
    const to=start+((end-start)*(i+1)/Math.max(1,lines.length));
    const isUrl=line.visualType==='url-like'||(i>0&&line.width/Math.max(1,line.height)>9);
    const result=isUrl?await runUrlLineOcr(line.canvas,from,to):await runThaiLineOcr(line.canvas,from,to);
    if(isUrl){
      const validation=validateUrlOcr(result.text);
      if(!validation.ok)report.warnings.push(...validation.issues);
    }
    parts.push(result.text);
    report.lineReports.push({index:i,type:isUrl?'url':'thai-title',engine:isUrl?'eng url-mode psm7':'tha+eng psm7',confidence:result.confidence,text:result.text});
  }
  let text=parts.join('\n').trim();
  const garbage=isGarbageOcrResult(text,'thai-url-screenshot');
  if(garbage.garbage)report.warnings.push('ควรตรวจผล OCR บางจุด');
  AppState.autoOcrDebug=report;
  AppState.reviewRequired=garbage.garbage||report.warnings.length>0;
  return {text,confidence:report.warnings.length?78:92,score:220-garbage.score,mode:'Auto Thai + URL Screenshot',risk:garbage.score,report};
}
