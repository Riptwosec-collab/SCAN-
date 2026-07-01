(function(){
  'use strict';

  const OCR_PASSES=[
    {engineId:'ocr-1',engineName:'Base Document OCR',pass:'base-document',lang:'tha+eng',psm:'AUTO',description:'original image + normal OCR'},
    {engineId:'ocr-2',engineName:'Thai Precision OCR',pass:'thai-sharp',lang:'tha+eng',psm:'AUTO',description:'upscale + sharpen + Thai priority'},
    {engineId:'ocr-3',engineName:'Binary Clean OCR',pass:'clean-binary',lang:'tha+eng',psm:'AUTO',description:'grayscale + threshold + denoise'},
    {engineId:'ocr-4',engineName:'Layout Sparse OCR',pass:'layout-sparse',lang:'tha+eng',psm:'SPARSE_TEXT',description:'adaptive threshold + crop text region'},
    {engineId:'ocr-5',engineName:'Receipt Table OCR',pass:'receipt-table',lang:'tha+eng',psm:'AUTO',description:'blocks + number focus + table preserve'}
  ];

  const now=()=>performance?.now?performance.now():Date.now();
  const normalize=value=>String(value||'').replace(/\r/g,'').trim();
  const splitWords=text=>String(text||'').split(/\s+/).map(w=>w.trim()).filter(Boolean);
  const splitLines=text=>String(text||'').replace(/\r/g,'').split('\n').map(line=>line.trim()).filter(Boolean);
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:0));

  function getTesseractOptions(passConfig){
    const params={preserve_interword_spaces:'1'};
    if(passConfig.psm==='SPARSE_TEXT')params.tessedit_pageseg_mode='11';
    if(passConfig.engineId==='ocr-5')params.tessedit_char_whitelist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzกขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮะาิีึืุูเแโใไำ่้๊๋์ๆฯ .,:%/()-_#@฿';
    return params;
  }

  function normalizeTesseractResult(data){
    const text=normalize(data?.text||'');
    const words=(data?.words||[]).map(word=>({
      text:word.text||'',confidence:Math.round(word.confidence||0),bbox:word.bbox||word.baseline||null
    })).filter(word=>word.text);
    const lines=(data?.lines||[]).map(line=>({text:line.text||'',confidence:Math.round(line.confidence||0),bbox:line.bbox||null})).filter(line=>line.text);
    const confidence=Math.round(data?.confidence||average(words.map(word=>word.confidence))||0);
    return {text,lines,words,confidence,lowConfidenceWords:words.filter(word=>word.confidence<60).map(word=>word.text)};
  }

  function average(values){values=values.filter(value=>Number.isFinite(value));return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}

  async function runTesseract(blob,passConfig){
    if(!window.Tesseract?.recognize)throw new Error('Tesseract.js ไม่พร้อมใช้งานใน Browser');
    const options={logger:null};
    const result=await window.Tesseract.recognize(blob,passConfig.lang||'tha+eng',options);
    const data=result?.data||{};
    const params=getTesseractOptions(passConfig);
    return {...normalizeTesseractResult(data),ocrParams:params};
  }

  async function preprocess(file,passConfig,retry=false){
    const service=window.PreprocessService;
    if(!service)throw new Error('PreprocessService ไม่พร้อมใช้งาน');
    if(passConfig.pass==='thai-sharp')return service.preprocessForThaiSharp(file,retry);
    if(passConfig.pass==='clean-binary')return service.preprocessForBinary(file,retry);
    if(passConfig.pass==='layout-sparse')return service.preprocessForSparse(file,retry);
    if(passConfig.pass==='receipt-table')return service.preprocessForReceipt(file,retry);
    return service.preprocessForDocument(file,retry);
  }

  async function runOCRPass(file,passConfig,options={}){
    const started=now();
    const base={engineId:passConfig.engineId,engineName:passConfig.engineName,pass:passConfig.pass,status:'running',retryUsed:false,preprocessingUsed:[],error:''};
    try{
      const prep=await preprocess(file,passConfig,false);
      let data=await runTesseract(prep.blob,passConfig);
      let retryMeta=null;
      if(data.confidence<60&&options.autoRetry!==false){
        const retry=await retryLowConfidenceOCR({...base,...data,preprocessingUsed:prep.preprocessingUsed},file,passConfig);
        if(retry&&retry.confidence>data.confidence){retryMeta=retry.retry;data=retry;}
      }
      return {...base,...data,status:'success',durationMs:Math.round(now()-started),preprocessingUsed:data.preprocessingUsed||prep.preprocessingUsed,retryUsed:!!retryMeta,retry:retryMeta||null,error:''};
    }catch(error){
      return {...base,text:'',lines:[],words:[],confidence:0,lowConfidenceWords:[],status:'failed',durationMs:Math.round(now()-started),error:error.message||String(error)};
    }
  }

  async function retryLowConfidenceOCR(result,file,passConfig){
    const beforeConfidence=result.confidence||0;
    const prep=await preprocess(file,passConfig,true);
    const data=await runTesseract(prep.blob,{...passConfig,psm:passConfig.engineId==='ocr-4'?'SPARSE_TEXT':'AUTO'});
    return {...result,...data,preprocessingUsed:prep.preprocessingUsed,retryUsed:true,retry:{retryUsed:true,retryReason:'confidence ต่ำ',beforeConfidence,afterConfidence:data.confidence}};
  }

  function textCompletenessScore(text){
    const words=splitWords(text).length;
    const lines=splitLines(text).length;
    const weird=(String(text||'').match(/[�{}<>~`_^=]{1,}/g)||[]).length;
    return clamp(Math.min(60,words*2)+Math.min(25,lines*3)-weird*8+15);
  }

  function documentLogicScore(text,typeHint){
    const extract=window.DocumentExtractor?.extractFields?.(text,typeHint)||{documentType:typeHint||'general',fields:{}};
    const f=extract.fields||{};
    let score=40;
    if(extract.documentType==='receipt'||extract.documentType==='invoice')score+=(f.total?25:0)+(f.date?15:0)+((f.items||[]).length?20:0);
    else if(extract.documentType==='it-ticket')score+=((f.ipAddress||[]).length?20:0)+((f.interface||[]).length?10:0)+(f.ticketNo?20:0)+((f.vlan||[]).length?10:0);
    else if(extract.documentType==='email')score+=(f.from?15:0)+(f.to?15:0)+(f.subject?15:0)+((f.urls||[]).length?10:0);
    else if(extract.documentType==='government')score+=(f.subject?20:0)+(f.to?15:0)+(f.department?15:0)+(f.date?10:0);
    else if(extract.documentType==='table')score+=Math.min(45,(f.rowCount||0)*8)+(f.headers?.length?15:0);
    else score+=textCompletenessScore(text)*.45;
    return clamp(score);
  }

  function consistencyScore(target,allResults){
    const targetWords=new Set(splitWords(target.text).map(w=>w.toLowerCase()));
    if(!targetWords.size)return 0;
    const scores=allResults.filter(r=>r.engineId!==target.engineId&&r.status==='success').map(other=>{
      const otherWords=new Set(splitWords(other.text).map(w=>w.toLowerCase()));
      let same=0;targetWords.forEach(word=>{if(otherWords.has(word))same++;});
      return same/Math.max(1,targetWords.size)*100;
    });
    return Math.round(average(scores));
  }

  function rankOCRResults(results,typeHint){
    const successful=results.filter(result=>result.status==='success');
    const ranked=results.map(result=>{
      const consistency=result.status==='success'?consistencyScore(result,successful):0;
      const logic=result.status==='success'?documentLogicScore(result.text,typeHint):0;
      const completeness=result.status==='success'?textCompletenessScore(result.text):0;
      const lowPenalty=Math.min(30,(result.lowConfidenceWords||[]).length*1.5);
      const retryBoost=result.retry?.afterConfidence>result.retry?.beforeConfidence?5:0;
      const finalRankScore=clamp((result.confidence||0)*.32+consistency*.24+logic*.24+completeness*.20-lowPenalty+retryBoost);
      return {...result,ranking:{engineId:result.engineId,rawConfidence:result.confidence||0,consistencyScore:consistency,documentLogicScore:logic,completenessScore:completeness,finalRankScore:Number(finalRankScore.toFixed(1)),rank:0}};
    }).sort((a,b)=>(b.ranking?.finalRankScore||0)-(a.ranking?.finalRankScore||0));
    ranked.forEach((result,index)=>{result.ranking.rank=index+1;result.isBest=index===0&&result.status==='success';});
    return ranked;
  }

  async function runMultiOCR(file,options={}){
    if(!file)throw new Error('ไม่พบไฟล์สำหรับ OCR');
    const analysis=options.imageAnalysis||await window.ImageAnalyzer?.analyzeImageQuality?.(file)||{recommendedPasses:OCR_PASSES.map(p=>p.pass),documentTypeHint:'general'};
    const recommended=analysis.recommendedPasses||OCR_PASSES.map(p=>p.pass);
    const passes=recommended.map(pass=>OCR_PASSES.find(p=>p.pass===pass)).filter(Boolean).slice(0,5);
    OCR_PASSES.forEach(pass=>{if(!passes.find(p=>p.engineId===pass.engineId))passes.push(pass);});
    const selected=passes.slice(0,5);
    const results=await Promise.all(selected.map(pass=>runOCRPass(file,pass,options)));
    const ranked=rankOCRResults(results,analysis.documentTypeHint);
    return {imageAnalysis:analysis,ocrResults:ranked,bestOCR:ranked.find(r=>r.isBest)||ranked[0]||null,createdAt:new Date().toISOString()};
  }

  window.MultiOCRService={OCR_PASSES,runMultiOCR,runOCRPass,rankOCRResults,retryLowConfidenceOCR};
})();
