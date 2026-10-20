'use strict';

// Demo fallback offers. When configured, Supabase stores offers and guest booking data.
let offers = [
  {id:1,restaurant:'Тёплый хлеб',dish:'Пакет свежей выпечки',category:'bakery',oldPrice:3300,price:990,portions:3,pickupStart:'20:00',pickup:'21:00',address:'пр. Бухар-Жырау, 42',district:'center',distance:450,photo:'assets/hero.jpg',initial:'т',description:'Круассан и 2–3 булочки, испечённые сегодня. Состав пакета зависит от того, что останется к вечеру. Содержит пшеницу, молоко и яйца; возможны следы орехов.'},
  {id:2,restaurant:'Karak House',dish:'Японские панкейки с ягодами',category:'dessert',oldPrice:2400,price:1680,portions:2,pickupStart:'20:00',pickup:'22:00',address:'Арбат, Бухар-Жырау 55/7',district:'center',distance:650,photo:'assets/pancakes.jpg',initial:'k',description:'Порция нежных панкейков с ягодами и сливочным кремом. Содержит пшеницу, яйца и молоко. Пример предложения возможного партнёра, а не действующее меню.'},
  {id:3,restaurant:'Daily Coffee',dish:'Кофе и круассан на вечер',category:'cafe',oldPrice:2800,price:1290,portions:4,pickupStart:'19:30',pickup:'21:30',address:'ул. Гоголя, 37',district:'center',distance:850,photo:'assets/coffee.jpg',initial:'d',description:'Капучино 300 мл и классический круассан. Кофе приготовят к вашему приходу. Содержит молоко, пшеницу и яйца. Фотография — пример подачи.'},
  {id:4,restaurant:'Зелёная лавка',dish:'Овощи для вкусного ужина',category:'grocery',oldPrice:3800,price:1490,portions:5,pickupStart:'19:00',pickup:'21:00',address:'ул. Университетская, 18',district:'southeast',distance:1800,photo:'assets/vegetables.jpg',initial:'з',description:'Набор сезонных овощей и зелени, примерно 1,5 кг. Точный состав уточняется при получении. Фотография показывает вариант блюда, которое можно приготовить из набора.'},
  {id:5,restaurant:'Пекарня у дома',dish:'Хлеб и булочки к завтраку',category:'bakery',oldPrice:2500,price:890,portions:2,pickupStart:'20:30',pickup:'22:00',address:'ул. Ермекова, 28',district:'mikhailovka',distance:2300,photo:'assets/bakery.jpg',initial:'п',description:'Хлеб сегодняшней выпечки и две булочки. Набор-сюрприз: пекарь выберет из оставшегося ассортимента. Содержит пшеницу; возможны молоко, яйца и кунжут.'},
  {id:6,restaurant:'Mamma Mia',dish:'Пицца на уютный вечер',category:'meal',oldPrice:4000,price:1990,portions:3,pickupStart:'21:00',pickup:'22:30',address:'ул. Муканова, 12',district:'southeast',distance:2600,photo:'assets/pizza.jpg',initial:'m',description:'Пицца с томатами и сыром, 30 см. Уточните начинку в заведении перед получением. Содержит пшеницу и молочные продукты.'},
  {id:7,restaurant:'Кофейня «Утро»',dish:'Последний кофе с собой',category:'cafe',oldPrice:1400,price:700,portions:0,pickupStart:'19:00',pickup:'20:00',address:'ул. Лободы, 8',district:'center',distance:1100,photo:'assets/coffee.jpg',initial:'у',description:'Капучино на обычном молоке, 300 мл. Содержит молоко. Это предложение уже разобрали.'}
];

