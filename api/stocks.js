module.exports = async (req, res) => {
  const { symbols } = req.query;
  const API_KEY = process.env.FINNHUB_API_KEY || 'd6vp8ghr01qiiutcl5tgd6vp8ghr01qiiutcl5u0';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (!symbols) {
    return res.status(400).json({ error: 'Symbols required' });
  }
  
  try {
    const symbolList = symbols.split(',');
    const results = [];
    
    for (const symbol of symbolList.slice(0, 50)) {
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
        );
        const quote = await response.json();
        
        const profileRes = await fetch(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`
        );
        const profile = await profileRes.json().catch(() => ({}));
        
        results.push({
          symbol,
          name: profile.name || symbol,
          price: quote.c,
          change: quote.d,
          changePercent: quote.dp,
          high: quote.h,
          low: quote.l,
          open: quote.o,
          prevClose: quote.pc,
          sector: profile.finnhubIndustry || ''
        });
      } catch (e) {
        results.push({ symbol, error: e.message });
      }
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
};
