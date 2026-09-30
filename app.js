'use strict';

// Illustrative local data. No orders, payments or personal details leave this page.
const offers = [
  {id:1,restaurant:'Тёплый хлеб',dish:'Пакет свежей выпечки',category:'bakery',oldPrice:3300,price:990,portions:3,pickupStart:'20:00',pickup:'21:00',address:'пр. Бухар-Жырау, 42',district:'center',distance:450,photo:'assets/hero.jpg',initial:'т',description:'Круассан и 2–3 булочки, испечённые сегодня. Состав пакета зависит от того, что останется к вечеру. Содержит пшеницу, молоко и яйца; возможны следы орехов.'},
  {id:2,restaurant:'Karak House',dish:'Японские панкейки с ягодами',category:'dessert',oldPrice:2400,price:1680,portions:2,pickupStart:'20:00',pickup:'22:00',address:'Арбат, Бухар-Жырау 55/7',district:'center',distance:650,photo:'assets/pancakes.jpg',initial:'k',description:'Порция нежных панкейков с ягодами и сливочным кремом. Содержит пшеницу, яйца и молоко. Пример предложения возможного партнёра, а не действующее меню.'},
  {id:3,restaurant:'Daily Coffee',dish:'Кофе и круассан на вечер',category:'cafe',oldPrice:2800,price:1290,portions:4,pickupStart:'19:30',pickup:'21:30',address:'ул. Гоголя, 37',district:'center',distance:850,photo:'assets/coffee.jpg',initial:'d',description:'Капучино 300 мл и классический круассан. Кофе приготовят к вашему приходу. Содержит молоко, пшеницу и яйца. Фотография — пример подачи.'},
  {id:4,restaurant:'Зелёная лавка',dish:'Овощи для вкусного ужина',category:'grocery',oldPrice:3800,price:1490,portions:5,pickupStart:'19:00',pickup:'21:00',address:'ул. Университетская, 18',district:'southeast',distance:1800,photo:'assets/vegetables.jpg',initial:'з',description:'Набор сезонных овощей и зелени, примерно 1,5 кг. Точный состав уточняется при получении. Фотография показывает вариант блюда, которое можно приготовить из набора.'},
  {id:5,restaurant:'Пекарня у дома',dish:'Хлеб и булочки к завтраку',category:'bakery',oldPrice:2500,price:890,portions:2,pickupStart:'20:30',pickup:'22:00',address:'ул. Ермекова, 28',district:'mikhailovka',distance:2300,photo:'assets/bakery.jpg',initial:'п',description:'Хлеб сегодняшней выпечки и две булочки. Набор-сюрприз: пекарь выберет из оставшегося ассортимента. Содержит пшеницу; возможны молоко, яйца и кунжут.'},
  {id:6,restaurant:'Mamma Mia',dish:'Пицца на уютный вечер',category:'meal',oldPrice:4000,price:1990,portions:3,pickupStart:'21:00',pickup:'22:30',address:'ул. Муканова, 12',district:'southeast',distance:2600,photo:'assets/pizza.jpg',initial:'m',description:'Пицца с томатами и сыром, 30 см. Уточните начинку в заведении перед получением. Содержит пшеницу и молочные продукты.'},
  {id:7,restaurant:'Кофейня «Утро»',dish:'Последний кофе с собой',category:'cafe',oldPrice:1400,price:700,portions:0,pickupStart:'19:00',pickup:'20:00',address:'ул. Лободы, 8',district:'center',distance:1100,photo:'assets/coffee.jpg',initial:'у',description:'Капучино на обычном молоке, 300 мл. Содержит молоко. Это предложение уже разобрали.'}
];
const categories = {bakery:'Выпечка',cafe:'Кафе',grocery:'Продукты',dessert:'Десерты',meal:'Готовая еда'};
const districts = {all:'Весь город',center:'Центр',southeast:'Юго-Восток',mikhailovka:'Михайловка'};
const state = {view:'discover',category:'all',district:'all',query:'',sort:'recommended',maxPrice:null,available:true,bigDiscount:false,favorites:new Set(),bookings:[]};
try {const stored=JSON.parse(localStorage.getItem('qalmasyn-favorites')||'[]');if(Array.isArray(stored))state.favorites=new Set(stored.filter(id=>Number.isInteger(id)&&offers.some(o=>o.id===id)));} catch {}
const $ = selector=>document.querySelector(selector);
const $$ = selector=>[...document.querySelectorAll(selector)];
const escapeHTML = value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value=>new Intl.NumberFormat('ru-KZ').format(value)+' ₸';
const discount = offer=>Math.round((1-offer.price/offer.oldPrice)*100);
const icon = name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const distance = value=>value==null?'Караганда':value<1000?value+' м':(value/1000).toLocaleString('ru-RU',{maximumFractionDigits:1})+' км';
const time = offer=>`${offer.pickupStart}–${offer.pickup}`;
const normalize = value=>String(value).toLocaleLowerCase('ru-RU').replace(/ё/g,'е');
function icons(){if(window.lucide)window.lucide.createIcons({attrs:{'aria-hidden':'true',focusable:'false'}});}
let toastTimeout;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{$('#toast').hidden=true;},3000);}
function setError(id,message){const el=$(id);el.textContent=message;el.hidden=!message;}
function badgeCounts(){for(const [selector,value] of [['.favorite-count',state.favorites.size],['.booking-count',state.bookings.length]])$$(selector).forEach(el=>{el.textContent=value;el.hidden=!value;});}

