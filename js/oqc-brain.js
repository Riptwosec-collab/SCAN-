(function(){
  'use strict';

  const normalize=value=>String(value||'').replace(/\r/g,'').replace(/\s+/g,' ').trim();
  const lineList=text=>String(text||'').replace(/\r/g,'').split('\n').map(normalize).filter(Boolean);
  const wordList=text=>String(text||'').split(/\s+/).map(normalize).filter(Boolean);
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:0));
  const average=values=>{values=values.filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;};

  function similarity(a,b){
    a=normalize(a).toLowerCase();b=normalize(b).toLowerCase();
    if(a===b)return 1;
    const m=a.length,n=b.length;if(!m||!n)return 0;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++)dp[i][0]=i;
    for(let j=0;j<=n;j++)dp[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return 1-dp[m][n]/Math.max(m,n);
  }

  function bestDictionaryCandidate(candidates){
    const learning=window.UserLearning;
    return candidates.map(candidate=>({candidate,score:learning?.dictionaryScore?.(candidate)||0,suggestion:learning?.suggestCorrection?.(candidate)})).sort((a,b)=>(b.suggestion?.score||0)+b.score-(a.suggestion?.score||0)-a.score)[0];
  }

  function clusterCandidates(candidates){
    const clusters=[];
    candidates.filter(Boolean).forEach(candidate=>{
      let cluster=clusters.find(item=>similarity(item.anchor,candidate)>.76);
      if(!cluster){cluster={anchor:candidate,items:[]};clusters.push(cluster);}
      cluster.items.push(candidate);
    });
    return clusters;
  }

  function chooseCandidate(candidates,ocrResults,position){
    const clusters=clusterCandidates(candidates);
    const scored=clusters.map(cluster=>{
      const dict=bestDictionaryCandidate(cluster.items);
      const selected=dict?.suggestion?.score>.82?dict.suggestion.word:cluster.items.slice().sort((a,b)=>b.length-a.length)[0];
      const majority=cluster.items.length;
      const confidenceBoost=ocrResults.reduce((sum,result,index)=>sum+(candidates[index]&&similarity(candidates[index],selected)>.76?(result.confidence||0):0),0)/Math.max(1,majority);
      const dictBoost=(dict?.score||0)*.18+(dict?.suggestion?.score||0)*18;
      return {selected,score:majority*26+confidenceBoost*.45+dictBoost,majority,cluster:cluster.items,reason:dictBoost>10?'majority + dictionary match':'majority + OCR confidence'};
    }).sort((a,b)=>b.score-a.score);
    const best=scored[0]||{selected:candidates[0]||'',score:0,majority:0,cluster:candidates,reason:'fallback'};
    return {position,candidates,selected:best.selected,reason:best.reason,confidence:clamp(best.score),majority:best.majority};
  }

  function runOQC1MajoritySimilarity(ocrResults){
    const successful=(ocrResults||[]).filter(result=>result.status==='success'&&result.text);
    if(!successful.length)return {status:'failed',text:'',confidence:0,conflictCount:0,resolvedCount:0,unresolvedCount:0,decisions:[],error:'ไม่มี OCR result ที่สำเร็จ'};
    const maxLines=Math.max(...successful.map(result=>lineList(result.text).length));
    const finalLines=[];
    const decisions=[];
    let conflictCount=0,resolvedCount=0,unresolvedCount=0;
    for(let i=0;i<maxLines;i++){
      const candidates=successful.map(result=>lineList(result.text)[i]||'').filter(Boolean);
      if(!candidates.length)continue;
      const unique=new Set(candidates.map(c=>c.toLowerCase()));
      if(unique.size===1){finalLines.push(candidates[0]);continue;}
      conflictCount++;
      const decision=chooseCandidate(candidates,successful,i);
      decisions.push(decision);
      finalLines.push(decision.selected);
      if(decision.confidence>=60)resolvedCount++;else unresolvedCount++;
    }
    const text=finalLines.join('\n');
    const confidence=clamp(average(successful.map(r=>r.confidence))*0.48+(resolvedCount/Math.max(1,conflictCount))*38+Math.min(14,wordList(text).length/12));
    return {status:'success',text,confidence:Number(confidence.toFixed(1)),conflictCount,resolvedCount,unresolvedCount,decisions};
  }

  function validateDocument(text,documentType,fields){
    const checks=[];
    const add=(name,passed)=>checks.push({name,passed:!!passed});
    if(documentType==='receipt'||documentType==='invoice'){
      add('dateValid',!!fields.date);add('totalFound',!!fields.total);add('itemsFound',(fields.items||[]).length>0);add('documentNoFound',!!(fields.receiptNo||fields.invoiceNo));
    }else if(documentType==='it-ticket'){
      add('ipFound',(fields.ipAddress||[]).length>0);add('networkPatternFound',(fields.vlan||[]).length>0||(fields.interface||[]).length>0);add('ticketOrIssueFound',!!fields.ticketNo||!!fields.issue);
    }else if(documentType==='email'){
      add('fromFound',!!fields.from);add('toFound',!!fields.to);add('subjectFound',!!fields.subject);
    }else if(documentType==='government'){
      add('subjectFound',!!fields.subject);add('recipientFound',!!fields.to);add('departmentFound',!!fields.department);add('dateFound',!!fields.date);
    }else if(documentType==='table'){
      add('headersFound',(fields.headers||[]).length>0);add('rowsFound',(fields.rows||[]).length>0);
    }else{
      add('textFound',wordList(text).length>3);
    }
    const passed=checks.filter(check=>check.passed).length;
    return {checks,score:clamp(passed/Math.max(1,checks.length)*100),passed,total:checks.length};
  }

  function runOQC2DocumentLogic(ocrResults,oqc1Result,analysis={}){
    const fallback=(ocrResults||[]).find(r=>r.isBest)||ocrResults?.[0];
    const baseText=oqc1Result?.text||fallback?.text||'';
    const applied=window.UserLearning?.applyUserCorrections?.(baseText)||{text:baseText,applied:[]};
    const extracted=window.DocumentExtractor?.extractFields?.(applied.text,analysis.documentTypeHint)||{documentType:'general',fields:{}};
    const validation=validateDocument(applied.text,extracted.documentType,extracted.fields||{});
    const warnings=[];
    if(validation.score<60)warnings.push('Document logic ผ่านไม่ครบ ควรตรวจทานเอง');
    if((oqc1Result?.unresolvedCount||0)>0)warnings.push('ยังมี conflict ที่ OQC #1 ไม่มั่นใจ '+oqc1Result.unresolvedCount+' จุด');
    const confidence=clamp((oqc1Result?.confidence||0)*.44+validation.score*.36+((fallback?.confidence||0)*.20)-warnings.length*4);
    return {status:'success',documentType:extracted.documentType,finalText:applied.text,confidence:Number(confidence.toFixed(1)),corrections:applied.applied||[],warnings,extractedFields:extracted.fields,validation:{...validation,totalMatched:validation.score>=70,dateValid:!!(extracted.fields?.date),documentNoFound:!!(extracted.fields?.documentNo||extracted.fields?.receiptNo||extracted.fields?.invoiceNo||extracted.fields?.ticketNo)}};
  }

  function calculateFinalConfidence(context){
    const ocrResults=context.ocrResults||[];
    const best=context.bestOCR||ocrResults.find(r=>r.isBest)||ocrResults[0]||{};
    const avgConf=average(ocrResults.filter(r=>r.status==='success').map(r=>r.confidence));
    const agreement=average(ocrResults.filter(r=>r.status==='success').map(r=>r.ranking?.consistencyScore||0));
    const logic=context.oqc2?.validation?.score||context.oqc2?.confidence||0;
    const completeness=best.ranking?.completenessScore||0;
    const resolved=context.oqc1?.conflictCount?context.oqc1.resolvedCount/context.oqc1.conflictCount*100:100;
    const lowPenalty=Math.min(18,ocrResults.reduce((sum,r)=>sum+(r.lowConfidenceWords||[]).length,0)*.8);
    const warningPenalty=(context.oqc2?.warnings||[]).length*4;
    const retryBoost=ocrResults.some(r=>r.retry?.afterConfidence>r.retry?.beforeConfidence)?4:0;
    const value=agreement*.35+(best.confidence||avgConf)*.20+logic*.25+completeness*.10+resolved*.10-lowPenalty-warningPenalty+retryBoost;
    return {finalConfidence:Number(clamp(value).toFixed(1)),parts:{OCRAgreement:Number(agreement.toFixed(1)),BestOCRConfidence:Math.round(best.confidence||avgConf||0),DocumentLogicScore:Number(logic.toFixed(1)),TextCompleteness:Number(completeness.toFixed(1)),OQCResolvedScore:Number(resolved.toFixed(1)),lowConfidencePenalty:Number(lowPenalty.toFixed(1)),manualWarningPenalty:warningPenalty,retryImprovementScore:retryBoost}};
  }

  function explainDecision(context){
    const best=context.bestOCR||context.ocrResults?.find(r=>r.isBest)||{};
    const finalSource=context.oqc2?.status==='success'?'OQC #2 finalText':context.oqc1?.status==='success'?'OQC #1 text':best.engineName||'fallback';
    const conf=calculateFinalConfidence(context);
    return {bestOCR:best.engineName||'',bestOCRId:best.engineId||'',finalSource,conflicts:context.oqc1?.decisions||[],confidenceParts:conf.parts,warnings:context.oqc2?.warnings||[],summary:['OCR ที่ดีที่สุด: '+(best.engineName||'-'),'Final source: '+finalSource,'Final confidence: '+conf.finalConfidence+'%'].join('\n')};
  }

  function buildFinalResult(context){
    const conf=calculateFinalConfidence(context);
    const finalText=context.oqc2?.finalText||context.oqc1?.text||context.bestOCR?.text||'';
    return {...context,finalText,finalConfidence:conf.finalConfidence,confidenceParts:conf.parts,explain:explainDecision(context)};
  }

  window.OQCBrain={runOQC1MajoritySimilarity,runOQC2DocumentLogic,calculateFinalConfidence,explainDecision,buildFinalResult,similarity};
})();
