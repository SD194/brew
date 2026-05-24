/**
 * BrewSync Admin — Staff Management
 */
import { toast } from './main.js';
import { escapeAttribute, escapeHtml } from './sanitize.js';
import { fetchStaff, createStaff, updateStaff, deleteStaff } from './api.js';

// The hardcoded master admin who cannot be deleted or modified
const MASTER_ADMIN_EMAIL = 'sharathnaikhelpline@gmail.com';

let isLoading = false;

export async function renderStaff(container) {
  const needsFetch = !window.APP.hasFetchedStaff;

  if (needsFetch && !isLoading) {
    isLoading = true;
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">Loading staff data...</div>`;
    try {
      const liveStaff = await fetchStaff();
      window.APP.staff = liveStaff;
      window.APP.hasFetchedStaff = true;
    } catch (err) {
      toast('Failed to load live staff data', 'error');
    } finally {
      isLoading = false;
      renderStaff(container); // Re-render with real data
    }
    return;
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <span style="font-size:13px;color:var(--muted)" id="staffCount">${window.APP.staff.length} team members</span>
      <button class="btn-primary" id="addStaffBtn">+ Add Staff</button>
    </div>
    
    <div class="staff-grid" id="staffGrid">
      ${window.APP.staff.map(s => {
        const isMaster = s.email === MASTER_ADMIN_EMAIL;
        return `
        <div class="staff-card ${isMaster ? 'master-card' : ''}" style="${isMaster ? 'border-color: var(--brand-light)' : ''}">
          <div class="staff-avatar" style="${isMaster ? 'background: var(--brand); color: white' : ''}">${escapeHtml((s.name || s.email || 'A').charAt(0).toUpperCase())}</div>
          <div class="staff-info">
            <div class="staff-name-row">${escapeHtml(s.name || 'No Name')}</div>
            <div class="staff-email">${escapeHtml(s.email)}</div>
            <div style="display:flex; gap:8px; align-items:center; margin-top:6px">
              <span class="staff-role-badge ${escapeAttribute(s.role)}">${s.role === 'admin' ? 'Administrator' : 'Staff'}</span>
              ${isMaster ? '<span style="font-size: 10px; font-weight: bold; color: var(--brand); background: var(--brand-light); padding: 3px 6px; border-radius: 4px;">Protected</span>' : ''}
            </div>
          </div>
          ${!isMaster ? `<button class="btn-icon" data-edit-staff="${escapeAttribute(s.id)}" title="Edit">✏️</button>` : `<div style="width: 32px"></div>`}
        </div>`
      }).join('')}
    </div>

    <div class="modal-overlay" id="staffModal">
      <div class="modal" id="staffModalContent" style="position:relative"></div>
    </div>
  `;

  document.getElementById('addStaffBtn')?.addEventListener('click', () => showStaffModal(null));
  document.querySelectorAll('[data-edit-staff]').forEach(btn => {
    btn.addEventListener('click', () => showStaffModal(btn.dataset.editStaff));
  });
}

function showStaffModal(id) {
  const member = id ? window.APP.staff.find(s => s.id === id) : null;
  const modal = document.getElementById('staffModal');
  const content = document.getElementById('staffModalContent');
  const isNew = !member;

  content.innerHTML = `
    <button class="btn-icon" id="staffModalClose" style="position:absolute;top:16px;right:16px">✕</button>
    <div class="modal-title">${isNew ? 'Add Staff Member' : `Edit: ${escapeHtml(member.name || member.email)}`}</div>
    <div style="margin-top:16px;display:grid;gap:12px">
      <div class="form-group"><label>Full Name</label><input id="staffName" value="${escapeAttribute(member?.name||'')}"/></div>
      <div class="form-group"><label>Email</label><input type="email" id="staffEmail" value="${escapeAttribute(member?.email||'')}"/></div>
      <div class="form-group"><label>Role</label>
        <select id="staffRole" class="status-select">
          <option value="staff" ${member?.role==='staff'?'selected':''}>Staff</option>
          <option value="admin" ${member?.role==='admin'?'selected':''}>Administrator</option>
        </select>
      </div>
      <div class="form-group"><label>${isNew ? 'Temporary Password' : 'New Password (Leave blank to keep current)'}</label><input type="password" id="staffPass" placeholder="Min 6 characters"/></div>
      <div style="display:flex;gap:10px">
        <button class="btn-primary" style="flex:1" id="staffSaveBtn">${isNew ? 'Create Account' : 'Save Changes'}</button>
        ${!isNew ? '<button class="btn-danger" id="staffDeleteBtn">Delete</button>' : ''}
      </div>
    </div>
  `;

  modal.classList.add('show');
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('show'); };
  document.getElementById('staffModalClose').onclick = () => modal.classList.remove('show');

  const saveBtn = document.getElementById('staffSaveBtn');
  saveBtn.onclick = async () => {
    const name = document.getElementById('staffName').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const role = document.getElementById('staffRole').value;
    const password = document.getElementById('staffPass').value;
    
    if (!name || !email) { toast('Name and email are required', 'error'); return; }
    if (isNew && password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      if (isNew) {
        await createStaff({ name, email, role, password });
        window.APP.staff = await fetchStaff(); // refresh
        toast(`${name} added as ${role}`, 'success');
      } else {
        await updateStaff({ id, name, email, role, password });
        window.APP.staff = await fetchStaff(); // refresh
        toast(`${name} updated`, 'success');
      }
      modal.classList.remove('show');
      renderStaff(document.getElementById('pageContainer'));
    } catch (err) {
      toast(err.message, 'error');
      saveBtn.textContent = isNew ? 'Create Account' : 'Save Changes';
      saveBtn.disabled = false;
    }
  };

  const deleteBtn = document.getElementById('staffDeleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to permanently delete ${member.name}?`)) return;
      deleteBtn.textContent = 'Deleting...';
      deleteBtn.disabled = true;
      try {
        await deleteStaff(id);
        window.APP.staff = await fetchStaff(); // refresh
        modal.classList.remove('show');
        toast('Staff member removed', 'info');
        renderStaff(document.getElementById('pageContainer'));
      } catch (err) {
        toast(err.message, 'error');
        deleteBtn.textContent = 'Delete';
        deleteBtn.disabled = false;
      }
    });
  }
}
