const IT_DICTIONARY_RULES=[
  [/\bSD\s*WAN\b/gi,'SD-WAN'],[/\bsdwan\b/gi,'SD-WAN'],[/\bN\s*O\s*C\b/gi,'NOC'],[/\bnoc\b/gi,'NOC'],
  [/\bcase\b/gi,'Case'],[/\bengineer\b/gi,'Engineer'],[/\bCUCM\s*(\d+)\b/gi,'CUCM$1'],
  [/route\s*pa\s*(?:tt|[ƩΣ])\s*ern/gi,'route pattern'],[/pa\s*(?:tt|[ƩΣ])\s*ern/gi,'pattern'],
  [/configura\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'configuration'],[/informa\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'information'],
  [/opera\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'operation'],[/loca\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'location'],
  [/destina\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'destination'],[/communica\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'communication'],
  [/\bV\s*L\s*A\s*N\b/gi,'VLAN'],[/\binterface\b/gi,'interface'],[/\bgateway\b/gi,'gateway'],[/\bendpoint\b/gi,'endpoint'],[/\btracker\b/gi,'tracker']
];

function applyItDictionary(text){
  if(!$('itDictionary')?.checked)return text;
  let out=text;
  for(const [pattern,replacement] of IT_DICTIONARY_RULES){
    out=replaceTrack(out,pattern,replacement);
  }
  return out;
}
