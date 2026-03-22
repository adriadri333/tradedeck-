const POPULAR_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'NFLX', 'DIS', 'SPY', 'QQQ', 'DIA', 'IWM'];

const FREE_LIMITS = { watchlist: 3, trades: 30 };
const PRO_PRICE = 4.98;

let currentView = 'market';
let currentStock = null;
let stockChart = null;
let priceRefreshInterval = null;
let subscription = { tier: 'free', status: 'inactive' };
let priceAlerts = [];
let currentUser = null;

function initApp() {
  let user = sessionStorage.getItem('user');
  if (!user) {
    user = JSON.stringify({ id: 'demo', email: 'demo@tradedeck.app' });
    sessionStorage.setItem('user', user);
  }
  
  currentUser = JSON.parse(user);
  document.getElementById('userName').textContent = currentUser.email?.split('@')[0] || 'Trader';
  document.getElementById('userAvatar').textContent = (currentUser.email?.[0] || 'T').toUpperCase();
  
  lucide.createIcons();
  setupNavigation();
  setupEventListeners();
  loadMarket();
  updateCounts();
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'x-circle'}"></i><span class="toast-content">${message}</span>`;
  document.getElementById('toastContainer')?.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => toast.remove(), 3000);
}

function getTrades() {
  return JSON.parse(sessionStorage.getItem('trades') || '[]');
}

function saveTrades(trades) {
  sessionStorage.setItem('trades', JSON.stringify(trades));
}

function getWatchlist() {
  return JSON.parse(sessionStorage.getItem('watchlist') || '[]');
}

function saveWatchlist(items) {
  sessionStorage.setItem('watchlist', JSON.stringify(items));
}

function isPro() { return subscription.tier === 'pro'; }

function canUseFeature(feature) {
  if (isPro()) return true;
  switch (feature) {
    case 'watchlist': return getWatchlist().length < FREE_LIMITS.watchlist;
    case 'trades': return getTrades().length < FREE_LIMITS.trades;
    case 'analytics':
    case 'exportPdf':
    case 'alerts':
      return false;
    default: return true;
  }
}

function updateSubscriptionUI() {
  if (isPro()) {
    document.getElementById('userTier').textContent = 'PRO';
    document.getElementById('userTier').style.color = '#FFD700';
  }
}

function setupNavigation() {
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'analytics' && !isPro()) {
        showUpgradeModal('Advanced Analytics', 'Unlock full analytics, win rate tracking, and P&L breakdowns.');
        return;
      }
      if (view === 'alerts' && !isPro()) {
        showUpgradeModal('Price Alerts', 'Set custom price alerts to get notified when stocks hit your targets.');
        return;
      }
      if (view === 'calendar' && !isPro()) {
        showUpgradeModal('Trading Calendar', 'View your trading activity on a monthly calendar with P&L tracking.');
        return;
      }
      navigateTo(view);
    });
  });
  
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.clear();
    localStorage.removeItem('sb_token');
    window.location.href = 'index.html';
  });
}

function navigateTo(view) {
  currentView = view;
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === view + 'View'));
  document.getElementById('pageTitle').textContent = view.charAt(0).toUpperCase() + view.slice(1);
  lucide.createIcons();
  
  if (view === 'market') loadMarket();
  else if (view === 'trades') loadTrades();
  else if (view === 'watchlist') loadWatchlist();
  else if (view === 'analytics') loadAnalytics();
  else if (view === 'alerts') loadAlerts();
  else if (view === 'calendar') loadCalendar();
}

function setupEventListeners() {
  document.getElementById('addTradeBtn')?.addEventListener('click', () => {
    if (!canUseFeature('trades')) {
      showUpgradeModal('Trade Limit', `Free plan allows ${FREE_LIMITS.trades} trades.`);
      return;
    }
    openTradeModal();
  });
  
  document.getElementById('emptyAddTrade')?.addEventListener('click', () => openTradeModal());
  document.getElementById('closeTradeModal')?.addEventListener('click', closeTradeModal);
  document.getElementById('cancelTrade')?.addEventListener('click', closeTradeModal);
  document.getElementById('tradeForm')?.addEventListener('submit', handleTradeSubmit);
  
  ['tradeEntry', 'tradeExit', 'tradeSize'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePnlPreview);
  });
  
  document.getElementById('backToStocks')?.addEventListener('click', () => {
    document.getElementById('stockDetail').classList.add('hidden');
    document.getElementById('stocksGrid').classList.remove('hidden');
  });
  
  document.getElementById('addToWatchlistBtn')?.addEventListener('click', addCurrentToWatchlist);
  
  document.getElementById('tradeFromDetailBtn')?.addEventListener('click', () => {
    if (currentStock) {
      openTradeModal();
      document.getElementById('tradeSymbol').value = currentStock.symbol;
    }
  });
  
  setupStockSearch();
  setupMarketFilters();
  setupAlertListeners();
}

