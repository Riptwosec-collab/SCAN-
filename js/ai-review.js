// RIPTWOSEC.SCAN Real AI Review
// BYOK: API key is stored only in this browser localStorage. Do not hard-code keys in this repo.
const AI_REVIEW_KEY='riptwosec.scan.aiReview';

function getAiReviewSettings(){
  try{
    return JSON.parse(localStorage.getItem(AI_REVIEW_KEY)||'{}');
  }catch{
    return {};
  }
}

function saveAiReviewSettings(next){
  localStorage.setItem(AI_REVIEW_KEY,JSON.stringify({...getAiReviewSettings(),...next}));
}

function injectAiReviewPanel(){
  if($('aiReviewPanel'))return;
  const anchor=document.querySelector('.dictionary-box')||document.querySelector('.action-row');
  if(!anchor)return;
  const settings=getAiReviewSettings();
  const panel=document.createElement('details');
  panel.id='aiReviewPanel';
  panel.className='ai-review-box';
  panel.open=!!settings.enabled;
  panel.innerHTML=`
    <summary>AI Review จริง หลัง OCR <span style="color:#facc15;font-size:12px">ต้องมี API Credit</span></summary>
    <div class="ai-review-inner">
      <label class="ai-review-toggle"><input id="aiReviewEnabled" type="checkbox" ${settings.enabled?'checked':''}> เปิด AI Review วิเคราะห์ทั้งย่อหน้า</label>
      <div class="ai-review-grid">
        <input id="aiReviewApiKey" type="password" placeholder="OpenAI API Key: sk-... ต้องมี Billing/Credit" value="${escapeHtml(settings.apiKey||'')}">
        <input id="aiReviewModel" placeholder="Model เช่น gpt-4o-mini" value="${escapeHtml(settings.model||'gpt-4o-mini')}">
      </div>
      <div class="ai-review-actions">
        <button class="btn small" id="saveAiReviewBtn" type="button">บันทึก AI Review</button>
        <button class="btn small danger" id="clearAiReviewKeyBtn" type="button">ลบ API Key</button>
      </div>
      <div class="hint">สำคัญ: ถ้าไม่มี OpenAI API Key ที่เปิด Billing/เติมเครดิตแล้ว ผลลัพธ์จะไม่ต่างจากเดิม เพราะระบบจะใช้ Rule-based เดิมแทน</div>
      <div class="hint">โหมดนี้ส่ง Raw OCR + ข้อความที่เว็บแก้แล้ว ไปให้ AI ตรวจบริบททั้งย่อหน้า แล้วคืนเฉพาะข้อความที่แก้แล้วเท่านั้น</div>
    </div>
  `;
  anchor.insertAdjacentElement('afterend',panel);

  $('saveAiReviewBtn').onclick=()=>{
    saveAiReviewSettings({
      enabled:$('aiReviewEnabled').checked,
      apiKey:$('aiReviewApiKey').value.trim(),
      model:$('aiReviewModel').value.trim()||'gpt-4o-mini'
    });
    setStatus('บันทึก AI Review แล้ว · ต้องมี API Credit จึงจะเห็นผลต่างจริง','ok');
  };
  $('clearAiReviewKeyBtn').onclick=()=>{
    $('aiReviewApiKey').value='';
    saveAiReviewSettings({apiKey:'',enabled:$('aiReviewEnabled').checked,model:$('aiReviewModel').value.trim()||'gpt-4o-mini'});
    setStatus('ลบ API Key ใน Browser แล้ว','ok');
  };
  $('aiReviewEnabled').onchange=()=>{
    saveAiReviewSettings({enabled:$('aiReviewEnabled').checked});
    setStatus($('aiReviewEnabled').checked?'เปิด AI Review แล้ว · ต้องมี API Key + Credit':'ปิด AI Review แล้ว','ok');
  };
}

document.addEventListener('DOMContentLoaded',injectAiReviewPanel);

