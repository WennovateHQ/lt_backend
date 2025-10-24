import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/config/database';
import { stripeConfig } from '@/config/env';
import { AppError, ErrorCodes } from '@/shared/utils/app-error';
import { logger } from '@/config/logger';
import { PaymentStatus, ContractStatus } from '@prisma/client';
import TaxService from '@/services/tax.service';
import { toNumber } from '@/shared/utils/decimal-converter';

// Initialize Stripe
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2023-10-16',
});

// Validation schemas
export const createPaymentIntentSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  milestoneId: z.string().min(1, 'Milestone ID is required').optional(),
  amount: z.number().min(1, 'Amount must be positive'),
  currency: z.string().default('CAD'),
  description: z.string().optional(),
});

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
});

export const createConnectAccountSchema = z.object({
  type: z.enum(['express', 'standard']).default('express'),
  country: z.string().default('CA'),
  email: z.string().email().optional(),
});

// Types
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type CreateConnectAccountInput = z.infer<typeof createConnectAccountSchema>;

export interface PaymentWithDetails {
  id: string;
  contractId: string;
  milestoneId: string | null;
  payerId: string;
  payeeId: string;
  amount: number | any; // Prisma Decimal type
  platformFee: number | any; // Prisma Decimal type
  netAmount: number | any; // Prisma Decimal type
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
  contract: {
    id: string;
    title: string;
    status: ContractStatus;
    project: {
      title: string;
      business: {
        profile: {
          firstName: string;
          lastName: string;
          companyName: string | null;
        } | null;
      };
    };
    talent: {
      profile: {
        firstName: string;
        lastName: string;
      } | null;
    };
  };
  milestone: {
    id: string;
    title: string;
    description: string | null;
  } | null;
}

export class PaymentsService {
  private readonly PLATFORM_FEE_RATE = 0.08; // 8% platform fee
  // TODO: Use for Stripe fee calculations
  // private readonly STRIPE_FEE_RATE = 0.029; // 2.9% + 30¢ Stripe fee (simplified)

  // Calculate platform fee with GST/HST for talent users
  private async calculateTalentPlatformFee(amount: number, talentId: string): Promise<{
    baseFee: number;
    gstHstAmount: number;
    totalFee: number;
    netAmount: number;
    exemptFromTax: boolean;
  }> {
    // Get talent's province and GST/HST number
    const talent = await prisma.user.findUnique({
      where: { id: talentId },
      select: {
        profile: {
          select: {
            gstHstNumber: true,
            location: {
              select: {
                province: true,
              },
            },
          },
        },
      },
    });

    const provinceCode = talent?.profile?.location?.province || 'ON'; // Default to Ontario
    const hasGstHstNumber = !!talent?.profile?.gstHstNumber;

    const feeCalculation = TaxService.calculateTalentPlatformFee(
      amount,
      provinceCode,
      hasGstHstNumber
    );

    return {
      baseFee: feeCalculation.baseFee,
      gstHstAmount: feeCalculation.taxAmount,
      totalFee: feeCalculation.totalFee,
      netAmount: amount - feeCalculation.totalFee,
      exemptFromTax: feeCalculation.exemptFromTax,
    };
  }

  // Calculate platform fee (legacy method for backward compatibility)
  private calculatePlatformFee(amount: number): number {
    return Math.round(amount * this.PLATFORM_FEE_RATE);
  }

  // Calculate net amount after fees
  private calculateNetAmount(amount: number, platformFee: number): number {
    return amount - platformFee;
  }

