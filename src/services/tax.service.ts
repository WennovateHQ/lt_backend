// import { Decimal } from '@prisma/client/runtime/library'; // Unused

export interface ProvincialTaxRate {
  province: string;
  provinceCode: string;
  taxType: 'GST' | 'HST' | 'GST/PST' | 'GST/QST';
  gstRate: number;
  provincialRate: number;
  totalRate: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  platformFee: number;
  gstAmount: number;
  provincialTaxAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  taxBreakdown: {
    gstRate: number;
    provincialRate: number;
    totalRate: number;
    taxType: string;
  };
}

export interface PlatformFeeCalculation {
  baseFee: number;
  taxAmount: number;
  totalFee: number;
  exemptFromTax: boolean;
  reason?: string;
}

export class TaxService {
  private static readonly PLATFORM_FEE_RATE = 0.08; // 8%
  
  private static readonly PROVINCIAL_TAX_RATES: ProvincialTaxRate[] = [
    { province: 'Alberta', provinceCode: 'AB', taxType: 'GST', gstRate: 0.05, provincialRate: 0.00, totalRate: 0.05 },
    { province: 'British Columbia', provinceCode: 'BC', taxType: 'GST/PST', gstRate: 0.05, provincialRate: 0.07, totalRate: 0.12 },
    { province: 'Manitoba', provinceCode: 'MB', taxType: 'GST/PST', gstRate: 0.05, provincialRate: 0.07, totalRate: 0.12 },
    { province: 'New Brunswick', provinceCode: 'NB', taxType: 'HST', gstRate: 0.05, provincialRate: 0.10, totalRate: 0.15 },
    { province: 'Newfoundland and Labrador', provinceCode: 'NL', taxType: 'HST', gstRate: 0.05, provincialRate: 0.10, totalRate: 0.15 },
    { province: 'Northwest Territories', provinceCode: 'NT', taxType: 'GST', gstRate: 0.05, provincialRate: 0.00, totalRate: 0.05 },
    { province: 'Nova Scotia', provinceCode: 'NS', taxType: 'HST', gstRate: 0.05, provincialRate: 0.10, totalRate: 0.15 },
    { province: 'Nunavut', provinceCode: 'NU', taxType: 'GST', gstRate: 0.05, provincialRate: 0.00, totalRate: 0.05 },
    { province: 'Ontario', provinceCode: 'ON', taxType: 'HST', gstRate: 0.05, provincialRate: 0.08, totalRate: 0.13 },
    { province: 'Prince Edward Island', provinceCode: 'PE', taxType: 'HST', gstRate: 0.05, provincialRate: 0.10, totalRate: 0.15 },
    { province: 'Quebec', provinceCode: 'QC', taxType: 'GST/QST', gstRate: 0.05, provincialRate: 0.09975, totalRate: 0.14975 },
    { province: 'Saskatchewan', provinceCode: 'SK', taxType: 'GST/PST', gstRate: 0.05, provincialRate: 0.06, totalRate: 0.11 },
    { province: 'Yukon', provinceCode: 'YT', taxType: 'GST', gstRate: 0.05, provincialRate: 0.00, totalRate: 0.05 }
  ];

  /**
   * Get tax rates for a specific province
   */
  static getTaxRatesByProvince(provinceCode: string): ProvincialTaxRate | null {
    return this.PROVINCIAL_TAX_RATES.find(rate => 
      rate.provinceCode.toLowerCase() === provinceCode.toLowerCase()
    ) || null;
  }

  /**
   * Calculate platform fees with tax considerations
   */
  static calculatePlatformFee(
    projectAmount: number,
    provinceCode: string,
    hasGstHstNumber: boolean = false
  ): PlatformFeeCalculation {
    const baseFee = projectAmount * this.PLATFORM_FEE_RATE;
    
    if (hasGstHstNumber) {
      return {
        baseFee,
        taxAmount: 0,
        totalFee: baseFee,
        exemptFromTax: true,
        reason: 'GST/HST registered business - exempt from tax on platform fees'
      };
    }

    const taxRates = this.getTaxRatesByProvince(provinceCode);
    if (!taxRates) {
      // Default to 5% GST if province not found
      const taxAmount = baseFee * 0.05;
      return {
        baseFee,
        taxAmount,
        totalFee: baseFee + taxAmount,
        exemptFromTax: false,
        reason: 'Province not found - applied default 5% GST'
      };
    }

    const taxAmount = baseFee * taxRates.totalRate;
    
    return {
      baseFee,
      taxAmount,
      totalFee: baseFee + taxAmount,
      exemptFromTax: false
    };
  }