function buildAiReviewPrompt(){
  return `คุณคือ AI Thai Document & OCR Post-Processor ของระบบ RIPTWOSEC.SCAN
หน้าที่: ตรวจและแก้ข้อความภาษาไทย/อังกฤษที่ได้จาก OCR ให้ถูกต้องตามบริบทเอกสารจริง โดยเฉพาะเอกสาร IT, อีเมลแจ้งเตือน, Ticket, สัญญา, ใบเสร็จ, หนังสือราชการ และเอกสารบริษัท

กฎสำคัญ:
1) แก้เฉพาะตัวอักษร/คำ/เว้นวรรค/สระ/วรรณยุกต์ที่เสียหายจาก OCR
2) ห้ามสรุป ห้ามแต่งเนื้อหาใหม่ ห้ามเปลี่ยนเจตนา
3) ห้ามลบเลขที่เอกสาร วันที่ รหัส Ticket เบอร์โทร URL Email ชื่อคน ชื่อบริษัท เว้นแต่เป็นขยะ OCR ชัดเจน
4) คงโครงสร้างเอกสาร เช่น วันที่, เรื่อง, เรียน, อ้างอิง, ย่อหน้า, รายการ, เบอร์โทร, email
5) ลบขยะ OCR ที่ไม่มีความหมาย เช่น เส้นตาราง ไอคอน ตัวซ้ำยาว สัญลักษณ์มั่ว
6) ถ้าคำก้ำกึ่งมากและไม่มีบริบทพอ ให้คงข้อความเดิม
7) ส่งกลับเฉพาะข้อความที่แก้แล้วเท่านั้น ไม่ต้องอธิบาย ไม่ต้องใส่ markdown

ตัวอย่าง mapping ที่ควรรู้:
วษนทรร->วันที่, เรรรอง/เรือ่ง->เรื่อง, แจอง->แจ้ง, กจาหนดการ->กำหนดการ, ปรษบปรคง->ปรับปรุง, เรรยน->เรียน, ททาน->ท่าน, ผผอใชอบรอการ->ผู้ใช้บริการ, ออางออง->อ้างอิง, บรอษษท->บริษัท, จจากษด->จำกัด, สรรอสษญญาณ->สื่อสัญญาณ, ความเรตวสผง->ความเร็วสูง, ตระหนษกถจง->ตระหนักถึง, ประสอทธอภาพ->ประสิทธิภาพ, เครรอขทาย->เครือข่าย, จจงเรรยนมาเพรรอโปรดทราบ->จึงเรียนมาเพื่อโปรดทราบ, กรคณาตอดตทอ->กรุณาติดต่อ, โทรศษทพร->โทรศัพท์, อีเมล/email/domain/url/ticket ต้องรักษาให้ถูกต้อง`;
}

function extractOpenAiText(data){
  if(data?.output_text)return data.output_text;
  const chunks=[];
  for(const item of data?.output||[]){
    for(const part of item?.content||[]){
      if(part?.text)chunks.push(part.text);
      if(part?.type==='output_text'&&part?.text)chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

async function aiReviewTextIfEnabled(rawText,cleanedText){
  const settings=getAiReviewSettings();
  if(!settings.enabled)return cleanedText;
  const apiKey=(settings.apiKey||'').trim();
  if(!apiKey){
    setStatus('AI Review ยังไม่ทำงาน: ยังไม่ได้ใส่ API Key ที่มี Credit · ใช้ Rule-based เดิม','err');
    return cleanedText;
  }
  const model=(settings.model||'gpt-4o-mini').trim();
  const inputText=`RAW OCR TEXT:\n${rawText||''}\n\nRULE-BASED CLEANED DRAFT:\n${cleanedText||''}`;
  try{
    setStatus('AI Review กำลังตรวจบริบททั้งย่อหน้า...','ok');
    setProgress(97);
    const res=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+apiKey
      },
      body:JSON.stringify({
        model,
        input:[
          {role:'system',content:[{type:'input_text',text:buildAiReviewPrompt()}]},
          {role:'user',content:[{type:'input_text',text:inputText}]}
        ],
        max_output_tokens:6000
      })
    });
    const data=await res.json();
    if(!res.ok){
      const msg=data?.error?.message||('HTTP '+res.status);
      throw new Error(msg);
    }
    const reviewed=extractOpenAiText(data).trim();
    if(!reviewed)throw new Error('AI ไม่ส่งข้อความกลับมา');
    setStatus('AI Review สำเร็จ · ตรวจบริบททั้งย่อหน้าแล้ว','ok');
    return reviewed;
  }catch(error){
    setStatus('AI Review ใช้งานไม่ได้: '+error.message+' · ใช้ Rule-based เดิม','err');
    return cleanedText;
  }
}
