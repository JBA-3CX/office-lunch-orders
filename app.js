const DEFAULT_MENU = [
  { id: 1, category: "Sandwiches", name: "#1 Special (Mortatella, salami, ham, sausage)", basePrice: 4.00, hasDouble: true },
  { id: 2, category: "Sandwiches", name: "#2 Turbo (Roast pork, haloumi, lountza, sausage)", basePrice: 4.00, hasDouble: true },
  { id: 3, category: "Sandwiches", name: "#3 Diafora Mix", basePrice: 4.00, hasDouble: true },
  { id: 4, category: "Sandwiches", name: "#4 Davos", basePrice: 4.00, hasDouble: true },
  { id: 5, category: "Sandwiches", name: "#5 Number 5 (Lountza, haloumi, cheese, bacon, mushrooms)", basePrice: 4.00, hasDouble: true },
  { id: 6, category: "Sandwiches", name: "#6 Lountza & Haloumi", basePrice: 4.00, hasDouble: true },
  { id: 7, category: "Sandwiches", name: "#7 German Breakfast (Frankfurt sausage, bacon, egg, cheese)", basePrice: 4.00, hasDouble: true },
  { id: 8, category: "Sandwiches", name: "#8 Roast Pork & Haloumi", basePrice: 4.00, hasDouble: true },
  { id: 9, category: "Sandwiches", name: "#9 Chinese (Chicken, cheese, mushrooms, peppers, fries)", basePrice: 4.00, hasDouble: true },
  { id: 10, category: "Sandwiches", name: "#10 Vegetarian (Cheese, haloumi, mushrooms, peppers, olives, fries)", basePrice: 4.00, hasDouble: true },
  { id: 11, category: "Sandwiches", name: "#11 Chicken BBQ", basePrice: 4.00, hasDouble: true },
  { id: 12, category: "Sandwiches", name: "#12 Chicken, Cheese & Mushroom", basePrice: 4.00, hasDouble: true },
  { id: 13, category: "Sandwiches", name: "#13 Chicken & Haloumi", basePrice: 4.00, hasDouble: true },
  { id: 14, category: "Sandwiches", name: "#14 Haloumi & Sausage", basePrice: 4.00, hasDouble: true },
  { id: 15, category: "Sandwiches", name: "#15 Breakfast Sandwich (Bacon, haloumi, egg)", basePrice: 4.00, hasDouble: true },
  { id: 16, category: "Sandwiches", name: "#16 Pizza Sandwich", basePrice: 4.00, hasDouble: true },
  { id: 17, category: "Sandwiches", name: "#17 Fasting Sandwich (Mushrooms, peppers, olives, fries)", basePrice: 4.00, hasDouble: true },
  { id: 18, category: "Burgers", name: "#18 Aphrodite's Special Burger (Beef, cheese, bacon, egg, mushrooms)", basePrice: 5.50, hasDouble: false },
  { id: 19, category: "Burgers", name: "#19 Beef Burger", basePrice: 4.00, hasDouble: false },
  { id: 20, category: "Burgers", name: "#20 Chicken Burger", basePrice: 4.00, hasDouble: false },
  { id: 21, category: "Burgers", name: "#21 Veggie Burger", basePrice: 4.00, hasDouble: false },
  { id: 22, category: "Hot Dogs", name: "#22 Hot Dog", basePrice: 3.00, hasDouble: false },
  { id: 23, category: "Hot Dogs", name: "#23 Californian Hot Dog (With cheese)", basePrice: 3.50, hasDouble: false },
  { id: 24, category: "Fries", name: "French Fries", basePrice: 1.80, isFries: true },
  { id: 25, category: "Salads", name: "#24 Chicken Fillet Salad", basePrice: 4.00, hasDouble: false },
  { id: 26, category: "Salads", name: "#25 Tuna Salad", basePrice: 4.50, hasDouble: false }
];

let menu = DEFAULT_MENU;
let ordersMap = {};
let currentCart = [];
let isLocked = false;
let adminPIN = "1234";

let cutoffDate = new Date();
cutoffDate.setHours(11, 30, 0, 0);

window.onload = function() {
  setTimeout(() => {
    initFirebaseListeners();
    populateMenuSelect();
    handleItemSelectChange();
    startCountdownTimer();
  }, 400);
};

