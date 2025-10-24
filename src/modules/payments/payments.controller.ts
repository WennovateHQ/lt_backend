import { Request, Response } from 'express';
import { PaymentsService, CreatePaymentIntentInput, CreateConnectAccountInput } from './payments.service';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { logger } from '@/config/logger';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { AppError } from '@/shared/utils/app-error';
import Stripe from 'stripe';
import { stripeConfig } from '@/config/env';

const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2023-10-16',
});

export class PaymentsController {
  private paymentsService: PaymentsService;

  constructor() {
    this.paymentsService = new PaymentsService();
  }

  // Create Stripe Connect account (talent only)
  createConnectAccount = asyncHandler(async (req: Request, res: Response) => {
    const talentId = req.user!.id;
    const input: CreateConnectAccountInput = req.body;

    const result = await this.paymentsService.createConnectAccount(talentId, input);

    logger.info('Connect account created', {
      talentId,
      accountId: result.accountId,
    });

    return res.status(201).json({
      message: 'Connect account created successfully',
      accountId: result.accountId,
      onboardingUrl: result.onboardingUrl,
    });
  });

  // Create payment intent (business only)
  createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const input: CreatePaymentIntentInput = req.body;

    const result = await this.paymentsService.createPaymentIntent(businessId, input);

    logger.info('Payment intent created', {
      businessId,
      paymentId: result.payment.id,
      amount: result.payment.amount,
    });

