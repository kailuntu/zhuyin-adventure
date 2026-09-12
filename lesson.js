import {splitZhuyin} from './logic.js';
const initials='ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ';
export const symbols='ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ';
const toneNames={'':'第一聲','ˊ':'第二聲','ˇ':'第三聲','ˋ':'第四聲','˙':'輕聲'};
export function lessonFor(character,reading){
 const {symbols:parts,tone}=splitZhuyin(reading);
 if(!parts.length||parts.some(s=>!symbols.includes(s)))return {character,reading,steps:[],unsupported:true};
 const initial=parts.length>1&&initials.includes(parts[0])?parts[0]:'';
 const rime=initial?parts.slice(1):parts;
 const steps=[];
 const add=(title,label,sounds,note)=>steps.push({title,label,sounds,note});
 if(rime.length>1){
  add('先認識後面的注音',rime.join(' ＋ '),rime,'先分別念，再把聲音連起來。');
  add('拼成結合韻',rime.join(''),[rime.join('')],'連成一個音，不要分成兩個字。');
 }else if(initial){add('先念韻母',rime.join(''),[rime.join('')],'先聽後面的音。');}
 const base=rime.join('');
 // The neutral tone belongs to the complete syllable; do not fabricate a stressed neutral rime.
 if(tone&&tone!=='˙')add(`帶上${toneNames[tone]}`,base+tone,[base+tone],'聲調和音一起念，不把調號念成另一個音節。');
 if(initial){add('加上前面的聲母',`${initial} ＋ ${base}${tone==='˙'?'':tone}`, [initial,base+(tone==='˙'?'':tone)],'聲母念短一點，接上後面的音。');}
 add(tone==='˙'?'合起來，輕輕念':'合起來念',`${reading} → ${character}`,[reading],tone==='˙'?'輕聲要短、輕，放回完整名字裡再念一次。':`${toneNames[tone]}，合成一個完整字音。`);
 return {character,reading,steps};
}

export function createTutor({root,getPokemon,beforePlay}){
 let selected=0,active=0,token=0,audio=null,timer=null,resolvePending=null,carriers=null;
 root.innerHTML=`<div class="tutor-top"><strong>一步一步，教我拼注音</strong><button type="button" class="small-button" data-action="close">收起</button></div><div class="tutor-characters" aria-label="選擇要練習的字"></div><div class="tutor-steps"></div><p class="tutor-note"></p><div class="tutor-actions"><button class="small-button" data-action="previous">← 上一步</button><button class="next" data-action="play">▶ 聽這一步</button><button class="small-button" data-action="next">下一步 →</button><button class="text-button" data-action="stop">停止播放</button></div><p class="tutor-status" role="status" aria-live="polite"></p><p class="tutor-source">單符音：教育部《國語注音符號手冊》（CC BY 4.0）。結合韻與字音：裝置合成語音，可能有誤讀，非官方錄音。<a href="https://language.moe.gov.tw/001/Upload/files/SITE_CONTENT/M0001/deploy/html_ch/index.html" target="_blank" rel="noreferrer">查看來源 ↗</a></p>`;
 const find=s=>root.querySelector(s);
 const message=t=>find('.tutor-status').textContent=t;
 function stop(){token++;clearTimeout(timer);if(audio){audio.onended=null;audio.onerror=null;audio.pause();audio=null;}window.speechSynthesis?.cancel();resolvePending?.(false);resolvePending=null;root.classList.remove('playing');}
 function render(){
  stop();const p=getPokemon();if(!p)return;
  const lesson=lessonFor(Array.from(p.name)[selected],p.zhuyin[selected]);
  find('.tutor-characters').replaceChildren(...Array.from(p.name).map((ch,i)=>{const b=document.createElement('button');b.textContent=ch;b.className='small-button'+(i===selected?' selected':'');b.setAttribute('aria-pressed',String(i===selected));b.onclick=()=>{selected=i;active=0;render();};return b;}));
  find('.tutor-steps').replaceChildren(...lesson.steps.map((s,i)=>{const b=document.createElement('button');b.className='tutor-step'+(i===active?' selected':'');const title=document.createElement('small');title.textContent=`${i+1}. ${s.title}`;const label=document.createElement('strong');label.textContent=s.label;b.append(title,label);b.setAttribute('aria-current',i===active?'step':'false');b.onclick=()=>{active=i;render();};return b;}));
  find('.tutor-note').textContent=lesson.steps[active]?.note||'這個符號或特殊名稱暫時沒有拼讀教學，請家長協助。';
  find('[data-action="previous"]').disabled=active===0;
  find('[data-action="next"]').disabled=active>=lesson.steps.length-1;
  find('[data-action="play"]').disabled=!lesson.steps.length;
  message(p.reviewed?'按「聽這一步」，聽完換你跟著念。':'這隻寶可夢的注音尚未人工校對，請家長先確認再帶孩子練習。');
 }
 async function play(){
  stop();beforePlay();const ticket=token;const p=getPokemon();const lesson=lessonFor(Array.from(p.name)[selected],p.zhuyin[selected]);const step=lesson.steps[active];if(!step)return;
  root.classList.add('playing');message('正在示範，聽完再跟著念。');
  try{
   if(!carriers){const res=await fetch('./data/lesson-speech.json');if(!res.ok)throw Error('音節資料載入失敗，請重新整理。');carriers=await res.json();}
   for(const sound of step.sounds){
    if(ticket!==token)return;
    const symbolIndex=symbols.indexOf(sound);
    const single=sound.length===1&&symbolIndex>=0;
    if(!single&&!carriers[sound])throw Error('這個帶調音暫時沒有可靠的示範對照，請家長依畫面帶讀。');
    const completed=await new Promise((resolve,reject)=>{
     resolvePending=resolve;
     const done=()=>{if(ticket!==token){resolve(false);return;}clearTimeout(timer);resolvePending=null;resolve(true);};
     const fail=()=>{if(ticket!==token){resolve(false);return;}clearTimeout(timer);resolvePending=null;reject(Error('示範音無法播放。請確認連線或裝置中文語音，再按一次重試。'));};
     timer=setTimeout(fail,15000);
     if(single){audio=new Audio(`./audio/zhuyin/F${symbolIndex+1}.WAV`);audio.onended=done;audio.onerror=fail;audio.play().catch(fail);}
     else{
      if(!window.speechSynthesis){fail();return;}
      const u=new SpeechSynthesisUtterance(carriers[sound]);u.lang='zh-TW';u.rate=.65;
      const voice=window.speechSynthesis.getVoices().find(v=>/^zh[-_]TW$/i.test(v.lang));if(voice)u.voice=voice;
      u.onend=done;u.onerror=fail;window.speechSynthesis.speak(u);
     }
    });
    if(!completed||ticket!==token)return;
   }
   if(ticket===token)message('換你念念看！可以重聽，或按下一步。');
  }catch(error){if(ticket===token){stop();message(error.message);}}
  finally{if(ticket===token)root.classList.remove('playing');}
 }
 find('[data-action="play"]').onclick=play;
 find('[data-action="stop"]').onclick=()=>{stop();message('已停止，可以重新播放。');};
 find('[data-action="close"]').onclick=()=>{stop();root.hidden=true;document.getElementById('teach').setAttribute('aria-expanded','false');};
 find('[data-action="previous"]').onclick=()=>{active--;render();};
 find('[data-action="next"]').onclick=()=>{active++;render();};
 return {stop,open(){selected=0;active=0;root.hidden=false;render();},reset(){stop();root.hidden=true;document.getElementById('teach').setAttribute('aria-expanded','false');}};
}
