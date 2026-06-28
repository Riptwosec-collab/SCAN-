const OCR_PROTECTED_TOKEN_RE=/^__OCR_KEEP_\d+__$/;

function protectImportantTokens(text){
  const tokens=[];
  let out=String(text||'');
  const patterns=[
    {type:'url',regex:/\bhttps?:\/\/[^\s<>"']+/gi},
    {type:'email',regex:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi},
    {type:'windowsPath',regex:/\b[A-Z]:\\[^\n\r\t<>|"]+/gi},
    {type:'apiPath',regex:/(^|[\s(["'])(\/[A-Za-z0-9._~:@!$&'()*+,;=%-]+(?:\/[A-Za-z0-9._~:@!$&'()*+,;=%-]+)+)/g},
    {type:'mac',regex:/\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi},
    {type:'ip',regex:/\b(?:\d{1,3}\.){3}\d{1,3}\b/g},
    {type:'ticket',regex:/\b(?:INC|REQ|TKT|CASE|ERR)[-_:]?[A-Z0-9-]{3,}\b/gi},
    {type:'amount',regex:/[฿$]?\s*\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\b\d+(?:\.\d{2})?\s*(?:บาท|THB|USD)\b/gi},
    {type:'date',regex:/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g},
    {type:'time',regex:/\b\d{1,2}:\d{2}(?::\d{2})?\b/g},
    {type:'percent',regex:/\b\d+(?:\.\d+)?%/g},
    {type:'version',regex:/\bv?\d+\.\d+(?:\.\d+){0,2}\b/gi},
    {type:'domain',regex:/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi},
    {type:'serial',regex:/\b[A-Z]{2,}[-_][A-Z0-9][A-Z0-9_-]{3,}\b/g}
  ];

  const reserve=(type,value)=>{
    const key='__OCR_KEEP_'+tokens.length+'__';
    tokens.push({key,value,type});
    return key;
  };

  for(const item of patterns){
    if(item.type==='apiPath'){
      out=out.replace(item.regex,(match,prefix,value)=>prefix+reserve(item.type,value));
    }else{
      out=out.replace(item.regex,match=>reserve(item.type,match));
    }
  }

  return {text:out,tokens};
}

function restoreImportantTokens(text,tokens){
  let out=String(text||'');
  for(const item of tokens||[]){
    out=out.split(item.key).join(item.value);
  }
  return out;
}

function isProtectedToken(value){
  return OCR_PROTECTED_TOKEN_RE.test(String(value||'').trim());
}

function getProtectedTokenReport(tokens){
  const grouped={};
  for(const item of tokens||[])grouped[item.type]=(grouped[item.type]||0)+1;
  return {total:(tokens||[]).length,types:grouped,tokens:tokens||[]};
}

function withProtectedTokens(text,callback){
  const protectedData=protectImportantTokens(text);
  const result=callback(protectedData.text,protectedData.tokens);
  return restoreImportantTokens(result,protectedData.tokens);
}

function testTokenProtector(){
  const sample='URL: https://scan-tawny.vercel.app/help.html\nEmail: network@dga.or.th\nIP: 10.240.36.254\nTicket: INC-2026-001\nAmount: ฿12,500.00\nAPI: /api/ocr/image';
  const protectedData=protectImportantTokens(sample);
  const restored=restoreImportantTokens(protectedData.text,protectedData.tokens);
  return {ok:restored===sample,protectedData,restored};
}
