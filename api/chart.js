export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'AAPL';
  
  const now = Math.floor(Date.now() / 1000);
  const day = 24 * 60 * 60;
  const candles = [];
  let price = 200;
  
  for (let i = 30; i >= 0; i--) {
    price = price + (Math.random() - 0.48) * 5;
    candles.push({
      time: now - (i * day),
      close: Math.round(price * 100) / 100
    });
  }
  
  return new Response(JSON.stringify(candles), {
    headers: { 'Content-Type': 'application/json' }
  });
}