// Dynamic pricing: the price slides from its starting value (at pickupStart) down to the floor (at the end of pickup).
// `price` becomes a getter, so every place that reads offer.price (and a booking that spreads the offer) gets the live value.
const toMinutes = t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
const clock = {minutes:(()=>{const d=new Date(),m=d.getHours()*60+d.getMinutes();return m>=1080&&m<=1380?Math.round(m/15)*15:1200;})()};
const clockLabel = ()=>String(Math.floor(clock.minutes/60)).padStart(2,'0')+':'+String(clock.minutes%60).padStart(2,'0');
// The whole page "sets" with the evening: colours are interpolated between day, sunset and night stops.
const skyStops=[
  {top:'#d62400',sun:'#ffb33d'},
  {top:'#9c1b00',sun:'#ff7a2e'},
  {top:'#1b0f0d',sun:'#f4efe0'}
];
const hexToRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,k)=>'#'+hexToRgb(a).map((v,i)=>Math.round(v+(hexToRgb(b)[i]-v)*k).toString(16).padStart(2,'0')).join('');
const lum=h=>{const [r,g,b]=hexToRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const inkFor=bg=>contrast(bg,'#141414')>=contrast(bg,'#ffffff')?'#141414':'#ffffff';
function applySky(){
  const p=(clock.minutes-1080)/300,seg=p<.55?0:1,k=seg?Math.min(1,(p-.55)/.3):p/.55,a=skyStops[seg],b=skyStops[seg+1],root=document.documentElement.style;
  const top=mix(a.top,b.top,k);
  root.setProperty('--top',top);root.setProperty('--sun',mix(a.sun,b.sun,k));root.setProperty('--hero-ink',inkFor(top));
  root.setProperty('--sun-x',(12+p*76)+'%');root.setProperty('--sun-y',(p*100-4)+'px');
}
function priceAt(o,minutes){
  if(!o.floor)return o.startPrice;
  const start=toMinutes(o.pickupStart),end=toMinutes(o.pickup);
  const progress=Math.min(1,Math.max(0,(minutes-start)/(end-start)));
  return Math.max(o.floor,Math.round((o.startPrice-(o.startPrice-o.floor)*progress)/10)*10);
}
function livePrice(o){return priceAt(o,clock.minutes);}
function makeLive(o,floor){
  o.startPrice=o.price;o.floor=floor||0;
  Object.defineProperty(o,'price',{get(){return livePrice(this);},enumerable:true,configurable:true});
}
const floors = {1:500,2:1100,3:700,4:800,5:450,6:1000};
function prepareOffers(list){
  offers=list.map(raw=>{
    const o={...raw};
    const floor=Number.isFinite(Number(o.floor))?Number(o.floor):(floors[o.id]||0);
    o.price=Number(o.price);o.oldPrice=Number(o.oldPrice);o.portions=Number(o.portions);
    makeLive(o,floor);
    return o;
  });
}
prepareOffers(offers);
const categories = {bakery:'Выпечка',cafe:'Кафе',grocery:'Продукты',dessert:'Десерты',meal:'Готовая еда'};
const districts = {all:'Весь город',center:'Центр',southeast:'Юго-Восток',mikhailovka:'Михайловка'};
const state = {view:'discover',category:'all',district:'all',query:'',sort:'recommended',maxPrice:null,available:true,bigDiscount:false,favorites:new Set(),bookings:[]};
try {const stored=JSON.parse(localStorage.getItem('qalmasyn-favorites')||'[]');if(Array.isArray(stored))state.favorites=new Set(stored.filter(Number.isInteger));} catch {}
try {const stored=JSON.parse(localStorage.getItem('qalmasyn-bookings')||'[]');if(Array.isArray(stored))state.bookings=stored;} catch {}
function saveBookings(){try{localStorage.setItem('qalmasyn-bookings',JSON.stringify(state.bookings));}catch{}}
// ---- Map: 2GIS MapGL when a key is set in config.js, otherwise a plain schematic with the same pins ----
const CENTER = [73.0860, 49.8062];
// Approximate demo coordinates [lng, lat] for the example venues.
const COORDS = {1:[73.1000,49.8045],2:[73.1040,49.8050],3:[73.0950,49.8030],4:[73.1250,49.7880],5:[73.1450,49.8200],6:[73.1100,49.7950],7:[73.0880,49.8070]};
state.mode = 'list';
state.user = {coords:CENTER,real:false};
offers.forEach(o=>{o.coords=COORDS[o.id]||null;});
function haversine(a,b){
  const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b[1]-a[1]),dLng=rad(b[0]-a[0]);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLng/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(h)));
}
function updateDistances(){offers.forEach(o=>{if(o.coords)o.distance=haversine(state.user.coords,o.coords);});}
updateDistances();
let gl=null,glMarkers=[],glUser=null,glStatus='idle',selectedPin=null,fitNext=true;
const mapKey=()=>(window.QALMASYN_CONFIG&&window.QALMASYN_CONFIG.twoGisKey)||'';
const venues=()=>filteredOffers().filter(o=>o.coords);
const nearCity=()=>haversine(CENTER,state.user.coords)<30000;
const pinHtml=o=>`<button type="button" class="map-pin${o.portions?'':' sold'}" data-pin="${o.id}">${money(o.price)}</button>`;
function loadMapgl(){return new Promise((resolve,reject)=>{if(window.mapgl)return resolve();const s=document.createElement('script');s.src='https://mapgl.2gis.com/api/js/v1';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
function setMode(mode){state.mode=mode==='map'?'map':'list';if(state.mode==='map')fitNext=true;refreshMap();}
function refreshMap(){
  const map=state.mode==='map';
  $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));
  $('#map-panel').hidden=!map;$('#offers').hidden=map;
  if(!map)return;
  $('#map-legend').textContent='Расстояния по прямой от '+(state.user.real?'вашего местоположения':'центра города')+'.';
  if(mapKey())drawGl();else drawSchema();
  if(selectedPin&&!venues().some(o=>o.id===selectedPin))hidePopup();else if(selectedPin)showPopup(selectedPin);
  icons();
}
function drawSchema(){
  $('#map-container').hidden=true;const box=$('#map-schema');box.hidden=false;
  const list=venues(),pts=list.map(o=>o.coords);if(nearCity())pts.push(state.user.coords);
  if(!pts.length){box.innerHTML='<p class="schema-note">Нет предложений с адресом на карте по этим фильтрам.</p>';return;}
  let w=Math.min(...pts.map(p=>p[0])),e=Math.max(...pts.map(p=>p[0])),s=Math.min(...pts.map(p=>p[1])),n=Math.max(...pts.map(p=>p[1]));
  const dx=Math.max(e-w,.01)*.15,dy=Math.max(n-s,.01)*.15;w-=dx;e+=dx;s-=dy;n+=dy;
  const pos=c=>`left:${((c[0]-w)/(e-w)*100).toFixed(1)}%;top:${((n-c[1])/(n-s)*100).toFixed(1)}%`;
  box.innerHTML='<p class="schema-note">Схема без карты: ключ 2ГИС не подключён.</p>'
    +list.map(o=>`<div class="schema-pin" style="${pos(o.coords)}">${pinHtml(o)}</div>`).join('')
    +(nearCity()?`<div class="schema-pin" style="${pos(state.user.coords)}"><span class="user-dot"></span><span class="user-label">Вы</span></div>`:'');
}
async function drawGl(){
  $('#map-schema').hidden=true;$('#map-container').hidden=false;
  if(glStatus==='loading')return;
  try{
    if(!gl){glStatus='loading';await loadMapgl();gl=new mapgl.Map('map-container',{center:CENTER,zoom:12,key:mapKey()});glStatus='ready';}
  }catch{glStatus='error';gl=null;$('#map-container').hidden=true;drawSchema();toast('Карта 2ГИС не загрузилась. Показываем схему.');return;}
  glMarkers.forEach(m=>m.destroy());
  glMarkers=venues().map(o=>new mapgl.HtmlMarker(gl,{coordinates:o.coords,html:pinHtml(o)}));
  if(glUser){glUser.destroy();glUser=null;}
  if(nearCity())glUser=new mapgl.HtmlMarker(gl,{coordinates:state.user.coords,html:'<span class="user-dot"></span>'});
  if(fitNext){fitNext=false;const pts=venues().map(o=>o.coords);if(nearCity())pts.push(state.user.coords);
    if(pts.length){try{gl.fitBounds({southWest:[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1]))],northEast:[Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]},{padding:{top:80,bottom:140,left:60,right:60}});}catch{gl.setCenter(CENTER);}}}
}
function routeUrl(o){
  if(!o.coords)return 'https://2gis.kz/karaganda/search/'+encodeURIComponent(o.address);
  const from=state.user.real?state.user.coords[0].toFixed(6)+','+state.user.coords[1].toFixed(6):'';
  return 'https://2gis.kz/karaganda/directions/points/'+from+'%7C'+o.coords[0]+','+o.coords[1];
}
const routeLink=o=>`<a class="route-link" href="${routeUrl(o)}" target="_blank" rel="noopener">${icon('route')}Как добраться</a>`;
function showPopup(id){
  const o=offers.find(x=>x.id===id);if(!o)return;selectedPin=id;
  $('#map-popup').innerHTML=`<button class="icon-button popup-close" type="button" data-popup-close aria-label="Закрыть карточку">${icon('x')}</button>${o.photo?`<img src="${escapeHTML(o.photo)}" alt="" width="84" height="84">`:''}<div class="popup-body"><strong>${escapeHTML(o.restaurant)}</strong><span>${escapeHTML(o.dish)}</span><span class="popup-meta">${money(o.price)} · ${distance(o.distance)} по прямой</span><span class="popup-actions"><button class="primary" type="button" data-offer="${o.id}">Открыть</button>${routeLink(o)}</span></div>`;
  $('#map-popup').hidden=false;icons();
}
function hidePopup(){selectedPin=null;$('#map-popup').hidden=true;}
function locate(){
  if(!navigator.geolocation){toast('Браузер не умеет определять местоположение.');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    state.user={coords:[pos.coords.longitude,pos.coords.latitude],real:true};updateDistances();fitNext=true;
    if($('#location-dialog').open)$('#location-dialog').close();
    renderOffers();toast('Местоположение определено. Расстояния по прямой.');
  },()=>toast('Не удалось определить местоположение. Считаем от центра города.'),{timeout:8000});
}
const watches = new Map(), notified = new Set(), alerts = [];
try{for(const [id,target] of JSON.parse(localStorage.getItem('qalmasyn-watch')||'[]'))if(offers.some(o=>o.id===id)&&Number.isFinite(target))watches.set(id,target);}catch{}
function saveWatches(){try{localStorage.setItem('qalmasyn-watch',JSON.stringify([...watches]));}catch{}}
let hold=null,holdTimer=null;
function stopHold(){clearInterval(holdTimer);holdTimer=null;hold=null;}
const $ = selector=>document.querySelector(selector);
const $$ = selector=>[...document.querySelectorAll(selector)];
const escapeHTML = value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value=>new Intl.NumberFormat('ru-KZ').format(value)+' ₸';
const discount = offer=>Math.round((1-offer.price/offer.oldPrice)*100);
const icon = name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const distance = value=>value==null?'Караганда':value<1000?value+' м':(value/1000).toLocaleString('ru-RU',{maximumFractionDigits:1})+' км';
const time = offer=>`${String(offer.pickupStart).slice(0,5)}–${String(offer.pickup).slice(0,5)}`;
const normalize = value=>String(value).toLocaleLowerCase('ru-RU').replace(/ё/g,'е');
function icons(){if(window.lucide)window.lucide.createIcons({attrs:{'aria-hidden':'true',focusable:'false'}});}
let toastTimeout;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{$('#toast').hidden=true;},3000);}
function setError(id,message){const el=$(id);el.textContent=message;el.hidden=!message;}
function badgeCounts(){for(const [selector,value] of [['.favorite-count',state.favorites.size],['.booking-count',state.bookings.length]])$$(selector).forEach(el=>{el.textContent=value;el.hidden=!value;});}

