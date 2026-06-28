const OCR_IMPORTANT_SYMBOLS=['/',':','.','-','_','@','#','%','฿','&','+','=','(',')','[',']','{','}','\\'];

function countImportantSymbols(text){
  const counts={};
  const value=String(text||'');
  for(const symbol of OCR_IMPORTANT_SYMBOLS){
    counts[symbol]=(value.split(symbol).length-1);
  }
  return counts;
}

function symbolPreservationScore(rawText,cleanedText){
  const raw=countImportantSymbols(rawText);
  const cleaned=countImportantSymbols(cleanedText);
  let rawTotal=0;
  let kept=0;
  const lost={};
  for(const symbol of OCR_IMPORTANT_SYMBOLS){
    rawTotal+=raw[symbol];
    kept+=Math.min(raw[symbol],cleaned[symbol]);
    if(cleaned[symbol]<raw[symbol])lost[symbol]=raw[symbol]-cleaned[symbol];
  }
  const score=rawTotal?Math.round((kept/rawTotal)*100):100;
  return {score,rawTotal,kept,lost,reviewRequired:score<92};
}