function initFirebaseListeners() {
  if (!window.db) return;

  const ordersRef = window.dbRef(window.db, 'orders');
  window.dbOnValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    ordersMap = data || {};
    renderOrders();
  });

  const menuRef = window.dbRef(window.db, 'menu');
  window.dbOnValue(menuRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      menu = Object.values(data);
      populateMenuSelect();
      handleItemSelectChange();
      renderAdminMenuList();
    }
  });
}

function populateMenuSelect() {
  const select = document.getElementById('item-select');
  if (!select) return;
  select.innerHTML = '';
  
  let currentCat = '';
  menu.forEach(item => {
    if (item.category !== currentCat) {
      currentCat = item.category;
      const optgroup = document.createElement('optgroup');
      optgroup.label = currentCat;
      select.appendChild(optgroup);
    }
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    select.appendChild(option);
  });
}

function handleItemSelectChange() {
  const select = document.getElementById('item-select');
  if (!select || !select.value) return;

  const itemId = parseInt(select.value);
  const item = menu.find(m => m.id === itemId);
  if (!item) return;

  const sizeContainer = document.getElementById('size-container');
  const sizeSelect = document.getElementById('size-select');

  sizeSelect.innerHTML = '';

  if (item.isFries) {
    sizeContainer.style.display = 'block';
    sizeSelect.innerHTML = `
      <option value="Small" data-price="1.80">Small (€1.80)</option>
      <option value="Large" data-price="2.20">Large (€2.20)</option>
    `;
  } else if (item.hasDouble) {
    sizeContainer.style.display = 'block';
    sizeSelect.innerHTML = `
      <option value="Single" data-price="${item.basePrice.toFixed(2)}">Single (€${item.basePrice.toFixed(2)})</option>
      <option value="Double" data-price="6.50">Double (€6.50)</option>
    `;
  } else {
    sizeContainer.style.display = 'block';
    sizeSelect.innerHTML = `<option value="Standard" data-price="${item.basePrice.toFixed(2)}">Standard (€${item.basePrice.toFixed(2)})</option>`;
  }

  updateItemPricePreview();
}

function adjustQty(delta) {
  const input = document.getElementById('item-qty');
  let val = parseInt(input.value) + delta;
  if (val < 1) val = 1;
  if (val > 10) val = 10;
  input.value = val;
  updateItemPricePreview();
}

function updateItemPricePreview() {
  const sizeSelect = document.getElementById('size-select');
  const selectedOption = sizeSelect.options[sizeSelect.selectedIndex];
  const basePrice = parseFloat(selectedOption ? selectedOption.getAttribute('data-price') : 0);
  const qty = parseInt(document.getElementById('item-qty').value);

  const extras = document.querySelectorAll('input[name="extra"]:checked');
  const extrasCost = extras.length * 0.50;

  const itemTotal = (basePrice + extrasCost) * qty;
  document.getElementById('item-price-preview').textContent = '€' + itemTotal.toFixed(2);
}

function addToCart() {
  const itemId = parseInt(document.getElementById('item-select').value);
  const item = menu.find(m => m.id === itemId);
  if (!item) return;

  const sizeSelect = document.getElementById('size-select');
  const selectedSize = sizeSelect.value;
  const basePrice = parseFloat(sizeSelect.options[sizeSelect.selectedIndex].getAttribute('data-price'));
  const qty = parseInt(document.getElementById('item-qty').value);
  
  const selectedExtras = Array.from(document.querySelectorAll('input[name="extra"]:checked')).map(cb => cb.value);
  const comment = document.getElementById('item-comment').value.trim();

  const itemTotal = (basePrice + (selectedExtras.length * 0.50)) * qty;

  currentCart.push({
    itemId,
    itemName: item.name,
    size: selectedSize,
    qty,
    extras: selectedExtras,
    comment,
    totalPrice: itemTotal
  });

  document.getElementById('item-comment').value = '';
  document.querySelectorAll('input[name="extra"]').forEach(cb => cb.checked = false);
  document.getElementById('item-qty').value = 1;

  renderCart();
  updateItemPricePreview();
}