function checkWatches(){
  for(const [id,target] of watches){const o=offers.find(x=>x.id===id);if(!o)continue;
    if(o.portions>0&&o.price<=target){if(!notified.has(id)){notified.add(id);const text='«'+o.dish+'» подешевел до '+money(o.price);alerts.push({time:clockLabel(),text});toast(text);renderWatches();}}else notified.delete(id);}
}
function renderWatches(){
  const rows=[...watches].map(([id,target])=>{const o=offers.find(x=>x.id===id);return o?`<article class="watch-row"><div><strong>${escapeHTML(o.dish)}</strong><span>Сейчас ${money(o.price)}, порог ${money(target)}</span></div><button class="text-button" type="button" data-unwatch="${id}">Перестать следить</button></article>`:'';}).join('');
  $('#watch-list').innerHTML=rows||'<p class="demo-inline">Пока ничего не отслеживаешь. Открой предложение и укажи цену.</p>';
  $('#alert-list').innerHTML=[...alerts].reverse().map(a=>`<p class="alert-row">${a.time} · ${escapeHTML(a.text)}</p>`).join('');
}
function helpBlock(offer){
  return offer.floor?`<details class="help"><summary>Как работает умная цена?</summary><p>Чем ближе конец окна выдачи, тем ниже цена: она снижается каждые 15 минут от стартовой до минимальной. Цена, которую ты видишь при брони, сохраняется на 5 минут. Но порции могут закончиться раньше.</p></details>`:'';
}
function similarBlock(offer){
  if(offer.portions)return '';
  const rest=offers.filter(o=>o.id!==offer.id&&o.portions>0).sort((a,b)=>(b.category===offer.category)-(a.category===offer.category)).slice(0,3);
  if(!rest.length)return '';
  return `<div class="similar"><strong>Похожие предложения</strong>${rest.map(o=>`<button class="similar-item" type="button" data-offer="${o.id}"><span>${escapeHTML(o.restaurant)}<br><small>${escapeHTML(o.dish)}</small></span><strong>${money(o.price)}</strong></button>`).join('')}</div>`;
}
const hhmm = m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
function chartSvg(o){
  const W=320,H=70,x0=1080,x1=1380,px=m=>((m-x0)/(x1-x0)*W).toFixed(1);
  const lo=o.floor||o.startPrice,hi=o.startPrice,py=p=>(hi===lo?30:10+(hi-p)/(hi-lo)*34).toFixed(1);
  const a=toMinutes(o.pickupStart),b=toMinutes(o.pickup);
  let d='';
  for(let m=x0;m<x1;m+=15){const y=py(priceAt(o,m));d+=(m===x0?'M':'L')+px(m)+' '+y+' L'+px(m+15)+' '+y+' ';}
  const ticks=[1140,1200,1260,1320].map(m=>`<text class="ch-tick" x="${px(m)}" y="${H-4}" text-anchor="middle">${m/60}</text>`).join('');
  const now=Math.min(x1,Math.max(x0,clock.minutes));
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="График цены вечера"><rect class="ch-band" x="${px(a)}" y="2" width="${(px(b)-px(a)).toFixed(1)}" height="${H-20}" rx="4"/><path class="ch-line" d="${d}"/><line class="ch-now" x1="${px(now)}" x2="${px(now)}" y1="2" y2="${H-16}"/><circle class="ch-dot" cx="${px(now)}" cy="${py(o.price)}" r="4.5"/>${ticks}</svg>`;
}
function nextDrop(o){
  if(!o.floor||!o.portions)return '';
  const start=toMinutes(o.pickupStart);
  if(clock.minutes<start)return 'С '+o.pickupStart+' цена начнёт падать';
  if(o.price<=o.floor)return 'Минимальная цена';
  const next=Math.min(1380,(Math.floor(clock.minutes/15)+1)*15),p=priceAt(o,next);
  return p<o.price?'Дальше '+hhmm(next)+': '+money(p):'Минимальная цена';
}
function card(offer){
  const saved=state.favorites.has(offer.id),urgent=offer.portions>0&&offer.portions<=2,drop=nextDrop(offer);
  return `<article class="offer-card${offer.portions?'':' sold-out'}">
    <button class="card-main" type="button" data-offer="${offer.id}" aria-haspopup="dialog" aria-label="${escapeHTML(offer.restaurant+' — '+offer.dish+', '+money(offer.price))}">
      <span class="row-info">${offer.photo?`<img class="row-thumb" src="${escapeHTML(offer.photo)}" alt="" width="72" height="72" loading="lazy">`:`<span class="row-thumb row-thumb-empty">${icon('utensils')}</span>`}<span class="row-text"><span class="merchant-row"><strong class="merchant-name">${escapeHTML(offer.restaurant)}</strong><span class="distance">${icon('navigation')}${distance(offer.distance)}</span></span><span class="dish-name">${escapeHTML(offer.dish)}</span><span class="pickup-line">${icon('clock-3')}Забрать сегодня <strong>${time(offer)}</strong></span></span></span>
      <span class="row-chart">${chartSvg(offer)}${watches.has(offer.id)?`<span class="drop-line watch-line">${icon('bell')}Слежу: до ${money(watches.get(offer.id))}</span>`:''}</span>
      <span class="row-price"><strong class="card-price">${money(offer.price)}</strong><span class="row-old"><del class="old-price">${money(offer.oldPrice)}</del><span class="discount-badge">−${discount(offer)}%</span></span>${drop?`<span class="drop-line">${icon('trending-down')}${drop}</span>`:''}<span class="stock-text${urgent?' urgent':''}">${offer.portions?'Осталось '+offer.portions:'Всё разобрали'}</span></span>
    </button><button class="favorite-button" type="button" data-favorite="${offer.id}" aria-pressed="${saved}" aria-label="${saved?'Убрать из избранного':'В избранное'}: ${escapeHTML(offer.restaurant)}">${icon('heart')}</button></article>`;
}
function filteredOffers(){
  const query=normalize(state.query.trim());
  const result=offers.filter(o=>(state.category==='all'||o.category===state.category)&&(state.district==='all'||o.district===state.district)&&(!state.available||o.portions>0)&&(!state.maxPrice||o.price<=state.maxPrice)&&(!state.bigDiscount||discount(o)>=50)&&(!query||normalize(o.restaurant+' '+o.dish+' '+categories[o.category]).includes(query)));
  if(state.sort==='near')result.sort((a,b)=>(a.distance??Infinity)-(b.distance??Infinity));
  if(state.sort==='price')result.sort((a,b)=>a.price-b.price);
  if(state.sort==='discount')result.sort((a,b)=>discount(b)-discount(a));
  return result;
}
function renderOffers(){
  const result=filteredOffers();$('#offers').innerHTML=result.map(card).join('');$('#offer-count').textContent=result.length;$('#search-empty').hidden=!!result.length;
  const saved=offers.filter(o=>state.favorites.has(o.id));$('#favorites-grid').innerHTML=saved.map(card).join('');$('#favorites-empty').hidden=!!saved.length;
  $$('.category').forEach(btn=>{const active=btn.dataset.category===state.category;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active);});
  $$('.district-label').forEach(el=>el.textContent=districts[state.district]);
  const count=Number(!!state.maxPrice)+Number(state.bigDiscount)+Number(!state.available)+Number(state.district!=='all');$('#active-filter-count').textContent=count;$('#active-filter-count').hidden=!count;
  renderWatches();refreshMap();badgeCounts();renderImpact();icons();
}
function renderImpact(){
  const best=Math.max(0,...offers.filter(o=>o.portions>0).map(discount));$('#hero-pct').textContent='−'+best+'%';
  const saved=128+state.bookings.length,co2=Math.round(saved*2.5);
  $('#impact-portions').textContent=saved;$('#impact-co2').textContent=co2;
  const sales=[2,5,9,6],max=Math.max(...sales);
  $('#demand-chart').innerHTML=['19:00','20:00','21:00','22:00'].map((h,i)=>`<div class="bar-col"><span class="bar-value">${sales[i]}</span><span class="bar" style="height:${Math.round(sales[i]/max*100)}%"></span><span class="bar-label">${h}</span></div>`).join('');
}
function showView(view,moveFocus=true){
  if(!['discover','favorites','bookings','owner'].includes(view))view='discover';
  state.view=view;
  $$('dialog[open]').forEach(el=>el.close());
  $$('.view').forEach(el=>el.hidden=el.id!==view+'-view');
  $$('nav [data-view],.business-link').forEach(el=>{const active=el.dataset.view===view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  try{history.replaceState(null,'','#'+view);}catch{}
  window.scrollTo({top:0,behavior:'instant'});
  if(moveFocus){const heading=$('#'+view+'-view h1');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  document.title='Qalmasyn — '+({discover:'пусть вкусное не пропадает',favorites:'избранное',bookings:'мои брони',owner:'для заведений'}[view]);
}
function toggleFavorite(id,trigger){
  const saved=state.favorites.has(id);if(saved)state.favorites.delete(id);else state.favorites.add(id);
  try{localStorage.setItem('qalmasyn-favorites',JSON.stringify([...state.favorites]));}catch{}
  const container=trigger.closest('.view').id;renderOffers();
  const next=$(`#${container} [data-favorite="${id}"]`)||$(`#${container} [data-favorite]`)||$(`#${container} .empty-state:not([hidden]) .primary`);if(next)next.focus({preventScroll:true});
  toast(saved?'Убрали из избранного':'Сохранили вкусную находку');
}

