import { z } from 'zod';
import { ContractStatus, MilestoneStatus } from '@prisma/client';

// Contract DTOs
export const CreateContractSchema = z.object({
  applicationId: z.string().cuid(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  totalAmount: z.number().positive('Total amount must be positive'),
  currency: z.string().optional().default('CAD'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  terms: z.string().optional()
});

export const UpdateContractSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  terms: z.string().optional()
});

export const CreateMilestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().datetime(),
  order: z.number().int().positive().optional()
});

export const UpdateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  order: z.number().int().positive().optional()
});

export const SubmitMilestoneSchema = z.object({
  deliverables: z.string().optional()
});

// Type exports
export type CreateContractDTO = z.infer<typeof CreateContractSchema>;
export type UpdateContractDTO = z.infer<typeof UpdateContractSchema>;
export type CreateMilestoneDTO = z.infer<typeof CreateMilestoneSchema>;
export type UpdateMilestoneDTO = z.infer<typeof UpdateMilestoneSchema>;
export type SubmitMilestoneDTO = z.infer<typeof SubmitMilestoneSchema>;

// Response types
export interface ContractWithDetails {
  id: string;
  title: string;
  description: string;
  totalAmount: number;
  currency: string;
  status: ContractStatus;
  startDate: Date;
  endDate: Date;
  terms?: string;
  businessSignedAt?: Date;
  talentSignedAt?: Date;
  activatedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  business: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      companyName?: string;
    };
  };
  talent: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      title?: string;
    };
  };
  project: {
    id: string;
    title: string;
    description: string;
  };
  milestones: MilestoneWithDetails[];
}

export interface MilestoneWithDetails {
  id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  order: number;
  status: MilestoneStatus;
  deliverables?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractStats {
  total: number;
  active: number;
  completed: number;
  totalEarnings: number;
}