function setupStockSearch() {
  const input = document.getElementById('stockSearch');
  const results = document.getElementById('searchResults');
  let timeout;
  
  input?.addEventListener('input', () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    if (q.length < 1) { results.classList.add('hidden'); return; }
    timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.length > 0) {
          results.innerHTML = data.map(s => `<div class="search-result-item" data-symbol="${s.symbol}" data-name="${s.name}"><span class="search-result-symbol">${s.symbol}</span><br><span class="search-result-name">${s.name}</span></div>`).join('');
          results.classList.remove('hidden');
          results.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
              showStockDetail(item.dataset.symbol, item.dataset.name);
              input.value = '';
              results.classList.add('hidden');
            });
          });
        } else { results.classList.add('hidden'); }
      } catch (e) { results.classList.add('hidden'); }
    }, 300);
  });
  
  input?.addEventListener('blur', () => setTimeout(() => results.classList.add('hidden'), 200));
}

function setupMarketFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadMarket(btn.dataset.filter);
    });
  });
}

function setupAlertListeners() {
  document.getElementById('createAlertBtn')?.addEventListener('click', () => {
    document.getElementById('alertModal').classList.remove('hidden');
    document.getElementById('alertSymbol').value = currentStock?.symbol || '';
  });
  
  document.getElementById('closeAlertModal')?.addEventListener('click', () => document.getElementById('alertModal').classList.add('hidden'));
  document.getElementById('cancelAlert')?.addEventListener('click', () => document.getElementById('alertModal').classList.add('hidden'));
  document.getElementById('alertForm')?.addEventListener('submit', (e) => { e.preventDefault(); createAlert(); });
  document.getElementById('closePaymentModal')?.addEventListener('click', () => document.getElementById('paymentModal').classList.add('hidden'));
}

function showUpgradeModal(title, message) {
  document.getElementById('upgradeModal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'upgradeModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal" style="max-width: 420px;"><div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="document.getElementById('upgradeModal').remove()"><i data-lucide="x"></i></button></div><div class="modal-body" style="text-align: center;"><p style="color: var(--text-secondary); margin-bottom: 16px;">${message}</p><div style="background: var(--bg-tertiary); border-radius: 12px; padding: 24px; margin-bottom: 20px;"><div style="color: #FFD700; margin-bottom: 12px;"><svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg></div><h4 style="margin-bottom: 16px;">TradeDeck Pro</h4><ul style="list-style: none; text-align: left; padding: 0; margin: 0;"><li style="padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="flex: 1;">Unlimited Trades</span></li><li style="padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="flex: 1;">Unlimited Watchlist</span></li><li style="padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="flex: 1;">Advanced Analytics</span></li><li style="padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="flex: 1;">P&L Trading Calendar</span></li><li style="padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="flex: 1;">Custom Price Alerts</span></li><li style="padding: 10px 0; display: flex; align-items: center; gap: 10px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="flex: 1;">PDF Export</span></li></ul></div><div style="margin-bottom: 16px;"><span style="font-size: 2.5rem; font-weight: 700;">$${PRO_PRICE}</span><span style="color: var(--text-secondary);">/month</span></div><button class="btn btn-primary btn-full" onclick="upgradeToPro()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Upgrade to Pro</button><button class="btn btn-ghost btn-full" onclick="document.getElementById('upgradeModal').remove()" style="margin-top: 8px;">Maybe Later</button></div></div>`;
  document.body.appendChild(modal);
  lucide.createIcons();
}

window.upgradeToPro = function() {
  document.getElementById('paymentModal').classList.remove('hidden');
};

window.processPayment = async function() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, userId: user.id })
    });
    
    const data = await res.json();
    
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Checkout failed');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const sub = JSON.parse(sessionStorage.getItem('subscription') || '{}');
  if (sub.tier === 'pro') {
    subscription = sub;
    updateSubscriptionUI();
  }
  
  document.getElementById('subscribeBtn')?.addEventListener('click', processPayment);
});