function card(offer){
  const saved=state.favorites.has(offer.id);
  return `<article class="offer-card${offer.portions?'':' sold-out'}">
    <button class="card-main" type="button" data-offer="${offer.id}" aria-haspopup="dialog" aria-label="${escapeHTML(offer.restaurant+' — '+offer.dish+', '+money(offer.price))}">
      <span class="card-photo">${offer.photo?`<img src="${escapeHTML(offer.photo)}" alt="${escapeHTML(offer.dish)}" loading="lazy" width="850" height="480">`:`<span class="photo-fallback">${icon('utensils')}qalmasyn.</span>`}
        <span class="stock-badge${offer.portions>0&&offer.portions<=2?' urgent':''}">${icon(offer.portions>0&&offer.portions<=2?'flame':'shopping-bag')}${offer.portions?'Осталось '+offer.portions:'Всё разобрали'}</span><span class="card-category">${categories[offer.category]}</span>
      </span><span class="card-body"><span class="merchant-row"><span class="merchant-avatar">${escapeHTML(offer.initial)}</span><strong class="merchant-name">${escapeHTML(offer.restaurant)}</strong><span class="distance">${icon('navigation')}${distance(offer.distance)}</span></span><span class="dish-name">${escapeHTML(offer.dish)}</span><span class="pickup-line">${icon('clock-3')}Забрать сегодня <strong>${time(offer)}</strong></span><span class="card-bottom"><strong class="card-price">${money(offer.price)}</strong><del class="old-price">${money(offer.oldPrice)}</del><span class="discount-badge">−${discount(offer)}%</span><span class="card-arrow">${icon('arrow-up-right')}</span></span></span>
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
  badgeCounts();icons();
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
  $('#dialog-content').innerHTML=`${offer.photo?`<img class="dialog-photo" src="${escapeHTML(offer.photo)}" alt="${escapeHTML(offer.dish)}">`:`<div class="dialog-photo-fallback">${icon('utensils')}</div>`}<div class="dialog-body"><p class="dialog-merchant">${icon('store')}${escapeHTML(offer.restaurant)} <span class="demo-badge">Пример</span></p><h2 id="dialog-title" tabindex="-1">${escapeHTML(offer.dish)}</h2><div class="dialog-price-row"><strong>${money(offer.price)}</strong><del>${money(offer.oldPrice)}</del><span class="discount-badge">−${discount(offer)}%</span></div><div class="detail-list"><div class="detail-item">${icon('clock-3')}<span><strong>Сегодня, ${time(offer)}</strong><small>Забери в этот промежуток времени</small></span></div><div class="detail-item">${icon('map-pin')}<span><strong>${escapeHTML(offer.address)}</strong><small>Караганда · ${districts[offer.district]}</small></span></div></div><p class="detail-description"><strong>Что тебя ждёт</strong>${escapeHTML(offer.description)}</p><button class="primary wide" id="start-booking" ${offer.portions?'':'disabled'}>${offer.portions?'Забронировать за '+money(offer.price):'Всё разобрали'} ${icon('arrow-right')}</button><p class="dialog-demo">${icon('info')}Демо-предложение. Тестовая бронь не отправляется заведению.</p></div>`;
  icons();offerDialog.showModal();offerDialog.scrollTop=0;$('#dialog-title').focus({preventScroll:true});
}
function bookingForm(){
  const offer=selectedOffer;if(!offer||!offer.portions)return;
  $('#dialog-content').innerHTML=`<div class="dialog-body"><p class="eyebrow">ЕЩЁ ОДИН ШАГ</p><h2 id="dialog-title">Сохраним вкусное<br>для тебя</h2><div class="booking-summary"><strong>${escapeHTML(offer.restaurant)}</strong><br>${escapeHTML(offer.dish)} · 1 шт.<br>Сегодня, ${time(offer)}</div><form id="booking-form"><label class="field">Твоё имя<input name="guestName" id="guest-name" autocomplete="given-name" required maxlength="80" placeholder="Как к тебе обращаться?"></label><label class="field">Номер телефона<input name="phone" autocomplete="tel" type="tel" required maxlength="24" placeholder="+7 (7XX) XXX-XX-XX"></label><p class="form-hint">Оплата при получении. Для демонстрации можно указать вымышленные данные.</p><p id="booking-error" class="error" role="alert" hidden></p><div class="booking-total"><span>Итого · 1 шт.</span><strong>${money(offer.price)}</strong></div><button class="primary wide" type="submit">Подтвердить тестовую бронь ${icon('check')}</button><p class="dialog-demo">${icon('shield-check')}Данные остаются в текущей странице и исчезнут после её обновления.</p></form></div>`;
  icons();offerDialog.scrollTop=0;$('#guest-name').focus({preventScroll:true});
}
function confirmBooking(form){
  if(!selectedOffer||selectedOffer.portions<1){setError('#booking-error','Эту порцию уже разобрали. Выбери другое предложение.');return;}
  const name=form.elements.guestName.value.trim(),phone=form.elements.phone.value.trim();
  if(!name){setError('#booking-error','Укажи имя.');return;}
  if(!/^[+\d\s()-]+$/.test(phone)||!/^\d{10,15}$/.test(phone.replace(/\D/g,''))){setError('#booking-error','Укажи номер с кодом страны: +7 700 000 00 00.');return;}
  let code;do{code='Q-'+Math.random().toString(36).slice(2,7).toUpperCase();}while(state.bookings.some(b=>b.code===code));
  const booking={...selectedOffer,code,name,phone};selectedOffer.portions--;state.bookings.push(booking);renderOffers();renderBookings();
  $('#dialog-content').innerHTML=`<div class="dialog-body success-body"><span class="success-icon">${icon('check')}</span><span class="demo-badge">Тестовая бронь</span><h2 id="dialog-title" tabindex="-1">Вкусный вечер<br>почти в руках!</h2><p>${escapeHTML(booking.restaurant)}<br>Сегодня, ${time(booking)}</p><strong class="reservation-code">${booking.code}</strong><p>Код для получения · ${money(booking.price)}<br>${escapeHTML(booking.address)}</p><button class="primary wide" data-view="bookings">Перейти к моим броням ${icon('arrow-right')}</button><p>Это демонстрация. Реальный заказ не создан.</p></div>`;
  icons();offerDialog.scrollTop=0;$('#dialog-title').focus({preventScroll:true});selectedOffer=null;
}
function renderBookings(){
  $('#bookings-empty').hidden=!!state.bookings.length;
  $('#bookings-list').innerHTML=[...state.bookings].reverse().map(b=>`<article class="booking-card">${b.photo?`<img src="${escapeHTML(b.photo)}" alt="${escapeHTML(b.dish)}">`:''}<div class="booking-info"><h3>${escapeHTML(b.restaurant)}</h3><p>${escapeHTML(b.dish)} · ${money(b.price)}</p><p class="pickup-line">${icon('clock-3')}Сегодня, ${time(b)}</p><p>${escapeHTML(b.address)}</p></div><div class="booking-ticket"><span>Код тестовой брони</span><strong>${b.code}</strong><button class="text-button" data-cancel="${b.code}">Отменить бронь</button></div></article>`).join('');
  $('#owner-booking-count').textContent='· '+state.bookings.length;
  $('#owner-bookings').innerHTML=state.bookings.length?[...state.bookings].reverse().map(b=>`<article class="owner-booking"><h3>${b.code} · ${escapeHTML(b.restaurant)}</h3><p>${escapeHTML(b.dish)} · ${money(b.price)} · 1 шт.</p><p>${escapeHTML(b.name)} · ${escapeHTML(b.phone)}</p><p>Самовывоз ${time(b)} · оплата при получении</p></article>`).join(''):'<p class="demo-inline">Здесь появятся тестовые брони гостей.</p>';
  badgeCounts();icons();
}
function cancelBooking(code){const index=state.bookings.findIndex(b=>b.code===code);if(index<0)return;const offer=offers.find(o=>o.id===state.bookings[index].id);if(offer)offer.portions++;state.bookings.splice(index,1);renderOffers();renderBookings();toast('Бронь отменена. Находка снова в витрине.');const focus=$('#bookings-list [data-cancel]')||$('#bookings-empty .primary');if(focus)focus.focus({preventScroll:true});}
offerDialog.addEventListener('close',()=>{selectedOffer=null;if(state.view===dialogOriginView){const target=dialogTrigger?.isConnected?dialogTrigger:dialogTrigger?.dataset.offer?$(`#${state.view}-view [data-offer="${dialogTrigger.dataset.offer}"]`):null;if(target)target.focus({preventScroll:true});}});

function resetFilters(){state.maxPrice=null;state.available=true;state.bigDiscount=false;$('#filter-form').reset();}
function resetSearch(){resetFilters();state.query='';state.category='all';state.district='all';$('#search').value='';renderOffers();}
document.addEventListener('click',event=>{
  const button=event.target.closest('button,a');if(!button)return;
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
$('#sort').addEventListener('change',event=>{state.sort=event.target.value;renderOffers();});
$('#filter-form').addEventListener('submit',event=>{event.preventDefault();const f=event.target.elements;state.maxPrice=f.maxPrice.value?Number(f.maxPrice.value):null;state.available=f.available.checked;state.bigDiscount=f.bigDiscount.checked;renderOffers();$('#filter-dialog').close();});
document.addEventListener('submit',event=>{if(event.target.id==='booking-form'){event.preventDefault();confirmBooking(event.target);}});

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
  offers.unshift({id:Math.max(...offers.map(o=>o.id))+1,restaurant,dish,description,address,price,oldPrice,portions,category:f.category.value,district:f.district.value,pickupStart:f.pickupStart.value,pickup:f.pickup.value,photo:uploadedPhoto,distance:null,initial:restaurant.slice(0,1).toLocaleLowerCase()});
  // Clear previous discovery constraints so a newly published offer is visible.
  resetSearch();state.sort='recommended';$('#sort').value='recommended';renderOffers();setError('#offer-error','');
  $('#publish-notice').textContent='«'+dish+'» добавлено. Открой «Найти вкусное», чтобы посмотреть карточку.';$('#publish-notice').hidden=false;
  f.dish.value='';f.description.value='';f.oldPrice.value='';f.price.value='';f.portions.value='3';$('#photo-input').value='';uploadedPhoto='';photoRequest++;$('#photo-preview').hidden=true;
  toast('Предложение появилось в демо-витрине');
});
$('#filter-button').setAttribute('aria-label','Фильтры предложений');
renderOffers();renderBookings();showView(location.hash.slice(1)||'discover',false);icons();
