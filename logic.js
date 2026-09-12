export const boundaries=[0,151,251,386,493,649,721,809,905,1025];
export function filterPokemon(data,query,generation,collectedOnly,progress){
 const q=query.trim().toLowerCase();
 return data.filter(p=>(!q||p.name.includes(q)||p.englishName?.toLowerCase().includes(q)||String(p.id).padStart(4,'0').includes(q))&&(!generation||(p.id>boundaries[generation-1]&&p.id<=boundaries[generation]))&&(!collectedOnly||progress[p.id]));
}
export function normalize(text){return text.normalize('NFKC').replace(/[\s\p{P}]/gu,'').toLowerCase();}
export function canonicalReading(value){return value.replace(/[ˉ˙\s]/gu,'')+(value.includes('˙')?'˙':'');}
export function matchSpeech(transcripts,pokemon,readings={}){
 const exact=transcripts.find(t=>normalize(t)===normalize(pokemon.name));
 if(exact!==undefined)return {kind:'exact',transcript:exact};
 const target=Array.from(normalize(pokemon.name));
 if(target.length!==pokemon.zhuyin?.length)return null;
 for(const transcript of transcripts){
  const chars=Array.from(normalize(transcript));
  if(chars.length!==target.length)continue;
  // Do not drop tones, accept edit distance, or allow a partial name in a sentence.
  const equal=chars.every((ch,i)=>ch===target[i]||(
   /^[\u3105-\u3129ˉˊˇˋ˙]+$/u.test(pokemon.zhuyin[i])&&
   Object.hasOwn(readings,ch)&&canonicalReading(readings[ch])===canonicalReading(pokemon.zhuyin[i])
  ));
  if(equal)return {kind:'homophone',transcript};
 }
 return null;
}
export function matches(transcripts,pokemon,readings={}){return Boolean(matchSpeech(transcripts,pokemon,readings));}
export function splitZhuyin(value){
 const tone=value.match(/[ˊˇˋ˙]/u)?.[0]||'';
 return {symbols:Array.from(value.replace(/[ˉˊˇˋ˙]/gu,'')),tone};
}
export function loadProgress(raw){try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))return {};return Object.fromEntries(Object.entries(value).filter(([id,v])=>/^\d+$/.test(id)&&+id>=1&&+id<=1025&&['voice','spelling','assisted'].includes(v)));}catch{return {};}}
