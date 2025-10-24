import Stripe from 'stripe';

class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env['STRIPE_SECRET_KEY']) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(process.env['STRIPE_SECRET_KEY'], {
      apiVersion: '2023-10-16',
    });
  }

  // Create a payment intent for escrow funding
  async createPaymentIntent(amount: number, currency = 'cad', metadata: any = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata,
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Create a Stripe Connect account for talents
  async createConnectAccount(email: string, country = 'CA') {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      return account;
    } catch (error) {
      console.error('Error creating Connect account:', error);
      throw error;
    }
  }

  // Create account link for onboarding
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      console.error('Error creating account link:', error);
      throw error;
    }
  }

  // Transfer funds to talent (for milestone payments)
  async transferToTalent(amount: number, destinationAccount: string, metadata: any = {}) {
    try {
      console.log(`💸 Creating Stripe transfer to Connect account: ${destinationAccount}`);
      console.log(`   Amount: $${(amount / 100).toFixed(2)} CAD`);
      
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount), // Amount should already be in cents from caller
        currency: 'cad',
        destination: destinationAccount,
        metadata,
      });

      console.log(`✅ Stripe transfer created successfully:`, {
        id: transfer.id,
        amount: transfer.amount,
        destination: transfer.destination,
        created: new Date(transfer.created * 1000)
      });

      return transfer;
    } catch (error: any) {
      console.error('❌ Error transferring to talent:', {
        code: error.code,
        message: error.message,
        type: error.type,
        destinationAccount
      });
      throw error;
    }
  }
  
  // Get Connect account balance (available funds)
  async getConnectBalance(accountId: string) {
    try {
      console.log(`📊 Fetching balance for Connect account: ${accountId}`);
      
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: accountId,
      });

      console.log(`✅ Connect account balance retrieved:`, {
        available: balance.available,
        pending: balance.pending,
        livemode: balance.livemode
      });

      return balance;
    } catch (error: any) {
      console.error('❌ Error fetching Connect balance:', {
        code: error.code,
        message: error.message,
        accountId
      });
      throw error;
    }
  }

  // Create a customer for businesses
  async createCustomer(email: string, name: string, metadata: any = {}) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });

      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  // Retrieve payment intent
  async getPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw error;
    }
  }

  // Retrieve Connect account
  async getConnectAccount(accountId: string) {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      return account;
    } catch (error) {
      console.error('Error retrieving Connect account:', error);
      throw error;
    }
  }

  // Create setup intent for saving payment methods
  async createSetupIntent(customerId: string) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return setupIntent;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  // Confirm payment intent with saved payment method
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  // Get Connect account balance
  async getConnectAccountBalance(accountId: string) {
    try {
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: accountId,
      });
      return balance;
    } catch (error) {
      console.error('Error retrieving Connect account balance:', error);
      throw error;
    }
  }

  // Create payout for talent withdrawal
  async createPayout(amount: number, currency: string, method: 'instant' | 'standard', accountId: string) {
    try {
      const payout = await this.stripe.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency,
          method
        } as any,
        {
          stripeAccount: accountId
        }
      );
      return payout;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  // Handle webhook events
  constructEvent(payload: string | Buffer, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env['STRIPE_WEBHOOK_SECRET']!
      );
      return event;
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
