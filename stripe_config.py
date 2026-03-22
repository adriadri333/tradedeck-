# Stripe Configuration for TradeDeck
# Get these from https://dashboard.stripe.com/apikeys

STRIPE_SECRET_KEY = 'sk_test_your_secret_key_here'
STRIPE_PUBLISHABLE_KEY = 'pk_test_your_publishable_key_here'
STRIPE_WEBHOOK_SECRET = 'whsec_your_webhook_secret_here'
STRIPE_PRICE_ID = 'price_your_price_id_here'  # Create this in Stripe Dashboard

# When customer pays, Stripe sends webhook to this endpoint
# Your server should verify the signature and update user's subscription
