const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const i18n = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function sourceBetween(source, start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
}

test('owner storage notice distinguishes server storage from temporary offers in both languages', () => {
  const owner = sourceBetween(html, '<aside class="owner-aside">', '</aside>');
  const notice = owner.match(/<p class="small-copy">([^<]+)<\/p>/)[1];
  assert.match(notice, /Supabase/);
  assert.match(notice, /без базы|без Supabase/i);
  assert.match(notice, /при ошибке/i);
  assert.match(notice, /до обновления страницы/);
  const kazakh = translate(notice, 'kk');
  assert.ok(kazakh, 'The owner storage notice must be translated');
  assert.match(kazakh, /Supabase/);
  assert.match(kazakh, /жаңартқанға дейін/);
});

test('bookings list explains persistent local data and conditional server storage in both languages', () => {
  const bookings = sourceBetween(html, '<section id="bookings-view"', '<section id="owner-view"');
  const notice = bookings.match(/<p class="demo-inline">([^<]+)<\/p>/)[1];
  assert.match(notice, /браузер|устройств/i);
  assert.match(notice, /после обновления/);
  assert.match(notice, /Supabase/);
  assert.ok(translate(notice, 'kk'), 'The bookings storage notice must be translated');
});

test('documentation does not deny the existing persistent and remote storage', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.doesNotMatch(readme, /в localStorage сохраняются только ID|Поля кабинета и гостей не передаются на сервер|Данные бронирований и добавленные предложения живут в памяти|интеграция, но она выключена/);
  assert.match(readme, /localStorage/);
  assert.match(readme, /имя и телефон/);
  assert.match(readme, /Supabase/);
});

function translate(text, language) {
  if (language === 'ru') return text;
  const dictionary = i18n.slice(0, i18n.indexOf('let lang ='));
  const translator = sourceBetween(i18n, 'function toKk(', 'function translateNode(');
  return vm.runInNewContext(`${dictionary}\n${translator}\ntoKk(input)`, {input: text});
}

function bookingHarness(enabled) {
  const storage = new Map();
  const requests = [];
  const content = {innerHTML: ''};
  const button = {disabled: false, textContent: ''};
  const context = {
    window: {QalmasynDB: {enabled, async createBooking(booking) {
      requests.push({...booking});
      return {code: booking.code};
    }}},
    localStorage: {setItem(key, value) { storage.set(key, value); }},
    selectedOffer: {id: 1, restaurant: 'Test venue', dish: 'Test bag', portions: 2, price: 900, address: 'Test address'},
    state: {bookings: []}, hold: null, holdTimer: null, bookingPending: false,
    offerDialog: {scrollTop: 0},
    $: selector => selector === '#dialog-content' ? content : {focus() {}},
    escapeHTML: String, icon: () => '', time: () => '20:00–21:00',
    money: value => `${value} ₸`, routeUrl: () => '#',
    stopHold() {}, tickHold() {}, setInterval() { return 1; }, icons() {},
    renderOffers() {}, renderBookings() {},
    setError(selector, message) { throw new Error(message); },
  };
  vm.createContext(context);
  const saveBookings = sourceBetween(app, 'function saveBookings(', '\n');
  const bookingForm = sourceBetween(app, 'function bookingForm(', 'let bookingPending=');
  const confirmBooking = sourceBetween(app, 'async function confirmBooking(', 'function tickHold(');
  vm.runInContext(`${saveBookings}\n${bookingForm}\n${confirmBooking}`, context);
  return {
    storage, requests,
    notice() {
      context.bookingForm();
      return content.innerHTML.match(/<p class="dialog-demo">([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, '');
    },
    confirm() {
      return context.confirmBooking({
        elements: {guestName: {value: 'Privacy Test'}, phone: {value: '+7 700 000 00 00'}},
        querySelector: () => button,
      });
    },
  };
}

for (const language of ['ru', 'kk']) {
  for (const onlineDb of [false, true]) {
    test(`booking notice matches persisted guest data (${language}, Supabase ${onlineDb ? 'on' : 'off'})`, async () => {
      const harness = bookingHarness(onlineDb);
      const notice = translate(harness.notice(), language);
      await harness.confirm();
      const [stored] = JSON.parse(harness.storage.get('qalmasyn-bookings'));
      assert.equal(stored.name, 'Privacy Test');
      assert.equal(stored.phone, '+7 700 000 00 00');
      assert.equal(harness.requests.length, onlineDb ? 1 : 0);
      assert.ok(notice, 'The storage notice must be available in the selected language');
      if (language === 'ru') {
        assert.match(notice, /имя/i);
        assert.match(notice, /телефон/i);
        assert.match(notice, /браузер|устройств/i);
        assert.match(notice, /после обновления|не исчезают|не удаляются/i);
        assert.match(notice, /если[^.]*Supabase[^.]*сервер|при подключ[ёе]нном Supabase[^.]*сервер/i);
      } else {
        assert.match(notice, /ат|есім/i);
        assert.match(notice, /телефон/i);
        assert.match(notice, /браузер|құрылғы/i);
        assert.match(notice, /жаңартқаннан кейін|жоғалмайды|жойылмайды/i);
        assert.match(notice, /Supabase[^.]*қосыл[^.]*сервер/i);
      }
    });
  }
}