  // Create Stripe Connect account for talent
  async createConnectAccount(talentId: string, input: CreateConnectAccountInput): Promise<{ accountId: string; onboardingUrl: string }> {
    const validatedInput = createConnectAccountSchema.parse(input);

    // Check if user is talent and doesn't already have a connect account
    const user = await prisma.user.findUnique({
      where: { id: talentId },
      select: { 
        userType: true, 
        email: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!user || user.userType !== 'TALENT') {
      throw new AppError('Only talent users can create connect accounts', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    try {
      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: validatedInput.type,
        country: validatedInput.country,
        email: validatedInput.email || user.email,
        business_profile: {
          name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : undefined,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env["FRONTEND_URL"]}/talent/payments/connect/refresh`,
        return_url: `${process.env["FRONTEND_URL"]}/talent/payments/connect/success`,
        type: 'account_onboarding',
      });

      // Store connect account ID in user record
      await prisma.user.update({
        where: { id: talentId },
        data: { stripeConnectAccountId: account.id },
      });

      logger.info('Stripe Connect account created and saved', {
        talentId,
        accountId: account.id,
      });

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error: any) {
      logger.error('Failed to create Stripe Connect account', error);
      
      // Check if Connect is not enabled
      if (error.message?.includes('signed up for Connect')) {
        throw new AppError(
          'Stripe Connect is not enabled. Please enable it in your Stripe Dashboard at https://dashboard.stripe.com/test/connect',
          500,
          'STRIPE_CONNECT_NOT_ENABLED'
        );
      }
      
      throw new AppError('Failed to create payment account', 500, 'STRIPE_ERROR');
    }
  }

  // Create payment intent for milestone payment
  async createPaymentIntent(businessId: string, input: CreatePaymentIntentInput): Promise<{ paymentIntent: Stripe.PaymentIntent; payment: PaymentWithDetails }> {
    const validatedInput = createPaymentIntentSchema.parse(input);

    // Verify contract exists and belongs to business
    const contract = await prisma.contract.findUnique({
      where: { id: validatedInput.contractId },
      include: {
        project: {
          select: { businessId: true },
        },
        talent: {
          select: { id: true },
        },
      },
    });

    if (!contract) {
      throw new AppError('Contract not found', 404, ErrorCodes.NOT_FOUND);
    }

    if ((contract as any).project?.businessId !== businessId) {
      throw new AppError('Not authorized for this contract', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new AppError('Contract must be active to process payments', 400, 'CONTRACT_NOT_ACTIVE');
    }

    // Verify milestone if provided
    let milestone = null;
    if (validatedInput.milestoneId) {
      milestone = await prisma.milestone.findUnique({
        where: { id: validatedInput.milestoneId },
      });

      if (!milestone || milestone.contractId !== validatedInput.contractId) {
        throw new AppError('Milestone not found or not associated with contract', 404, ErrorCodes.NOT_FOUND);
      }

      if (milestone.status !== 'SUBMITTED') {
        throw new AppError('Milestone must be submitted to process payment', 400, 'MILESTONE_NOT_SUBMITTED');
      }
    }

    // Calculate fees
    const amount = validatedInput.amount;
    const platformFee = this.calculatePlatformFee(amount);
    const netAmount = this.calculateNetAmount(amount, platformFee);

    try {
      // Create Stripe Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: validatedInput.currency.toLowerCase(),
        description: validatedInput.description || `Payment for contract ${contract.id}`,
        metadata: {
          contractId: contract.id,
          milestoneId: validatedInput.milestoneId || '',
          businessId,
          talentId: contract.talent.id,
        },
        application_fee_amount: Math.round(platformFee * 100), // Platform fee in cents
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          contractId: validatedInput.contractId,
          milestoneId: validatedInput.milestoneId,
          payerId: businessId,
          payeeId: contract.talent.id,
          amount,
          platformFee,
          netAmount,
          currency: validatedInput.currency,
          status: PaymentStatus.PENDING,
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      logger.info('Payment intent created', {
        paymentId: payment.id,
        contractId: validatedInput.contractId,
        amount,
        businessId,
      });

      const paymentWithDetails = await this.getPaymentById(payment.id);

      return {
        paymentIntent,
        payment: paymentWithDetails,
      };
    } catch (error) {
      logger.error('Failed to create payment intent', error);
      throw new AppError('Failed to create payment', 500, 'STRIPE_ERROR');
    }
  }

  // Confirm payment (webhook handler)
  async confirmPayment(paymentIntentId: string): Promise<PaymentWithDetails> {
    // Find payment by Stripe payment intent ID
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Update payment status
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Update payment
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      // Update milestone status if applicable
      if (payment.milestoneId) {
        await tx.milestone.update({
          where: { id: payment.milestoneId },
          data: { status: 'APPROVED' },
        });
      }

      return updated;
    });

    logger.info('Payment confirmed', {
      paymentId: payment.id,
      paymentIntentId,
      amount: payment.amount,
    });

    return this.getPaymentById(updatedPayment.id);
  }

  // Handle failed payment
  async handleFailedPayment(paymentIntentId: string): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) {
      logger.warn('Failed payment not found in database', { paymentIntentId });
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });

    logger.info('Payment marked as failed', {
      paymentId: payment.id,
      paymentIntentId,
    });
  }

  // Get payment by ID
  async getPaymentById(paymentId: string): Promise<PaymentWithDetails> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contract: {
          include: {
            project: {
              include: {
                business: {
                  select: {
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                        companyName: true,
                      },
                    },
                  },
                },
              },
            },
            talent: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        milestone: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404, ErrorCodes.NOT_FOUND);
    }

    return payment;
  }

  // Get payments for a contract
  async getContractPayments(contractId: string, userId: string): Promise<PaymentWithDetails[]> {
    // Verify user has access to this contract
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        project: {
          select: { businessId: true },
        },
      },
    });

    if (!contract) {
      throw new AppError('Contract not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (contract.project.businessId !== userId && contract.talentId !== userId) {
      throw new AppError('Not authorized to view payments for this contract', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    const payments = await prisma.payment.findMany({
      where: { contractId },
      include: {
        contract: {
          include: {
            project: {
              include: {
                business: {
                  select: {
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                        companyName: true,
                      },
                    },
                  },
                },
              },
            },
            talent: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        milestone: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }

  // Get user's payment history
  async getUserPayments(userId: string, query: {
    type?: 'sent' | 'received';
    status?: PaymentStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: PaymentWithDetails[]; total: number }> {
    const { type, status, limit = 20, offset = 0 } = query;

    const where: any = {};

    if (type === 'sent') {
      where.payerId = userId;
    } else if (type === 'received') {
      where.payeeId = userId;
    } else {
      where.OR = [
        { payerId: userId },
        { payeeId: userId },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          contract: {
            include: {
              project: {
                include: {
                  business: {
                    select: {
                      profile: {
                        select: {
                          firstName: true,
                          lastName: true,
                          companyName: true,
                        },
                      },
                    },
                  },
                },
              },
              talent: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          milestone: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total };
  }

  // Get payment statistics
  async getPaymentStats(): Promise<{
    totalPayments: number;
    totalVolume: number;
    totalPlatformFees: number;
    byStatus: Record<PaymentStatus, number>;
    recentPayments: number;
  }> {
    const [
      totalPayments,
      volumeData,
      byStatus,
      recentPayments,
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
          platformFee: true,
        },
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.payment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const statusStats = byStatus.reduce((acc: any, item: any) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    return {
      totalPayments,
      totalVolume: toNumber(volumeData._sum.amount) || 0,
      totalPlatformFees: toNumber(volumeData._sum.platformFee) || 0,
      byStatus: statusStats,
      recentPayments,
    };
  }

  // Webhook handler for Stripe events
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    logger.info('Processing Stripe webhook', {
      type: event.type,
      id: event.id,
    });

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.confirmPayment(paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handleFailedPayment(failedPaymentIntent.id);
        break;

      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }
  }

  // Get payment receipt
  async getPaymentReceipt(receiptId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: receiptId },
      include: {
        contract: {
          include: {
            project: {
              select: {
                title: true,
                businessId: true,
              },
            },
            talent: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        milestone: {
          select: {
            title: true,
            description: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Check if user is authorized to view this receipt
    if (payment.payerId !== userId && payment.payeeId !== userId) {
      throw new AppError('Not authorized to view this receipt', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    // Generate receipt data
    const receipt = {
      id: payment.id,
      receiptNumber: `RCP-${payment.id.slice(-8).toUpperCase()}`,
      date: payment.createdAt,
      amount: Number(payment.amount),
      platformFee: Number(payment.platformFee),
      netAmount: Number(payment.netAmount),
      currency: payment.currency,
      status: payment.status,
      project: {
        title: payment.contract.project.title,
      },
      milestone: payment.milestone ? {
        title: payment.milestone.title,
        description: payment.milestone.description,
      } : null,
      payer: {
        id: payment.payerId,
        name: 'Business User', // Would need to fetch actual business profile
      },
      payee: {
        id: payment.payeeId,
        name: payment.contract.talent.profile?.displayName || 
              `${payment.contract.talent.profile?.firstName} ${payment.contract.talent.profile?.lastName}`,
      },
      paymentMethod: 'Credit Card', // Would need to fetch from Stripe
      transactionId: payment.stripePaymentIntentId,
    };

    return receipt;
  }

  // Get tax documents for a user
  async getTaxDocuments(userId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

    // Get user's GST/HST registration status and province
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        userType: true,
        profile: {
          select: {
            gstHstNumber: true,
            location: {
              select: {
                province: true,
              },
            },
          },
        },
      },
    });

    const hasGstHstNumber = !!user?.profile?.gstHstNumber;
    const provinceCode = user?.profile?.location?.province || 'ON';
    const taxRates = TaxService.getTaxRatesByProvince(provinceCode);

    // Get all payments for the user in the specified year
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { payerId: userId },
          { payeeId: userId },
        ],
        status: PaymentStatus.COMPLETED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        contract: {
          include: {
            project: {
              select: {
                title: true,
              },
            },
          },
        },
        milestone: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Separate payments and receipts
    const paymentsOut = payments.filter(p => p.payerId === userId);
    const paymentsIn = payments.filter(p => p.payeeId === userId);

    // Calculate totals for talent users (income received)
    const totalPaid = paymentsOut.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalReceived = paymentsIn.reduce((sum, p) => sum + Number(p.netAmount), 0);
    const totalGrossIncome = paymentsIn.reduce((sum, p) => sum + Number(p.amount), 0);
    // const totalPlatformFees = paymentsIn.reduce((sum, p) => sum + Number(p.platformFee), 0);

    // Calculate GST/HST breakdown for talent users
    const basePlatformFees = totalGrossIncome * 0.08; // 8% base platform fee
    const gstHstOnFees = hasGstHstNumber ? 0 : basePlatformFees * (taxRates?.totalRate || 0);
    const totalFeesWithTax = basePlatformFees + gstHstOnFees;

    const taxDocument = {
      id: `tax-${userId}-${currentYear}`, // Unique ID for frontend mapping
      year: currentYear,
      userId,
      generatedAt: new Date(),
      gstHstInfo: {
        hasGstHstNumber,
        gstHstNumber: user?.profile?.gstHstNumber || null,
        province: provinceCode,
        taxType: taxRates?.taxType || 'HST',
        gstRate: taxRates?.gstRate || 0.05,
        provincialRate: taxRates?.provincialRate || 0,
        totalTaxRate: taxRates?.totalRate || 0,
        exemptFromTax: hasGstHstNumber,
      },
      summary: {
        totalPaid,
        totalGrossIncome,
        basePlatformFees,
        gstHstOnPlatformFees: gstHstOnFees,
        totalPlatformFeesWithTax: totalFeesWithTax,
        totalReceived,
        netIncome: totalReceived,
        transactionCount: payments.length,
      },
      payments: payments.map(p => {
        const paymentAmount = Number(p.amount);
        const platformFee = Number(p.platformFee);
        const netAmount = Number(p.netAmount);
        const baseFee = paymentAmount * 0.08;
        const gstHst = platformFee - baseFee;

        return {
          id: p.id,
          date: p.createdAt,
          amount: paymentAmount,
          basePlatformFee: baseFee,
          gstHstOnFee: gstHst,
          totalPlatformFee: platformFee,
          netAmount: netAmount,
          type: p.payerId === userId ? 'PAYMENT_OUT' : 'PAYMENT_IN',
          project: p.contract.project.title,
          milestone: p.milestone?.title || 'Project Payment',
          status: p.status,
        };
      }),
    };

    logger.info('Tax document generated', {
      userId,
      year: currentYear,
      transactionCount: payments.length,
      totalReceived,
      hasGstHstNumber,
      gstHstOnFees,
    });

    return taxDocument;
  }

  // Setup bank account for talent users
  async setupBankAccount(userId: string, bankAccountData: {
    accountHolderName: string;
    accountNumber: string;
    routingNumber: string;
    accountType: 'checking' | 'savings';
    currency?: string;
  }) {
    // Verify user is a talent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        userType: true,
        stripeConnectAccountId: true,
      },
    });

    if (!user || user.userType !== 'TALENT') {
      throw new AppError('Only talent users can setup bank accounts', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (!user.stripeConnectAccountId) {
      throw new AppError('Stripe Connect account required', 400, 'STRIPE_CONNECT_REQUIRED');
    }

    try {
      // Create external account in Stripe
      const externalAccount = await stripe.accounts.createExternalAccount(
        user.stripeConnectAccountId,
        {
          external_account: {
            object: 'bank_account',
            country: 'CA',
            currency: bankAccountData.currency || 'CAD',
            account_holder_name: bankAccountData.accountHolderName,
            account_number: bankAccountData.accountNumber,
            routing_number: bankAccountData.routingNumber,
            account_holder_type: 'individual',
          },
        }
      );

      // Store bank account info in database
      const bankAccount = await prisma.bankAccount.create({
        data: {
          userId,
          stripeExternalAccountId: externalAccount.id,
          accountHolderName: bankAccountData.accountHolderName,
          accountType: bankAccountData.accountType,
          currency: bankAccountData.currency || 'CAD',
          last4: bankAccountData.accountNumber.slice(-4),
          isDefault: true, // Set as default if it's the first one
        },
      });

      logger.info('Bank account setup completed', {
        userId,
        bankAccountId: bankAccount.id,
        stripeExternalAccountId: externalAccount.id,
      });

      return {
        id: bankAccount.id,
        accountHolderName: bankAccount.accountHolderName,
        accountType: bankAccount.accountType,
        currency: bankAccount.currency,
        last4: bankAccount.last4,
        isDefault: bankAccount.isDefault,
        status: 'active',
      };
    } catch (error) {
      logger.error('Bank account setup failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Stripe.errors.StripeError) {
        throw new AppError(`Bank account setup failed: ${error.message}`, 400, 'STRIPE_ERROR');
      }

      throw new AppError('Bank account setup failed', 500, ErrorCodes.INTERNAL_ERROR);
    }
  }

  // Fund escrow for a contract
  async fundEscrow(businessId: string, contractId: string, amount: number) {
    // Verify contract belongs to business
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        project: {
          select: {
            businessId: true,
            title: true,
          },
        },
      },
    });

    if (!contract) {
      throw new AppError('Contract not found', 404, ErrorCodes.NOT_FOUND);
    }

    if ((contract as any).project?.businessId !== businessId) {
      throw new AppError('Not authorized to fund this contract', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new AppError('Contract must be active to fund escrow', 400, 'CONTRACT_NOT_ACTIVE');
    }

    // Create escrow payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'cad',
      description: `Escrow funding for ${contract.project.title}`,
      metadata: {
        contractId,
        businessId,
        type: 'escrow_funding',
      },
    });

    // Calculate platform fee with GST/HST for talent
    const feeCalculation = await this.calculateTalentPlatformFee(amount, contract.talentId);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        contractId,
        payerId: businessId,
        payeeId: contract.talentId,
        amount,
        platformFee: feeCalculation.totalFee,
        netAmount: feeCalculation.netAmount,
        currency: 'CAD',
        status: PaymentStatus.PENDING,
        stripePaymentIntentId: paymentIntent.id
      },
    });

    logger.info('Escrow funding initiated', {
      contractId,
      businessId,
      amount,
      paymentId: payment.id,
      paymentIntentId: paymentIntent.id,
    });

    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: 'CAD',
    };
  }

  // Release milestone payment
  async releaseMilestonePayment(businessId: string, milestoneId: string) {
    // Get milestone and verify ownership
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        contract: {
          include: {
            project: {
              select: {
                businessId: true,
                title: true,
              },
            },
            talent: {
              select: {
                id: true,
                stripeConnectAccountId: true,
              },
            },
          },
        },
      },
    });

    if (!milestone) {
      throw new AppError('Milestone not found', 404, ErrorCodes.NOT_FOUND);
    }

    if ((milestone as any).contract?.project?.businessId !== businessId) {
      throw new AppError('Not authorized to release this milestone payment', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (milestone.status !== 'SUBMITTED') {
      throw new AppError('Milestone must be submitted to release payment', 400, 'MILESTONE_NOT_SUBMITTED');
    }

    // Verify talent has Connect account
    if (!(milestone as any).contract?.talent?.stripeConnectAccountId) {
      throw new AppError('Talent has not set up their payout account', 400, 'TALENT_NO_CONNECT_ACCOUNT');
    }

    // Find the escrow payment for this milestone
    const escrowPayment = await prisma.payment.findFirst({
      where: {
        contractId: milestone.contractId,
        milestoneId: milestoneId,
        status: PaymentStatus.PROCESSING,
      },
    });

    if (!escrowPayment) {
      throw new AppError('No escrowed payment found for this milestone', 400, 'NO_ESCROW_PAYMENT');
    }

    try {
      // Transfer funds to talent's Stripe Connect account
      const transfer = await stripe.transfers.create({
        amount: Math.round(Number(escrowPayment.netAmount) * 100),
        currency: 'cad',
        destination: (milestone as any).contract?.talent?.stripeConnectAccountId,
        description: `Payment for milestone: ${milestone.title}`,
        metadata: {
          milestoneId,
          contractId: milestone.contractId,
          paymentId: escrowPayment.id,
          talentId: (milestone as any).contract?.talent?.id,
        },
      });

      // Update payment status
      await prisma.payment.update({
        where: { id: escrowPayment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          stripeTransferId: transfer.id,
          processedAt: new Date(),
        },
      });

      // Update milestone status
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      logger.info('Milestone payment released', {
        milestoneId,
        businessId,
        paymentId: escrowPayment.id,
        transferId: transfer.id,
        amount: escrowPayment.netAmount,
      });

      return {
        milestoneId,
        paymentId: escrowPayment.id,
        amount: Number(escrowPayment.netAmount),
        transferId: transfer.id,
        status: 'completed',
      };
    } catch (error) {
      logger.error('Milestone payment release failed', {
        milestoneId,
        businessId,
        paymentId: escrowPayment.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError('Payment release failed', 500, ErrorCodes.INTERNAL_ERROR);
    }
  }

  // Withdraw funds for talent users
  async withdrawFunds(talentId: string, amount: number) {
    // Verify user is a talent with Stripe Connect account
    const user = await prisma.user.findUnique({
      where: { id: talentId },
      select: {
        userType: true,
        stripeConnectAccountId: true,
      },
    });

    if (!user || user.userType !== 'TALENT') {
      throw new AppError('Only talent users can withdraw funds', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (!user.stripeConnectAccountId) {
      throw new AppError('Stripe Connect account required', 400, 'STRIPE_CONNECT_REQUIRED');
    }

    // Verify Connect account is ready for payouts
    try {
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      
      if (!account.payouts_enabled) {
        throw new AppError(
          'Your payout account is not ready yet. Please complete the identity verification process.',
          400,
          'PAYOUTS_NOT_ENABLED'
        );
      }

      if (!account.details_submitted) {
        throw new AppError(
          'Please complete your payout account setup before withdrawing funds.',
          400,
          'ACCOUNT_SETUP_INCOMPLETE'
        );
      }

      // Check for pending requirements
      if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
        throw new AppError(
          `Additional verification required: ${account.requirements.currently_due.join(', ')}`,
          400,
          'VERIFICATION_REQUIRED'
        );
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to verify Connect account', error);
      throw new AppError('Unable to verify payout account status', 500, 'STRIPE_ERROR');
    }

    // Check available balance in database
    const availableBalance = await this.getAvailableBalance(talentId);
    
    if (amount > availableBalance) {
      throw new AppError('Insufficient balance for withdrawal', 400, 'INSUFFICIENT_BALANCE');
    }

    try {
      // Create payout from Connect account to bank
      // NOTE: Money was already transferred to Connect account when business released payment
      logger.info('Creating payout from Connect account to bank', {
        talentId,
        amount,
        connectAccountId: user.stripeConnectAccountId,
      });

      const payout = await stripe.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency: 'cad',
          description: 'Talent earnings withdrawal',
          metadata: {
            talentId,
            type: 'earnings_withdrawal',
          },
        },
        {
          stripeAccount: user.stripeConnectAccountId,
        }
      );

      // Record withdrawal in database
      const withdrawal = await prisma.withdrawal.create({
        data: {
          userId: talentId,
          amount,
          currency: 'CAD',
          status: 'PENDING',
          stripePayoutId: payout.id,
        },
      });

      logger.info('Withdrawal initiated successfully', {
        talentId,
        amount,
        withdrawalId: withdrawal.id,
        payoutId: payout.id,
        note: 'Payout from Connect account to bank account',
      });

      return {
        withdrawalId: withdrawal.id,
        amount,
        currency: 'CAD',
        status: 'pending',
        estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        payoutId: payout.id,
      };
    } catch (error: any) {
      logger.error('Withdrawal failed', {
        talentId,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
        stripeError: error.type || error.code,
        stripeMessage: error.message,
        fullError: error,
      });

      // Handle specific Stripe errors
      if (error.type === 'StripeInvalidRequestError') {
        throw new AppError(
          error.message || 'Invalid withdrawal request. Please ensure your payout account is fully verified.',
          400,
          'STRIPE_INVALID_REQUEST'
        );
      }

      if (error.message?.includes('payout') || error.message?.includes('account')) {
        throw new AppError(
          'Your payout account is not ready yet. Please complete the verification process.',
          400,
          'ACCOUNT_NOT_READY'
        );
      }

      // Insufficient funds in Connect account
      if (error.message?.includes('insufficient funds') || error.message?.includes('balance is too low')) {
        throw new AppError(
          'Your Connect account has insufficient funds. Please ensure payment has been released for this milestone.',
          400,
          'CONNECT_INSUFFICIENT_BALANCE'
        );
      }

      throw new AppError(
        `Withdrawal failed: ${error.message || 'Unknown error'}`,
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }
  }

  // Helper method to get available balance
  private async getAvailableBalance(talentId: string): Promise<number> {
    const completedPayments = await prisma.payment.aggregate({
      where: {
        payeeId: talentId,
        status: PaymentStatus.COMPLETED,
      },
      _sum: {
        netAmount: true,
      },
    });

    const withdrawals = await prisma.withdrawal.aggregate({
      where: {
        userId: talentId,
        status: { in: ['PENDING', 'COMPLETED'] },
      },
      _sum: {
        amount: true,
      },
    });

    const totalEarnings = Number(completedPayments._sum.netAmount || 0);
    const totalWithdrawals = Number(withdrawals._sum.amount || 0);

    return totalEarnings - totalWithdrawals;
  }
}