  /**
   * Calculate taxes on any amount for a given province
   */
  static calculateTax(
    amount: number,
    provinceCode: string
  ): TaxCalculationResult {
    const taxRates = this.getTaxRatesByProvince(provinceCode);
    
    if (!taxRates) {
      throw new Error(`Tax rates not found for province: ${provinceCode}`);
    }

    const platformFee = amount * this.PLATFORM_FEE_RATE;
    const gstAmount = amount * taxRates.gstRate;
    const provincialTaxAmount = amount * taxRates.provincialRate;
    const totalTaxAmount = gstAmount + provincialTaxAmount;
    const totalAmount = amount + totalTaxAmount;

    return {
      subtotal: amount,
      platformFee,
      gstAmount,
      provincialTaxAmount,
      totalTaxAmount,
      totalAmount,
      taxBreakdown: {
        gstRate: taxRates.gstRate,
        provincialRate: taxRates.provincialRate,
        totalRate: taxRates.totalRate,
        taxType: taxRates.taxType
      }
    };
  }

  /**
   * Calculate business platform fees for fixed-price projects
   */
  static calculateBusinessPlatformFee(
    projectTotalCost: number,
    businessProvinceCode: string,
    businessHasGstHst: boolean = false
  ): PlatformFeeCalculation {
    return this.calculatePlatformFee(projectTotalCost, businessProvinceCode, businessHasGstHst);
  }

  /**
   * Calculate business platform fees for hourly projects (biweekly)
   */
  static calculateBusinessHourlyPlatformFee(
    hourlyRate: number,
    totalHours: number,
    businessProvinceCode: string,
    businessHasGstHst: boolean = false
  ): PlatformFeeCalculation {
    const biweeklyAmount = hourlyRate * totalHours;
    return this.calculatePlatformFee(biweeklyAmount, businessProvinceCode, businessHasGstHst);
  }

  /**
   * Calculate talent platform fees on completed work payments
   */
  static calculateTalentPlatformFee(
    paymentAmount: number,
    talentProvinceCode: string,
    talentHasGstHst: boolean = false
  ): PlatformFeeCalculation {
    return this.calculatePlatformFee(paymentAmount, talentProvinceCode, talentHasGstHst);
  }

  /**
   * Validate GST/HST number format (basic validation)
   */
  static validateGstHstNumber(gstHstNumber: string): boolean {
    if (!gstHstNumber) return false;
    
    // Remove spaces and convert to uppercase
    const cleaned = gstHstNumber.replace(/\s/g, '').toUpperCase();
    
    // Canadian GST/HST number format: 9 digits + RT + 4 digits
    // Example: 123456789RT0001
    const gstHstRegex = /^\d{9}RT\d{4}$/;
    
    return gstHstRegex.test(cleaned);
  }

  /**
   * Format GST/HST number for display
   */
  static formatGstHstNumber(gstHstNumber: string): string {
    if (!gstHstNumber) return '';
    
    const cleaned = gstHstNumber.replace(/\s/g, '').toUpperCase();
    
    if (cleaned.length === 15) {
      // Format as: 123 456 789 RT 0001
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 11)} ${cleaned.slice(11, 15)}`;
    }
    
    return cleaned;
  }

  /**
   * Get all available provinces for dropdown
   */
  static getAllProvinces(): { code: string; name: string; taxType: string; totalRate: number }[] {
    return this.PROVINCIAL_TAX_RATES.map(rate => ({
      code: rate.provinceCode,
      name: rate.province,
      taxType: rate.taxType,
      totalRate: rate.totalRate
    }));
  }

  /**
   * Calculate total project cost including all fees and taxes
   */
  static calculateTotalProjectCost(
    baseProjectCost: number,
    businessProvinceCode: string,
    talentProvinceCode: string,
    businessHasGstHst: boolean = false,
    talentHasGstHst: boolean = false
  ): {
    baseProjectCost: number;
    businessPlatformFee: PlatformFeeCalculation;
    talentPlatformFee: PlatformFeeCalculation;
    totalCostToBusiness: number;
    netPaymentToTalent: number;
  } {
    const businessFee = this.calculateBusinessPlatformFee(
      baseProjectCost, 
      businessProvinceCode, 
      businessHasGstHst
    );
    
    const talentFee = this.calculateTalentPlatformFee(
      baseProjectCost, 
      talentProvinceCode, 
      talentHasGstHst
    );

    const totalCostToBusiness = baseProjectCost + businessFee.totalFee;
    const netPaymentToTalent = baseProjectCost - talentFee.totalFee;

    return {
      baseProjectCost,
      businessPlatformFee: businessFee,
      talentPlatformFee: talentFee,
      totalCostToBusiness,
      netPaymentToTalent
    };
  }
}

export default TaxService;
