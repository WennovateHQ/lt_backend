// Shared enums for the application
// Re-export Prisma-generated enums for type consistency

export { 
  UserType,
  UserStatus,
  ProjectStatus,
  ProjectType,
  ApplicationStatus,
  ContractStatus,
  MilestoneStatus,
  PaymentStatus,
  MessageStatus,
  NotificationType,
  PaymentType,
  WithdrawalStatus,
  EscrowStatus,
  EscrowTransactionType,
  EscrowTransactionStatus,
  CredentialType,
  AvailabilityStatus,
  DeliverableStatus,
  TimeEntryStatus
} from '@prisma/client';

import type { 
  UserType,
  ProjectStatus,
  ProjectType,
  ApplicationStatus,
  ContractStatus,
  MilestoneStatus,
  PaymentStatus,
  MessageStatus,
  NotificationType
} from '@prisma/client';

// Type guards for runtime type checking
const USER_TYPES = ['BUSINESS', 'TALENT', 'ADMIN'] as const;
const PROJECT_STATUSES = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
const PROJECT_TYPES = ['FIXED_PRICE', 'HOURLY'] as const;
const APPLICATION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;
const CONTRACT_STATUSES = ['DRAFT', 'PENDING_SIGNATURES', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'IN_PROGRESS'] as const;
const MILESTONE_STATUSES = ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
const PAYMENT_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const;
const MESSAGE_STATUSES = ['SENT', 'READ'] as const;
const NOTIFICATION_TYPES = [
  'APPLICATION_RECEIVED',
  'APPLICATION_STATUS_CHANGED',
  'NEW_MESSAGE',
  'CONTRACT_SIGNED',
  'MILESTONE_SUBMITTED',
  'MILESTONE_APPROVED',
  'PAYMENT_RECEIVED',
  'NEW_REVIEW',
  'SYSTEM_ANNOUNCEMENT',
  'ACCOUNT_UPDATE'
] as const;

export const isUserType = (value: string): value is UserType => {
  return USER_TYPES.includes(value as any);
};

export const isProjectStatus = (value: string): value is ProjectStatus => {
  return PROJECT_STATUSES.includes(value as any);
};

export const isProjectType = (value: string): value is ProjectType => {
  return PROJECT_TYPES.includes(value as any);
};

export const isApplicationStatus = (value: string): value is ApplicationStatus => {
  return APPLICATION_STATUSES.includes(value as any);
};

export const isContractStatus = (value: string): value is ContractStatus => {
  return CONTRACT_STATUSES.includes(value as any);
};

export const isMilestoneStatus = (value: string): value is MilestoneStatus => {
  return MILESTONE_STATUSES.includes(value as any);
};

export const isPaymentStatus = (value: string): value is PaymentStatus => {
  return PAYMENT_STATUSES.includes(value as any);
};

export const isMessageStatus = (value: string): value is MessageStatus => {
  return MESSAGE_STATUSES.includes(value as any);
};

export const isNotificationType = (value: string): value is NotificationType => {
  return NOTIFICATION_TYPES.includes(value as any);
};
