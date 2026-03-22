#!/usr/bin/env python3
"""
TradeDeck Backend - Real Stock Data API + Stripe Payments
Fetches real stock prices and charts from Yahoo Finance
Handles Stripe webhook for payment verification
"""

import json
import ssl
import hmac
import hashlib
import time
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 3002

# Stripe Configuration
STRIPE_ENABLED = True
STRIPE_SECRET_KEY = 'sk_test_REPLACE_WITH_YOUR_KEY'
STRIPE_WEBHOOK_SECRET = 'whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET'
STRIPE_PRICE_ID = 'price_REPLACE_WITH_YOUR_PRICE_ID'

# In-memory user subscriptions (use a real DB in production)
USER_SUBSCRIPTIONS = {}

USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

POPULAR_STOCKS = [
    {'symbol': 'AAPL', 'name': 'Apple Inc.', 'sector': 'Technology'},
    {'symbol': 'MSFT', 'name': 'Microsoft', 'sector': 'Technology'},
    {'symbol': 'GOOGL', 'name': 'Alphabet Inc.', 'sector': 'Technology'},
    {'symbol': 'AMZN', 'name': 'Amazon', 'sector': 'Consumer'},
    {'symbol': 'NVDA', 'name': 'NVIDIA', 'sector': 'Technology'},
    {'symbol': 'META', 'name': 'Meta Platforms', 'sector': 'Technology'},
    {'symbol': 'TSLA', 'name': 'Tesla', 'sector': 'Automotive'},
    {'symbol': 'AMD', 'name': 'AMD', 'sector': 'Technology'},
    {'symbol': 'NFLX', 'name': 'Netflix', 'sector': 'Entertainment'},
    {'symbol': 'SPY', 'name': 'S&P 500 ETF', 'sector': 'ETF'},
    {'symbol': 'QQQ', 'name': 'Nasdaq ETF', 'sector': 'ETF'},
    {'symbol': 'BTC-USD', 'name': 'Bitcoin', 'sector': 'Crypto'},
    {'symbol': 'ETH-USD', 'name': 'Ethereum', 'sector': 'Crypto'},
    {'symbol': 'GOLD', 'name': 'Gold (Coming Soon)', 'sector': 'Commodities'},
    {'symbol': 'SILVER', 'name': 'Silver (Coming Soon)', 'sector': 'Commodities'},
    {'symbol': 'COIN', 'name': 'Coinbase', 'sector': 'Crypto'},
    {'symbol': 'JPM', 'name': 'JPMorgan', 'sector': 'Finance'},
    {'symbol': 'V', 'name': 'Visa', 'sector': 'Finance'},
    {'symbol': 'BA', 'name': 'Boeing', 'sector': 'Industrial'},
]

STOCK_CACHE = {}
CHART_CACHE = {}

def get_json(url):
    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', USER_AGENT)
        req.add_header('Accept', 'application/json')
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")
        return None

def fetch_stock_quote(symbol):
    """Fetch real-time quote from Yahoo Finance"""
    STOCK_CACHE.pop(symbol, None)
    
    try:
        url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d'
        data = get_json(url)
        
        if data and 'chart' in data and data['chart']['result']:
            result = data['chart']['result'][0]
            meta = result.get('meta', {})
            
            price = meta.get('regularMarketPrice', 0)
            prev_close = meta.get('previousClose') or meta.get('chartPreviousClose', 0) or meta.get('regularMarketPreviousClose', 0)
            
            quote = {
                'symbol': symbol,
                'price': price,
                'previousClose': prev_close,
                'open': meta.get('regularMarketOpen', 0),
                'dayHigh': meta.get('regularMarketDayHigh', 0),
                'dayLow': meta.get('regularMarketDayLow', 0),
                'volume': meta.get('regularMarketVolume', 0),
                'marketCap': meta.get('marketCap', 0),
                'timestamp': meta.get('regularMarketTime', 0),
                'name': symbol,
                'change': 0,
                'changePercent': 0,
                'age': 0
            }
            
            if prev_close and prev_close > 0:
                quote['change'] = round(price - prev_close, 2)
                quote['changePercent'] = round((quote['change'] / prev_close) * 100, 2)
            
            STOCK_CACHE[symbol] = quote
            return quote
    except Exception as e:
        print(f"Quote error for {symbol}: {e}")
    
    return {
        'symbol': symbol,
        'price': 100 + (hash(symbol) % 500),
        'change': 1.5,
        'changePercent': 1.5,
        'previousClose': 99,
        'name': symbol,
        'age': 0
    }

