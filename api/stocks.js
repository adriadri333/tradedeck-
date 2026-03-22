export default async function handler(req, res) {
  const { symbols } = req.query;
  
  if (!symbols) {
    return res.status(400).json({ error: 'Symbols required' });
  }
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );
    const data = await response.json();
    res.status(200).json(data.quoteResponse?.result || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
}