function renderCart() {
  const container = document.getElementById('cart-container');
  const itemsList = document.getElementById('cart-items');
  
  if (currentCart.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  itemsList.innerHTML = '';

  let grandCartTotal = 0;

  currentCart.forEach((c, index) => {
    grandCartTotal += c.totalPrice;
    const div = document.createElement('div');
    div.className = "flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg text-xs border border-slate-700/80";
    div.innerHTML = `
      <div>
        <span class="font-bold text-slate-200">${c.qty}x ${c.itemName} (${c.size})</span>
        ${c.extras.length ? `<span class="text-amber-400 block">+ ${c.extras.join(', ')}</span>` : ''}
        ${c.comment ? `<span class="text-slate-400 italic block">"${c.comment}"</span>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-amber-400">€${c.totalPrice.toFixed(2)}</span>
        <button onclick="removeFromCart(${index})" class="text-slate-500 hover:text-red-400 px-1"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    itemsList.appendChild(div);
  });

  document.getElementById('cart-total-price').textContent = '€' + grandCartTotal.toFixed(2);
}

function removeFromCart(index) {
  currentCart.splice(index, 1);
  renderCart();
}

function submitFinalOrder() {
  const nameInput = document.getElementById('user-name');
  const userName = nameInput.value.trim();
  
  if (!userName) {
    nameInput.focus();
    nameInput.classList.add('ring-2', 'ring-red-500');
    setTimeout(() => nameInput.classList.remove('ring-2', 'ring-red-500'), 2000);
    return;
  }

  const itemComment = document.getElementById('item-comment').value.trim();
  const hasCheckedExtras = document.querySelectorAll('input[name="extra"]:checked').length > 0;
  const currentQty = parseInt(document.getElementById('item-qty').value);

  if (currentCart.length === 0 || itemComment || hasCheckedExtras || currentQty > 1) {
    addToCart();
  }

  if (currentCart.length === 0) {
    return;
  }

  const newOrder = {
    person: userName,
    items: [...currentCart],
    timestamp: Date.now()
  };

  if (window.db) {
    const ordersRef = window.dbRef(window.db, 'orders');
    window.dbPush(ordersRef, newOrder);
  }

  currentCart = [];
  renderCart();

  const submitBtn = document.querySelector("button[onclick='submitFinalOrder()']");
  if (submitBtn) {
    const originalHTML = submitBtn.innerHTML;
    const originalClasses = submitBtn.className;

    submitBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Submitted!`;
    submitBtn.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-base";
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.innerHTML = originalHTML;
      submitBtn.className = originalClasses;
      submitBtn.disabled = false;
    }, 3000);
  }
}

function renderOrders() {
  renderPhoneView();
  renderDistributionView();
}

function renderPhoneView() {
  const container = document.getElementById('phone-checklist');
  if (!container) return;
  container.innerHTML = '';

  const orderList = Object.values(ordersMap);
  let totalCount = 0;
  let grandTotal = 0;

  if (orderList.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">No orders placed yet.</p>`;
    document.getElementById('total-items-count').textContent = '0';
    document.getElementById('grand-total-price').textContent = '€0.00';
    return;
  }

  const groupedMap = {};

  orderList.forEach(order => {
    if (!order.items) return;
    order.items.forEach(item => {
      totalCount += item.qty;
      grandTotal += item.totalPrice;

      const extrasStr = (item.extras && item.extras.length) ? item.extras.join(', ') : '';
      const commentStr = item.comment ? item.comment : '';
      const groupKey = `${item.itemName}||${item.size}||${extrasStr}||${commentStr}`;

      if (!groupedMap[groupKey]) {
        groupedMap[groupKey] = {
          itemName: item.itemName,
          size: item.size,
          extras: extrasStr,
          comment: commentStr,
          totalQty: 0,
          people: []
        };
      }

      groupedMap[groupKey].totalQty += item.qty;
      groupedMap[groupKey].people.push(order.person);
    });
  });

  Object.values(groupedMap).forEach(group => {
    const card = document.createElement('div');
    card.className = "p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1";

    let lineText = `<span class="font-bold text-sm text-slate-100">${group.totalQty}x ${group.itemName} (${group.size})</span>`;

    if (group.extras) {
      lineText += ` <span class="text-amber-400 font-semibold text-xs">+ ${group.extras}</span>`;
    }

    if (group.comment) {
      lineText += ` <span class="text-red-400 font-extrabold text-xs tracking-wide"> - ${group.comment}</span>`;
    }

    const peopleList = group.people.join(', ');

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <label class="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" class="w-4 h-4 text-amber-500 bg-slate-800 border-slate-700 rounded focus:ring-0 accent-amber-500 mt-0.5">
          <div>
            <div>${lineText}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">For: ${peopleList}</div>
          </div>
        </label>
      </div>
    `;
    container.appendChild(card);
  });

  document.getElementById('total-items-count').textContent = totalCount;
  document.getElementById('grand-total-price').textContent = '€' + grandTotal.toFixed(2);
}

function renderDistributionView() {
  const container = document.getElementById('distribution-list');
  if (!container) return;
  container.innerHTML = '';

  const entries = Object.entries(ordersMap);

  if (entries.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">No orders placed yet.</p>`;
    return;
  }

  entries.forEach(([key, order]) => {
    if (!order.items) return;
    const orderTotal = order.items.reduce((sum, i) => sum + i.totalPrice, 0);
    const card = document.createElement('div');
    card.className = "p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-2";
    
    let itemsHtml = order.items.map(i => `
      <div class="text-xs border-b border-slate-800 pb-1 last:border-0">
        <span class="font-bold text-slate-200">${i.qty}x ${i.itemName} (${i.size})</span>
        ${i.extras && i.extras.length ? `<span class="text-amber-400 block text-[11px]">+ ${i.extras.join(', ')}</span>` : ''}
        ${i.comment ? `<span class="text-slate-400 block text-[11px] italic">"${i.comment}"</span>` : ''}
      </div>
    `).join('');

    card.innerHTML = `
      <div class="flex justify-between items-center border-b border-slate-800 pb-1.5">
        <span class="font-bold text-sm text-slate-100">${order.person}</span>
        <div class="flex items-center gap-2">
          <span class="font-bold text-xs text-emerald-400">€${orderTotal.toFixed(2)}</span>
          <button onclick="deleteOrder('${key}')" class="text-slate-500 hover:text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="space-y-1">${itemsHtml}</div>
    `;
    container.appendChild(card);
  });
}

function deleteOrder(key) {
  if (confirm("Remove this order?")) {
    if (window.db) {
      const itemRef = window.dbRef(window.db, `orders/${key}`);
      window.dbRemove(itemRef);
    }
  }
}

function switchTab(tab) {
  const phoneBtn = document.getElementById('tab-phone-btn');
  const distBtn = document.getElementById('tab-dist-btn');
  const phoneContent = document.getElementById('tab-phone-content');
  const distContent = document.getElementById('tab-dist-content');

  if (tab === 'phone') {
    phoneBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg transition bg-amber-500 text-slate-950 shadow-md";
    distBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-400 hover:text-slate-200";
    phoneContent.classList.remove('hidden');
    distContent.classList.add('hidden');
  } else {
    distBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg transition bg-amber-500 text-slate-950 shadow-md";
    phoneBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-400 hover:text-slate-200";
    distContent.classList.remove('hidden');
    phoneContent.classList.add('hidden');
  }
}

function startCountdownTimer() {
  setInterval(() => {
    const now = new Date();
    const diff = cutoffDate - now;

    if (diff <= 0) {
      document.getElementById('timer-display').textContent = "00:00:00";
      document.getElementById('form-locked-overlay').classList.remove('hidden');
      isLocked = true;
      return;
    }

    const hrs = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const secs = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

    document.getElementById('timer-display').textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);
}

function openLightbox() { document.getElementById('lightbox-modal').classList.remove('hidden'); }
function closeLightbox() { document.getElementById('lightbox-modal').classList.add('hidden'); }
function openAdminModal() { document.getElementById('admin-modal').classList.remove('hidden'); }
function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }

function verifyAdminPIN() {
  const pin = document.getElementById('admin-pin-input').value;
  if (pin === adminPIN) {
    document.getElementById('admin-auth-section').classList.add('hidden');
    document.getElementById('admin-panel-section').classList.remove('hidden');
    renderAdminMenuList();
  } else {
    alert("Incorrect PIN");
  }
}

function renderAdminMenuList() {
  const container = document.getElementById('admin-menu-list');
  if (!container) return;
  container.innerHTML = '';
  
  menu.forEach(item => {
    const div = document.createElement('div');
    div.className = "flex items-center justify-between bg-slate-800 p-2 rounded text-xs border border-slate-700";
    div.innerHTML = `
      <div class="truncate pr-2">
        <span class="font-bold text-amber-400">[${item.category}]</span> 
        <span class="text-slate-200">${item.name}</span>
        <span class="text-slate-400 block text-[10px]">€${item.basePrice.toFixed(2)}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button onclick="editAdminMenuItem(${item.id})" class="text-slate-400 hover:text-amber-400 p-1"><i class="fa-solid fa-pen"></i></button>
        <button onclick="deleteAdminMenuItem(${item.id})" class="text-slate-400 hover:text-red-400 p-1"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    container.appendChild(div);
  });
}

function editAdminMenuItem(id) {
  const item = menu.find(m => m.id === id);
  if (!item) return;
  document.getElementById('edit-item-id').value = item.id;
  document.getElementById('admin-item-cat').value = item.category;
  document.getElementById('admin-item-name').value = item.name;
  document.getElementById('admin-item-price').value = item.basePrice;
  document.getElementById('admin-has-double').checked = !!item.hasDouble;
  document.getElementById('admin-is-fries').checked = !!item.isFries;
}

function saveAdminMenuItem() {
  const editId = document.getElementById('edit-item-id').value;
  const category = document.getElementById('admin-item-cat').value.trim() || 'General';
  const name = document.getElementById('admin-item-name').value.trim();
  const basePrice = parseFloat(document.getElementById('admin-item-price').value);
  const hasDouble = document.getElementById('admin-has-double').checked;
  const isFries = document.getElementById('admin-is-fries').checked;

  if (!name || isNaN(basePrice)) {
    return;
  }

  if (editId) {
    const item = menu.find(m => m.id === parseInt(editId));
    if (item) {
      item.category = category; item.name = name; item.basePrice = basePrice;
      item.hasDouble = hasDouble; item.isFries = isFries;
    }
  } else {
    menu.push({ id: Date.now(), category, name, basePrice, hasDouble, isFries });
  }

  if (window.db) {
    const menuRef = window.dbRef(window.db, 'menu');
    window.dbSet(menuRef, menu);
  }

  populateMenuSelect();
  handleItemSelectChange();
  renderAdminMenuList();
  resetAdminMenuForm();
}

function deleteAdminMenuItem(id) {
  if (confirm("Delete this menu item?")) {
    menu = menu.filter(m => m.id !== id);
    if (window.db) {
      const menuRef = window.dbRef(window.db, 'menu');
      window.dbSet(menuRef, menu);
    }
    populateMenuSelect();
    handleItemSelectChange();
    renderAdminMenuList();
  }
}

function resetAdminMenuForm() {
  document.getElementById('edit-item-id').value = '';
  document.getElementById('admin-item-cat').value = '';
  document.getElementById('admin-item-name').value = '';
  document.getElementById('admin-item-price').value = '';
  document.getElementById('admin-has-double').checked = false;
  document.getElementById('admin-is-fries').checked = false;
}

function resetMenuToDefault() {
  if (confirm("Reset menu items back to default?")) {
    menu = [...DEFAULT_MENU];
    if (window.db) {
      const menuRef = window.dbRef(window.db, 'menu');
      window.dbSet(menuRef, menu);
    }
    populateMenuSelect();
    handleItemSelectChange();
    renderAdminMenuList();
  }
}

function updateCutoffTime() {
  const val = document.getElementById('cutoff-time-input').value;
  if (!val) return;
  const [h, m] = val.split(':');
  cutoffDate.setHours(parseInt(h), parseInt(m), 0, 0);
  document.getElementById('cutoff-time-display').textContent = cutoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('form-locked-overlay').classList.add('hidden');
}

function addTimerMinutes(mins) {
  cutoffDate = new Date(Date.now() + mins * 60000);
  document.getElementById('cutoff-time-display').textContent = cutoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('form-locked-overlay').classList.add('hidden');
}

function toggleFormLock() {
  isLocked = !isLocked;
  document.getElementById('form-locked-overlay').classList.toggle('hidden', !isLocked);
}

function clearAllOrders() {
  if (confirm("Are you sure you want to clear all orders?")) {
    if (window.db) {
      const ordersRef = window.dbRef(window.db, 'orders');
      window.dbSet(ordersRef, null);
    }
    closeAdminModal();
  }
}

function copyPhoneScript() {
  let script = "Aphrodite's Snacks Order:\n\n";
  const checklist = document.querySelectorAll('#phone-checklist .p-3');
  checklist.forEach(card => {
    const title = card.querySelector('span').textContent;
    script += `• ${title}\n`;
    const notes = card.querySelectorAll('.pl-6 div');
    notes.forEach(n => script += `  ${n.textContent}\n`);
  });
  navigator.clipboard.writeText(script);
}
