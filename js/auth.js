const SUPABASE_URL = 'https://sgcdntxkuupafvamjqbb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnY2RudHhrdXVwYWZ2YW1qcWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkxMzM3MDYsImV4cCI6MjAyNDcwOTcwNn0.Kvj1k9L8Gz8YbX9ZxP2L5M3N7O1Q6R8S0T2U4V5W6X7Y8Z9A0B1C2D3E4F5G6';

class SupabaseAuth {
  constructor() {
    this.supabase = window.supabase || null;
  }

  async signUp(email, password) {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Signup failed');
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async signIn(email, password) {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('sb_session', JSON.stringify(data));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getSession() {
    try {
      const stored = localStorage.getItem('sb_session');
      return stored ? { data: { session: JSON.parse(stored) }, error: null } : { data: { session: null }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  }
}

const auth = new SupabaseAuth();

const demoTrades = [
  { id: 'trade-1', symbol: 'AAPL', entry_price: 175.50, exit_price: 182.30, position_size: 100, strategy: 'swing', notes: 'Earnings play', status: 'closed', entered_at: new Date(Date.now() - 2*24*60*60*1000).toISOString(), exited_at: new Date(Date.now() - 1*24*60*60*1000).toISOString(), created_at: new Date().toISOString() },
  { id: 'trade-2', symbol: 'TSLA', entry_price: 245.00, exit_price: 238.50, position_size: 50, strategy: 'day-trade', notes: 'Gap fill', status: 'closed', entered_at: new Date(Date.now() - 1*24*60*60*1000).toISOString(), exited_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'trade-3', symbol: 'NVDA', entry_price: 480.00, exit_price: 510.25, position_size: 25, strategy: 'swing', notes: 'AI momentum', status: 'closed', entered_at: new Date(Date.now() - 5*24*60*60*1000).toISOString(), exited_at: new Date(Date.now() - 3*24*60*60*1000).toISOString(), created_at: new Date().toISOString() },
];

const demoWatchlist = [
  { symbol: 'AAPL', name: 'Apple Inc.', addedAt: Date.now() },
  { symbol: 'TSLA', name: 'Tesla', addedAt: Date.now() },
  { symbol: 'NVDA', name: 'NVIDIA', addedAt: Date.now() },
];

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 16px 24px; background: #161B22; border: 1px solid #30363D; border-radius: 8px; color: #F0F6FC; z-index: 1000; animation: slideIn 0.3s;';
  if (type === 'error') toast.style.borderColor = '#EF4444';
  if (type === 'success') toast.style.borderColor = '#10B981';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = e.target.querySelector('button[type="submit"]');
  
  if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }
  
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  
  const { data, error } = await auth.signIn(email, password);
  
  if (error) {
    showToast(error.message || 'Login failed', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
  }
  
  showToast('Welcome back!');
  setTimeout(() => window.location.href = 'app.html', 500);
}

async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const btn = e.target.querySelector('button[type="submit"]');
  
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }
  
  btn.disabled = true;
  btn.textContent = 'Creating...';
  
  const { data, error } = await auth.signUp(email, password);
  
  if (error) {
    showToast(error.message || 'Signup failed', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
    return;
  }
  
  showToast('Account created! Check your email to confirm.');
  setTimeout(() => {
    switchTab('login');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }, 2000);
}

function handleDemoLogin() {
  sessionStorage.setItem('user', JSON.stringify({ id: 'demo-001', email: 'demo@tradedeck.app' }));
  sessionStorage.setItem('trades', JSON.stringify(demoTrades));
  sessionStorage.setItem('watchlist', JSON.stringify(demoWatchlist));
  showToast('Welcome to TradeDeck Demo!');
  setTimeout(() => window.location.href = 'app.html', 500);
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const demoBtn = document.getElementById('demoBtn');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
  
  if (demoBtn) {
    demoBtn.addEventListener('click', handleDemoLogin);
  }
  
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  const { data } = await auth.getSession();
  if (data?.session) {
    window.location.href = 'app.html';
  }
});
