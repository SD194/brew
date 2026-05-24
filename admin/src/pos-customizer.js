/**
 * BrewSync Admin — POS Item Customizer
 * Modal for customizing menu items before adding to cart.
 */
import { escapeAttribute, escapeHtml, formatCurrency } from './sanitize.js';

// Customization options per category slug
const CUSTOM_OPTIONS = {
  'hot-coffee': {
    size: [
      { label: 'Regular', price: 0 },
      { label: 'Large', price: 30 },
      { label: 'Extra Large', price: 50 }
    ],
    milk: ['Regular', 'Oat Milk (+₹30)', 'Almond Milk (+₹40)', 'Soy Milk (+₹25)', 'No Milk'],
    sugar: ['Regular', 'Less Sugar', 'No Sugar', 'Extra Sweet'],
    extras: [
      { label: 'Extra Shot', price: 40 },
      { label: 'Whipped Cream', price: 30 },
      { label: 'Chocolate Drizzle', price: 20 },
      { label: 'Vanilla Syrup', price: 25 }
    ]
  },
  'cold-coffee': {
    size: [
      { label: 'Regular', price: 0 },
      { label: 'Large', price: 30 },
      { label: 'Extra Large', price: 50 }
    ],
    milk: ['Regular', 'Oat Milk (+₹30)', 'Almond Milk (+₹40)', 'No Milk'],
    sugar: ['Regular', 'Less Sugar', 'No Sugar'],
    extras: [
      { label: 'Extra Shot', price: 40 },
      { label: 'Whipped Cream', price: 30 },
      { label: 'Caramel Drizzle', price: 25 }
    ]
  },
  'sandwiches': {
    bread: ['Sourdough', 'Multigrain', 'White', 'Gluten-Free (+₹40)'],
    extras: [
      { label: 'Extra Cheese', price: 30 },
      { label: 'Avocado', price: 50 },
        { label: 'Jalapenos', price: 20 }
    ]
  },
  'default': {
    extras: [
      { label: 'Extra Portion', price: 50 }
    ]
  }
};

let currentItem = null;
let selectedOptions = {};

export function openPOSCustomizer(item, categorySlug, onAddCallback) {
  currentItem = item;
  const options = CUSTOM_OPTIONS[categorySlug] || CUSTOM_OPTIONS['default'];
  selectedOptions = { size: 0, notes: '' };

  // Ensure modal container exists
  let modal = document.getElementById('posCustomizerModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'posCustomizerModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal" id="posCustomizerContent" style="position:relative; padding:0; overflow:hidden;"></div>`;
    document.body.appendChild(modal);
  }
  const content = document.getElementById('posCustomizerContent');

  // Header
  let html = `
    <button class="btn-icon" id="custModalClose" style="position:absolute;top:16px;right:16px;z-index:10;background:#fff;border-radius:50%">✕</button>
    <div class="cust-item-header">
      <div class="${item.is_veg ? 'veg-dot' : 'nonveg-dot'}"></div>
      <div>
        <div class="cust-item-name">${escapeHtml(item.name)}</div>
        <div class="cust-item-price" id="custPrice">${formatCurrency(item.price)}</div>
      </div>
    </div>
    <div style="max-height: 60vh; overflow-y: auto; padding-bottom: 80px;">`; // Wrap sections in scrollable area

  // Size options
  if (options.size) {
    html += `<div class="cust-section">
      <div class="cust-section-title">Size</div>
      <div class="cust-chips" data-group="size">
        ${options.size.map((s, i) => `
          <label class="cust-chip ${i === 0 ? 'selected' : ''}">
            <input type="radio" name="cust-size" value="${i}" data-extra="${escapeAttribute(s.price)}" ${i === 0 ? 'checked' : ''}/>
            <span>${escapeHtml(s.label)}${s.price ? ` (+${formatCurrency(s.price)})` : ''}</span>
          </label>`).join('')}
      </div>
    </div>`;
  }

  // Milk type
  if (options.milk) {
    html += `<div class="cust-section">
      <div class="cust-section-title">Milk Type</div>
      <div class="cust-chips" data-group="milk">
        ${options.milk.map((m, i) => `
          <label class="cust-chip ${i === 0 ? 'selected' : ''}">
            <input type="radio" name="cust-milk" value="${escapeAttribute(m)}" ${i === 0 ? 'checked' : ''}/>
            <span>${escapeHtml(m)}</span>
          </label>`).join('')}
      </div>
    </div>`;
  }

  // Bread type
  if (options.bread) {
    html += `<div class="cust-section">
      <div class="cust-section-title">Bread</div>
      <div class="cust-chips" data-group="bread">
        ${options.bread.map((b, i) => `
          <label class="cust-chip ${i === 0 ? 'selected' : ''}">
            <input type="radio" name="cust-bread" value="${escapeAttribute(b)}" ${i === 0 ? 'checked' : ''}/>
            <span>${escapeHtml(b)}</span>
          </label>`).join('')}
      </div>
    </div>`;
  }

  // Sugar level
  if (options.sugar) {
    html += `<div class="cust-section">
      <div class="cust-section-title">Sugar Level</div>
      <div class="cust-chips" data-group="sugar">
        ${options.sugar.map((s, i) => `
          <label class="cust-chip ${i === 0 ? 'selected' : ''}">
            <input type="radio" name="cust-sugar" value="${escapeAttribute(s)}" ${i === 0 ? 'checked' : ''}/>
            <span>${escapeHtml(s)}</span>
          </label>`).join('')}
      </div>
    </div>`;
  }

  // Extras (multi-select)
  if (options.extras) {
    html += `<div class="cust-section">
      <div class="cust-section-title">Add Extras</div>
      <div class="cust-extras">
        ${options.extras.map(e => `
          <label class="cust-extra-row">
            <div>
              <span class="cust-extra-name">${escapeHtml(e.label)}</span>
              <span class="cust-extra-price">+${formatCurrency(e.price)}</span>
            </div>
            <input type="checkbox" class="cust-extra-check" data-price="${escapeAttribute(e.price)}" data-label="${escapeAttribute(e.label)}"/>
          </label>`).join('')}
      </div>
    </div>`;
  }

  // Notes
  html += `<div class="cust-section">
    <div class="cust-section-title">Special Instructions</div>
    <textarea class="cust-notes" id="custNotes" placeholder="e.g. No ice, extra hot, allergies..." maxlength="200"></textarea>
  </div>`;

  // Add button
  html += `<button class="cust-add-btn" id="custAddBtn">
    <span>ADD TO CART</span>
    <span id="custTotalPrice">${formatCurrency(item.price)}</span>
  </button>
  </div>`; // close scrollable area

  content.innerHTML = html;
  modal.classList.add('show');
  
  document.getElementById('custModalClose').onclick = () => modal.classList.remove('show');
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('show'); };

  setupCustomizerListeners(item, options, onAddCallback, modal);
}

