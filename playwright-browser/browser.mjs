import { chromium } from 'playwright';

function validateHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL tidak valid.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Hanya URL http:// atau https:// yang diizinkan.');
  }
  return parsed.toString();
}

async function getPageContext(page) {
  return page.evaluate(() => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
    };

    const escapeCss = (val) => CSS.escape(val);

    const buildSelector = (el) => {
      if (el.id) {
        const byId = `#${escapeCss(el.id)}`;
        if (document.querySelectorAll(byId).length === 1) return byId;
      }
      const tag = el.tagName.toLowerCase();
      for (const attr of ['name', 'data-testid', 'aria-label', 'placeholder', 'title']) {
        const val = el.getAttribute(attr);
        if (val && val.length <= 80) {
          const sel = `${tag}[${attr}="${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
          try {
            if (document.querySelectorAll(sel).length === 1) return sel;
          } catch { /* ignore invalid selector */ }
        }
      }
      if (tag === 'a') {
        const href = el.getAttribute('href');
        if (href && href.length <= 120) {
          const sel = `a[href="${href.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
          try {
            if (document.querySelectorAll(sel).length === 1) return sel;
          } catch { /* ignore */ }
        }
      }
      const parts = [];
      let cur = el;
      while (cur && cur.nodeType === 1 && cur !== document.body) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) {
          part = `#${escapeCss(cur.id)}`;
          parts.unshift(part);
          break;
        }
        const parent = cur.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (siblings.length > 1) {
            part += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
          }
        }
        parts.unshift(part);
        cur = parent;
      }
      return parts.join(' > ');
    };

    const description =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      '';

    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .filter(isVisible)
      .map((el) => `${el.tagName.toLowerCase()}: ${(el.innerText || '').replace(/\s+/g, ' ').trim()}`)
      .filter((line) => line.length > 4)
      .slice(0, 15);

    const interactiveCandidates = document.querySelectorAll(
      'button, input:not([type="hidden"]), textarea, select, [role="button"], [role="searchbox"], a[href]'
    );
    const elements = [];
    for (const el of interactiveCandidates) {
      if (elements.length >= 30) break;
      if (!isVisible(el)) continue;
      const tag = el.tagName.toLowerCase();
      const label = (
        el.getAttribute('aria-label') ||
        el.innerText ||
        el.getAttribute('placeholder') ||
        el.getAttribute('title') ||
        el.getAttribute('name') ||
        el.value ||
        ''
      ).replace(/\s+/g, ' ').trim().slice(0, 80);

      elements.push({
        tag,
        type: el.getAttribute('type') || el.getAttribute('role') || undefined,
        label: label || '(tanpa label)',
        value: typeof el.value === 'string' && el.value ? el.value.slice(0, 60) : undefined,
        selector: buildSelector(el),
      });
    }

    const links = [];
    const seenUrls = new Set();
    for (const a of document.querySelectorAll('a[href]')) {
      if (links.length >= 20) break;
      if (!isVisible(a)) continue;
      const href = a.href;
      if (!href || (!href.startsWith('http://') && !href.startsWith('https://')) || seenUrls.has(href)) continue;
      const linkText = (a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!linkText) continue;
      seenUrls.add(href);
      links.push({ text: linkText, url: href });
    }

    const mainRoot = document.querySelector('main, article, [role="main"]');
    const mainText = mainRoot?.innerText?.trim() || '';
    const bodyText = document.body?.innerText?.trim() || '';
    const chosenText = mainText.length >= 200 ? mainText : bodyText;
    const text = chosenText.replace(/\n{3,}/g, '\n\n').trim().slice(0, 7000);

    return {
      url: location.href,
      title: document.title || '',
      description: description.trim().slice(0, 300) || undefined,
      headings,
      text,
      links,
      elements,
    };
  });
}

/**
 * Creates a headless Playwright controller focused on fast web navigation and context extraction.
 */
export function createBrowserController({ headless = true } = {}) {
  let browser = null;
  let context = null;
  let page = null;
  let queue = Promise.resolve();

  async function ensurePage() {
    if (page && !page.isClosed()) return page;
    if (!browser || !browser.isConnected()) {
      browser = await chromium.launch({
        headless,
        args: ['--no-first-run', '--no-default-browser-check'],
      });
    }
    if (!context) {
      context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    }
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(15000);
    return page;
  }

  async function findLocator(activePage, selector) {
    if (typeof selector !== 'string' || !selector.trim()) {
      throw new Error('Parameter selector wajib diisi.');
    }
    const clean = selector.trim();
    const cssLocator = activePage.locator(clean).first();
    if ((await cssLocator.count()) > 0) return cssLocator;

    const byText = activePage.getByText(clean, { exact: false }).first();
    if ((await byText.count()) > 0) return byText;

    throw new Error(`Elemen tidak ditemukan: ${clean}`);
  }

  async function settlePage(activePage) {
    await activePage.waitForLoadState('domcontentloaded').catch(() => {});
    await activePage.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
  }

  async function executeAction(payload) {
    const action = typeof payload?.action === 'string' ? payload.action.trim().toLowerCase() : '';
    if (!action) throw new Error('Parameter action wajib diisi (goto, click, type, press, scroll, snapshot, close).');

    if (action === 'close') {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
      page = null;
      context = null;
      browser = null;
      return { ok: true, action: 'close', message: 'Sesi browser headless ditutup.' };
    }

    const activePage = await ensurePage();

    if (action === 'goto') {
      const targetUrl = validateHttpUrl(payload.url);
      await activePage.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await settlePage(activePage);
    } else if (action === 'click') {
      const locator = await findLocator(activePage, payload.selector);
      await locator.click();
      await settlePage(activePage);
    } else if (action === 'type') {
      if (typeof payload.text !== 'string') throw new Error('Parameter text wajib diisi untuk action type.');
      const locator = await findLocator(activePage, payload.selector);
      await locator.fill(payload.text);
      if (payload.submit === true) {
        await locator.press('Enter');
        await settlePage(activePage);
      }
    } else if (action === 'press') {
      const key = typeof payload.key === 'string' && payload.key.trim() ? payload.key.trim() : 'Enter';
      await activePage.keyboard.press(key);
      await settlePage(activePage);
    } else if (action === 'scroll') {
      const delta = payload.direction === 'up' ? -700 : 700;
      await activePage.evaluate((y) => window.scrollBy(0, y), delta);
      await activePage.waitForTimeout(200);
    } else if (action !== 'snapshot') {
      throw new Error(`Action tidak dikenal: ${action}`);
    }

    const snapshot = await getPageContext(activePage);
    return { ok: true, action, ...snapshot };
  }

  return {
    run(payload) {
      const task = queue.then(() => executeAction(payload));
      queue = task.catch(() => {});
      return task;
    },
    async close() {
      return this.run({ action: 'close' });
    },
  };
}
