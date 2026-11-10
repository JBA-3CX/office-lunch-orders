const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Simulate Firebase's removal of empty arrays, without touching production data.
function app() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      const el = { value: '', textContent: '', disabled: false, style: {}, children: [],
        classList: { add: (...x) => x.forEach(c => classes.add(c)), remove: (...x) => x.forEach(c => classes.delete(c)), contains: c => classes.has(c) },
        appendChild(child) { this.children.push(child); }, focus() {}, scrollIntoView() {} };
      let html = '';
      Object.defineProperty(el, 'innerHTML', { get: () => html, set(value) {
        html = value;
        if (id === 'size-select') {
          this.options = [...value.matchAll(/value="([^"]+)" data-price="([^"]+)"/g)].map(m => ({ value: m[1], getAttribute: () => m[2] }));
          this.value = this.options[0]?.value || '';
        }
      } });
      Object.defineProperty(el, 'selectedIndex', { get() { return (this.options || []).findIndex(o => o.value === this.value); } });
      elements.set(id, el);
    }
    return elements.get(id);
  }
  const extras = ['Cheese', 'Bacon'].map(value => ({ value, checked: false }));
  const alerts = [];
  const context = vm.createContext({ window: {}, document: {
    getElementById: element, createElement: () => element(Symbol()),
    querySelector: () => element('submit'),
    querySelectorAll: selector => selector.includes(':checked') ? extras.filter(e => e.checked) : extras
  }, console: { error() {} }, alert: msg => alerts.push(msg), confirm: () => true,
    setTimeout() {}, setInterval() {} });
  const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  vm.runInContext(source.replace(/^initApp\(\);/m, ''), context);
  const run = code => vm.runInContext(code, context);
  run(`ordersMap = { original: { person: 'Joe', items: [
    { itemId: 1, itemName: 'Sandwich', size: 'Double', qty: 2, comment: 'No tomato', totalPrice: 13 },
    { itemId: 24, itemName: 'Fries', size: 'Large', qty: 1, extras: ['Cheese'], totalPrice: 2.7 }
  ] } };`);
  element('item-select').value = '1';
  element('item-qty').value = 1;
  run('handleItemSelectChange()');
  return { run, element, extras, alerts, context };
}

test('reopen Firebase order without extras; editing draft does not mutate saved order', () => {
  const a = app();
  a.run("editSubmittedOrder('original')");
  assert.equal(a.element('user-name').value, 'Joe');
  assert.equal(a.run('currentCart[0].extras.length'), 0);
  a.run('currentCart[0].qty = 3');
  assert.equal(a.run('ordersMap.original.items[0].qty'), 2);
});

test('item editor restores all options and replaces the item with recalculated total', () => {
  const a = app();
  a.run("editSubmittedOrder('original'); editCartItem(0)");
  assert.equal(a.element('size-select').value, 'Double');
  assert.equal(a.element('item-qty').value, 2);
  assert.equal(a.element('item-comment').value, 'No tomato');
  a.extras[0].checked = true;
  a.run('addToCart()');
  assert.equal(a.run('currentCart.length'), 2);
  assert.equal(a.run('currentCart[0].totalPrice'), 14);
  a.run('editCartItem(1)');
  assert.equal(a.element('size-select').value, 'Large');
  assert.equal(a.extras[0].checked, true);
});

test('save updates original key once and waits for server acknowledgement', async () => {
  const a = app();
  const writes = [];
  let resolve;
  a.context.dbMock = { ref: key => ({ set: data => { writes.push({ key, data }); return new Promise(r => resolve = r); } }) };
  a.run("db = dbMock; editSubmittedOrder('original'); editCartItem(0)");
  a.element('item-qty').value = 3;
  const saving = a.run('submitFinalOrder()');
  await a.run('submitFinalOrder()');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, 'orders/original');
  assert.equal(writes[0].data.items[0].qty, 3);
  assert.equal(a.run('currentCart.length'), 2);
  assert.equal(a.element('submit').disabled, true);
  resolve();
  await saving;
  assert.equal(a.run('editingOrderKey'), null);
  assert.equal(a.run('currentCart.length'), 0);
  assert.match(a.element('order-status').textContent, /successfully/);
});

test('failed save keeps draft and original key for retry', async () => {
  const a = app();
  a.context.dbMock = { ref: () => ({ set: () => Promise.reject(new Error('Permission denied')) }) };
  a.run("db = dbMock; editSubmittedOrder('original')");
  await a.run('submitFinalOrder()');
  assert.equal(a.run('editingOrderKey'), 'original');
  assert.equal(a.run('currentCart.length'), 2);
  assert.equal(a.element('submit').disabled, false);
  assert.match(a.element('order-status').textContent, /Could not save/);
});

test('empty edited order is not replaced with default sandwich', async () => {
  const a = app();
  a.run("editSubmittedOrder('original'); removeFromCart(1); removeFromCart(0)");
  await a.run('submitFinalOrder()');
  assert.equal(a.run('currentCart.length'), 0);
  assert.match(a.alerts[0], /at least one/);
});

test('cancel leaves saved order intact and restores new-order mode', () => {
  const a = app();
  a.run("editSubmittedOrder('original'); editCartItem(0); cancelOrderEdit()");
  assert.equal(a.run('editingOrderKey'), null);
  assert.equal(a.run('editingCartIndex'), null);
  assert.equal(a.run('ordersMap.original.items.length'), 2);
  assert.equal(a.element('user-name').value, '');
});

test('new order still creates a new record', async () => {
  const a = app();
  let writes = 0;
  a.context.dbMock = { ref: key => ({ push: data => { assert.equal(key, 'orders'); assert.equal(data.person, 'New person'); writes++; return Promise.resolve(); } }) };
  a.run('db = dbMock; addToCart()');
  a.element('user-name').value = 'New person';
  await a.run('submitFinalOrder()');
  assert.equal(writes, 1);
});

test('switching lines keeps changes to both lines when saving the whole order', async () => {
  const a = app();
  let saved;
  a.context.dbMock = { ref: () => ({ set: data => { saved = data; return Promise.resolve(); } }) };
  a.run("db = dbMock; editSubmittedOrder('original'); editCartItem(0)");
  a.element('item-qty').value = 3;
  a.run('editCartItem(1)');
  assert.equal(a.run('currentCart[0].qty'), 3);
  a.element('item-comment').value = 'Extra crispy';
  await a.run('submitFinalOrder()');
  assert.equal(saved.items.length, 2);
  assert.equal(saved.items[0].qty, 3);
  assert.equal(saved.items[0].totalPrice, 19.5);
  assert.equal(saved.items[1].comment, 'Extra crispy');
  assert.equal(saved.items[1].totalPrice, 2.7);
});

test('cutoff explains why edit cannot open, without changing the order', () => {
  const a = app();
  a.run("isLocked = true; editSubmittedOrder('original')");
  assert.equal(a.run('editingOrderKey'), null);
  assert.match(a.alerts[0], /Ordering is closed/);
  assert.match(a.alerts[0], /10:00 cutoff/);
  assert.equal(a.run('ordersMap.original.items.length'), 2);
});

test('cutoff reached during editing keeps draft and prevents saving', async () => {
  const a = app();
  a.run("editSubmittedOrder('original'); isLocked = true");
  await a.run('submitFinalOrder()');
  assert.equal(a.run('editingOrderKey'), 'original');
  assert.equal(a.run('currentCart.length'), 2);
  assert.match(a.alerts[0], /changes have not been saved/);
});