function setupCustomizerListeners(item, options, onAddCallback, modal) {
  const content = document.getElementById('posCustomizerContent');

  // Radio chip selection styling
  content.querySelectorAll('.cust-chips input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const group = radio.closest('.cust-chips');
      group.querySelectorAll('.cust-chip').forEach(c => c.classList.remove('selected'));
      radio.closest('.cust-chip').classList.add('selected');
      updateCustomPrice(item, options);
    });
  });

  // Checkbox extras
  content.querySelectorAll('.cust-extra-check').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.cust-extra-row').classList.toggle('active', cb.checked);
      updateCustomPrice(item, options);
    });
  });

  // Add to cart
  document.getElementById('custAddBtn').addEventListener('click', () => {
    const notes = buildNotesString();
    const extraPrice = calcExtraPrice(options);
    const totalPrice = item.price + extraPrice;

    if (onAddCallback) {
      onAddCallback(item, totalPrice, notes);
    }

    modal.classList.remove('show');
  });
}

function updateCustomPrice(item, options) {
  const extra = calcExtraPrice(options);
  const total = item.price + extra;
  const el = document.getElementById('custTotalPrice');
  if (el) el.textContent = formatCurrency(total);
  const priceEl = document.getElementById('custPrice');
  if (priceEl) priceEl.textContent = formatCurrency(total);
}

function calcExtraPrice(options) {
  let extra = 0;
  // Size extra
  const sizeRadio = document.querySelector('input[name="cust-size"]:checked');
  if (sizeRadio) extra += +(sizeRadio.dataset.extra || 0);
  // Extras
  document.querySelectorAll('.cust-extra-check:checked').forEach(cb => {
    extra += +(cb.dataset.price || 0);
  });
  return extra;
}

function buildNotesString() {
  const parts = [];
  // Collect all radio selections
  ['size', 'milk', 'bread', 'sugar'].forEach(name => {
    const radio = document.querySelector(`input[name="cust-${name}"]:checked`);
    if (radio) {
      const label = radio.closest('.cust-chip')?.querySelector('span')?.textContent;
      if (label && !label.startsWith('Regular')) parts.push(label.replace(/\s*\(\+₹[\d,]+\)/, ''));
    }
  });
  // Extras
  document.querySelectorAll('.cust-extra-check:checked').forEach(cb => {
    parts.push(cb.dataset.label);
  });
  // Notes textarea
  const notes = document.getElementById('custNotes')?.value.trim();
  if (notes) parts.push(`Note: ${notes}`);
  return parts.join(' · ');
}
