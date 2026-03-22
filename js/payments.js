import { loadStripe } from 'https://cdn.jsdelivr.net/npm/@stripe/stripe-js@1/+esm';

const STRIPE_KEY = 'pk_test_placeholder';
const API_URL = 'http://localhost:3002';

const FREE_LIMITS = {
  watchlist: 5,
  trades: 50,
  analytics: false,
  exportPdf: false,
  alerts: false
};

const PRO_PRICE = 9.99;

let stripe = null;
let user = null;
let subscription = { tier: 'free', status: 'active' };

export function initPayments() {
  if (STRIPE_KEY !== 'pk_test_placeholder') {
    stripe = Stripe(STRIPE_KEY);
  }
}

export function isPro() {
  return subscription.tier === 'pro';
}

export function canUseFeature(feature) {
  if (isPro()) return true;
  
  switch (feature) {
    case 'watchlist':
      return getWatchlist().length < FREE_LIMITS.watchlist;
    case 'trades':
      return getTrades().length < FREE_LIMITS.trades;
    case 'analytics':
    case 'exportPdf':
    case 'alerts':
      return false;
    default:
      return true;
  }
}

export function getLimits() {
  return {
    ...FREE_LIMITS,
    isPro: isPro(),
    watchlistUsed: getWatchlist().length,
    tradesUsed: getTrades().length
  };
}

export async function subscribe() {
  if (isPro()) return { success: true, message: 'Already subscribed' };
  
  if (!stripe) {
    return simulateProSubscription();
  }
  
  try {
    const session = await stripe.redirectToCheckout({
      lineItems: [{ price: 'price_pro_monthly', quantity: 1 }],
      mode: 'subscription',
      successUrl: `${window.location.origin}/app.html?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/app.html?cancelled=true`
    });
    
    if (session.error) {
      return { success: false, error: session.error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Subscription error:', error);
    return { success: false, error: error.message };
  }
}

export function simulateProSubscription() {
  subscription.tier = 'pro';
  sessionStorage.setItem('subscription', JSON.stringify(subscription));
  return { success: true, message: 'Upgraded to Pro!' };
}

export function cancelSubscription() {
  subscription.tier = 'free';
  sessionStorage.setItem('subscription', JSON.stringify(subscription));
  return { success: true };
}

export function loadSubscription() {
  const stored = sessionStorage.getItem('subscription');
  if (stored) {
    subscription = JSON.parse(stored);
  }
  return subscription;
}

function getWatchlist() {
  const stored = sessionStorage.getItem('watchlist');
  return stored ? JSON.parse(stored) : [];
}

function getTrades() {
  const stored = sessionStorage.getItem('trades');
  return stored ? JSON.parse(stored) : [];
}

export function renderUpgradeModal() {
  return `
    <div class="upgrade-modal">
      <div class="upgrade-header">
        <div class="upgrade-icon"><i data-lucide="crown"></i></div>
        <h2>Upgrade to Pro</h2>
        <p>Unlock all features and take your trading to the next level</p>
      </div>
      
      <div class="upgrade-features">
        <div class="upgrade-feature">
          <i data-lucide="check"></i>
          <span><strong>Unlimited</strong> watchlist items</span>
        </div>
        <div class="upgrade-feature">
          <i data-lucide="check"></i>
          <span><strong>Unlimited</strong> trades tracked</span>
        </div>
        <div class="upgrade-feature">
          <i data-lucide="check"></i>
          <span><strong>Advanced analytics</strong> & charts</span>
        </div>
        <div class="upgrade-feature">
          <i data-lucide="check"></i>
          <span><strong>PDF reports</strong> export</span>
        </div>
        <div class="upgrade-feature">
          <i data-lucide="check"></i>
          <span><strong>Price alerts</strong> for watchlist</span>
        </div>
      </div>
      
      <div class="upgrade-pricing">
        <div class="price-tag">
          <span class="price">$${PRO_PRICE}</span>
          <span class="period">/month</span>
        </div>
        <p class="price-note">Cancel anytime. No hidden fees.</p>
      </div>
      
      <button class="btn btn-primary btn-full" id="upgradeConfirm">
        <i data-lucide="zap"></i>
        Upgrade to Pro
      </button>
    </div>
  `;
}

export function renderProBadge() {
  if (isPro()) {
    return '<span class="pro-badge"><i data-lucide="crown"></i> PRO</span>';
  }
  return '';
}

export { PRO_PRICE, FREE_LIMITS };