    return res.status(201).json({
      message: 'Payment intent created successfully',
      clientSecret: result.paymentIntent.client_secret,
      payment: result.payment,
    });
  });

  // Get payment by ID
  getPayment = asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const payment = await this.paymentsService.getPaymentById(paymentId);

    // Check if user has access to this payment
    const userId = req.user!.id;
    if (payment.payerId !== userId && payment.payeeId !== userId) {
      return res.status(403).json({
        error: 'Not authorized to view this payment',
      });
    }

    return res.json({
      payment,
    });
  });

  // Get payments for a contract
  getContractPayments = asyncHandler(async (req: Request, res: Response) => {
    const { contractId } = req.params;
    if (!contractId) {
      return res.status(400).json({ error: 'Contract ID is required' });
    }
    const userId = req.user!.id;

    const payments = await this.paymentsService.getContractPayments(contractId, userId);

    return res.json({
      payments,
    });
  });

  // Get user's payment history
  getMyPayments = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      type,
      status,
      limit = '20',
      offset = '0',
    } = req.query;

    const query = {
      type: type as 'sent' | 'received' | undefined,
      status: status as PaymentStatus | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const result = await this.paymentsService.getUserPayments(userId, query);

    return res.json({
      payments: result.payments,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });

  // Get payment statistics (admin only)
  getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.paymentsService.getPaymentStats();

    return res.json({
      stats,
    });
  });

  // Stripe webhook handler
  handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = stripeConfig.webhookSecret;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    try {
      await this.paymentsService.handleStripeWebhook(event);
      
      logger.info('Webhook processed successfully', {
        type: event.type,
        id: event.id,
      });

      return res.json({ received: true });
    } catch (error) {
      logger.error('Webhook processing failed', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Get Connect account status (talent only)
  getConnectAccountStatus = asyncHandler(async (req: Request, res: Response) => {
    const talentId = req.user!.id;

    // Get user's Connect account ID
    const user = await prisma.user.findUnique({
      where: { id: talentId },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      return res.json({
        hasConnectAccount: false,
        accountStatus: 'not_created',
        payoutsEnabled: false,
        detailsSubmitted: false,
        message: 'Connect account not found. Please create one to receive payments.',
      });
    }

    try {
      // Fetch real account status from Stripe
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

      return res.json({
        hasConnectAccount: true,
        accountId: account.id,
        accountStatus: account.charges_enabled ? 'active' : 'pending',
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
        },
      });
    } catch (error) {
      logger.error('Failed to fetch Connect account status', error);
      throw new AppError('Failed to fetch account status', 500, 'STRIPE_ERROR');
    }
  });

  // Create Connect account link for re-onboarding
  createConnectAccountLink = asyncHandler(async (req: Request, res: Response) => {
    const { accountId } = req.params;
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    const { type = 'account_onboarding' } = req.body;

    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env["FRONTEND_URL"]}/talent/payments/connect/refresh`,
        return_url: `${process.env["FRONTEND_URL"]}/talent/payments/connect/success`,
        type: type as Stripe.AccountLinkCreateParams.Type,
      });

      return res.json({
        url: accountLink.url,
      });
    } catch (error) {
      logger.error('Failed to create account link', error);
      return res.status(500).json({
        error: 'Failed to create account link',
      });
    }
  });

  // Get payment methods (for future use)
  getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
    // TODO: Use userId when implementing payment methods functionality
    // const userId = req.user!.id;

    // Placeholder for payment methods functionality
    return res.json({
      paymentMethods: [],
      message: 'Payment methods feature coming soon',
    });
  });

  // Calculate payment fees
  calculateFees = asyncHandler(async (req: Request, res: Response) => {
    const { amount } = req.query;

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({
        error: 'Valid amount is required',
      });
    }

    const paymentAmount = Number(amount);
    const platformFee = Math.round(paymentAmount * 0.08); // 8% platform fee
    const stripeFee = Math.round(paymentAmount * 0.029 + 30); // Simplified Stripe fee
    const netAmount = paymentAmount - platformFee;

    return res.json({
      amount: paymentAmount,
      platformFee,
      stripeFee,
      netAmount,
      breakdown: {
        platformFeeRate: '8%',
        stripeFeeRate: '2.9% + $0.30',
      },
    });
  });

  // Get payment receipt
  getPaymentReceipt = asyncHandler(async (req: Request, res: Response) => {
    const { receiptId } = req.params;
    if (!receiptId) {
      return res.status(400).json({ error: 'Receipt ID is required' });
    }
    const userId = req.user!.id;

    const receipt = await this.paymentsService.getPaymentReceipt(receiptId, userId);

    logger.info('Payment receipt retrieved', {
      userId,
      receiptId,
    });

    return res.json({
      receipt,
    });
  });

  // Get tax documents
  getTaxDocuments = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { year } = req.query;

    const taxDocument = await this.paymentsService.getTaxDocuments(
      userId,
      year ? parseInt(year as string, 10) : undefined
    );

    logger.info('Tax documents retrieved', {
      userId,
      year: taxDocument.year,
    });

    // Return as array for frontend compatibility
    return res.json([taxDocument]);
  });

  // Setup bank account (talent only)
  setupBankAccount = asyncHandler(async (req: Request, res: Response) => {
    const talentId = req.user!.id;
    const bankAccountData = req.body;

    const result = await this.paymentsService.setupBankAccount(talentId, bankAccountData);

    logger.info('Bank account setup', {
      talentId,
      accountId: result.id,
    });

    return res.status(201).json({
      message: 'Bank account setup successfully',
      accountId: result.id,
    });
  });

  // Fund escrow (business only)
  fundEscrow = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const { contractId, amount } = req.body;

    if (!contractId || !amount) {
      return res.status(400).json({
        error: 'Contract ID and amount are required',
      });
    }

    const result = await this.paymentsService.fundEscrow(businessId, contractId, amount);

    logger.info('Escrow funded', {
      businessId,
      contractId,
      amount,
    });

    return res.status(201).json({
      message: 'Escrow funded successfully',
      paymentId: result.paymentId,
      clientSecret: result.clientSecret,
      amount: result.amount,
    });
  });

  // Release milestone payment (business only)
  releaseMilestonePayment = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const { milestoneId } = req.body;

    if (!milestoneId) {
      return res.status(400).json({
        error: 'Milestone ID is required',
      });
    }

    const result = await this.paymentsService.releaseMilestonePayment(businessId, milestoneId);

    logger.info('Milestone payment released', {
      businessId,
      milestoneId,
    });

    return res.json({
      message: 'Milestone payment released successfully',
      paymentId: result.paymentId,
      transferId: result.transferId,
      amount: result.amount,
    });
  });

  // Withdraw funds (talent only)
  withdrawFunds = asyncHandler(async (req: Request, res: Response) => {
    const talentId = req.user!.id;
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        error: 'Amount is required',
      });
    }

    const result = await this.paymentsService.withdrawFunds(talentId, amount);

    logger.info('Funds withdrawn', {
      talentId,
      amount,
      withdrawalId: result.withdrawalId,
    });

    return res.status(201).json({
      message: 'Withdrawal initiated successfully',
      withdrawal: result,
    });
  });

  // TEST HELPER: Fund platform account for testing withdrawals
  testFundPlatformAccount = asyncHandler(async (req: Request, res: Response) => {
    const { amount = 500000 } = req.body; // Default $5000 CAD
    
    logger.info('TEST MODE: Funding platform account', { amount });

    // Create a payment intent with test card that succeeds immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents
      currency: 'cad',
      payment_method_types: ['card'],
      description: 'Test funding for platform account',
      metadata: {
        type: 'test_funding',
        purpose: 'withdrawal_testing',
      },
    });

    // Confirm it with the special test card that adds to available balance
    const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_bypassPending', // Special test PM that bypasses pending
    });

    logger.info('TEST MODE: Platform account funded', {
      paymentIntentId: confirmedIntent.id,
      amount: confirmedIntent.amount,
      status: confirmedIntent.status,
    });

    return res.json({
      message: 'Platform account funded successfully',
      amount: amount / 100,
      currency: 'CAD',
      paymentIntentId: confirmedIntent.id,
      status: confirmedIntent.status,
      note: 'This is test mode only. In production, real milestone payments will fund the platform account.',
    });
  });
}
