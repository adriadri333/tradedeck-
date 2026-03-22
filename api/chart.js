module.exports = async (req, res) => {
  const { symbol, resolution = 'D', from, to } = req.query;
  const API_KEY = process.env.FINNHUB_API_KEY || 'd6vp8ghr01qiiutcl5tgd6vp8ghr01qiiutcl5u0';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol required' });
  }
  
  const now = Math.floor(Date.now() / 1000);
  const fromTime = from || (now - 30 * 24 * 60 * 60);
  const toTime = to || now;
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${fromTime}&to=${toTime}&token=${API_KEY}`
    );
    const data = await response.json();
    
    if (data.s === 'ok') {
      const candles = data.t.map((time, i) => ({
        time,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      }));
      res.status(200).json(candles);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
};