const offerDialog=$('#offer-dialog');let selectedOffer=null;let dialogTrigger=null;let dialogOriginView='discover';
function openOffer(id,trigger){
  const offer=offers.find(o=>o.id===id);if(!offer)return;selectedOffer=offer;dialogTrigger=trigger;dialogOriginView=state.view;
  $('#dialog-content').innerHTML=`${offer.photo?`<img class="dialog-photo" src="${escapeHTML(offer.photo)}" alt="${escapeHTML(offer.dish)}">`:`<div class="dialog-photo-fallback">${icon('utensils')}</div>`}<div class="dialog-body"><p class="dialog-merchant">${icon('store')}${escapeHTML(offer.restaurant)} <span class="demo-badge">Пример</span></p><h2 id="dialog-title" tabindex="-1">${escapeHTML(offer.dish)}</h2><div class="dialog-price-row"><strong>${money(offer.price)}</strong><del>${money(offer.oldPrice)}</del><span class="discount-badge">−${discount(offer)}%</span></div>${helpBlock(offer)}<div class="detail-list"><div class="detail-item">${icon('clock-3')}<span><strong>Сегодня, ${time(offer)}</strong><small>Забери в этот промежуток времени</small></span></div><div class="detail-item">${icon('map-pin')}<span><strong>${escapeHTML(offer.address)}</strong><small>Караганда · ${districts[offer.district]}${offer.distance!=null?' · '+distance(offer.distance)+' по прямой':''}</small>${routeLink(offer)}</span></div></div><p class="detail-description"><strong>Что тебя ждёт</strong>${escapeHTML(offer.description)}</p>${similarBlock(offer)}${offer.floor&&offer.portions&&offer.price>offer.floor?`<form class="watch-form" id="watch-form"><label class="field">Сообщить, когда дешевле, ₸<input id="watch-target" type="number" min="${offer.floor}" max="${offer.price}" step="10" required value="${watches.get(offer.id)??Math.max(offer.floor,Math.round(offer.price*.8/10)*10)}"></label><button class="text-button" type="submit">Следить за ценой</button>${watches.has(offer.id)?`<button class="text-button" type="button" data-unwatch="${offer.id}">Перестать следить</button>`:''}</form>`:''}<button class="primary wide" id="start-booking" ${offer.portions?'':'disabled'}>${offer.portions?'Забронировать за '+money(offer.price):'Всё разобрали'} ${icon('arrow-right')}</button>${offer.portions?'<p class="hold-note">Цена фиксируется на 5 минут после нажатия «Забронировать».</p>':''}<p class="dialog-demo">${icon('info')}Конкурсный прототип. Бронь сохраняется в этом браузере, а при подключённом Supabase передаётся на сервер.</p></div>`;
  icons();offerDialog.showModal();offerDialog.scrollTop=0;$('#dialog-title').focus({preventScroll:true});
}
function bookingForm(){
  const offer=selectedOffer;if(!offer||!offer.portions)return;
  stopHold();hold={price:offer.price,until:Date.now()+300000};holdTimer=setInterval(tickHold,1000);
  $('#dialog-content').innerHTML=`<div class="dialog-body"><h2 id="dialog-title">Сохраним вкусное<br>для тебя</h2><div class="booking-summary"><strong>${escapeHTML(offer.restaurant)}</strong><br>${escapeHTML(offer.dish)} · 1 шт.<br>Сегодня, ${time(offer)}</div><form id="booking-form"><label class="field">Твоё имя<input name="guestName" id="guest-name" autocomplete="given-name" required maxlength="80" placeholder="Как к тебе обращаться?"></label><label class="field">Номер телефона<input name="phone" autocomplete="tel" type="tel" required maxlength="24" placeholder="+7 (7XX) XXX-XX-XX"></label><p class="form-hint">Оплата при получении. Для демонстрации можно указать вымышленные данные.</p><p id="booking-error" class="error" role="alert" hidden></p><p class="hold-line">${icon('lock')}Цена зафиксирована: <strong id="hold-timer">5:00</strong></p><div class="booking-total"><span>Итого · 1 шт.</span><strong id="hold-total">${money(hold.price)}</strong></div><button class="primary wide" type="submit">Подтвердить тестовую бронь ${icon('check')}</button><p class="dialog-demo">${icon('shield-check')}Имя, телефон и бронь сохраняются в этом браузере и не исчезают после обновления. Если подключён Supabase, они также передаются на сервер.</p></form></div>`;
  icons();offerDialog.scrollTop=0;$('#guest-name').focus({preventScroll:true});
}
let bookingPending=false;
async function confirmBooking(form){
  if(bookingPending)return;
  const offer=selectedOffer;
  if(!offer||offer.portions<1){setError('#booking-error','Эту порцию уже разобрали. Выбери другое предложение.');return;}
  const name=form.elements.guestName.value.trim(),phone=form.elements.phone.value.trim();
  if(!name){setError('#booking-error','Укажи имя.');return;}
  if(!/^[+\d\s()-]+$/.test(phone)||!/^\d{10,15}$/.test(phone.replace(/\D/g,''))){setError('#booking-error','Укажи номер с кодом страны: +7 700 000 00 00.');return;}
  let code;do{code='Q-'+Math.random().toString(36).slice(2,7).toUpperCase();}while(state.bookings.some(b=>b.code===code));
  const booking={...offer,price:hold?hold.price:offer.price,code,name,phone};
  const finalize=()=>{offer.portions--;state.bookings.push(booking);saveBookings();renderOffers();renderBookings();
    $('#dialog-content').innerHTML=`<div class="dialog-body success-body"><span class="success-icon">${icon('check')}</span><span class="demo-badge">Бронь подтверждена</span><h2 id="dialog-title" tabindex="-1">Вкусный вечер<br>почти в руках!</h2><p>${escapeHTML(booking.restaurant)}<br>Сегодня, ${time(booking)}</p><strong class="reservation-code">${booking.code}</strong><p>Код для получения · ${money(booking.price)}<br>${escapeHTML(booking.address)}</p><a class="primary wide" target="_blank" rel="noopener" href="${routeUrl(booking)}">${icon('route')}Открыть маршрут</a><button class="text-button wide" data-view="bookings">Мои брони</button><p class="dialog-demo">Демо-проект: оплата при получении.</p></div>`;
    icons();offerDialog.scrollTop=0;$('#dialog-title').focus({preventScroll:true});selectedOffer=null;
  };
  if(!window.QalmasynDB?.enabled){stopHold();finalize();return;}
  bookingPending=true;
  const submit=form.querySelector('button[type="submit"]');if(submit){submit.disabled=true;submit.textContent='Сохраняем бронь…';}
  try{const remote=await window.QalmasynDB.createBooking(booking);if(remote?.code)booking.code=remote.code;stopHold();finalize();}
  catch{setError('#booking-error','Не удалось подтвердить бронь. Проверь интернет и попробуй ещё раз.');if(submit){submit.disabled=false;submit.textContent='Подтвердить тестовую бронь';icons();}}
  finally{bookingPending=false;}
}
function tickHold(){
  if(!hold||!selectedOffer||!offerDialog.open){stopHold();return;}
  let left=hold.until-Date.now();
  if(left<=0){hold={price:selectedOffer.price,until:Date.now()+300000};left=300000;toast('Время фиксации вышло. Цена обновлена.');const total=$('#hold-total');if(total)total.textContent=money(hold.price);}
  const t=$('#hold-timer');if(t)t.textContent=Math.floor(left/60000)+':'+String(Math.floor(left/1000)%60).padStart(2,'0');
}
function renderBookings(){
  $('#bookings-empty').hidden=!!state.bookings.length;
  $('#bookings-list').innerHTML=[...state.bookings].reverse().map(b=>`<article class="booking-card">${b.photo?`<img src="${escapeHTML(b.photo)}" alt="${escapeHTML(b.dish)}">`:''}<div class="booking-info"><h2>${escapeHTML(b.restaurant)}</h2><p>${escapeHTML(b.dish)} · ${money(b.price)}</p><p class="pickup-line">${icon('clock-3')}Сегодня, ${time(b)}</p><p>${escapeHTML(b.address)}</p><a class="route-link" href="${routeUrl(b)}" target="_blank" rel="noopener">${icon('route')}Построить маршрут в 2GIS</a></div><div class="booking-ticket"><span>Код брони</span><strong>${b.code}</strong><button class="text-button" data-cancel="${b.code}">Отменить бронь</button></div></article>`).join('');
  $('#owner-booking-count').textContent='· '+state.bookings.length;
  $('#owner-bookings').innerHTML=state.bookings.length?[...state.bookings].reverse().map(b=>`<article class="owner-booking"><h3>${b.code} · ${escapeHTML(b.restaurant)}</h3><p>${escapeHTML(b.dish)} · ${money(b.price)} · 1 шт.</p><p>${escapeHTML(b.name)} · ${escapeHTML(b.phone)}</p><p>Самовывоз ${time(b)} · оплата при получении</p></article>`).join(''):'<p class="demo-inline">Здесь появятся тестовые брони гостей.</p>';
  badgeCounts();icons();
}
async function cancelBooking(code){const index=state.bookings.findIndex(b=>b.code===code);if(index<0)return;const button=$(`[data-cancel="${code}"]`);if(button){button.disabled=true;button.textContent='Отменяем…';}try{if(window.QalmasynDB?.enabled)await window.QalmasynDB.cancelBooking(code);const offer=offers.find(o=>o.id===state.bookings[index].id);if(offer)offer.portions++;state.bookings.splice(index,1);saveBookings();renderOffers();renderBookings();toast('Бронь отменена. Находка снова в витрине.');const focus=$('#bookings-list [data-cancel]')||$('#bookings-empty .primary');if(focus)focus.focus({preventScroll:true});}catch{if(button){button.disabled=false;button.textContent='Отменить бронь';}toast('Не удалось отменить бронь. Попробуй ещё раз.');}}
offerDialog.addEventListener('close',()=>{stopHold();selectedOffer=null;if(state.view===dialogOriginView){const target=dialogTrigger?.isConnected?dialogTrigger:dialogTrigger?.dataset.offer?$(`#${state.view}-view [data-offer="${dialogTrigger.dataset.offer}"]`):null;if(target)target.focus({preventScroll:true});}});

