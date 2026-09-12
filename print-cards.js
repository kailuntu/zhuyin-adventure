import {buildCards,annotatedCardName} from './flashcards.js';
const pages=document.querySelector('#pages'),status=document.querySelector('#status'),printButton=document.querySelector('#print');
document.querySelector('#retry').onclick=()=>location.reload();
printButton.onclick=()=>window.print();
function element(tag,className,text){const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;}
function loadImage(img,id){
 return new Promise(resolve=>{
  let fallback=false,finished=false;
  const timer=setTimeout(()=>finish(false),25000);
  function finish(ok){if(finished)return;finished=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(ok);}
  img.onload=()=>finish(true);
  img.onerror=()=>{if(!fallback){fallback=true;img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;}else finish(false);};
  img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
 });
}
async function prepare(){
 try{
  const response=await fetch('./data/pokemon.json');if(!response.ok)throw Error('data');
  const cards=buildCards(await response.json()),pending=[];let sheet;
  cards.forEach((c,i)=>{
   if(i%6===0){sheet=element('section','sheet');sheet.setAttribute('aria-label',`第 ${Math.floor(i/6)+1} 頁`);pages.append(sheet);}
   const card=element('article','print-card');card.setAttribute('aria-label',`${c.symbol}，${c.pokemon.name}`);
   const top=element('div','card-topline');top.append(element('span','symbol',c.symbol),element('span','group',`${c.group} · ${i+1}/37`));
   const img=element('img','');img.alt=c.pokemon.name;img.width=140;img.height=140;pending.push(loadImage(img,c.pokemon.id));
   card.append(top,img,annotatedCardName(c),element('p','explanation',`找找粗體的 ${c.symbol}，一起念念看！`),element('p','credit','注音探險 · 圖片／名稱：PokeAPI'));sheet.append(card);
  });
  const loaded=await Promise.all(pending);await document.fonts.ready;
  if(loaded.some(ok=>!ok))throw Error('images');
  document.body.classList.add('ready');printButton.disabled=false;status.textContent='37 張字卡已準備好！可以列印，或另存為 PDF。';
 }catch{status.textContent='部分資料或圖片未能載入，請確認網路後重新載入，再匯出完整字卡。';document.querySelector('#retry').hidden=false;}
}
prepare();
