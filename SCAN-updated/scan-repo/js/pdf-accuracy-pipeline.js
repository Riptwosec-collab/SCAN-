function buildPdfAccuracyReport(pageInfo){
  const fields=typeof validateImportantFields==='function'?validateImportantFields(pageInfo.cleanedText||pageInfo.rawText||''):{fields:[],issues:[],suspicious:[]};
  const symbols=typeof symbolPreservationScore==='function'?symbolPreservationScore(pageInfo.rawText||'',pageInfo.cleanedText||pageInfo.rawText||''):{score:100,lost:{}};
  const lowConfidence=(pageInfo.confidence||0)<75;
  return {
    page:pageInfo.page,
    source:pageInfo.method==='text-layer'?'text-layer':'ocr',
    confidence:pageInfo.confidence,
    reviewRequired:lowConfidence||fields.reviewRequired||symbols.reviewRequired,
    fields:fields.fields.length,
    suspicious:fields.suspicious,
    fieldIssues:fields.issues,
    symbolScore:symbols.score,
    symbolLoss:symbols.lost
  };
}

function buildPdfDocumentAccuracyReport(pages){
  return (pages||[]).map(buildPdfAccuracyReport);
}