function resetFilters(){state.maxPrice=null;state.available=true;state.bigDiscount=false;$('#filter-form').reset();}
function resetSearch(){resetFilters();state.query='';state.category='all';state.district='all';$('#search').value='';renderOffers();}
document.addEventListener('click',event=>{
  const button=event.target.closest('button,a');if(!button)return;
  if(button.dataset.lang){applyLang(button.dataset.lang);return;}
  if(button.dataset.mode){setMode(button.dataset.mode);return;}
  if(button.dataset.pin){showPopup(Number(button.dataset.pin));return;}
  if(button.hasAttribute('data-popup-close')){hidePopup();return;}
  if(button.hasAttribute('data-locate')){locate();return;}
  if(button.dataset.unwatch){const id=Number(button.dataset.unwatch);watches.delete(id);notified.delete(id);saveWatches();if(offerDialog.open&&selectedOffer&&selectedOffer.id===id)openOffer(id,button);renderOffers();toast('Слежение отключено');return;}
  if(button.dataset.view){event.preventDefault();showView(button.dataset.view);return;}
  if(button.hasAttribute('data-close')){button.closest('dialog').close();return;}
  if(button.dataset.offer){openOffer(Number(button.dataset.offer),button);return;}
  if(button.dataset.favorite){toggleFavorite(Number(button.dataset.favorite),button);return;}
  if(button.dataset.cancel){cancelBooking(button.dataset.cancel);return;}
  if(button.dataset.category){state.category=button.dataset.category;renderOffers();return;}
  if(button.hasAttribute('data-location')){$$('.district-options button').forEach(el=>el.classList.toggle('selected',el.dataset.district===state.district));$('#location-dialog').showModal();return;}
  if(button.dataset.district){state.district=button.dataset.district;$('#location-dialog').close();renderOffers();if(state.view!=='discover')showView('discover');return;}
  if(button.id==='filter-button'){const f=$('#filter-form').elements;f.maxPrice.value=state.maxPrice??'';f.available.checked=state.available;f.bigDiscount.checked=state.bigDiscount;$('#filter-dialog').showModal();return;}
  if(button.id==='clear-filters'){resetFilters();renderOffers();$('#filter-dialog').close();return;}
  if(button.id==='reset-search'){resetSearch();$('#search').focus();return;}
  if(button.id==='start-booking')bookingForm();
});
$('#search').addEventListener('input',event=>{state.query=event.target.value;renderOffers();});
$('#map-container').addEventListener('click',event=>{const pin=event.target.closest('[data-pin]');if(pin)showPopup(Number(pin.dataset.pin));},true);
$('#clock').value=clock.minutes;$('#clock-label').textContent=clockLabel();applySky();
$('#clock').addEventListener('input',event=>{clock.minutes=Number(event.target.value);$('#clock-label').textContent=clockLabel();applySky();renderOffers();checkWatches();});
$('#sort').addEventListener('change',event=>{state.sort=event.target.value;renderOffers();});
$('#filter-form').addEventListener('submit',event=>{event.preventDefault();const f=event.target.elements;state.maxPrice=f.maxPrice.value?Number(f.maxPrice.value):null;state.available=f.available.checked;state.bigDiscount=f.bigDiscount.checked;renderOffers();$('#filter-dialog').close();});
document.addEventListener('submit',event=>{
  if(event.target.id==='booking-form'){event.preventDefault();confirmBooking(event.target);}
  if(event.target.id==='watch-form'){event.preventDefault();const offer=selectedOffer,target=Number($('#watch-target').value);if(!offer||!Number.isFinite(target)||target<offer.floor||target>offer.price)return;watches.set(offer.id,target);saveWatches();notified.delete(offer.id);renderOffers();openOffer(offer.id,dialogTrigger);toast('Следим за ценой. Сообщим, когда она опустится до '+money(target));}
});

