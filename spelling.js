import {canonicalReading} from './logic.js';
export function shuffle(items,random=Math.random){
 const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function makeTiles(pokemon,data){
 const answers=pokemon.zhuyin.map((reading,i)=>({id:`answer-${i}`,reading}));
 const existing=new Set(answers.map(t=>canonicalReading(t.reading)));
 const pool=data.flatMap(p=>p.zhuyin).filter(r=>/^[ㄅ-ㄩˊˇˋ˙]+$/u.test(r)&&!existing.has(canonicalReading(r)));
 const extras=shuffle([...new Set(pool)]).slice(0,3).map((reading,i)=>({id:`extra-${i}`,reading}));
 return shuffle([...answers,...extras]);
}
export function spellingCorrect(slots,pokemon){return slots.length===pokemon.zhuyin.length&&slots.every((tile,i)=>tile&&canonicalReading(tile.reading)===canonicalReading(pokemon.zhuyin[i]));}
export function createSpelling({root,onComplete,onAttempt}){
 let pokemon=null,tiles=[],slots=[],done=false;
 root.innerHTML=`<p class="spell-hint">依照名字的順序，點選每個字的注音。點空格裡的注音可以取回。</p><div class="spell-slots" aria-label="依序拼出名字"></div><div class="spell-tiles" aria-label="可選擇的注音"></div><div class="spell-actions"><button class="small-button" id="spell-clear">清空重拼</button><button class="next" id="spell-check">拼好了，檢查！</button></div><p class="spell-status" role="status" aria-live="polite"></p>`;
 const find=s=>root.querySelector(s);
 function render(){
  const used=new Set(slots.filter(Boolean).map(t=>t.id));
  find('.spell-slots').replaceChildren(...slots.map((tile,i)=>{const b=document.createElement('button');b.className='spell-slot'+(tile?' filled':'');b.textContent=tile?.reading||String(i+1);b.disabled=done||!tile;b.setAttribute('aria-label',tile?`第 ${i+1} 格，${tile.reading}，點選取回`:`第 ${i+1} 格，等待注音`);b.onclick=()=>{slots[i]=null;find('.spell-status').textContent='取回了，再選一個注音放進來。';render();};return b;}));
  find('.spell-tiles').replaceChildren(...tiles.map(tile=>{const b=document.createElement('button');b.className='spell-tile';b.textContent=tile.reading;b.dataset.tileId=tile.id;b.disabled=done||used.has(tile.id);b.setAttribute('aria-label',`選擇 ${tile.reading}`);b.onclick=()=>{const index=slots.indexOf(null);if(index<0)return;onAttempt();slots[index]=tile;find('.spell-status').textContent=slots.every(Boolean)?'都放好了，按「拼好了，檢查！」看看。':`已放入第 ${index+1} 格，繼續找下一個注音。`;render();};return b;}));
  find('#spell-check').disabled=done||!slots.length||slots.some(t=>!t);find('#spell-clear').disabled=!slots.some(Boolean);
 }
 find('#spell-clear').onclick=()=>{done=false;slots=slots.map(()=>null);find('.spell-status').textContent='重新開始，慢慢找就好。';render();};
 find('#spell-check').onclick=()=>{
  if(done||!pokemon||slots.some(t=>!t))return;
  if(spellingCorrect(slots,pokemon)){done=true;render();find('.spell-status').textContent='拼對了！你把完整名字的注音排好了！';onComplete();}
  else{const wrong=slots.flatMap((tile,i)=>canonicalReading(tile.reading)!==canonicalReading(pokemon.zhuyin[i])?[i+1]:[]);find('.spell-status').textContent=`再看看第 ${wrong.join('、')} 格的注音和聲調。點一下取回，再試一次！`;}
 };
 return {reset(p,data){pokemon=p;tiles=makeTiles(p,data);slots=p.zhuyin.map(()=>null);done=false;find('.spell-status').textContent='每個空格放一個字的完整注音。';render();}};
}
