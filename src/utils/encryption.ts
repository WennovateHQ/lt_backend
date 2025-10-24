import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Get encryption key from environment variable
 * In production, this should be stored in a secure key management service
 */
function getEncryptionKey(): string {
  const key = process.env['ENCRYPTION_KEY'];
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)');
  }
  return key;
}

/**
 * Encrypt sensitive data (SIN, bank account numbers)
 * Uses AES-256-GCM for authenticated encryption
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: salt + iv + authTag + encryptedData (all in hex)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from the encryption key and salt
    const derivedKey = crypto.pbkdf2Sync(
      Buffer.from(key, 'hex'),
      salt,
      100000,
      32,
      'sha256'
    );
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    
    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine: salt + iv + authTag + encrypted data
    const result = Buffer.concat([salt, iv, authTag, encrypted]);
    
    // Return as hex string
    return result.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedData - The encrypted string in hex format
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    
    // Convert from hex to buffer
    const buffer = Buffer.from(encryptedData, 'hex');
    
    // Extract components
    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, TAG_POSITION);
    const authTag = buffer.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = buffer.slice(ENCRYPTED_POSITION);
    
    // Derive the same key
    const derivedKey = crypto.pbkdf2Sync(
      Buffer.from(key, 'hex'),
      salt,
      100000,
      32,
      'sha256'
    );
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data for comparison (one-way)
 * Useful for searching/matching without decryption
 * @param data - The data to hash
 * @returns SHA-256 hash in hex format
 */
export function hashData(data: string): string {
  if (!data) {
    return '';
  }
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random encryption key
 * Run this once to generate a key for your environment
 * @returns 32-byte key in hex format (64 characters)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Mask sensitive data for display
 * @param data - The data to mask
 * @param visibleChars - Number of characters to show at the end
 * @returns Masked string
 */
export function maskData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '****';
  }
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
}

/**
 * Validate SIN format (Canadian)
 * @param sin - Social Insurance Number
 * @returns boolean
 */
export function isValidSIN(sin: string): boolean {
  // Remove dashes and spaces
  const cleaned = sin.replace(/[-\s]/g, '');
  
  // Must be 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    return false;
  }
  
  // Cannot start with 0 or 8
  if (cleaned.startsWith('0') || cleaned.startsWith('8')) {
    return false;
  }
  
  return true;
}

/**
 * Validate Canadian bank account details
 * @param institution - 3-digit institution number
 * @param transit - 5-digit transit number
 * @param account - 7-12 digit account number
 * @returns boolean
 */
export function isValidBankAccount(
  institution: string,
  transit: string,
  account: string
): boolean {
  // Institution: 3 digits
  if (!/^\d{3}$/.test(institution)) {
    return false;
  }
  
  // Transit: 5 digits
  if (!/^\d{5}$/.test(transit)) {
    return false;
  }
  
  // Account: 7-12 digits
  if (!/^\d{7,12}$/.test(account)) {
    return false;
  }
  
  return true;
}