let uploadedPhoto='',photoLoading=false,photoRequest=0;
$('#photo-input').addEventListener('change',function(){
  const request=++photoRequest,file=this.files[0],preview=$('#photo-preview');uploadedPhoto='';photoLoading=false;preview.hidden=true;preview.removeAttribute('src');$('#publish').disabled=false;setError('#offer-error','');
  if(!file)return;
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024){this.value='';setError('#offer-error','Выбери JPG, PNG или WebP размером до 5 МБ.');return;}
  photoLoading=true;$('#publish').disabled=true;
  const reader=new FileReader();
  function fail(){if(request!==photoRequest)return;photoLoading=false;$('#publish').disabled=false;$('#photo-input').value='';setError('#offer-error','Не удалось открыть фото. Выбери другой файл.');}
  reader.onload=()=>{if(request!==photoRequest)return;const check=new Image();check.onload=()=>{if(request!==photoRequest)return;uploadedPhoto=reader.result;preview.src=uploadedPhoto;preview.hidden=false;photoLoading=false;$('#publish').disabled=false;};check.onerror=fail;check.src=reader.result;};reader.onerror=fail;reader.readAsDataURL(file);
});
$('#offer-form').addEventListener('submit',function(event){
  event.preventDefault();if(photoLoading)return;const f=this.elements;
  const restaurant=f.restaurant.value.trim(),dish=f.dish.value.trim(),description=f.description.value.trim(),address=f.address.value.trim(),price=Number(f.price.value),oldPrice=Number(f.oldPrice.value),portions=Number(f.portions.value);
  if(!restaurant||!dish||!description||!address){setError('#offer-error','Заполни название заведения, предложение, состав и адрес.');return;}
  if(![price,oldPrice,portions].every(n=>Number.isSafeInteger(n)&&n>0)||price>=oldPrice||oldPrice>1000000||portions>999){setError('#offer-error','Укажи целые положительные цены и количество. Цена со скидкой должна быть ниже обычной.');return;}
  const floor=f.dynamic.checked?Number(f.floor.value):0;
  if(f.dynamic.checked&&(!Number.isSafeInteger(floor)||floor<1||floor>=price)){setError('#offer-error','Минимальная цена должна быть целым числом ниже стартовой цены со скидкой.');return;}
  if(f.dynamic.checked&&toMinutes(f.pickup.value)<=toMinutes(f.pickupStart.value)){setError('#offer-error','Для динамической цены время «до» должно быть позже времени «с».');return;}
  const created={id:Math.max(...offers.map(o=>o.id))+1,restaurant,dish,description,address,price,oldPrice,portions,category:f.category.value,district:f.district.value,pickupStart:f.pickupStart.value,pickup:f.pickup.value,photo:uploadedPhoto,distance:null,initial:restaurant.slice(0,1).toLocaleLowerCase()};
  makeLive(created,floor);offers.unshift(created);
  if(window.QalmasynDB?.enabled){
    window.QalmasynDB.createOffer({...created,floor}).then(remote=>{
      if(remote){const index=offers.indexOf(created);if(index>=0){const next={...remote};makeLive(next,Number(remote.floor)||0);next.coords=null;offers[index]=next;renderOffers();}}
    }).catch(()=>toast('Не удалось сохранить предложение на сервере. Оно доступно только до обновления страницы.'));
  }
  // Clear previous discovery constraints so a newly published offer is visible.
  resetSearch();state.sort='recommended';$('#sort').value='recommended';renderOffers();setError('#offer-error','');
  $('#publish-notice').textContent='«'+dish+'» добавлено. Открой «Найти вкусное», чтобы посмотреть карточку.';$('#publish-notice').hidden=false;
  f.dish.value='';f.description.value='';f.oldPrice.value='';f.price.value='';f.portions.value='3';$('#photo-input').value='';uploadedPhoto='';photoRequest++;$('#photo-preview').hidden=true;
  toast('Предложение появилось в демо-витрине');
});
$('#filter-button').setAttribute('aria-label','Фильтры предложений');
async function start(){
  if(window.QalmasynDB?.enabled){
    try{const remoteOffers=await window.QalmasynDB.loadOffers();if(Array.isArray(remoteOffers)){prepareOffers(remoteOffers);offers.forEach(o=>o.coords=COORDS[o.id]||null);updateDistances();}}
    catch{toast('Не удалось загрузить базу. Показаны демонстрационные предложения.');}
  }
  renderOffers();renderBookings();showView(location.hash.slice(1)||'discover',false);icons();
}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
start();
