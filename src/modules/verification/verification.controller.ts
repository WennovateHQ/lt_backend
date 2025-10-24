import { Request, Response } from 'express'
import { VerificationService } from './verification.service'
import { 
  SendEmailVerificationRequest,
  VerifyEmailRequest,
  SendPhoneVerificationRequest,
  VerifyPhoneRequest,
  SubmitBusinessVerificationRequest,
  UpdateBusinessVerificationRequest,
  SubmitIdentityVerificationRequest,
  UpdateIdentityVerificationRequest,
  UploadVerificationDocumentRequest,
  ReviewVerificationRequest,
  VerificationSearchParams
} from './verification.types'

export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  // Email Verification
  sendEmailVerification = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: SendEmailVerificationRequest = req.body

      // Validate email format if provided
      if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(data.email)) {
          return res.status(400).json({ error: 'Invalid email format' })
        }
      }

      const verification = await this.verificationService.sendEmailVerification(userId, data)
      return res.json({ 
        message: 'Verification email sent successfully',
        verificationId: verification.id,
        expiresAt: verification.expiresAt
      })
    } catch (error) {
      console.error('Error sending email verification:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to send email verification' })
      }
    }
  }

  verifyEmail = async (req: Request, res: Response) => {
    try {
      const data: VerifyEmailRequest = req.body

      if (!data.token) {
        return res.status(400).json({ error: 'Verification token is required' })
      }

      const result = await this.verificationService.verifyEmail(data)
      
      if (result.success) {
        return res.json({ message: result.message })
      } else {
        return res.status(400).json({ error: result.message })
      }
    } catch (error) {
      console.error('Error verifying email:', error)
      return res.status(500).json({ error: 'Failed to verify email' })
    }
  }

  resendEmailVerification = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const verification = await this.verificationService.resendEmailVerification(userId)
      return res.json({ 
        message: 'Verification email resent successfully',
        verificationId: verification.id,
        expiresAt: verification.expiresAt
      })
    } catch (error) {
      console.error('Error resending email verification:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to resend email verification' })
      }
    }
  }

  // Phone Verification
  sendPhoneVerification = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: SendPhoneVerificationRequest = req.body

      // Validate required fields
      if (!data.phoneNumber || !data.countryCode || !data.method) {
        return res.status(400).json({ 
          error: 'Phone number, country code, and method are required' 
        })
      }

      // Validate phone number format (basic validation)
      if (data.phoneNumber.length < 10 || data.phoneNumber.length > 15) {
        return res.status(400).json({ error: 'Invalid phone number format' })
      }

      // Validate country code
      if (data.countryCode.length !== 2) {
        return res.status(400).json({ error: 'Invalid country code format' })
      }

      const verification = await this.verificationService.sendPhoneVerification(userId, data)
      return res.json({ 
        message: 'Verification code sent successfully',
        verificationId: verification.id,
        method: verification.method,
        expiresAt: verification.expiresAt
      })
    } catch (error) {
      console.error('Error sending phone verification:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to send phone verification' })
      }
    }
  }

  verifyPhone = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: VerifyPhoneRequest = req.body

      if (!data.phoneNumber || !data.verificationCode) {
        return res.status(400).json({ 
          error: 'Phone number and verification code are required' 
        })
      }

      // Validate verification code format
      if (!/^\d{6}$/.test(data.verificationCode)) {
        return res.status(400).json({ error: 'Verification code must be 6 digits' })
      }

      const result = await this.verificationService.verifyPhone(userId, data)
      
      if (result.success) {
        return res.json({ message: result.message })
      } else {
        return res.status(400).json({ error: result.message })
      }
    } catch (error) {
      console.error('Error verifying phone:', error)
      return res.status(500).json({ error: 'Failed to verify phone' })
    }
  }

  // Business Verification
  submitBusinessVerification = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: SubmitBusinessVerificationRequest = req.body

      // Validate required fields
      if (!data.businessName || !data.registrationNumber || !data.businessType || !data.jurisdiction) {
        return res.status(400).json({ 
          error: 'Business name, registration number, business type, and jurisdiction are required' 
        })
      }

      // Validate documents
      if (!data.documents || data.documents.length === 0) {
        return res.status(400).json({ error: 'At least one verification document is required' })
      }

      // Validate each document
      for (const doc of data.documents) {
        if (!doc.type || !doc.fileName || !doc.fileUrl) {
          return res.status(400).json({ 
            error: 'Document type, file name, and file URL are required for all documents' 
          })
        }
      }

      const verification = await this.verificationService.submitBusinessVerification(userId, data)
      return res.status(201).json({
        message: 'Business verification submitted successfully',
        verificationId: verification.id,
        status: verification.status
      })
    } catch (error) {
      console.error('Error submitting business verification:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to submit business verification' })
      }
    }
  }

  getBusinessVerificationStatus = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const verification = await this.verificationService.getBusinessVerificationStatus(userId)
      
      if (!verification) {
        return res.status(404).json({ error: 'Business verification not found' })
      }

      return res.json(verification)
    } catch (error) {
      console.error('Error getting business verification status:', error)
      return res.status(500).json({ error: 'Failed to get business verification status' })
    }
  }

  updateBusinessVerification = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: UpdateBusinessVerificationRequest = req.body

      const verification = await this.verificationService.updateBusinessVerification(userId, data)
      return res.json({
        message: 'Business verification updated successfully',
        verification
      })
    } catch (error) {
      console.error('Error updating business verification:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to update business verification' })
      }
    }
  }

  // Identity Verification
  submitIdentityVerification = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: SubmitIdentityVerificationRequest = req.body

      // Validate required fields
      if (!data.personalInfo || !data.verificationMethod || !data.documents) {
        return res.status(400).json({ 
          error: 'Personal info, verification method, and documents are required' 
        })
      }

      // Validate personal info
      const { personalInfo } = data
      if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.dateOfBirth || !personalInfo.address) {
        return res.status(400).json({ 
          error: 'Complete personal information is required' 
        })
      }

      // Validate address
      const { address } = personalInfo
      if (!address.street || !address.city || !address.province || !address.postalCode || !address.country) {
        return res.status(400).json({ 
          error: 'Complete address information is required' 
        })
      }

      // Validate documents
      if (data.documents.length === 0) {
        return res.status(400).json({ error: 'At least one identity document is required' })
      }

      const verification = await this.verificationService.submitIdentityVerification(userId, data)
      return res.status(201).json({
        message: 'Identity verification submitted successfully',
        verificationId: verification.id,
        status: verification.status
      })
    } catch (error) {
      console.error('Error submitting identity verification:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to submit identity verification' })
      }
    }
  }

  getIdentityVerificationStatus = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const verification = await this.verificationService.getIdentityVerificationStatus(userId)
      
      if (!verification) {
        return res.status(404).json({ error: 'Identity verification not found' })
      }

      return res.json(verification)
    } catch (error) {
      console.error('Error getting identity verification status:', error)
      return res.status(500).json({ error: 'Failed to get identity verification status' })
    }
  }

  updateIdentityVerification = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: UpdateIdentityVerificationRequest = req.body

      const verification = await this.verificationService.updateIdentityVerification(userId, data)
      return res.json({
        message: 'Identity verification updated successfully',
        verification
      })
    } catch (error) {
      console.error('Error updating identity verification:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to update identity verification' })
      }
    }
  }

  // Document Upload
  uploadDocument = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: UploadVerificationDocumentRequest = req.body

      // Validate required fields
      if (!data.verificationType || !data.documentType || !data.fileName || !data.fileUrl) {
        return res.status(400).json({ 
          error: 'Verification type, document type, file name, and file URL are required' 
        })
      }

      const result = await this.verificationService.uploadVerificationDocument(userId, data)
      return res.json(result)
    } catch (error) {
      console.error('Error uploading verification document:', error)
      return res.status(500).json({ error: 'Failed to upload verification document' })
    }
  }

  // User Status
  getUserVerificationStatus = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const status = await this.verificationService.getUserVerificationStatus(userId)
      return res.json(status)
    } catch (error) {
      console.error('Error getting user verification status:', error)
      return res.status(500).json({ error: 'Failed to get verification status' })
    }
  }

  // Admin Endpoints
  getPendingVerifications = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check admin permissions
      if (req.user?.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      const params: VerificationSearchParams = {
        page: req.query['page'] ? parseInt(req.query['page'] as string) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
        type: req.query['type'] as 'business' | 'identity',
        status: req.query['status'] as any,
        userId: req.query['userId'] as string,
        dateFrom: req.query['dateFrom'] as string,
        dateTo: req.query['dateTo'] as string,
        search: req.query['search'] as string,
        sortBy: req.query['sortBy'] as any,
        sortOrder: req.query['sortOrder'] as 'asc' | 'desc'
      }

      const result = await this.verificationService.getPendingVerifications(params)
      return res.json(result)
    } catch (error) {
      console.error('Error getting pending verifications:', error)
      return res.status(500).json({ error: 'Failed to get pending verifications' })
    }
  }

  reviewVerification = async (req: Request, res: Response) => {
    try {
      const { verificationId } = req.params
      if (!verificationId) {
        return res.status(400).json({ error: 'Verification ID is required' })
      }
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check admin permissions
      if (req.user?.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      const data: ReviewVerificationRequest = req.body

      // Validate required fields
      if (!data.status) {
        return res.status(400).json({ error: 'Verification status is required' })
      }

      if (data.status === 'rejected' && !data.rejectionReason) {
        return res.status(400).json({ error: 'Rejection reason is required when rejecting verification' })
      }

      const result = await this.verificationService.reviewVerification(verificationId, userId, data)
      return res.json(result)
    } catch (error) {
      console.error('Error reviewing verification:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to review verification' })
      }
    }
  }

  getVerificationStats = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check admin permissions
      if (req.user?.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      const stats = await this.verificationService.getVerificationStats()
      return res.json(stats)
    } catch (error) {
      console.error('Error getting verification stats:', error)
      return res.status(500).json({ error: 'Failed to get verification statistics' })
    }
  }
}
