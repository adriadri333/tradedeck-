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
        
        const nameMap = {
          'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft', 'GOOGL': 'Alphabet Inc.',
          'AMZN': 'Amazon', 'NVDA': 'NVIDIA', 'TSLA': 'Tesla',
          'META': 'Meta Platforms', 'AMD': 'AMD', 'NFLX': 'Netflix',
          'DIS': 'Disney', 'SPY': 'S&P 500 ETF', 'QQQ': 'Nasdaq ETF',
          'DIA': 'Dow Jones ETF', 'IWM': 'Russell 2000 ETF'
        };
        
        results.push({
          symbol,
          name: nameMap[symbol] || symbol,
          price: quote.c || 0,
          change: quote.d || 0,
          changePercent: quote.dp || 0,
          high: quote.h || 0,
          low: quote.l || 0,
          open: quote.o || 0,
          prevClose: quote.pc || 0
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
