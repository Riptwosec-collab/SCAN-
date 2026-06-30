function extractImportantFields(text){
  const value=String(text||'');
  const specs=[
    ['url',/\bhttps?:\/\/[^\s<>"']+/gi],
    ['email',/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
    ['ip',/\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
    ['mac',/\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi],
    ['amount',/[฿$]\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\b\d+(?:\.\d{2})?\s*(?:บาท|THB|USD)\b/gi],
    ['date',/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g],
    ['time',/\b\d{1,2}:\d{2}(?::\d{2})?\b/g],
    ['ticket',/\b(?:INC|REQ|TKT|CASE|ERR)[-_:]?[A-Z0-9-]{3,}\b/gi],
    ['domain',/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi],
    ['version',/\bv?\d+\.\d+(?:\.\d+){0,2}\b/gi]
  ];
  return specs.flatMap(([type,regex])=>(value.match(regex)||[]).map(value=>({type,value})));
}

function isValidIp(value){
  return String(value).split('.').every(part=>part!==''&&Number(part)>=0&&Number(part)<=255);
}

function validateImportantFields(text){
  const fields=extractImportantFields(text);
  const issues=[];
  for(const field of fields){
    if(field.type==='ip'&&!isValidIp(field.value))issues.push({...field,issue:'invalid-ip-range'});
    if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value))issues.push({...field,issue:'invalid-email'});
    if(field.type==='url'&&!/^https?:\/\/[^.\s]+\.[^\s]+/i.test(field.value))issues.push({...field,issue:'invalid-url'});
  }
  const suspicious=findSuspiciousOcrTokens(text);
  return {fields,issues,suspicious,reviewRequired:issues.length>0||suspicious.length>0};
}

function findSuspiciousOcrTokens(text){
  const value=String(text||'');
  const checks=[
    {name:'floating Thai mark',regex:/(^|\s)[\u0e30\u0e32\u0e33\u0e34-\u0e3a\u0e47-\u0e4e]/g},
    {name:'split Thai mark',regex:/[\u0e40-\u0e44]\s+[\u0e01-\u0e2e]|[\u0e01-\u0e2e]\s+[\u0e34-\u0e3a\u0e47-\u0e4e]/g},
    {name:'replacement character',regex:/�|\uFFFD/g},
    {name:'mixed O0/I1 token',regex:/\b(?=[A-Z0-9]*[OIlo])(?=[A-Z0-9]*[01])[A-Z0-9_-]{4,}\b/g},
    {name:'placeholder leak',regex:/__OCR_KEEP_\d+__/g}
  ];
  return checks.map(check=>{
    const matches=value.match(check.regex)||[];
    return matches.length?{name:check.name,count:matches.length,sample:matches.slice(0,5)}:null;
  }).filter(Boolean);
}

function markSuspiciousFields(text){
  const result=validateImportantFields(text);
  AppState.reviewRequired=!!result.reviewRequired;
  AppState.fieldValidation=result;
  return String(text||'');
}

function validateAndMarkSuspiciousFields(text){
  return markSuspiciousFields(text);
}
