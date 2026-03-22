# TradeDeck – Trader Organizer

## Concept
A sleek, professional trading journal that helps traders log trades, track performance, and manage watchlists. Dark theme with green/red profit indicators, clean data tables, and real-time calculations.

## Design Language

### Colors
- Background: #0D1117 (dark)
- Cards: #161B22
- Border: #30363D
- Profit: #10B981 (green)
- Loss: #EF4444 (red)
- Accent: #58A6FF (blue)
- Text: #F0F6FC

### Typography
- Headings: Space Grotesk
- Body: DM Sans
- Numbers/Data: JetBrains Mono

### Layout
- Dashboard-first design
- Tabbed navigation: Dashboard | Trades | Watchlist | Analytics
- Mobile: Bottom navigation bar
- Desktop: Sidebar

## Features

### 1. Trade Journal
- Log trades with: Symbol, Entry, Exit, Size, Strategy, Notes
- Auto-calculate P&L and percentage return
- Edit/delete trades
- Filter by date, symbol, strategy
- Mark trades as winners/losers

### 2. Watchlist
- Add symbols with optional notes
- Quick-add from trade entries
- Drag to reorder
- Mark as watched/ignored

### 3. Dashboard
- Today's P&L summary
- Weekly performance
- Win rate percentage
- Best/worst trade
- Recent trades list
- Quick stats cards

### 4. Analytics (Premium)
- Total P&L by period
- P&L by strategy
- P&L by symbol
- Win rate over time
- Average winner vs loser

### 5. Export
- Export trades to CSV
- Export summary to PDF

## Data Model

### Trades
```
{
  id: uuid,
  user_id: uuid,
  symbol: string,
  entry_price: number,
  exit_price: number,
  position_size: number,
  pnl: number (calculated),
  pnl_percent: number (calculated),
  strategy: string,
  notes: string,
  status: 'open' | 'closed',
  entered_at: timestamp,
  exited_at: timestamp,
  created_at: timestamp
}
```

### Watchlist
```
{
  id: uuid,
  user_id: uuid,
  symbol: string,
  notes: string,
  status: 'watching' | 'ignored',
  created_at: timestamp
}
```

### Profiles
```
{
  id: uuid (from auth),
  email: string,
  subscription_tier: 'free' | 'pro',
  created_at: timestamp
}
```

## Free Tier Limits
- 50 trades
- 20 watchlist items
- Basic summaries

## Pro Tier ($9.99/mo)
- Unlimited trades/watchlist
- Advanced analytics
- PDF exports
- Priority support

## File Structure
```
tradedeck/
├── index.html          # Login/signup
├── app.html            # Main app (dashboard)
├── css/styles.css      # All styles
├── js/
│   ├── app.js          # Main app logic
│   ├── auth.js         # Auth + demo mode
│   ├── trades.js       # Trade CRUD
│   ├── watchlist.js    # Watchlist CRUD
│   └── analytics.js    # Calculations & charts
└── SPEC.md
```
