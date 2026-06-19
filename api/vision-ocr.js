// Vercel Serverless Function: Vision OCR / image recheck
// Env: OPENAI_API_KEY, PAID_ACCESS_CODES, AI_VISION_MODEL(optional, default gpt-4o-mini)

function setCors(res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}

function validCode(code){
  const allowed=(process.env.PAID_ACCESS_CODES||'').split(',').map(x=>x.trim()).filter(Boolean);
  return !!allowed.length && allowed.includes(String(code||'').trim());
}

function prompt(){
  return `You are RIPTWOSEC.SCAN Vision OCR.
Read the provided image/PDF page directly and transcribe Thai + English text as accurately as possible.
Rules:
- Return only the extracted/corrected text. No markdown, no explanation.
- Preserve document layout, line breaks, headings, tables, numbers, dates, ticket IDs, phone numbers, URLs, emails, IPs, MAC addresses, VLANs, interface names and company/person names.
- Do not summarize or translate.
- Do not invent missing text.
- If uncertain, keep the closest visible text.
- Thai OCR priority: fix broken vowels, tone marks, split Thai words, and common OCR swaps while preserving original meaning.
- Remove obvious visual noise only if it is not part of the document.`;
}

function extractText(data){
  if(data?.output_text)return data.output_text.trim();
  const chunks=[];
  for(const item of data?.output||[]){
    for(const part of item?.content||[]){
      if(part?.text)chunks.push(part.text);
      if(part?.type==='output_text'&&part?.text)chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

module.exports=async function handler(req,res){
  setCors(res);
  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const key=process.env.OPENAI_API_KEY;
    if(!key)return res.status(500).json({error:'Server missing OPENAI_API_KEY'});
    const {accessCode,imageDataUrl,rawText,cleanedText,model}=req.body||{};
    if(!validCode(accessCode))return res.status(402).json({error:'ต้องใส่ Access Code ที่ได้รับหลัง Donate ก่อนใช้ Vision OCR'});
    if(!imageDataUrl || !String(imageDataUrl).startsWith('data:image/'))return res.status(400).json({error:'Missing imageDataUrl'});
    const selected=String(model||process.env.AI_VISION_MODEL||process.env.AI_REVIEW_MODEL||'gpt-4o-mini').trim();
    const context=`Existing OCR draft for comparison only. Do not trust it blindly.\nRAW OCR:\n${String(rawText||'').slice(0,12000)}\n\nCLEANED DRAFT:\n${String(cleanedText||'').slice(0,12000)}`;
    const openai=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({
        model:selected,
        input:[
          {role:'system',content:[{type:'input_text',text:prompt()}]},
          {role:'user',content:[
            {type:'input_text',text:context},
            {type:'input_image',image_url:imageDataUrl}
          ]}
        ],
        max_output_tokens:6000
      })
    });
    const data=await openai.json();
    if(!openai.ok)return res.status(openai.status).json({error:data?.error?.message||'OpenAI Vision error'});
    const text=extractText(data);
    return res.status(200).json({text,model:selected});
  }catch(error){
    return res.status(500).json({error:error.message||'Vision OCR server error'});
  }
};
