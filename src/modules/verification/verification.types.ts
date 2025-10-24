export interface EmailVerification {
  id: string
  userId: string
  email: string
  token: string
  status: 'pending' | 'verified' | 'expired' | 'failed'
  sentAt: string
  verifiedAt?: string
  expiresAt: string
  attempts: number
  maxAttempts: number
}

export interface PhoneVerification {
  id: string
  userId: string
  phoneNumber: string
  countryCode: string
  verificationCode: string
  status: 'pending' | 'verified' | 'expired' | 'failed'
  method: 'sms' | 'call'
  sentAt: string
  verifiedAt?: string
  expiresAt: string
  attempts: number
  maxAttempts: number
}

export interface BusinessVerification {
  id: string
  userId: string
  businessName: string
  registrationNumber: string
  businessType: 'corporation' | 'partnership' | 'sole_proprietorship' | 'non_profit' | 'other'
  jurisdiction: string
  status: 'pending' | 'verified' | 'rejected' | 'requires_documents'
  
  documents: Array<{
    id: string
    type: 'business_registration' | 'tax_certificate' | 'operating_agreement' | 'articles_incorporation' | 'other'
    fileName: string
    fileUrl: string
    uploadedAt: string
    status: 'pending' | 'approved' | 'rejected'
    rejectionReason?: string
  }>
  
  verificationData?: {
    registeredAddress: string
    incorporationDate: string
    directors?: Array<{
      name: string
      title: string
    }>
    businessDescription: string
    website?: string
    phoneNumber?: string
  }
  
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  verificationNotes?: string
  
  createdAt: string
  updatedAt: string
}

export interface IdentityVerification {
  id: string
  userId: string
  status: 'pending' | 'verified' | 'rejected' | 'requires_documents'
  
  personalInfo: {
    firstName: string
    lastName: string
    dateOfBirth: string
    address: {
      street: string
      city: string
      province: string
      postalCode: string
      country: string
    }
  }
  
  documents: Array<{
    id: string
    type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'other'
    fileName: string
    fileUrl: string
    uploadedAt: string
    status: 'pending' | 'approved' | 'rejected'
    rejectionReason?: string
    expiryDate?: string
  }>
  
  verificationMethod: 'document_upload' | 'video_call' | 'in_person'
  verificationScore?: number
  
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  verificationNotes?: string
  
  createdAt: string
  updatedAt: string
}

export interface SendEmailVerificationRequest {
  email?: string // If not provided, uses user's current email
}

export interface VerifyEmailRequest {
  token: string
}

export interface SendPhoneVerificationRequest {
  phoneNumber: string
  countryCode: string
  method: 'sms' | 'call'
}

export interface VerifyPhoneRequest {
  phoneNumber: string
  verificationCode: string
}

export interface SubmitBusinessVerificationRequest {
  businessName: string
  registrationNumber: string
  businessType: BusinessVerification['businessType']
  jurisdiction: string
  verificationData: BusinessVerification['verificationData']
  documents: Array<{
    type: string
    fileName: string
    fileUrl: string
  }>
}

export interface UpdateBusinessVerificationRequest {
  businessName?: string
  registrationNumber?: string
  businessType?: BusinessVerification['businessType']
  jurisdiction?: string
  verificationData?: BusinessVerification['verificationData']
}

export interface SubmitIdentityVerificationRequest {
  personalInfo: IdentityVerification['personalInfo']
  verificationMethod: IdentityVerification['verificationMethod']
  documents: Array<{
    type: string
    fileName: string
    fileUrl: string
    expiryDate?: string
  }>
}

export interface UpdateIdentityVerificationRequest {
  personalInfo?: IdentityVerification['personalInfo']
}

export interface UploadVerificationDocumentRequest {
  verificationType: 'business' | 'identity'
  documentType: string
  fileName: string
  fileUrl: string
  expiryDate?: string
}

export interface ReviewVerificationRequest {
  status: 'verified' | 'rejected' | 'requires_documents'
  rejectionReason?: string
  verificationNotes?: string
  documentReviews?: Array<{
    documentId: string
    status: 'approved' | 'rejected'
    rejectionReason?: string
  }>
}

export interface VerificationStats {
  overview: {
    totalVerifications: number
    pendingVerifications: number
    verifiedUsers: number
    rejectedVerifications: number
    averageProcessingTime: number
  }
  
  byType: {
    email: {
      total: number
      verified: number
      pending: number
      failed: number
    }
    phone: {
      total: number
      verified: number
      pending: number
      failed: number
    }
    business: {
      total: number
      verified: number
      pending: number
      rejected: number
    }
    identity: {
      total: number
      verified: number
      pending: number
      rejected: number
    }
  }
  
  trends: {
    verificationsThisMonth: number
    verificationsLastMonth: number
    averageProcessingTimeThisMonth: number
    averageProcessingTimeLastMonth: number
    verificationSuccessRate: number
  }
  
  topRejectionReasons: Array<{
    reason: string
    count: number
    percentage: number
  }>
}

export interface PendingVerificationsResponse {
  verifications: Array<{
    id: string
    type: 'business' | 'identity'
    userId: string
    userName: string
    userEmail: string
    status: string
    submittedAt: string
    priority: 'low' | 'medium' | 'high'
    documentCount: number
    businessName?: string
    registrationNumber?: string
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface VerificationSearchParams {
  page?: number
  limit?: number
  type?: 'business' | 'identity'
  status?: 'pending' | 'verified' | 'rejected' | 'requires_documents'
  userId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export interface VerificationNotification {
  type: 'verification_submitted' | 'verification_approved' | 'verification_rejected' | 'documents_required' | 'verification_expired'
  userId: string
  verificationType: 'email' | 'phone' | 'business' | 'identity'
  title: string
  message: string
  actionUrl?: string
  metadata?: Record<string, any>
}
