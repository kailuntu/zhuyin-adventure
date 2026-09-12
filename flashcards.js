import {symbols} from './lesson.js';
// Explicit associations; each selected character and reading can be reviewed independently.
export const associations=[
 ['ㄅ','波波','波','ㄅㄛ'],['ㄆ','皮卡丘','皮','ㄆㄧˊ'],['ㄇ','喵喵','喵','ㄇㄧㄠ'],['ㄈ','風速狗','風','ㄈㄥ'],
 ['ㄉ','地鼠','地','ㄉㄧˋ'],['ㄊ','土狼犬','土','ㄊㄨˇ'],['ㄋ','尼多蘭','尼','ㄋㄧˊ'],['ㄌ','拉普拉斯','拉','ㄌㄚ'],
 ['ㄍ','哥達鴨','哥','ㄍㄜ'],['ㄎ','卡比獸','卡','ㄎㄚˇ'],['ㄏ','猴怪','猴','ㄏㄡˊ'],['ㄐ','傑尼龜','傑','ㄐㄧㄝˊ'],
 ['ㄑ','球球海獅','球','ㄑㄧㄡˊ'],['ㄒ','小火龍','小','ㄒㄧㄠˇ'],['ㄓ','未知圖騰','知','ㄓ'],['ㄔ','超音蝠','超','ㄔㄠ'],
 ['ㄕ','水箭龜','水','ㄕㄨㄟˇ'],['ㄖ','向日種子','日','ㄖˋ'],['ㄗ','走路草','走','ㄗㄡˇ'],['ㄘ','刺甲貝','刺','ㄘˋ'],
 ['ㄙ','三地鼠','三','ㄙㄢ'],['ㄚ','阿勃梭魯','阿','ㄚ'],['ㄛ','波克比','波','ㄅㄛ'],['ㄜ','摩魯蛾','蛾','ㄜˊ'],
 ['ㄝ','巴大蝶','蝶','ㄉㄧㄝˊ'],['ㄞ','呆呆獸','呆','ㄉㄞ'],['ㄟ','雷丘','雷','ㄌㄟˊ'],['ㄠ','毛球','毛','ㄇㄠˊ'],
 ['ㄡ','口呆花','口','ㄎㄡˇ'],['ㄢ','穿山鼠','山','ㄕㄢ'],['ㄣ','噴火龍','噴','ㄆㄣ'],['ㄤ','胖丁','胖','ㄆㄤˋ'],
 ['ㄥ','大針蜂','蜂','ㄈㄥ'],['ㄦ','捲捲耳','耳','ㄦˇ'],['ㄧ','伊布','伊','ㄧ'],['ㄨ','烏波','烏','ㄨ'],['ㄩ','鯉魚王','魚','ㄩˊ']
];
export function buildCards(data){
 return associations.map(([symbol,name,character,reading],i)=>{
  const pokemon=data.find(p=>p.name===name);
  if(!pokemon||!name.includes(character)||!reading.includes(symbol)||symbols[i]!==symbol)throw Error(`Invalid flashcard ${symbol}`);
  return {symbol,pokemon,character,reading,audioId:i+1,group:i<21?'聲母':i<34?'韻母':'介音'};
 });
}
export function createFlashcards({root,beforeAudio,onPractice}){
 let cards=[],position=0,concealed=false,audio=null,playId=0,imageFailed=false;
 root.innerHTML=`<div class="dex-heading"><div><span class="eyebrow">MY BOPOMOFO FRIENDS</span><h2>一個注音，一位寶可夢朋友</h2><p class="muted">先聽符號的聲音，再看看它藏在哪個名字裡。</p></div><span class="pill">37 張聯想字卡</span></div><div class="flash-layout"><aside class="card symbol-picker"><h3>今天想認識哪個注音？</h3><div class="symbol-groups"></div><p class="muted">ㄧ、ㄨ、ㄩ也可以單獨成音，或和其他韻符組成結合韻。</p></aside><section class="card flash-focus"><div class="card-top"><span class="pill" id="flash-group"></span><span id="flash-position"></span></div><div class="flash-main"><div class="flash-sound"><span id="flash-symbol" aria-label="目前的注音符號"></span><button class="next" id="flash-listen">♫ 聽注音符號</button></div><div class="flash-friend"><img id="flash-image" width="230" height="230" alt=""><p id="flash-image-error" hidden>圖片暫時無法載入，仍可聽音與看名字。</p><span id="flash-question" hidden>?</span><div id="flash-name"></div></div></div><div class="flash-explanation" id="flash-explanation"><p id="flash-sentence"></p><div id="flash-reading" aria-label="代表字的完整注音"></div><p class="muted" id="flash-reminder"></p></div><p id="flash-recall" class="flash-recall" hidden>想一想：哪位寶可夢的名字裡有這個注音？</p><div class="flash-actions"><button class="small-button" id="flash-name-audio">♫ 聽寶可夢名字</button><button class="small-button" id="flash-hide" aria-pressed="false">遮住圖片想一想</button><button class="next" id="flash-practice">練習這隻寶可夢 →</button></div><p id="flash-status" class="status" role="status" aria-live="polite"></p><div class="flash-pagination"><button class="small-button" id="flash-prev">← 上一張</button><button class="text-button" id="flash-random">隨機抽一張</button><button class="small-button" id="flash-next">下一張 →</button></div></section></div><p class="muted">符號示範音：教育部《國語注音符號手冊》（CC BY 4.0）；名稱朗讀：裝置語音。代表配對為本站教學設計，寶可夢名稱與圖片來自 PokeAPI。看字卡不會自動解鎖答題收藏。</p>`;
 const $=id=>root.querySelector(`#${id}`);
 function stop(){playId++;if(audio){audio.onended=null;audio.onerror=null;audio.pause();audio=null;}window.speechSynthesis?.cancel();}
 function reveal(value){
  concealed=value;$('flash-image').hidden=value||imageFailed;$('flash-name').hidden=value;$('flash-explanation').hidden=value;
  $('flash-question').hidden=!value;$('flash-recall').hidden=!value;$('flash-name-audio').disabled=value;
  $('flash-hide').textContent=value?'看看代表寶可夢':'遮住圖片想一想';$('flash-hide').setAttribute('aria-pressed',String(value));
  $('flash-image-error').hidden=value||!imageFailed;
 }
 function render(){
  stop();if(!cards.length)return;const c=cards[position];
  $('flash-symbol').textContent=c.symbol;$('flash-group').textContent=c.group;$('flash-position').textContent=`${position+1} / 37`;
  root.querySelectorAll('[data-symbol]').forEach(b=>{const current=b.dataset.symbol===c.symbol;b.classList.toggle('selected',current);b.setAttribute('aria-pressed',String(current));});
  const img=$('flash-image');img.alt=c.pokemon.name;let fallback=false;imageFailed=false;
  img.onload=()=>{imageFailed=false;img.hidden=concealed;$('flash-image-error').hidden=true;};
  img.onerror=()=>{if(!fallback){fallback=true;img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${c.pokemon.id}.png`;}else{imageFailed=true;img.hidden=true;$('flash-image-error').hidden=concealed;}};
  img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${c.pokemon.id}.png`;
  $('flash-name').replaceChildren(...Array.from(c.pokemon.name).map(ch=>{const el=document.createElement(ch===c.character?'mark':'span');el.textContent=ch;return el;}));
  $('flash-sentence').textContent=`「${c.pokemon.name}」的「${c.character}」，注音裡有 ${c.symbol}。`;
  $('flash-reading').replaceChildren(...Array.from(c.reading).map(symbol=>{const el=document.createElement(symbol===c.symbol?'mark':'span');el.textContent=symbol;return el;}));
  $('flash-reminder').textContent=c.reading.replace(/[ˊˇˋ˙]/gu,'')===c.symbol?'先聽這個注音符號，再留意名字裡的聲調。':`標亮的是今天的 ${c.symbol}；「${c.character}」要把其他注音和聲調一起拼起來念。`;
  reveal(concealed);$('flash-status').textContent='按「聽注音符號」，跟著念一次吧！';
 }
 $('flash-listen').onclick=()=>{
  stop();beforeAudio();const ticket=playId;if(!cards.length)return;
  audio=new Audio(`./audio/zhuyin/F${cards[position].audioId}.WAV`);$('flash-status').textContent='聽一聽這個注音的聲音…';
  audio.onended=()=>{if(ticket===playId)$('flash-status').textContent='換你念念看！也可以再聽一次。';};
  const fail=()=>{if(ticket===playId)$('flash-status').textContent='示範音暫時無法播放，請再按一次重試。';};audio.onerror=fail;audio.play().catch(fail);
 };
 $('flash-name-audio').onclick=()=>{
  stop();beforeAudio();if(!cards.length)return;if(!window.speechSynthesis){$('flash-status').textContent='此裝置無法示範名字，請家長陪你念。';return;}
  const ticket=playId;const u=new SpeechSynthesisUtterance(cards[position].pokemon.name);u.lang='zh-TW';u.rate=.7;
  const voice=window.speechSynthesis.getVoices().find(v=>/^zh[-_]TW$/i.test(v.lang));if(voice)u.voice=voice;
  u.onend=()=>{if(ticket===playId)$('flash-status').textContent='你找到名字裡的注音了嗎？';};u.onerror=()=>{if(ticket===playId)$('flash-status').textContent='名字朗讀暫時無法播放，請家長陪你念。';};window.speechSynthesis.speak(u);
 };
 $('flash-hide').onclick=()=>{stop();reveal(!concealed);$('flash-status').textContent=concealed?'聽符號，試著想起代表寶可夢。':'看看名字裡標亮的字，你想對了嗎？';};
 $('flash-prev').onclick=()=>{position=(position+36)%37;render();};
 $('flash-next').onclick=()=>{position=(position+1)%37;render();};
 $('flash-random').onclick=()=>{position=(position+1+Math.floor(Math.random()*36))%37;render();};
 $('flash-practice').onclick=()=>{if(cards.length){stop();onPractice(cards[position].pokemon);}};
 return {stop,init(data){cards=buildCards(data);const groups=root.querySelector('.symbol-groups');groups.replaceChildren();for(const group of ['聲母','韻母','介音']){const label=document.createElement('h4');label.textContent=group;const grid=document.createElement('div');grid.className='symbol-grid';cards.forEach((c,i)=>{if(c.group!==group)return;const b=document.createElement('button');b.dataset.symbol=c.symbol;b.textContent=c.symbol;b.setAttribute('aria-label',`認識注音 ${c.symbol}`);b.onclick=()=>{position=i;render();};grid.append(b);});groups.append(label,grid);}render();}};
}
