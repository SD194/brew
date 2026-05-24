/**
 * BrewSync Admin — Menu Manager (CRUD)
 */
import { toast } from './main.js';
import { saveMenuItem, updateMenuAvailability } from './api.js';
import { escapeAttribute, escapeHtml, formatCurrency } from './sanitize.js';

export function renderMenuManager(container) {
  const { menuItems, categories } = window.APP;

  container.innerHTML = `
    <div class="menu-toolbar">
      <input type="text" class="menu-search" id="menuSearch" placeholder="Search menu items..."/>
      <select class="menu-search" id="menuCatFilter" style="width:180px">
        <option value="all">All Categories</option>
        ${categories.map(c => `<option value="${escapeAttribute(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <button class="btn-primary" id="addItemBtn" style="margin-left:auto">+ Add Item</button>
    </div>
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="menu-table">
        <thead><tr>
          <th>Item</th><th>Category</th><th>Price</th><th>Type</th><th>Featured</th><th>Available</th><th>Actions</th>
        </tr></thead>
        <tbody id="menuTableBody"></tbody>
      </table>
    </div>

    <!-- Edit Modal -->
    <div class="modal-overlay" id="menuModal">
      <div class="modal" id="menuModalContent" style="position:relative"></div>
    </div>
  `;

  renderMenuTable(menuItems);
  bindMenuEvents();
}

function renderMenuTable(items) {
  const body = document.getElementById('menuTableBody');
  const { categories } = window.APP;

  body.innerHTML = items.map(item => {
    const cat = categories.find(c => c.id === item.category_id);
    return `
      <tr data-id="${item.id}">
        <td><div class="menu-item-cell"><span class="menu-item-emoji-cell">${escapeHtml(item.emoji||'🍽️')}</span><span>${escapeHtml(item.name)}</span></div></td>
        <td style="font-size:12px;color:var(--muted)">${escapeHtml(cat?.name || '—')}</td>
        <td style="font-weight:700">${formatCurrency(item.price)}</td>
        <td><span class="${item.is_veg ? 'badge-veg' : 'badge-nonveg'}">${item.is_veg ? 'Veg' : 'Non-Veg'}</span></td>
        <td>${item.is_featured ? '⭐' : '—'}</td>
        <td><button class="menu-toggle ${item.is_available !== false ? 'on' : ''}" data-id="${escapeAttribute(item.id)}" data-field="available"></button></td>
        <td><button class="btn-ghost btn-sm" data-edit="${escapeAttribute(item.id)}">Edit</button></td>
      </tr>`;
  }).join('');
}

function bindMenuEvents() {
  // Search
  document.getElementById('menuSearch')?.addEventListener('input', filterMenu);
  document.getElementById('menuCatFilter')?.addEventListener('change', filterMenu);

  // Toggle availability
  document.querySelectorAll('.menu-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const item = window.APP.menuItems.find(i => i.id === id);
      if (item) {
        const nextValue = !item.is_available;
        try {
          const saved = await updateMenuAvailability(id, nextValue);
          item.is_available = saved.is_available;
          btn.classList.toggle('on', item.is_available);
          toast(`${item.name} ${item.is_available ? 'enabled' : 'disabled'}`, 'info');
        } catch (err) {
          toast(err.message || 'Unable to update item availability', 'error');
        }
      }
    });
  });

  // Edit buttons
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => showEditModal(btn.dataset.edit));
  });

  // Add item
  document.getElementById('addItemBtn')?.addEventListener('click', () => showEditModal(null));
}

function filterMenu() {
  const query = document.getElementById('menuSearch')?.value.toLowerCase() || '';
  const cat = document.getElementById('menuCatFilter')?.value || 'all';
  let items = window.APP.menuItems;
  if (cat !== 'all') items = items.filter(i => i.category_id === cat);
  if (query) items = items.filter(i => i.name.toLowerCase().includes(query));
  renderMenuTable(items);
  bindMenuEvents();
}

function showEditModal(id) {
  const item = id ? window.APP.menuItems.find(i => i.id === id) : null;
  const modal = document.getElementById('menuModal');
  const content = document.getElementById('menuModalContent');
  const isNew = !item;

  content.innerHTML = `
    <button class="btn-icon" id="menuModalClose" style="position:absolute;top:16px;right:16px">✕</button>
    <div class="modal-title">${isNew ? 'Add New Item' : `Edit: ${escapeHtml(item.name)}`}</div>
    <div style="margin-top:16px;display:grid;gap:12px">
      <div class="form-group"><label>Name</label><input id="editName" value="${escapeAttribute(item?.name||'')}"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Price (₹)</label><input type="number" id="editPrice" value="${escapeAttribute(item?.price||0)}"/></div>
        <div class="form-group"><label>Emoji</label><input id="editEmoji" value="${escapeAttribute(item?.emoji||'🍽️')}"/></div>
      </div>
      <div class="form-group"><label>Category</label>
        <select id="editCat" class="status-select">
          ${window.APP.categories.map(c => `<option value="${escapeAttribute(c.id)}" ${item?.category_id===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Description</label><textarea id="editDesc" class="status-select" rows="2">${escapeHtml(item?.description||'')}</textarea></div>
      <div style="display:flex;gap:16px;font-size:13px">
        <label><input type="checkbox" id="editVeg" ${item?.is_veg!==false?'checked':''}/> Veg</label>
        <label><input type="checkbox" id="editFeatured" ${item?.is_featured?'checked':''}/> Featured</label>
        <label><input type="checkbox" id="editCustomizable" ${item?.is_customizable?'checked':''}/> Customizable</label>
      </div>
      <button class="btn-primary btn-full" id="editSaveBtn">${isNew ? 'Add Item' : 'Save Changes'}</button>
    </div>
  `;

  modal.classList.add('show');
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('show'); };
  document.getElementById('menuModalClose').onclick = () => modal.classList.remove('show');

  document.getElementById('editSaveBtn').onclick = async () => {
    const data = {
      name: document.getElementById('editName').value.trim(),
      price: parseInt(document.getElementById('editPrice').value) || 0,
      emoji: document.getElementById('editEmoji').value || '🍽️',
      category_id: document.getElementById('editCat').value,
      description: document.getElementById('editDesc').value,
      is_veg: document.getElementById('editVeg').checked,
      is_featured: document.getElementById('editFeatured').checked,
      is_customizable: document.getElementById('editCustomizable').checked,
      is_available: true
    };

    if (!data.name) { toast('Name is required', 'error'); return; }
    if (isNew) data.id = 'new-' + Date.now();

    try {
      const saved = await saveMenuItem(isNew ? data : { ...item, ...data });

      if (isNew) {
        window.APP.menuItems.push(saved);
        toast(`${saved.name} added!`, 'success');
      } else {
        Object.assign(item, saved);
        toast(`${saved.name} updated!`, 'success');
      }

      modal.classList.remove('show');
      filterMenu();
    } catch (err) {
      toast(err.message || 'Unable to save menu item', 'error');
    }
  };
}
