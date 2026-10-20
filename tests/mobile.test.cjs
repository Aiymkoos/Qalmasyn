const assert = require('node:assert/strict');
const test = require('node:test');
const { startServer, launchBrowser, openApp } = require('./helpers.cjs');

test('mobile content and navigation fit the viewport in both languages', async t => {
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const width of [320, 390, 430]) {
      for (const language of ['ru', 'kk']) {
        await t.test(`${width}px ${language}`, async () => {
          const { context, page } = await openApp(browser, server.url, { width, language });
          try {
            await page.evaluate(() => document.fonts.ready);
            const layout = await page.evaluate(() => {
              const viewport = document.documentElement.clientWidth;
              const bounds = selector => [...document.querySelectorAll(selector)].map(element => {
                const rect = element.getBoundingClientRect();
                return {
                  selector: element.className || element.dataset.lang || element.dataset.view,
                  left: rect.left,
                  right: rect.right,
                  width: rect.width,
                  height: rect.height,
                };
              }).filter(rect => rect.width && rect.height);
              return {
                viewport,
                scrollWidth: document.documentElement.scrollWidth,
                loadedFonts: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family),
                content: bounds('.header-inner, .header-actions, .hero-copy, .hero h1, .hero-description, .hero-visual, .hero-visual img, .hero-pct, .mobile-nav'),
                controls: bounds('.lang button, .location-button, .hero-cta, .mobile-nav button'),
              };
            });
            for (const font of ['Onest', 'Rubik', 'Aclonica']) {
              assert.ok(layout.loadedFonts.includes(font), `${font} must be loaded for layout verification`);
            }
            assert.ok(
              layout.scrollWidth <= layout.viewport,
              `document width ${layout.scrollWidth}px exceeds viewport ${layout.viewport}px`,
            );
            for (const element of [...layout.content, ...layout.controls]) {
              assert.ok(
                element.left >= -1 && element.right <= layout.viewport + 1,
                `${JSON.stringify(element)} exceeds viewport ${layout.viewport}px`,
              );
            }
            for (const control of layout.controls) {
              assert.ok(
                control.width >= 44 && control.height >= 44,
                `${JSON.stringify(control)} is smaller than a 44px touch target`,
              );
            }
            const sticky = await page.evaluate(() => {
              window.scrollTo({ top: document.querySelector('#today').offsetTop + 100, behavior: 'instant' });
              const header = document.querySelector('.site-header').getBoundingClientRect();
              const clock = document.querySelector('.clockbar').getBoundingClientRect();
              const slider = document.querySelector('#clock');
              const range = slider.getBoundingClientRect();
              return {
                headerBottom: header.bottom,
                clockTop: clock.top,
                sliderReceivesPointer: document.elementFromPoint(range.x + range.width / 2, range.y + range.height / 2) === slider,
              };
            });
            assert.ok(
              sticky.clockTop >= sticky.headerBottom - 1,
              `sticky clock is covered by the header: ${JSON.stringify(sticky)}`,
            );
            assert.equal(sticky.sliderReceivesPointer, true, 'clock slider must remain usable after scrolling');
            await page.locator('[data-location]').click();
            assert.equal(await page.locator('#location-dialog').evaluate(dialog => dialog.open), true);
            await page.locator('#location-dialog [data-close]').click();
            await page.locator('.mobile-nav [data-view="favorites"]').click();
            assert.equal(await page.locator('#favorites-view').isVisible(), true);
          } finally {
            await context.close();
          }
        });
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
