(function(){
  'use strict';

  const CORRECTION_KEY='riptwosec-scan-user-corrections-v1';
  const DICT_KEY='riptwosec-scan-custom-dictionary-v1';
  const normalize=value=>String(value||'').trim();

  function safeParse(value,fallback){try{return JSON.parse(value)||fallback;}catch(error){return fallback;}}
  function loadUserCorrections(){return safeParse(localStorage.getItem(CORRECTION_KEY),[]);}
  function saveAllCorrections(items){localStorage.setItem(CORRECTION_KEY,JSON.stringify(items.slice(-500)));}
  function saveUserCorrection(wrong,correct){
    wrong=normalize(wrong);correct=normalize(correct);
    if(!wrong||!correct||wrong===correct)return null;
    const items=loadUserCorrections();
    const existing=items.find(item=>item.wrong===wrong&&item.correct===correct);
    const rule=existing||{wrong,correct,source:'user',createdAt:new Date().toISOString(),used:0};
    if(!existing)items.push(rule);
    saveAllCorrections(items);
    return rule;
  }

  function applyUserCorrections(text){
    let output=String(text||'');
    const applied=[];
    loadUserCorrections().forEach(rule=>{
      if(!rule?.wrong||!rule?.correct)return;
      const before=output;
      output=output.split(rule.wrong).join(rule.correct);
      if(output!==before)applied.push(rule);
    });
    if(applied.length){
      const items=loadUserCorrections();
      applied.forEach(rule=>{const target=items.find(item=>item.wrong===rule.wrong&&item.correct===rule.correct);if(target)target.used=(target.used||0)+1;});
      saveAllCorrections(items);
    }
    return {text:output,applied};
  }

  function loadCustomDictionary(){
    return safeParse(localStorage.getItem(DICT_KEY),{
      general:['เครื่อง','เครือข่าย','ข้อมูล','เอกสาร','จำนวน','วันที่'],
      it:['IP Address','Mac Address','VLAN','Router','Switch','Firewall','DHCP','DNS','ARP','STP','Interface','Notebook'],
      tax:['ใบกำกับภาษี','เลขประจำตัวผู้เสียภาษี','ยอดรวม','ภาษี','ส่วนลด'],
      government:['บันทึกข้อความ','ส่วนราชการ','เรียน','เรื่อง','ผู้อำนวยการ','อนุเคราะห์','ราชการ'],
      company:[],product:[],user:[]
    });
  }

  function saveCustomDictionaryWord(word,category='user'){
    word=normalize(word);category=normalize(category)||'user';
    if(!word)return null;
    const dict=loadCustomDictionary();
    if(!Array.isArray(dict[category]))dict[category]=[];
    if(!dict[category].includes(word))dict[category].push(word);
    localStorage.setItem(DICT_KEY,JSON.stringify(dict));
    return {word,category};
  }

  function dictionaryWords(categories){
    const dict=loadCustomDictionary();
    const keys=categories?.length?categories:Object.keys(dict);
    return Array.from(new Set(keys.flatMap(key=>dict[key]||[])));
  }

  function dictionaryScore(word){
    const target=normalize(word).toLowerCase();
    if(!target)return 0;
    return dictionaryWords().some(item=>item.toLowerCase()===target)?100:dictionaryWords().some(item=>item.toLowerCase().includes(target)||target.includes(item.toLowerCase()))?65:0;
  }

  function suggestCorrection(word){
    const target=normalize(word).toLowerCase();
    if(!target)return null;
    const candidates=dictionaryWords().map(item=>({word:item,score:similarity(target,item.toLowerCase())})).sort((a,b)=>b.score-a.score);
    return candidates[0]?.score>.72?candidates[0]:null;
  }

  function similarity(a,b){
    if(a===b)return 1;
    const m=a.length,n=b.length;
    if(!m||!n)return 0;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++)dp[i][0]=i;
    for(let j=0;j<=n;j++)dp[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return 1-dp[m][n]/Math.max(m,n);
  }

  window.UserLearning={saveUserCorrection,applyUserCorrections,loadUserCorrections,loadCustomDictionary,saveCustomDictionaryWord,dictionaryWords,dictionaryScore,suggestCorrection};
})();