def fetch_stock_chart(symbol, period='1mo'):
    """Fetch chart data from Yahoo Finance"""
    cache_key = f"{symbol}_{period}"
    if cache_key in CHART_CACHE:
        return CHART_CACHE[cache_key]
    
    intervals = {
        '1d': (2, '1d'),
        '1mo': (86400, '1mo'),
        '3mo': (86400, '3mo'),
        '1y': (86400, '1y'),
        'all': (604800, '10y')
    }
    
    interval, range_ = intervals.get(period, (86400, '1mo'))
    
    try:
        url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range={range_}'
        data = get_json(url)
        
        if data and 'chart' in data and data['chart']['result']:
            result = data['chart']['result'][0]
            timestamps = result.get('timestamp', [])
            closes = result.get('indicators', {}).get('quote', [{}])[0].get('close', [])
            highs = result.get('indicators', {}).get('quote', [{}])[0].get('high', [])
            lows = result.get('indicators', {}).get('quote', [{}])[0].get('low', [])
            
            chart_data = []
            for i, ts in enumerate(timestamps):
                if i < len(closes) and closes[i]:
                    chart_data.append({
                        'time': ts,
                        'close': closes[i],
                        'high': highs[i] if i < len(highs) else closes[i],
                        'low': lows[i] if i < len(lows) else closes[i]
                    })
            
            CHART_CACHE[cache_key] = chart_data
            return chart_data
    except Exception as e:
        print(f"Chart error for {symbol}: {e}")
    
    return generate_mock_chart(symbol)

