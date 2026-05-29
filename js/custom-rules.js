const CUSTOM_RULES_KEY='riptwosec.scan.customRules';

function getCustomRules(){
  return JSON.parse(localStorage.getItem(CUSTOM_RULES_KEY)||'[]');
}

function saveCustomRules(rules){
  localStorage.setItem(CUSTOM_RULES_KEY,JSON.stringify(rules));
  renderCustomRules();
}

function addCustomRule(){
  const from=$('customFrom').value.trim();
  const to=$('customTo').value.trim();
  if(!from||!to){setStatus('กรุณาใส่คำผิดและคำที่ต้องการแก้','err');return;}
  const rules=getCustomRules();
  rules.unshift({from,to});
  saveCustomRules(rules.slice(0,80));
  $('customFrom').value='';
  $('customTo').value='';
  setStatus('เพิ่มคำแก้เองแล้ว','ok');
}

function applyCustomRules(text){
  let out=text;
  for(const rule of getCustomRules()){
    out=replaceTrack(out,rule.from,rule.to);
  }
  return out;
}

function renderCustomRules(){
  const box=$('customRules');
  if(!box)return;
  const rules=getCustomRules();
  box.innerHTML='';
  rules.slice(0,18).forEach((rule,index)=>{
    const chip=document.createElement('span');
    chip.className='rule-chip';
    chip.textContent=rule.from+' → '+rule.to+' ×';
    chip.onclick=()=>{
      const next=getCustomRules();
      next.splice(index,1);
      saveCustomRules(next);
    };
    box.appendChild(chip);
  });
}
