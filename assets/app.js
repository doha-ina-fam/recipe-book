'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalizeSearch(v){return String(v??'').normalize('NFKC').toLowerCase().replace(/달걀/g,'계란').replace(/\s+/g,'');}
// Ingredient labels contain section names and preparation notes, not extra ingredients.
function ingredientSearchParts(raw){
 let s=String(raw??'').normalize('NFKC').replace(/\([^)]*\)/g,'').replace(/^[^:：]+[:：]\s*/, '').trim();
 if(/(?:용|데침|삶는|볶음용|밑간용|추가 간용)/.test(s)){
  s=s.replace(/^.*?용\s+/, '').replace(/^면 삶는\s+/, '').replace(/^밥 짓는\s+/, '');
 }
 return s.split(/·|,|또는|등\s*채소/).map(normalizeSearch).filter(Boolean);
}
const ingredientSearchRules={
 감자:{exclude:['감자전분','감자수제비']},
 마늘:{exclude:['마늘쫑','마늘햄']},
 파:{include:['파','대파','쪽파','실파','다진파','파채'],exact:true},
 무:{include:['무','무채','무편썰기'],exact:true},
 배:{include:['배'],exact:true},
 김:{include:['김','구운김','김밥김','조미김','김가루','불닭김가루'],exact:true},
 굴:{include:['굴','생굴'],exact:true},
 새우:{exclude:['새우젓','새우만두']},
 참치:{exclude:['참치액','참치액젓']},
 멸치:{exclude:['액젓','다시다','육수']},
 소고기:{exclude:['다시다']},
 닭:{exclude:['육수','불닭']},닭고기:{include:['닭','닭고기','닭날개','닭다리살','닭볶음탕용닭','손질한닭다리살','통닭다리장각'],exact:true},
 버터:{exclude:['땅콩버터']},
 사과:{exclude:['식초','잼']},
 토마토:{exclude:['소스','주스','케첩']},
 쌀:{include:['쌀'],exact:true},
 김치:{exclude:['국물']},
 만두:{exclude:['만두피']},
 라면:{exclude:['스프']},
 우유:{include:['우유'],exact:true},
 고추:{exclude:['고추장','고추기름','고추냉이']},
 깨:{include:['깨','참깨','통깨','볶은깨','간깨','깻가루','깨소금'],exact:true},
 소금:{exclude:['깨소금']},
 물:{include:['물','생수','찬물','뜨거운물','얼음물'],exact:true},
 밥:{include:['밥','따뜻한밥','쌀밥','흰쌀밥','귀리밥','즉석밥','찬밥','현미밥'],exact:true},
 면:{exclude:['면수','스프','육수']},
 전분:{},소스:{},육수:{},액젓:{}
};
function ingredientPartMatches(part,term){
 const rule=ingredientSearchRules[term];
 if(!rule)return part.includes(term);
 if(rule.exclude?.some(word=>part.includes(word)))return false;
 if(rule.exact){
  // Strip quantities embedded in old ingredient labels (e.g. 대파 반단).
  const base=part.replace(/(?:\d.*|반단|반쪽|한쪽|한주먹|한스푼|큰거.*|흰부분|파란부분|반개)$/,'');
  return rule.include.includes(base);
 }
 return part.includes(term);
}
function matchesRecipe(r,v){
 const parts=r.ingredients.flatMap(i=>ingredientSearchParts(i.name));
 const title=normalizeSearch(r.name);
 return String(v).trim().split(/[\s,，]+/).filter(Boolean).every(raw=>{
  const term=normalizeSearch(raw);
  // Basic ingredient searches use actual ingredients; dish names remain partial searches.
  if(Object.hasOwn(ingredientSearchRules,term))return title===term||parts.some(p=>ingredientPartMatches(p,term));
  return title.includes(term)||parts.some(p=>ingredientPartMatches(p,term));
 });
}
const categoryNames=['국·탕','면','밥·덮밥','반찬·기타','고기·해산물','찜·조림','브런치·샐러드','소스','즐겨찾기'];
const categoryIcons=['🍲','🍜','🍚','🥞','🍗','🥘','🥗','🫙','♥'];
let recipes=[],filter=null,query='',currentRecipe=null,selected=new Set(),serving=1,completed=new Set(),previousFocus=null;
function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function saveStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('저장 공간을 사용할 수 없어요.');return false;}}
const favorites=()=>readStore('recipe-favs',[]);
let cart=readStore('recipe-cart-v1',[]);if(!Array.isArray(cart))cart=[];
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),2600);}
function toggleFav(id){const f=favorites();saveStore('recipe-favs',f.includes(id)?f.filter(x=>x!==id):[...f,id]);renderCards();if(currentRecipe)$('detailfav').textContent=favorites().includes(currentRecipe.id)?'♥':'♡';}
function renderFilters(){const f=favorites();$('filters').innerHTML=categoryNames.map((c,i)=>`<button data-filter="${esc(c)}"><span>${categoryIcons[i]}</span><strong>${c}</strong><small>${recipes.filter(r=>c==='즐겨찾기'?f.includes(r.id):(r.categories||[r.category]).includes(c)).length}개</small></button>`).join('');$('filters').classList.toggle('hidden',!!filter||!!query);$('categoryback').classList.toggle('hidden',!filter&&!query);$('listtitle').textContent=query?'검색 결과':filter||'카테고리';$('clear-favorites').classList.toggle('hidden',filter!=='즐겨찾기'||!!query);$('clear-favorites').disabled=!f.length;}
function renderCards(){renderFilters();if(!filter&&!query){$('cards').innerHTML='';$('count').textContent=recipes.length+'개 레시피';return;}const f=favorites();const list=recipes.filter(r=>query?matchesRecipe(r,query):(filter==='즐겨찾기'?f.includes(r.id):(r.categories||[r.category]).includes(filter)));$('count').textContent=list.length+'개';$('cards').innerHTML=list.length?list.map(r=>`<article class="recipe-row"><button class="recipe-open" data-id="${esc(r.id)}">${esc(r.name)}</button><button class="fav" data-fav="${esc(r.id)}" aria-label="${esc(r.name)} 좋아요" aria-pressed="${f.includes(r.id)}">${f.includes(r.id)?'♥':'♡'}</button></article>`).join(''):'<p class="empty">해당하는 레시피가 없어요.</p>';}
function routeHash(){return location.hash.slice(1);}
function navigate(hash){if(routeHash()===hash){renderRoute();return;}history.pushState({recipeApp:true},'',location.pathname+location.search+(hash?'#'+hash:''));renderRoute();window.scrollTo(0,0);}
function parseRoute(){try{const h=routeHash();if(h==='cart')return{page:'cart'};if(h.startsWith('category='))return{page:'home',filter:decodeURIComponent(h.slice(9))};if(h.startsWith('search='))return{page:'home',query:decodeURIComponent(h.slice(7))};if(h.startsWith('recipe='))return{page:'detail',id:decodeURIComponent(h.slice(7))};if(h)return{page:'detail',id:decodeURIComponent(h)};}catch{}return{page:'home'};}
function renderRoute(){closeDialog(false);const route=parseRoute();['home','detail','cart'].forEach(id=>$(id).classList.toggle('hidden',id!==route.page));$('back').classList.toggle('hidden',route.page==='home'&&!route.filter&&!route.query);$('home-tab').classList.toggle('active',route.page!=='cart');$('cart-tab').classList.toggle('active',route.page==='cart');$('home-tab').setAttribute('aria-current',route.page!=='cart'?'page':'false');$('cart-tab').setAttribute('aria-current',route.page==='cart'?'page':'false');currentRecipe=null;if(route.page==='cart')renderCart();else if(route.page==='detail')showRecipe(route.id);else{filter=route.filter||null;query=route.query||'';$('search').value=query;renderCards();}updateCartCount();}
function fmt(n){return Number.isInteger(n)?String(n):String(Number(n.toFixed(2)));}
function amountOf(i){if(i.amount==null)return '';const n=i.amount*(currentRecipe.scaleIngredients===false?1:serving/(currentRecipe.servings||1));return n===1/3?'1/3':fmt(n);}
function quantityOf(i){
if(i.amountText)return i.amountText;
if(i.amount!=null)return amountOf(i)+(i.unit||'');
const text=String(i.unit||'').trim();
const main=text.replace(/\([^)]*\)/g,'').trim();
if(!main||/미기재|불명확|불일치|확인 필요|추정/.test(main)||/^(비율|선택$|필요하면$|곁들임$|먹을 때$|사워도우 또는 바게트$)/.test(main))return '';
return text;
}
function showRecipe(id){const r=recipes.find(x=>x.id===id);if(!r){navigate('');return;}currentRecipe=r;selected=new Set();completed=new Set();serving=r.servings||1;$('detail').innerHTML=`<div class="detailart">${esc(r.emoji||'🍽️')}</div><div class="detailtitle"><h2>${esc(r.name)}</h2><button class="fav" id="detailfav" aria-label="좋아요">${favorites().includes(id)?'♥':'♡'}</button></div>${r.youtube?`<a class="yt titlevideo" href="${esc(r.youtube)}" target="_blank" rel="noopener noreferrer">▶ 원본 영상 보기</a>`:''}${r.sourceUrl&&!r.sourceUrl.includes('youtu')?`<a class="source-link" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">레시피 출처 보기 ↗</a>`:''}<div class="section"><div class="servingbar"><h3>재료</h3><button class="primary small" id="add-cart" disabled>장바구니 넣기</button></div>${r.scaleIngredients===false?'':`<div class="stepper"><button id="minus" aria-label="인분 줄이기">−</button><strong id="serving"></strong><button id="plus" aria-label="인분 늘리기">+</button></div>`}<div id="ingredients"></div></div><div class="section"><h3>조리 순서</h3><div id="steps"></div></div>${r.tips?`<div class="section"><h3>🍯 요리 팁</h3><div class="tip">${esc(r.tips).replace(/\n/g,'<br>')}</div></div>`:''}${r.sourceNote?`<details class="source-note"><summary>출처·분량 확인 안내</summary><p>${esc(r.sourceNote)}</p></details>`:''}`;
paintIngredients();if($('minus')){$('minus').onclick=()=>{serving=Math.max(1,serving-1);paintIngredients();};$('plus').onclick=()=>{serving=Math.min(10,serving+1);paintIngredients();};}$('ingredients').onchange=e=>{const input=e.target.closest('[data-ingredient]');if(!input)return;const n=Number(input.dataset.ingredient);input.checked?selected.add(n):selected.delete(n);$('add-cart').disabled=!selected.size;};$('add-cart').onclick=openQuantityDialog;$('detailfav').onclick=()=>toggleFav(id);$('steps').innerHTML=r.steps.length?r.steps.map((s,i)=>`<button class="step" data-step="${i}" aria-pressed="false"><span class="stepnum">${i+1}</span><span>${esc(s)}</span></button>`).join(''):'<p class="meta">조리 순서는 미기재입니다. 출처를 참고해 주세요.</p>';$('steps').onclick=e=>{const b=e.target.closest('[data-step]');if(!b)return;const i=Number(b.dataset.step);completed.has(i)?completed.delete(i):completed.add(i);b.classList.toggle('done',completed.has(i));b.setAttribute('aria-pressed',String(completed.has(i)));b.querySelector('.stepnum').textContent=completed.has(i)?'✓':i+1;};}
function paintIngredients(){const r=currentRecipe;if($('serving')){$('serving').textContent=serving+'인분';$('minus').disabled=serving===1;$('plus').disabled=serving===10;}$('ingredients').innerHTML=r.ingredients.map((i,n)=>`<label class="ingredient"><input type="checkbox" data-ingredient="${n}" ${selected.has(n)?'checked':''}><span>${esc(i.name)}</span><strong>${esc(quantityOf(i)||i.unit||'분량 미기재')}</strong></label>`).join('');$('add-cart').disabled=!selected.size;}
function openQuantityDialog(){if(!selected.size)return;previousFocus=document.activeElement;$('quantity-fields').innerHTML=[...selected].map(n=>{const i=currentRecipe.ingredients[n];return`<label class="quantity-row"><span>${esc(i.name)}</span><input data-index="${n}" type="text" maxlength="80" value="${esc(quantityOf(i))}" placeholder="수량 입력 (예: 1개)" aria-label="${esc(i.name)} 수량"></label>`;}).join('');$('quantity-dialog').showModal();$('quantity-title').focus({preventScroll:true});history.pushState({recipeApp:true,quantityDialog:true},'',location.href);}
function closeDialog(goBack=true){if(!$('quantity-dialog').open)return;$('quantity-dialog').close();previousFocus?.focus();if(goBack&&history.state?.quantityDialog)history.back();}
$('quantity-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog();});$('cancel-quantity').onclick=()=>closeDialog();
$('quantity-form').onsubmit=e=>{e.preventDefault();const added=[...$('quantity-fields').querySelectorAll('input')].map(input=>({id:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),name:currentRecipe.ingredients[Number(input.dataset.index)].name,quantity:input.value.trim(),recipe:currentRecipe.name}));const next=[...cart,...added];if(!saveStore('recipe-cart-v1',next))return;cart=next;closeDialog();selected.clear();paintIngredients();updateCartCount();toast(added.length+'개 재료를 장바구니에 넣었어요.');};
function updateCartCount(){$('cart-count').textContent=cart.length?String(cart.length):'';}
function renderCart(){$('cart-items').innerHTML=cart.length?cart.map(item=>`<div class="cart-row"><div><strong>${esc(item.name)}</strong><small>${esc(item.recipe||'')}</small></div><input type="text" maxlength="80" data-cart-quantity="${esc(item.id)}" value="${esc(item.quantity)}" placeholder="수량 미입력" aria-label="${esc(item.name)} 수량"><button class="remove-item" data-remove="${esc(item.id)}" aria-label="${esc(item.name)} 삭제">×</button></div>`).join(''):'<p class="empty">장바구니가 비어 있어요.<br>레시피에서 필요한 재료를 골라 담아보세요.</p>';$('export-cart').disabled=!cart.length;$('clear-cart').disabled=!cart.length;$('cart-total').textContent=cart.length+'개 재료';$('export-result').classList.add('hidden');}
$('cart-items').onchange=e=>{if(!e.target.dataset.cartQuantity)return;const next=cart.map(i=>i.id===e.target.dataset.cartQuantity?{...i,quantity:e.target.value.trim()}:i);if(saveStore('recipe-cart-v1',next)){cart=next;if(!$('export-result').classList.contains('hidden'))renderShopping();}};$('cart-items').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;const next=cart.filter(i=>i.id!==b.dataset.remove);if(saveStore('recipe-cart-v1',next)){cart=next;renderCart();updateCartCount();}};
$('clear-cart').onclick=()=>{if(!cart.length)return;if(!saveStore('recipe-cart-v1',[]))return;cart=[];renderCart();updateCartCount();$('kurly-table').innerHTML='';toast('장바구니를 전부 비웠어요.');};
// Keep source entries editable; aggregate only the shopping table.
function shoppingName(raw){
 let name=String(raw||'').normalize('NFKC').trim();
 // A colon is a section prefix only when followed by whitespace (not a ratio).
 name=name.replace(/^[^:：]+[:：]\s+/, '').replace(/^(?:소스|양념|드레싱|반죽|고명|육수|밑간)용\s+/, '');
 name=name.replace(/\s*\((?:소스용|양념용|선택|선택사항)\)\s*/g,' ').trim();
 return name.replace(/다진\s*마늘/g,'다진 마늘').replace(/간\s+마늘/g,'다진 마늘');
}
function shoppingAmount(raw){
 const original=String(raw||'').trim();
 const text=original.normalize('NFKC').replace(/\s*\((?:원문\s*)?[^)]*\)/g,'').trim();
 const m=text.match(/^(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)\s*(큰술|작은술|스푼|숟가락|티스푼|kg|mg|ml|mL|g|L|l|T|t|개|대|팩|봉|줌|컵|마리|쪽|장|모|알|근)?$/);
 if(!m)return {text:original||'수량 미기재'};
 const parts=m[1].split('/').map(Number), value=parts.length===2?parts[0]/parts[1]:parts[0];
 if(!Number.isFinite(value))return {text:original};
 const unit=m[2]||'';
 const units={T:['큰술',1],t:['작은술',1],티스푼:['작은술',1],kg:['g',1000],mL:['ml',1],L:['ml',1000],l:['ml',1000]};
 const [canonical,factor]=units[unit]||[unit,1];
 return {value:value*factor,unit:canonical};
}
function shoppingRows(items){
 const groups=new Map();
 for(const item of items){
  const name=shoppingName(item.name),optional=/\(선택(?:사항)?\)/.test(item.name),key=name.replace(/\s+/g,'');
  if(!groups.has(key))groups.set(key,{name,optional,amounts:new Map(),notes:[]});
  const group=groups.get(key);group.optional=group.optional&&optional;
  const amount=shoppingAmount(item.quantity);
  if(amount.text)group.notes.push(amount.text);
  else group.amounts.set(amount.unit,(group.amounts.get(amount.unit)||0)+amount.value);
 }
 return [...groups.values()].map(g=>({name:g.name,quantity:[...[...g.amounts].map(([u,n])=>fmt(n)+(u||' (단위 미기재)')),...g.notes].join(' + '),optional:g.optional}));
}
function renderShopping(){
 $('kurly-table').innerHTML=`<table class="kurly-table"><thead><tr><th scope="col">필요한 재료</th><th scope="col">검색 링크</th></tr></thead><tbody>${shoppingRows(cart).map(i=>`<tr><td><strong>${esc(i.name)}</strong><span>${esc(i.quantity)}${i.optional?' · 선택':''}</span></td><td><a href="https://shopping.naver.com/kurlynmart/search?q=${encodeURIComponent(i.name)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(i.name)} 컬리N마트 검색">검색 ↗</a></td></tr>`).join('')}</tbody></table>`;
}
$('export-cart').onclick=()=>{renderShopping();$('export-result').classList.remove('hidden');};
$('clear-favorites').onclick=()=>{if(!saveStore('recipe-favs',[]))return;renderCards();toast('모든 즐겨찾기를 해제했어요.');};
$('cards').onclick=e=>{const fav=e.target.closest('[data-fav]');if(fav){toggleFav(fav.dataset.fav);return;}const b=e.target.closest('[data-id]');if(b)navigate('recipe='+encodeURIComponent(b.dataset.id));};$('filters').onclick=e=>{const b=e.target.closest('[data-filter]');if(b)navigate('category='+encodeURIComponent(b.dataset.filter));};$('categoryback').onclick=()=>navigate('');$('search').oninput=e=>{const q=e.target.value.trim();const h=q?'search='+encodeURIComponent(q):filter?'category='+encodeURIComponent(filter):'';if(!routeHash())history.pushState({recipeApp:true},'',location.pathname+location.search+'#'+h);else history.replaceState({recipeApp:true},'',location.pathname+location.search+(h?'#'+h:''));query=q;renderCards();};$('home-tab').onclick=()=>navigate('');$('cart-tab').onclick=()=>navigate('cart');$('back').onclick=()=>history.back();window.addEventListener('popstate',()=>{if(!history.state?.quantityDialog)renderRoute();});window.addEventListener('hashchange',()=>{if(!history.state?.quantityDialog)renderRoute();});window.addEventListener('storage',e=>{if(e.key==='recipe-cart-v1'){cart=readStore('recipe-cart-v1',[]);updateCartCount();if(parseRoute().page==='cart')renderCart();}});
const initialHash=routeHash();history.replaceState({recipeApp:true},'',location.pathname+location.search);if(initialHash)history.pushState({recipeApp:true},'',location.pathname+location.search+'#'+initialHash);
fetch('data/recipes.json?v=89',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{recipes=data;renderRoute();}).catch(()=>{$('cards').innerHTML='<p class="empty">레시피를 불러오지 못했어요. 연결을 확인하고 다시 열어주세요.</p>';});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installbar').classList.remove('hidden');});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('installbar').classList.add('hidden');}else alert('Safari의 공유 메뉴에서 홈 화면에 추가를 선택하세요.');};$('installclose').onclick=()=>$('installbar').classList.add('hidden');if(/iPad|iPhone|iPod/.test(navigator.userAgent)&&!navigator.standalone){$('installbar').classList.remove('hidden');$('install').textContent='iPhone 홈 화면에 추가 안내';}