async function loadMarket() {
  const grid = document.getElementById('stocksGrid');
  grid.innerHTML = '<div class="loading-spinner">Loading stocks...</div>';
  
  try {
    const symbols = POPULAR_STOCKS.join(',');
    const res = await fetch(`/api/stocks?symbols=${symbols}`);
    const stocks = await res.json();
    
    grid.innerHTML = stocks.map(s => {
      const change = s.change || 0;
      const changePercent = s.changePercent || 0;
      const changeClass = change >= 0 ? 'profit' : 'loss';
      const prefix = change >= 0 ? '+' : '';
      return `<div class="stock-card" data-symbol="${s.symbol}"><div class="stock-card-symbol">${s.symbol}</div><div class="stock-card-name">${s.name || s.symbol}</div><span class="stock-card-price">$${(s.price || 0).toFixed(2)}</span> <span class="stock-card-change ${changeClass}">${prefix}${change.toFixed(2)} (${changePercent.toFixed(2)}%)</span></div>`;
    }).join('');
    
    grid.querySelectorAll('.stock-card').forEach(card => {
      card.addEventListener('click', () => showStockDetail(card.dataset.symbol));
    });
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><h3>Failed to load stocks</h3><p>Check your connection</p></div>';
  }
}

async function showStockDetail(symbol, name = '') {
  currentStock = { symbol, name };
  document.getElementById('stocksGrid').classList.add('hidden');
  document.getElementById('stockDetail').classList.remove('hidden');
  
  if (priceRefreshInterval) clearInterval(priceRefreshInterval);
  
  const loadQuote = async () => {
    try {
      const res = await fetch(`/api/stocks?symbols=${symbol}`);
      const data = await res.json();
      const stock = Array.isArray(data) ? data[0] : data;
      if (!stock || stock.error) return;
      
      currentStock = { ...currentStock, ...stock };
      
      document.getElementById('detailSymbol').textContent = symbol;
      document.getElementById('detailName').textContent = stock.name || symbol;
      document.getElementById('detailPrice').textContent = `$${(stock.price || 0).toFixed(2)}`;
      const change = stock.change || 0;
      const changePercent = stock.changePercent || 0;
      document.getElementById('detailChange').textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
      document.getElementById('detailChange').className = `stock-change ${change >= 0 ? 'profit' : 'loss'}`;
      document.getElementById('detailOpen').textContent = `$${(stock.open || 0).toFixed(2)}`;
      document.getElementById('detailHigh').textContent = `$${(stock.high || 0).toFixed(2)}`;
      document.getElementById('detailLow').textContent = `$${(stock.low || 0).toFixed(2)}`;
      document.getElementById('detailVolume').textContent = '-';
      document.getElementById('lastUpdated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (e) { console.error(e); }
  };
  
  await loadQuote();
  await loadStockChart(symbol);
}

async function loadStockChart(symbol) {
  try {
    const res = await fetch(`/api/chart?symbol=${symbol}`);
    const candles = await res.json();
    if (!candles || candles.length === 0) {
      document.getElementById('stockChart').style.display = 'none';
      return;
    }
    
    document.getElementById('stockChart').style.display = 'block';
    const ctx = document.getElementById('stockChart').getContext('2d');
    const prices = candles.map(c => c.close).filter(p => p !== null);
    if (prices.length === 0) return;
    
    const isUp = prices[prices.length - 1] >= prices[0];
    const lineColor = isUp ? '#10B981' : '#EF4444';
    
    if (stockChart) {
      stockChart.destroy();
    }
    
    stockChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: candles.map(() => ''),
        datasets: [{ data: prices, borderColor: lineColor, borderWidth: 2, fill: false, tension: 0.4, pointRadius: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: true, grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8B949E' } } } }
    });
    }
  } catch (e) { console.error('Chart error:', e); }
}

function addCurrentToWatchlist() {
  if (!currentStock || !canUseFeature('watchlist')) return;
  const watchlist = getWatchlist();
  if (watchlist.some(w => w.symbol === currentStock.symbol)) return;
  watchlist.push({ symbol: currentStock.symbol, name: currentStock.name || currentStock.symbol, addedAt: Date.now() });
  saveWatchlist(watchlist);
  updateCounts();
  showToast(`${currentStock.symbol} added to watchlist`);
}

async function loadWatchlist() {
  const container = document.getElementById('watchlistPrices');
  const watchlist = getWatchlist();
  
  if (watchlist.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>Watchlist is empty</h3><p>Add stocks from the Market tab</p></div>';
    return;
  }
  
  try {
    const symbols = watchlist.map(w => w.symbol).join(',');
    const res = await fetch(`/api/stocks?symbols=${symbols}`);
    const stocks = await res.json();
    
    container.innerHTML = stocks.map(s => {
      const change = s.change || 0;
      const changePercent = s.changePercent || 0;
      const changeClass = change >= 0 ? 'profit' : 'loss';
      const prefix = change >= 0 ? '+' : '';
      return `<div class="watchlist-card" data-symbol="${s.symbol}"><div class="watchlist-card-header"><div class="watchlist-symbol">${s.symbol}</div><button class="watchlist-remove" onclick="event.stopPropagation(); removeFromWatchlist('${s.symbol}')">×</button></div><div class="watchlist-price">$${(s.price || 0).toFixed(2)}</div><div class="watchlist-change ${changeClass}">${prefix}${change.toFixed(2)} (${changePercent.toFixed(2)}%)</div><canvas id="mini-${s.symbol}" height="60"></canvas></div>`;
    }).join('');
    
    container.querySelectorAll('.watchlist-card').forEach(card => {
      card.addEventListener('click', () => showStockDetail(card.dataset.symbol));
      loadMiniChart(card.dataset.symbol);
    });
  } catch (e) { console.error(e); }
}

async function loadMiniChart(symbol) {
  try {
    const res = await fetch(`/api/chart?symbol=${symbol}&resolution=D`);
    const candles = await res.json();
    if (!candles || candles.length === 0) return;
    const prices = candles.map(c => c.close).filter(p => p !== null);
    if (prices.length === 0) return;
    const ctx = document.getElementById(`mini-${symbol}`)?.getContext('2d');
    if (!ctx) return;
    const isUp = prices[prices.length - 1] >= prices[0];
    new Chart(ctx, { type: 'line', data: { labels: prices.map(() => ''), datasets: [{ data: prices, borderColor: isUp ? '#10B981' : '#EF4444', borderWidth: 1.5, fill: false, tension: 0.4, pointRadius: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } } });
  } catch (e) {}
}

window.removeFromWatchlist = function(symbol) {
  saveWatchlist(getWatchlist().filter(w => w.symbol !== symbol));
  updateCounts();
  loadWatchlist();
};

async function loadTrades() {
  const trades = getTrades();
  const tbody = document.getElementById('tradesTableBody');
  const empty = document.getElementById('tradesEmpty');
  
  if (trades.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  tbody.innerHTML = [...trades].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(t => {
    const pnl = (t.exit_price - t.entry_price) * t.position_size;
    const pnlPercent = ((t.exit_price - t.entry_price) / t.entry_price) * 100;
    const pnlClass = pnl >= 0 ? 'profit' : 'loss';
    return `<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td class="td-symbol">${t.symbol}</td><td>$${t.entry_price.toFixed(2)}</td><td>$${t.exit_price.toFixed(2)}</td><td>${t.position_size}</td><td class="td-pnl ${pnlClass}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(1)}%)</td><td>${t.strategy || '-'}</td><td class="td-actions"><button onclick="deleteTrade('${t.id}')">×</button></td></tr>`;
  }).join('');
}

function loadAnalytics() {
  const trades = getTrades();
  const total = trades.length;
  const winners = trades.filter(t => (t.exit_price - t.entry_price) * t.position_size > 0).length;
  const totalPnl = trades.reduce((sum, t) => sum + (t.exit_price - t.entry_price) * t.position_size, 0);
  const winRate = total > 0 ? (winners / total) * 100 : 0;
  
  document.getElementById('analyticsTotal').textContent = `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`;
  document.getElementById('analyticsTotal').className = `value ${totalPnl >= 0 ? 'profit' : 'loss'}`;
  document.getElementById('analyticsTotalTrades').textContent = total;
  document.getElementById('analyticsWinRate').textContent = `${winRate.toFixed(1)}%`;
}

window.deleteTrade = function(id) {
  if (!confirm('Delete this trade?')) return;
  saveTrades(getTrades().filter(t => t.id !== id));
  updateCounts();
  loadTrades();
};

function updateCounts() {
  document.getElementById('tradeCount').textContent = getTrades().length;
  document.getElementById('watchlistCount').textContent = getWatchlist().length;
}

function openTradeModal(tradeId = null) {
  const form = document.getElementById('tradeForm');
  form.reset();
  document.getElementById('tradeDate').value = new Date().toISOString().split('T')[0];
  if (tradeId) {
    const trade = getTrades().find(t => t.id === tradeId);
    if (trade) {
      document.getElementById('tradeId').value = trade.id;
      document.getElementById('tradeSymbol').value = trade.symbol;
      document.getElementById('tradeEntry').value = trade.entry_price;
      document.getElementById('tradeExit').value = trade.exit_price;
      document.getElementById('tradeSize').value = trade.position_size;
      document.getElementById('tradeStrategy').value = trade.strategy || '';
    }
  }
  document.getElementById('tradeModal').classList.remove('hidden');
}

function closeTradeModal() { document.getElementById('tradeModal').classList.add('hidden'); }

function updatePnlPreview() {
  const entry = parseFloat(document.getElementById('tradeEntry').value) || 0;
  const exit = parseFloat(document.getElementById('tradeExit').value) || 0;
  const size = parseInt(document.getElementById('tradeSize').value) || 0;
  const pnl = (exit - entry) * size;
  const pnlPercent = entry > 0 ? ((exit - entry) / entry) * 100 : 0;
  document.getElementById('pnlValue').textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
  document.getElementById('pnlValue').className = `value ${pnl >= 0 ? 'profit' : 'loss'}`;
  document.getElementById('pnlPercent').textContent = `${pnlPercent.toFixed(2)}%`;
}

function handleTradeSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('tradeId').value || `trade-${Date.now()}`;
  const symbol = document.getElementById('tradeSymbol').value.toUpperCase().trim();
  const entry = parseFloat(document.getElementById('tradeEntry').value);
  const exit = parseFloat(document.getElementById('tradeExit').value);
  const size = parseInt(document.getElementById('tradeSize').value);
  const strategy = document.getElementById('tradeStrategy').value;
  const now = new Date().toISOString();
  
  const trade = { id, symbol, entry_price: entry, exit_price: exit, position_size: size, strategy, status: 'closed', created_at: now };
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === id);
  if (idx >= 0) trades[idx] = trade;
  else trades.push(trade);
  
  saveTrades(trades);
  closeTradeModal();
  updateCounts();
  showToast(idx >= 0 ? 'Trade updated!' : 'Trade logged!');
  if (currentView === 'trades') loadTrades();
}

function loadAlerts() {
  const alerts = JSON.parse(sessionStorage.getItem('alerts') || '[]');
  const container = document.getElementById('alertsList');
  
  if (alerts.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No alerts</h3><p>Create price alerts to get notified</p></div>';
    return;
  }
  
  container.innerHTML = alerts.map(a => `<div class="alert-card ${a.triggered ? 'triggered' : ''}"><div class="alert-header"><span class="alert-symbol">${a.symbol}</span><button class="alert-delete" onclick="deleteAlert('${a.id}')">×</button></div><div class="alert-details"><span>${a.type === 'above' ? 'Above' : 'Below'}</span><span class="alert-price">$${a.targetPrice}</span></div>${a.triggered ? '<span class="alert-triggered">Triggered</span>' : '<span class="alert-active">Active</span>'}</div>`).join('');
}

window.deleteAlert = function(id) {
  const alerts = JSON.parse(sessionStorage.getItem('alerts') || '[]').filter(a => a.id !== id);
  sessionStorage.setItem('alerts', JSON.stringify(alerts));
  loadAlerts();
};

function createAlert() {
  const symbol = document.getElementById('alertSymbol').value.toUpperCase().trim();
  const type = document.getElementById('alertType').value;
  const price = parseFloat(document.getElementById('alertPrice').value);
  
  if (!symbol || !price) return;
  
  const alerts = JSON.parse(sessionStorage.getItem('alerts') || '[]');
  alerts.push({ id: `alert-${Date.now()}`, symbol, type, targetPrice: price, triggered: false });
  sessionStorage.setItem('alerts', JSON.stringify(alerts));
  
  document.getElementById('alertModal').classList.add('hidden');
  showToast(`Alert created for ${symbol}`);
  loadAlerts();
}

// Trading Calendar
let calendarDate = new Date();

function loadCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('currentMonth');
  const statsDiv = document.getElementById('calendarStats');
  
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  
  monthLabel.textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const trades = getTrades();
  const tradesByDay = {};
  
  trades.forEach(trade => {
    const date = new Date(trade.created_at || trade.entered_at);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!tradesByDay[dayKey]) {
      tradesByDay[dayKey] = { trades: [], pnl: 0 };
    }
    const pnl = (trade.exit_price - trade.entry_price) * trade.position_size;
    tradesByDay[dayKey].trades.push(trade);
    tradesByDay[dayKey].pnl += pnl;
  });
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  let html = '<div class="calendar-day-header">Sun</div><div class="calendar-day-header">Mon</div><div class="calendar-day-header">Tue</div><div class="calendar-day-header">Wed</div><div class="calendar-day-header">Thu</div><div class="calendar-day-header">Fri</div><div class="calendar-day-header">Sat</div>';
  
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`;
  }
  
  const today = new Date();
  let totalPnl = 0;
  let tradingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayKey = `${year}-${month}-${day}`;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const dayData = tradesByDay[dayKey];
    
    let dayClass = 'calendar-day';
    if (isToday) dayClass += ' today';
    if (dayData) {
      dayClass += ' has-trades';
      totalPnl += dayData.pnl;
      tradingDays++;
    }
    
    let pnlHtml = '';
    if (dayData) {
      const pnlClass = dayData.pnl >= 0 ? 'profit' : 'loss';
      const prefix = dayData.pnl >= 0 ? '+' : '';
      pnlHtml = `<div class="calendar-day-pnl ${pnlClass}">${prefix}$${dayData.pnl.toFixed(0)}</div><div class="calendar-day-trades">${dayData.trades.length} trade${dayData.trades.length > 1 ? 's' : ''}</div>`;
    }
    
    html += `<div class="${dayClass}"><div class="calendar-day-number">${day}</div>${pnlHtml}</div>`;
  }
  
  const remainingDays = 42 - (firstDay + daysInMonth);
  for (let day = 1; day <= remainingDays; day++) {
    html += `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`;
  }
  
  grid.innerHTML = html;
  
  const winDays = Object.values(tradesByDay).filter(d => d.pnl > 0).length;
  const lossDays = Object.values(tradesByDay).filter(d => d.pnl < 0).length;
  const avgPnl = tradingDays > 0 ? totalPnl / tradingDays : 0;
  
  statsDiv.innerHTML = `
    <div class="calendar-stat">
      <div class="label">Trading Days</div>
      <div class="value">${tradingDays}</div>
    </div>
    <div class="calendar-stat">
      <div class="label">Total P&L</div>
      <div class="value ${totalPnl >= 0 ? 'profit' : 'loss'}">${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}</div>
    </div>
    <div class="calendar-stat">
      <div class="label">Win Days</div>
      <div class="value profit">${winDays}</div>
    </div>
    <div class="calendar-stat">
      <div class="label">Loss Days</div>
      <div class="value loss">${lossDays}</div>
    </div>
    <div class="calendar-stat">
      <div class="label">Avg P&L/Day</div>
      <div class="value ${avgPnl >= 0 ? 'profit' : 'loss'}">${avgPnl >= 0 ? '+' : ''}$${avgPnl.toFixed(2)}</div>
    </div>
  `;
}

document.getElementById('prevMonth')?.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  loadCalendar();
});

document.getElementById('nextMonth')?.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  loadCalendar();
});

document.addEventListener('DOMContentLoaded', initApp);
