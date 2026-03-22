module.exports = async (req, res) => {
  const { symbol, interval = '5m', range = '1d' } = req.query;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol required' });
  }
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
};
