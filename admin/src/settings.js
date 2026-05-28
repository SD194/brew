import { fetchStoreSettings, updateStoreSettings } from './api.js';
import { toast } from './main.js';

let isOnline = true;

export async function renderSettings(container) {
  container.innerHTML = `
    <div class="card" style="max-width: 500px; margin: 0 auto;">
      <div class="card-header">
        <div class="card-title">Store Operations</div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 0; border-top: 1px solid var(--border);">
        <div>
          <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Accept Online Orders</div>
          <div style="font-size: 13px; color: var(--muted);">When disabled, customers will see a 'Store Closed' message and cannot place orders.</div>
        </div>
        <button id="storeOnlineToggle" class="menu-toggle ${isOnline ? 'on' : ''}"></button>
      </div>
    </div>
  `;

  const toggleBtn = document.getElementById('storeOnlineToggle');
  
  // Load current state
  try {
    const settings = await fetchStoreSettings();
    isOnline = settings.is_online;
    if (isOnline) {
      toggleBtn.classList.add('on');
    } else {
      toggleBtn.classList.remove('on');
    }
  } catch (err) {
    console.error('Failed to load settings', err);
    toast('Failed to load store settings', 'error');
  }

  // Handle toggle click
  toggleBtn.addEventListener('click', async () => {
    const newStatus = !isOnline;
    
    // Optimistic UI update
    isOnline = newStatus;
    if (isOnline) toggleBtn.classList.add('on');
    else toggleBtn.classList.remove('on');

    try {
      await updateStoreSettings(newStatus);
      toast(newStatus ? 'Store is now ONLINE' : 'Store is now OFFLINE', newStatus ? 'success' : 'error');
    } catch (err) {
      console.error(err);
      toast('Failed to update store settings', 'error');
      
      // Revert UI on failure
      isOnline = !newStatus;
      if (isOnline) toggleBtn.classList.add('on');
      else toggleBtn.classList.remove('on');
    }
  });
}
