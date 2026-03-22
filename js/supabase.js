import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://sgcdntxkuupafvamjqbb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnY2RudHhrdXVwYWZ2YW1qcWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkxMzM3MDYsImV4cCI6MjAyNDcwOTcwNn0.Kvj1k9L8Gz8YbX9ZxP2L5M3N7O1Q6R8S0T2U4V5W6X7Y8Z9A0B1C2D3E4F5G6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { email }
    }
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Database operations
export async function getUserSubscription(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

export async function updateSubscription(userId, subscriptionData) {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({ ...subscriptionData, user_id: userId, updated_at: new Date().toISOString() });
  return { data, error };
}

export async function getTrades(userId) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function saveTrade(userId, trade) {
  const { data, error } = await supabase
    .from('trades')
    .upsert({ ...trade, user_id: userId, created_at: trade.created_at || new Date().toISOString() });
  return { data, error };
}

export async function deleteTrade(userId, tradeId) {
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('user_id', userId)
    .eq('id', tradeId);
  return { error };
}

export async function getWatchlist() {
  return { data: [], error: null };
}

export async function addToWatchlist(userId, symbol, name) {
  const { data, error } = await supabase
    .from('watchlist')
    .upsert({ user_id: userId, symbol, name, added_at: new Date().toISOString() });
  return { data, error };
}

export async function removeFromWatchlist(userId, symbol) {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('symbol', symbol);
  return { error };
}

export async function getAlerts(userId) {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function saveAlert(userId, alert) {
  const { data, error } = await supabase
    .from('price_alerts')
    .upsert({ ...alert, user_id: userId, created_at: alert.created_at || new Date().toISOString() });
  return { data, error };
}

export async function deleteAlert(userId, alertId) {
  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('user_id', userId)
    .eq('id', alertId);
  return { error };
}

export async function updateAlertTriggered(userId, alertId, currentPrice) {
  const { error } = await supabase
    .from('price_alerts')
    .update({ triggered: true, triggered_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', alertId);
  return { error };
}

// Listen to auth state changes
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