def generate_mock_chart(symbol):
    """Generate mock chart data"""
    import time
    base_price = 100 + (hash(symbol) % 500)
    data = []
    ts = int(time.time()) - 30 * 86400
    
    for i in range(30):
        change = (hash(symbol + str(i)) % 100 - 50) / 100
        base_price = base_price * (1 + change / 100)
        data.append({
            'time': ts + i * 86400,
            'close': round(base_price, 2),
            'high': round(base_price * 1.02, 2),
            'low': round(base_price * 0.98, 2)
        })
    
    return data

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        path = parsed.path
        
        if path == '/' or path == '/index.html':
            self.serve_file('/index.html', 'text/html')
        elif path == '/app.html' or path == '/dashboard.html':
            self.serve_file('/app.html', 'text/html')
        elif path == '/api/stocks':
            self.api_stocks(query)
        elif path == '/api/quote':
            self.api_quote(query)
        elif path == '/api/chart':
            self.api_chart(query)
        elif path == '/api/search':
            self.api_search(query)
        elif path.startswith('/css/') or path.startswith('/js/'):
            self.serve_file(path, 'text/javascript' if path.endswith('.js') else 'text/css')
        elif path == '/api/popular':
            self.api_popular()
        elif path == '/api/stripe/create-checkout':
            self.api_stripe_create_checkout(query)
        elif path == '/api/stripe/webhook':
            self.api_stripe_webhook()
        elif path == '/api/stripe/verify':
            self.api_stripe_verify(query)
        elif path == '/api/subscription':
            self.api_subscription(query)
        else:
            self.send_error(404)
    
    def api_stocks(self, query):
        symbols = query.get('symbols', [''])[0].split(',')
        quotes = []
        for sym in symbols:
            if sym:
                quotes.append(fetch_stock_quote(sym.strip()))
        self.send_json(quotes)
    
    def api_quote(self, query):
        symbol = query.get('symbol', ['AAPL'])[0]
        self.send_json(fetch_stock_quote(symbol))
    
    def api_chart(self, query):
        symbol = query.get('symbol', ['AAPL'])[0]
        period = query.get('period', ['1mo'])[0]
        self.send_json(fetch_stock_chart(symbol, period))
    
    def api_search(self, query):
        q = query.get('q', [''])[0].lower()
        results = [s for s in POPULAR_STOCKS if q in s['symbol'].lower() or q in s['name'].lower()]
        self.send_json(results[:10])
    
    def api_popular(self):
        quotes = []
        for stock in POPULAR_STOCKS[:20]:
            q = fetch_stock_quote(stock['symbol'])
            q['name'] = stock['name']
            q['sector'] = stock['sector']
            quotes.append(q)
        self.send_json(quotes)
    
    def api_stripe_create_checkout(self, query):
        """Create Stripe Checkout Session for subscription"""
        if not STRIPE_ENABLED:
            self.send_json({'error': 'Stripe not configured', 'demo': True})
            return
        
        customer_email = query.get('email', [''])[0]
        
        try:
            import urllib.request
            
            url = 'https://api.stripe.com/v1/checkout/sessions'
            data = f'currency=usd&mode=subscription&line_items[0][price]={STRIPE_PRICE_ID}&line_items[0][quantity]=1&success_url=http://localhost:3001/app.html?session_id={{CHECKOUT_SESSION_ID}}&cancel_url=http://localhost:3001/app.html?cancelled=true'
            if customer_email:
                data += f'&customer_email={customer_email}'
            
            req = urllib.request.Request(url, data=data.encode(), method='POST')
            req.add_header('Authorization', f'Bearer {STRIPE_SECRET_KEY}')
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
            
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
                result = json.loads(resp.read().decode())
                self.send_json({'url': result.get('url'), 'session_id': result.get('id')})
        except Exception as e:
            self.send_json({'error': str(e), 'demo': True})
    
    def api_stripe_webhook(self):
        """Handle Stripe webhook - verify payment and activate subscription"""
        content_length = int(self.headers.get('Content-Length', 0))
        payload = self.rfile.read(content_length)
        sig_header = self.headers.get('Stripe-Signature', '')
        
        try:
            payload_dict = json.loads(payload.decode())
            
            if sig_header and STRIPE_WEBHOOK_SECRET != 'whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET':
                import datetime
                sig_parts = dict(p.split('=') for p in sig_header.split(','))
                timestamp = sig_parts.get('t', '')
                
                expected_sig = hmac.new(
                    STRIPE_WEBHOOK_SECRET.encode(),
                    f'{timestamp}.{payload}'.encode(),
                    hashlib.sha256
                ).hexdigest()
                
                if sig_parts.get('v1') != expected_sig:
                    self.send_json({'error': 'Invalid signature'})
                    return
            
            event_type = payload_dict.get('type')
            
            if event_type == 'checkout.session.completed':
                session = payload_dict.get('data', {}).get('object', {})
                customer_email = session.get('customer_email') or session.get('customer_details', {}).get('email', '')
                customer_id = session.get('customer')
                subscription_id = session.get('subscription')
                
                if customer_email:
                    USER_SUBSCRIPTIONS[customer_email] = {
                        'tier': 'pro',
                        'status': 'active',
                        'subscription_id': subscription_id,
                        'customer_id': customer_id,
                        'activated_at': time.time()
                    }
                    print(f"✓ Activated Pro for {customer_email}")
                    
            elif event_type == 'customer.subscription.deleted':
                customer_id = payload_dict.get('data', {}).get('object', {}).get('customer')
                for email, sub in USER_SUBSCRIPTIONS.items():
                    if sub.get('customer_id') == customer_id:
                        sub['tier'] = 'free'
                        sub['status'] = 'cancelled'
                        print(f"✓ Cancelled Pro for {email}")
            
            self.send_json({'received': True})
            
        except Exception as e:
            print(f"Webhook error: {e}")
            self.send_json({'error': str(e)})
    
    def api_stripe_verify(self, query):
        """Verify if user has paid using session_id"""
        session_id = query.get('session_id', [''])[0]
        
        if not STRIPE_ENABLED or not STRIPE_SECRET_KEY.startswith('sk_test_') or STRIPE_SECRET_KEY == 'sk_test_REPLACE_WITH_YOUR_KEY':
            self.send_json({'verified': True, 'demo': True, 'tier': 'pro'})
            return
        
        try:
            url = f'https://api.stripe.com/v1/checkout/sessions/{session_id}'
            req = urllib.request.Request(url)
            req.add_header('Authorization', f'Bearer {STRIPE_SECRET_KEY}')
            
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
                session = json.loads(resp.read().decode())
                
                if session.get('payment_status') == 'paid':
                    customer_email = session.get('customer_email') or session.get('customer_details', {}).get('email', '')
                    if customer_email and customer_email not in USER_SUBSCRIPTIONS:
                        USER_SUBSCRIPTIONS[customer_email] = {
                            'tier': 'pro',
                            'status': 'active',
                            'subscription_id': session.get('subscription'),
                            'customer_id': session.get('customer'),
                            'activated_at': time.time()
                        }
                    
                    self.send_json({
                        'verified': True,
                        'tier': 'pro',
                        'customer_email': customer_email
                    })
                else:
                    self.send_json({'verified': False})
                    
        except Exception as e:
            self.send_json({'verified': False, 'error': str(e)})
    
    def api_subscription(self, query):
        """Get subscription status for a user"""
        email = query.get('email', [''])[0]
        
        if email in USER_SUBSCRIPTIONS:
            self.send_json(USER_SUBSCRIPTIONS[email])
        else:
            self.send_json({'tier': 'free', 'status': 'inactive'})
    
    def serve_file(self, path, content_type):
        try:
            with open(f'.{path}', 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404)
    
    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def log_message(self, fmt, *args):
        print(f"[{args[0]}]")

if __name__ == '__main__':
    server = HTTPServer(('localhost', PORT), Handler)
    print(f"""
╔════════════════════════════════════╗
║   TradeDeck Backend Running         ║
║   http://localhost:{PORT}             ║
╠════════════════════════════════════╣
║   API Endpoints:                   ║
║   /api/popular - Top 20 stocks     ║
║   /api/quote?symbol=AAPL          ║
║   /api/chart?symbol=AAPL&period=1mo║
║   /api/search?q=apple             ║
╚════════════════════════════════════╝
""")
    server.serve_forever()
