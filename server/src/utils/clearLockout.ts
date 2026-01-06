/**
 * Utility to clear account lockout (for testing/admin purposes)
 */

import { clearFailedAttempts } from '../middleware/accountLockout';

/**
 * Clear lockout for a specific email/IP combination
 */
export function clearAccountLockout(email: string, ipAddress: string = 'unknown'): void {
    clearFailedAttempts(email, ipAddress);
    console.log(`Lockout cleared for ${email} from ${ipAddress}`);
}
