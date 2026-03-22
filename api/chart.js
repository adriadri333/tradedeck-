export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'AAPL';
  const API_KEY = 'd6vp8ghr01qiiutcl5tgd6vp8ghr01qiiutcl5u0';
  
  const now = Math.floor(Date.now() / 1000);
  const from = now - (30 * 24 * 60 * 60);
  
  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${now}&token=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    
    if (data.s === 'ok' && data.t) {
      const candles = data.t.map((t, i) => ({
        time: t,
        close: data.c[i]
      }));
      return new Response(JSON.stringify(candles), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
