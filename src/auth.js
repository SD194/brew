import { showToast } from './animations.js';
import * as UI from './ui.js';

let guestEmail = sessionStorage.getItem('guestEmail') || null;
// checkoutInitiated tracks if they either entered an email or explicitly skipped.
let checkoutInitiated = sessionStorage.getItem('checkoutInitiated') === 'true';

export function hasCompletedCheckoutStep() {
  return checkoutInitiated;
}

export function getOrderEmail() {
  return guestEmail || null;
}

export function openGuestCheckout() {
  UI.openSheet('guestDetailsSheet');
}

export function setupAuthListeners(onSuccessCallback) {
  const proceedBtn = document.getElementById('proceedGuestBtn');
  const skipBtn = document.getElementById('skipGuestBtn');

  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      const email = document.getElementById('guestEmailInput').value.trim();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        showToast('Please enter a valid email address, or click Skip.', 'error');
        return;
      }

      guestEmail = email;
      checkoutInitiated = true;
      sessionStorage.setItem('guestEmail', email);
      sessionStorage.setItem('checkoutInitiated', 'true');
      
      UI.closeAllSheets();
      if (onSuccessCallback) onSuccessCallback();
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      guestEmail = null; // null for skipped
      checkoutInitiated = true;
      sessionStorage.removeItem('guestEmail');
      sessionStorage.setItem('checkoutInitiated', 'true');
      
      UI.closeAllSheets();
      if (onSuccessCallback) onSuccessCallback();
    });
  }
}
