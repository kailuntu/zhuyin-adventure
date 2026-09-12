import {filterPokemon,matchSpeech,loadProgress,splitZhuyin} from './logic.js';
import {createTutor} from './lesson.js';
import {createFlashcards} from './flashcards.js';
import {createSpelling} from './spelling.js';
const $=id=>document.getElementById(id);
const englishName=document.createElement('p');englishName.id='english-name';englishName.className='english-name';englishName.lang='en';$('name').after(englishName);
const englishButton=document.createElement('button');englishButton.id='speak-english';englishButton.className='small-button';englishButton.textContent='♫ 聽英文名字';englishButton.disabled=true;englishName.after(englishButton);
const englishNote=document.createElement('p');englishNote.className='name-tip';englishNote.textContent='英文由裝置語音朗讀，非官方配音。';englishButton.after(englishNote);
englishButton.onclick=()=>current&&speak(current.englishName,'en-US');
let data=[],current=null,page=1,progress={},session=new Set(),recognition=null,listening=false,consent=false,requestId=0;
let recognitionReadings={};
const readingsReady=fetch('./data/recognition-readings.json').then(res=>{if(!res.ok)throw Error('readings');return res.json();}).then(value=>{recognitionReadings=value;return true;}).catch(()=>false);
try{progress=loadProgress(localStorage.getItem('zhuyin-progress-v1'));}catch{}
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const teachButton=document.createElement('button');teachButton.id='teach';teachButton.className='small-button teach-button';teachButton.textContent='♫ 教我注音怎麼拼';teachButton.setAttribute('aria-expanded','false');teachButton.setAttribute('aria-controls','tutor');
const tutorRoot=document.createElement('section');tutorRoot.id='tutor';tutorRoot.className='tutor';tutorRoot.hidden=true;tutorRoot.setAttribute('aria-label','注音拼讀教學');
document.querySelector('.name-tip').after(teachButton,tutorRoot);
const tutor=createTutor({root:tutorRoot,getPokemon:()=>current,beforePlay:()=>{stop();endMicTest();}});
teachButton.onclick=()=>{if(!current)return;stop();endMicTest();if(tutorRoot.hidden){tutor.open();teachButton.setAttribute('aria-expanded','true');}else tutor.reset();};
const artwork=id=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const sprite=id=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
const flashNav=document.createElement('button');flashNav.className='nav';flashNav.dataset.view='cards';flashNav.textContent='注音字卡';document.querySelector('nav').append(flashNav);
const flashRoot=document.createElement('section');flashRoot.id='cards-view';flashRoot.hidden=true;$('dex-view').after(flashRoot);
const flashcards=createFlashcards({root:flashRoot,beforeAudio:()=>{tutor.stop();stop();endMicTest();},onPractice:p=>{showView('learn');selectPokemon(p);window.scrollTo({top:0,behavior:'smooth'});}});
const answerModes=document.createElement('div');answerModes.className='answer-modes';answerModes.setAttribute('role','group');answerModes.setAttribute('aria-label','選擇答題方式');answerModes.innerHTML='<button class="small-button selected" id="mode-voice" aria-pressed="true">♫ 用麥克風念名字</button><button class="small-button" id="mode-spelling" aria-pressed="false">▦ 用點的拼注音</button>';
const spellingRoot=document.createElement('section');spellingRoot.id='spelling';spellingRoot.hidden=true;spellingRoot.setAttribute('aria-label','點選注音拼名字');document.querySelector('.instruction').before(answerModes);$('record').before(spellingRoot);
const spelling=createSpelling({root:spellingRoot,onAttempt:()=>{stop();tutor.stop();endMicTest();},onComplete:()=>unlock('spelling')});
let answerMode='voice';
function setAnswerMode(mode){
 stop();tutor.stop();endMicTest();answerMode=mode;spellingRoot.hidden=mode!=='spelling';$('record').hidden=mode!=='voice';speechHelp.hidden=true;
 for(const name of ['voice','spelling']){$(`mode-${name}`).setAttribute('aria-pressed',String(mode===name));$(`mode-${name}`).classList.toggle('selected',mode===name);}
 document.querySelector('.instruction').textContent=mode==='spelling'?'點選注音，依序拼出寶可夢的名字':'按下麥克風，念出牠的名字';
 status(mode==='spelling'?'不需要麥克風，慢慢拼也可以認識新朋友。':'準備好了就按麥克風，不用急喔。');
}
$('mode-voice').onclick=()=>setAnswerMode('voice');$('mode-spelling').onclick=()=>setAnswerMode('spelling');
function status(text,success=false){$('status').textContent=text;$('status').classList.toggle('success',success);}
function stop(){if(recognition){const previous=recognition;recognition=null;previous.abort();}listening=false;$('record').classList.remove('listening');$('record-label').textContent='換我念名字';}
let localSpeech=false;
const speechHelp=document.createElement('section');
speechHelp.id='speech-help';speechHelp.className='speech-help';speechHelp.hidden=true;
speechHelp.setAttribute('aria-label','語音連線排查');
speechHelp.innerHTML=`<strong>請家長協助檢查語音</strong><p id="speech-reason"></p><p id="speech-environment"></p><ol><li>若使用 App 內預覽，請改在獨立瀏覽器開啟同一網址。</li><li>若麥克風正常，請換另一個網路或瀏覽器重試；網頁能開啟，不代表語音服務能連線。</li></ol><div class="speech-help-actions"><button id="test-mic" class="small-button">測試麥克風（5 秒）</button><button id="check-local" class="small-button">檢查本機中文辨識</button></div><p id="mic-test-result" role="status"></p><meter id="mic-level" min="0" max="1" value="0" aria-label="麥克風音量" hidden></meter><p id="local-result" role="status"></p><p>麥克風測試只在此裝置量測音量，不錄存、不上傳，也不會讓題目通過。</p>`;
$('status').after(speechHelp);
function showSpeechHelp(error){
 speechHelp.hidden=false;
 const reasons={network:'瀏覽器無法完成語音服務連線（network）。無法單靠此訊息確認麥克風是否正常。','not-allowed':'麥克風或語音權限未獲允許。請檢查網站權限及系統麥克風設定。','audio-capture':'無法取得麥克風，請確認已連接且未被其他程式占用。','service-not-allowed':'瀏覽器未允許此語音服务；有辨識介面不代表服務可用。','language-not-supported':'目前辨識服務不支援 zh-TW。','insecure':'目前網址不是安全連線。此電腦可使用 http://localhost:5173，其他裝置需使用 HTTPS。'};
 $('speech-reason').textContent=reasons[error]||'目前環境無法啟動語音辨識，請檢查瀏覽器支援。';
 const ua=navigator.userAgent;const browser=/Edg\//.test(ua)?'Microsoft Edge':/CriOS|Chrome\//.test(ua)?'Chrome／Chromium':/Safari\//.test(ua)?'Safari':'其他瀏覽器';
 $('speech-environment').textContent=`目前：${browser} · ${window.isSecureContext?'安全環境':'非安全環境'} · ${navigator.onLine?'裝置回報已連線（不保證語音服務可達）':'裝置回報離線'}`;
}
let micTestId=0,micStream=null,micContext=null,micTimer=null,micFrame=null;
function endMicTest(){
 micTestId++;clearTimeout(micTimer);cancelAnimationFrame(micFrame);
 micStream?.getTracks().forEach(track=>track.stop());micStream=null;
 if(micContext){micContext.close().catch(()=>{});micContext=null;}
 $('test-mic').disabled=false;$('mic-level').hidden=true;
}
$('test-mic').onclick=async()=>{
 tutor.stop();
 stop();window.speechSynthesis?.cancel();endMicTest();const ticket=micTestId;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){$('mic-test-result').textContent='此環境無法測試麥克風，請使用 localhost 或 HTTPS 的獨立瀏覽器。';return;}
 $('test-mic').disabled=true;$('mic-test-result').textContent='請允許麥克風，再說幾句話；只測試音量，不傳送聲音。';
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  if(ticket!==micTestId){stream.getTracks().forEach(track=>track.stop());return;}
  micStream=stream;micContext=new AudioContext();await micContext.resume();if(ticket!==micTestId)return;
  const analyser=micContext.createAnalyser();analyser.fftSize=1024;micContext.createMediaStreamSource(stream).connect(analyser);
  const samples=new Float32Array(analyser.fftSize);let peak=0;
  $('mic-level').hidden=false;$('mic-test-result').textContent='正在測試，請說話，看看音量條有沒有變化。';
  const sample=()=>{if(ticket!==micTestId)return;analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);peak=Math.max(peak,rms);$('mic-level').value=Math.min(1,rms*8);micFrame=requestAnimationFrame(sample);};sample();
  micTimer=setTimeout(()=>{if(ticket!==micTestId)return;endMicTest();$('mic-test-result').textContent=peak>.008?'有收到音訊訊號。麥克風可輸入，但不代表辨識服務已恢復；請重試或換網路／瀏覽器。':'已取得麥克風，但音量很低。請確認未靜音、選對輸入裝置，靠近麥克風再測試。';},5000);
 }catch(error){if(ticket!==micTestId)return;endMicTest();$('mic-test-result').textContent=error.name==='NotAllowedError'?'麥克風權限被拒絕，請在網站與系統設定中允許麥克風。':error.name==='NotFoundError'?'找不到麥克風，請檢查裝置連接。':'無法完成麥克風測試，請檢查输入裝置與系統權限。';}
};
$('check-local').onclick=async()=>{
 stop();endMicTest();$('check-local').disabled=true;$('local-result').textContent='正在確認此裝置是否已安裝 zh-TW 辨識…';
 try{
  if(!Recognition||typeof Recognition.available!=='function'||!('processLocally' in new Recognition()))throw Error('unsupported');
  const available=await Recognition.available({langs:['zh-TW'],processLocally:true});
  localSpeech=available==='available';
  $('local-result').textContent=localSpeech?'已切換成裝置內中文辨識。請再按「換我念名字」；辨識聲音不會傳至遠端服務。':'裝置未提供已安裝的 zh-TW 辨識，無法立即切換為本機模式。仍需可連線的語音服務。';
 }catch{localSpeech=false;$('local-result').textContent='此瀏覽器無法檢查或提供本機中文辨識。仍需可連線的語音服務。';}
 finally{$('check-local').disabled=false;}
};
function updateProgress(){
 $('total').textContent=Object.keys(progress).length;
 $('journey-dots').replaceChildren(...Array.from({length:5},(_,i)=>{const el=document.createElement('span');el.className='journey-dot'+(i<session.size?' done':'');el.textContent=i<session.size?'★':i+1;return el;}));
 $('journey-text').textContent=session.size>=5?'今天的 5 位朋友集齊了！也可以繼續探險。':`這次已認識 ${session.size} 位朋友，一起慢慢來。`;
}
function showView(view){flashcards.stop();tutor.stop();stop();endMicTest();window.speechSynthesis?.cancel();$('learn-view').hidden=view!=='learn';$('dex-view').hidden=view!=='dex';flashRoot.hidden=view!=='cards';document.querySelectorAll('.nav').forEach(el=>el.classList.toggle('active',el.dataset.view===view));if(view==='dex')renderDex();}
function speak(text,lang='zh-TW'){
 tutor.stop();
 endMicTest();
 stop();if(!('speechSynthesis' in window)){status('這個裝置無法示範朗讀，可以請家長陪你念。');return;}
 window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=lang==='en-US'?.8:.7;const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.lang.replace('_','-').toLowerCase()===lang.toLowerCase())||(lang==='en-US'?voices.find(v=>/^en[-_]/i.test(v.lang)):null);if(voice)u.voice=voice;
 u.onerror=()=>status('示範朗讀暫時無法播放，可以請家長陪你念。');window.speechSynthesis.speak(u);
}
async function selectPokemon(p){
 spelling.reset(p,data);
 tutor.reset();
 try{sessionStorage.setItem('zhuyin-last-question',String(p.id));}catch{}
 endMicTest();speechHelp.hidden=true;
 stop();window.speechSynthesis?.cancel();current=p;const ticket=++requestId;
 englishName.textContent=p.englishName;englishButton.disabled=!p.englishName;
 $('record').disabled=!Recognition;$('speak').disabled=false;$('number').textContent=`NO. ${String(p.id).padStart(4,'0')}`;
 $('pokemon-image').classList.add('silhouette');$('pokemon-image').alt='等待現身的寶可夢黑影';$('pokemon-image').hidden=false;$('image-error').hidden=true;$('mystery').hidden=false;
 let fallback=false;$('pokemon-image').onerror=()=>{if(!fallback){fallback=true;$('pokemon-image').src=sprite(p.id);}else{$('pokemon-image').hidden=true;$('image-error').hidden=false;}};
 $('pokemon-image').onload=()=>{$('pokemon-image').hidden=false;$('image-error').hidden=true;};
 $('pokemon-image').src=artwork(p.id);
 $('encounter-title').textContent='是誰躲在這裡呢？';$('encounter-copy').textContent='用你的聲音，邀請牠出來玩！';
 $('name').replaceChildren(...Array.from(p.name).map((ch,i)=>{
  const button=document.createElement('button');button.className='character';button.setAttribute('aria-label',`${ch}，${p.zhuyin[i]}`);
  const letter=document.createElement('span');letter.textContent=ch;button.append(letter);
  if(p.zhuyin[i]!==ch){
   const {symbols,tone}=splitZhuyin(p.zhuyin[i]);
   const z=document.createElement('span');z.className='zhuyin'+(tone==='˙'?' neutral':'');z.setAttribute('aria-hidden','true');
   const column=document.createElement('span');column.className='zhuyin-symbols';
   symbols.forEach(symbol=>{const s=document.createElement('span');s.className='zhuyin-symbol';s.textContent=symbol;column.append(s);});
   z.append(column);
   if(tone){const t=document.createElement('span');t.className='zhuyin-tone';t.textContent=tone;z.append(t);}
   button.append(z);
  }
  button.onclick=()=>speak(ch);return button;
 }));
 status(answerMode==='spelling'?'依序選注音，拼出這位朋友的名字。':Recognition?'準備好了就按麥克風，不用急喔。':'此瀏覽器未提供語音辨識，可以改用點選拼注音。');
 // Cache the selected Pokémon response instead of requesting 1025 records per visit.
 try{let details;try{details=JSON.parse(sessionStorage.getItem(`poke-${p.id}`));}catch{}
  if(!details){const res=await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`,{signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error();const raw=await res.json();details={image:raw.sprites.other?.['official-artwork']?.front_default||raw.sprites.front_default};try{sessionStorage.setItem(`poke-${p.id}`,JSON.stringify(details));}catch{}}
  if(ticket===requestId&&details.image)$('pokemon-image').src=details.image;
 }catch{/* The bundled dataset and PokeAPI sprites URL remain available. */}
}
function unlock(method){
 if(!current)return;stop();$('pokemon-image').classList.remove('silhouette');$('pokemon-image').alt=current.name;$('mystery').hidden=true;
 $('encounter-title').textContent=`${current.name}，很高興認識你！`;$('encounter-copy').textContent=method==='voice'?'你念出牠的名字了，真棒！':'和家長一起完成了這次練習！';
 const rank={assisted:1,spelling:2,voice:3};if((rank[method]||0)>(rank[progress[current.id]]||0))progress[current.id]=method;
 session.add(current.id);let saved=true;try{localStorage.setItem('zhuyin-progress-v1',JSON.stringify(progress));}catch{saved=false;}
 if(method==='spelling')$('encounter-copy').textContent='你拼出完整名字的注音了，真棒！';
 status((method==='voice'?'太棒了！你念出名字了，新的朋友現身囉！':method==='spelling'?'拼對了！已記錄為「注音拼字完成」，新的朋友現身囉！':'已記錄為「家長協助」，謝謝你勇敢練習！')+(saved?'':' 此瀏覽器無法保存進度。'),true);updateProgress();
}
function startRecognition(){
 tutor.stop();
 endMicTest();
 if(!current||!Recognition)return;if(recognition){recognition.stop();return;}
 if(!window.isSecureContext){showSpeechHelp('insecure');status('請家長協助開啟安全網址再使用麥克風。');return;}
 window.speechSynthesis?.cancel();const target=current;const r=new Recognition();recognition=r;r.lang='zh-TW';r.interimResults=false;r.maxAlternatives=5;r.continuous=false;let hadResult=false;
 if(localSpeech)r.processLocally=true;
 r.onstart=()=>{if(recognition!==r)return;listening=true;$('record').classList.add('listening');$('record-label').textContent='正在聽… 點一下結束';status('慢慢念出完整名字，我在聽喔。');};
 r.onresult=event=>{if(recognition!==r||current!==target)return;hadResult=true;const transcripts=Array.from(event.results).flatMap(result=>Array.from(result).map(a=>a.transcript));const match=matchSpeech(transcripts,target,recognitionReadings);
  if(match){unlock('voice');if(match.kind==='homophone'){$('encounter-copy').textContent='名字的同音字也認得出來了！';status(`辨識文字「${match.transcript}」與「${target.name}」同音同調，已解鎖！`,true);}}
  else{status(`辨識文字是「${transcripts[0]||''}」，目前還沒對上名字。這不代表你念錯，可以再試或請家長確認。`);}
 };
 r.onerror=event=>{if(recognition!==r)return;hadResult=true;
  if(event.error==='aborted'){stop();return;}
  if(event.error==='no-speech'){status('剛剛沒有聽清楚，再按一次慢慢念就好。');}
  else{showSpeechHelp(event.error);status('語音暫時無法使用，請家長協助查看下方檢查方式。');}
  stop();
 };
 r.onend=()=>{if(recognition!==r)return;recognition=null;listening=false;$('record').classList.remove('listening');$('record-label').textContent='再念一次';if(!hadResult)status('還沒有聽到完整名字，再試一次吧。');};
 try{r.start();}catch{stop();status('麥克風無法啟動，請檢查瀏覽器權限或使用家長協助。');}
}
function renderDex(){
 const filtered=filterPokemon(data,$('search').value,+$('generation').value,$('collected-only').checked,progress),pages=Math.max(1,Math.ceil(filtered.length/24));page=Math.min(page,pages);
 $('result-count').textContent=`找到 ${filtered.length} 位朋友 · 點選卡片開始練習`;
 $('dex-grid').replaceChildren(...filtered.slice((page-1)*24,page*24).map(p=>{const b=document.createElement('button');b.className='dex-item';b.setAttribute('aria-label',`${p.name}，${progress[p.id]?'已認識':'尚未解鎖'}，開始練習`);const num=document.createElement('small');num.textContent=`NO. ${String(p.id).padStart(4,'0')}`;const img=document.createElement('img');img.src=sprite(p.id);img.alt='';img.loading='lazy';img.width=110;img.height=110;img.className=progress[p.id]?'':'locked';img.onerror=()=>{img.hidden=true;};const name=document.createElement('strong');name.textContent=p.name;const en=document.createElement('span');en.className='english-name';en.lang='en';en.textContent=p.englishName;b.append(num,img,name,en);if(progress[p.id]){const check=document.createElement('span');check.className='caught';check.textContent=progress[p.id]==='voice'?'★':'♡';b.append(check);}b.onclick=()=>{showView('learn');selectPokemon(p);window.scrollTo({top:0,behavior:'smooth'});};return b;}));
 if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='這裡還沒有朋友，試試其他條件或開始一場探險吧。';$('dex-grid').append(empty);}
 $('page-info').textContent=`${page} / ${pages}`;$('prev-page').disabled=page===1;$('next-page').disabled=page===pages;
}
document.querySelectorAll('.nav').forEach(el=>el.onclick=()=>showView(el.dataset.view));
$('speak').onclick=()=>current&&speak(current.name);
$('record').onclick=()=>{if(!consent){$('mic-dialog').showModal();return;}startRecognition();};
$('mic-cancel').onclick=()=>$('mic-dialog').close();$('mic-consent').onclick=()=>{consent=true;$('mic-dialog').close();startRecognition();};
for(const id of ['parent-open','assist'])$(id).onclick=()=>{flashcards.stop();tutor.stop();stop();endMicTest();$('parent-dialog').showModal();};
$('parent-pass').onclick=()=>{if(current){$('parent-dialog').close();showView('learn');unlock('assisted');}};
$('support-note').textContent=Recognition?'此瀏覽器有語音辨識介面，實際可用性仍取決於權限、網路及裝置服務。':'此瀏覽器沒有語音辨識介面；仍可聽示範並由家長協助完成。';
function randomQuestion(){
 if(!data.length)return;
 let previous=current?.id;
 if(!previous){try{previous=Number(sessionStorage.getItem('zhuyin-last-question'));}catch{}}
 const others=data.filter(p=>p.id!==previous);
 const unlearned=others.filter(p=>!progress[p.id]);
 const pool=unlearned.length?unlearned:others.length?others:data;
 return selectPokemon(pool[Math.floor(Math.random()*pool.length)]);
}
$('next').onclick=randomQuestion;
for(const id of ['search','generation','collected-only'])$(id).addEventListener('input',()=>{page=1;renderDex();});
$('prev-page').onclick=()=>{page--;renderDex();};$('next-page').onclick=()=>{page++;renderDex();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){flashcards.stop();tutor.stop();stop();endMicTest();window.speechSynthesis?.cancel();}});
window.addEventListener('pagehide',endMicTest);
updateProgress();
try{const response=await fetch('./data/pokemon.json');if(!response.ok)throw Error('data');data=await response.json();if(data.length!==1025)throw Error('incomplete');await readingsReady;flashcards.init(data);await randomQuestion();}catch{$('load-error').hidden=false;status('資料尚未載入，請重新整理再試一次。');}
