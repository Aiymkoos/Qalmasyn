const assert = require('node:assert/strict');
const test = require('node:test');
const { startServer, launchBrowser, openApp } = require('./helpers.cjs');

let server;
let browser;

test.before(async () => {
  server = await startServer();
  browser = await launchBrowser();
});

test.after(async () => {
  await browser?.close();
  await server?.close();
});

function offerCard(page, id) {
  return page.locator('#offers .offer-card').filter({
    has: page.locator(`[data-offer="${id}"]`),
  });
}

async function waitForOffers(page) {
  await page.locator('#offers [data-offer="1"]').waitFor({ state: 'attached' });
}

test('one TEST booking survives reload and cancellation restores stock despite duplicate submit', async () => {
  const { context, page, db } = await openApp(browser, server.url, { onlineDb: true });
  try {
    const card = offerCard(page, 1);
    assert.equal(await card.locator('.stock-text').textContent(), 'Осталось 3');
    await card.locator('[data-offer="1"]').click();

    const route = page.locator('#offer-dialog .route-link');
    const expectedRoute = 'https://2gis.kz/karaganda/directions/points/%7C73.1,49.8045';
    assert.equal(await route.getAttribute('href'), expectedRoute);
    assert.equal(await route.getAttribute('target'), '_blank');
    assert.match(await route.getAttribute('rel'), /\bnoopener\b/);

    await page.locator('#start-booking').click();
    await page.locator('#guest-name').fill('TEST Regression');
    await page.locator('#booking-form [name="phone"]').fill('+7 700 000 00 00');

    // Both events arrive before the mocked HTTP request completes.
    const submitDisabled = await page.locator('#booking-form').evaluate(form => {
      form.requestSubmit();
      const disabled = form.querySelector('[type="submit"]').disabled;
      form.requestSubmit();
      return disabled;
    });
    assert.equal(submitDisabled, true, 'submission must disable the button while pending');
    await page.locator('.reservation-code').waitFor();
    const code = await page.locator('.reservation-code').textContent();
    assert.match(code, /^Q-[A-Z0-9]{5}$/);
    assert.equal(db.createCalls, 1, 'duplicate submission must issue only one create request');
    assert.equal(db.bookings.length, 1);
    assert.equal(db.bookings[0].p_guest_name, 'TEST Regression');
    assert.equal(db.bookings[0].p_phone, '+7 700 000 00 00');
    assert.equal(db.bookings[0].p_price, 990);
    assert.equal(await card.locator('.stock-text').textContent(), 'Осталось 2');
    assert.equal(await page.locator('#offer-dialog a.primary').getAttribute('href'), expectedRoute);

    await page.locator('#offer-dialog [data-view="bookings"]').click();
    assert.equal(await page.locator('#bookings-list .booking-card').count(), 1);
    assert.equal(await page.locator('#bookings-list .booking-ticket strong').textContent(), code);

    await page.reload();
    await waitForOffers(page);
    await page.locator('#bookings-list .booking-card').waitFor();
    assert.equal(await page.locator('#bookings-list .booking-card').count(), 1);
    assert.equal(await page.locator('#bookings-list .booking-ticket strong').textContent(), code);
    assert.equal(await page.locator('#bookings-list .route-link').getAttribute('href'), expectedRoute);
    assert.equal(await card.locator('.stock-text').textContent(), 'Осталось 2');
    assert.equal(db.createCalls, 1, 'reload must not create another booking');

    await page.locator('#bookings-list [data-cancel]').click();
    await page.locator('#bookings-empty').waitFor();
    assert.equal(await page.locator('#bookings-list .booking-card').count(), 0);
    assert.equal(db.cancelCalls, 1);
    await page.locator('.mobile-nav [data-view="discover"]').click();
    assert.equal(await card.locator('.stock-text').textContent(), 'Осталось 3');

    await page.reload();
    await waitForOffers(page);
    assert.equal(await card.locator('.stock-text').textContent(), 'Осталось 3');
    await page.locator('.mobile-nav [data-view="bookings"]').click();
    assert.equal(await page.locator('#bookings-empty').isVisible(), true);
    assert.equal(await page.locator('#bookings-list .booking-card').count(), 0);
  } finally {
    await context.close();
  }
});

test('a saved favorite remains selected after reload and appears in favorites', async () => {
  const { context, page } = await openApp(browser, server.url, { onlineDb: true });
  try {
    const favorite = page.locator('#offers [data-favorite="1"]');
    assert.equal(await favorite.getAttribute('aria-pressed'), 'false');
    await favorite.click();
    assert.equal(await favorite.getAttribute('aria-pressed'), 'true');

    await page.reload();
    await waitForOffers(page);
    assert.equal(await favorite.getAttribute('aria-pressed'), 'true');
    await page.locator('.mobile-nav [data-view="favorites"]').click();
    assert.equal(await page.locator('#favorites-grid .offer-card').count(), 1);
    assert.equal(await page.locator('#favorites-grid [data-offer="1"]').isVisible(), true);
    assert.equal(await page.locator('#favorites-empty').isVisible(), false);
  } finally {
    await context.close();
  }
});

test('the price filter excludes an expensive offer and reset restores it', async () => {
  const { context, page } = await openApp(browser, server.url, { onlineDb: true });
  try {
    assert.equal(await page.locator('#offers .offer-card').count(), 2);
    await page.locator('#filter-button').click();
    await page.locator('#filter-form [name="maxPrice"]').fill('1000');
    await page.locator('#filter-form [type="submit"]').click();
    assert.equal(await page.locator('#filter-dialog').isVisible(), false);
    assert.equal(await page.locator('#offers .offer-card').count(), 1);
    assert.equal(await page.locator('#offers [data-offer="1"]').isVisible(), true);
    assert.equal(await page.locator('#offers [data-offer="2"]').count(), 0);
    assert.equal(await page.locator('#active-filter-count').textContent(), '1');

    await page.locator('#filter-button').click();
    await page.locator('#clear-filters').click();
    assert.equal(await page.locator('#offers .offer-card').count(), 2);
    assert.equal(await page.locator('#offers [data-offer="2"]').isVisible(), true);
    assert.equal(await page.locator('#active-filter-count').isVisible(), false);
  } finally {
    await context.close();
  }
});
