const THAI_UI_TERMS=[
  'เมนู','อ่านข้อมูลเต็ม','ข่าวประจำวัน','ตารางหนังโรงไทย','หนังโรงไทย','Netflix','ซีรีส์น่าดู',
  'Daily Brief','แพลตฟอร์ม','เดือน','แยกเดือน','แยกแพลตฟอร์ม','ตามภาพ','ที่ส่งไป',
  'กดเข้าไป','หน้าหนังโรงไทย','ข้างใน','มีให้เลือก','แก้เป็นตามรูปที่ส่งไป'
];

const THAI_UI_EXACT_RULES=[
  [/เบมนตาราง/g,'เมนูตาราง'],
  [/เบมน/g,'เมนู'],
  [/เนตฟิก|เน็ตฟิก|เนตฟลิก|เน็ตฟลิก|Netflixx|NetfIix|Netfiix/gi,'Netflix'],
  [/Daily\s*Brlef|DaiIy\s*Brief|Daily\s*Bnef|DailyBrief/gi,'Daily Brief'],
  [/นําต/g,'น่าดู'],
  [/นําดู/g,'น่าดู'],
  [/น่าต/g,'น่าดู'],
  [/ทฎี่/g,'ที่'],
  [/กดเซ้า/g,'กดเข้า'],
  [/เซ้า/g,'เข้า'],
  [/แพทฟอม/g,'แพลตฟอร์ม'],
  [/แพลทฟอม/g,'แพลตฟอร์ม'],
  [/แพลทฟอร์ม/g,'แพลตฟอร์ม'],
  [/เนือง/g,'เดือน'],
  [/รป/g,'รูป'],
  [/ประจํา\s*วัน|ประจําวัน/g,'ประจำวัน'],
  [/ประจําวัณ/g,'ประจำวัน'],
  [/ชีรีส์/g,'ซีรีส์'],
  [/ซีรีส์นําต/g,'ซีรีส์น่าดู'],
  [/ซีรีส์นําดู/g,'ซีรีส์น่าดู'],
  [/หนังโรง\s+ไทย/g,'หนังโรงไทย']
];

const THAI_UI_BAD_PATTERNS=[
  /เบมน/g,/ทฎี่/g,/กดเซ้า/g,/นําต/g,/แพทฟอม/g,/แพลทฟอม/g,/เนือง/g,/ประจําวัณ/g,/ซีรีส์นําต/g
];

function isThaiUiPresetActive(){
  const preset=$('ocrPreset')?.value||AppState.ocrPreset||'';
  const skill=AppState.ocrSkill||'';
  return preset==='dark-thai-screenshot'||skill==='dark-thai-screenshot';
}

function thaiUiLevenshtein(a,b){
  const x=Array.from(String(a||''));
  const y=Array.from(String(b||''));
  const dp=Array.from({length:x.length+1},()=>Array(y.length+1).fill(0));
  for(let i=0;i<=x.length;i++)dp[i][0]=i;
  for(let j=0;j<=y.length;j++)dp[0][j]=j;
  for(let i=1;i<=x.length;i++){
    for(let j=1;j<=y.length;j++){
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(x[i-1]===y[j-1]?0:1));
    }
  }
  return dp[x.length][y.length];
}

function thaiUiSimilarity(a,b){
  const max=Math.max(Array.from(String(a||'')).length,Array.from(String(b||'')).length,1);
  return 1-(thaiUiLevenshtein(a,b)/max);
}

function shouldSkipThaiUiToken(token){
  return !token||/[0-9/@#%฿&+=()[\]{}\\]|https?:|__OCR_KEEP_/i.test(token);
}

function correctThaiUiTerms(text,{force=false}={}){
  if(!force&&!isThaiUiPresetActive())return String(text||'');
  let out=String(text||'');
  const fixed=[];
  for(const [pattern,replacement] of THAI_UI_EXACT_RULES){
    out=out.replace(pattern,match=>{
      if(match!==replacement)fixed.push({from:match,to:replacement,type:'Thai UI Dictionary'});
      return replacement;
    });
  }

  const hasUiContext=/เมนู|ข่าว|หนังโรง|Netflix|Daily Brief|ซีรีส์|แพลตฟอร์ม|เดือน|ตามภาพ|ส่งไป|เลือก/g.test(out);
  if(hasUiContext){
    out=out.replace(/[\u0e01-\u0e2e\u0e30-\u0e3a\u0e40-\u0e4e]{3,}/g,token=>{
      if(shouldSkipThaiUiToken(token))return token;
      let best=null;
      for(const term of THAI_UI_TERMS.filter(x=>/[\u0e00-\u0e7f]/.test(x))){
        const sim=thaiUiSimilarity(token,term);
        if(sim>=.84&&(!best||sim>best.sim))best={term,sim};
      }
      if(best&&best.term!==token){
        fixed.push({from:token,to:best.term,type:'Thai UI Fuzzy'});
        return best.term;
      }
      return token;
    });
  }

  if(fixed.length){
    AppState.fixedWords=[...(AppState.fixedWords||[]),...fixed];
    AppState.thaiUiDictionaryReport={fixed,reviewRequired:false};
    if(typeof setStatus==='function'&&isThaiUiPresetActive()){
      setStatus('พบคำที่แก้จาก Thai UI Dictionary: '+fixed.slice(0,4).map(x=>x.to).join(', '),'ok');
    }
  }
  return out;
}

function scoreThaiUiScreenshotText(text){
  const value=String(text||'');
  let score=0;
  const positive=[
    /เมนู/g,/ข่าวประจำวัน/g,/หนังโรงไทย/g,/Netflix/g,/Daily Brief/g,/ซีรีส์น่าดู/g,
    /แพลตฟอร์ม/g,/เดือน/g,/^\s*[123]\s+/gm,/[+/]/g,/กดเข้า/g,/ตามภาพ/g
  ];
  for(const pattern of positive)score+=(value.match(pattern)||[]).length*18;
  for(const pattern of THAI_UI_BAD_PATTERNS)score-=(value.match(pattern)||[]).length*28;
  if(/Net[^f]?|ฟิก|ฟลิก/i.test(value)&&!/Netflix/.test(value))score-=30;
  if(/Daily|Brief/i.test(value)&&!/Daily Brief/.test(value))score-=18;
  const floating=(value.match(/(^|\s)[\u0e30-\u0e3a\u0e47-\u0e4e]/g)||[]).length;
  score-=floating*10;
  return score;
}

const DARK_THAI_UI_MENU_SAMPLE=[
  '1 เมนูอ่านข้อมูลเต็มเอาออกไป เหลือไว้แค่เมนูข่าวประจำวัน',
  '2 เพิ่มเมนูตารางหนังโรงไทย + Netflix / ซีรีส์น่าดู ตามภาพ ที่ส่งไป กดเข้าไปในหน้าหนังโรงไทย + Netflix / ซีรีส์น่าดู แล้วข้างในมีให้เลือกเดือนแยกกัน แยกแพลตฟอร์ม ในเดือนนั้นๆๆ',
  '3 Daily Brief / ข่าวประจำวัน แก้เป็นตามรูปที่ส่งไป'
].join('\n');
