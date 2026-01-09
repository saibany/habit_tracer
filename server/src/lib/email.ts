/**
 * Email Utility
 * Phase 1: Console-based (no real email sending)
 * Phase 2: Add Nodemailer / SendGrid / Resend
 */

import crypto from 'crypto';
import { getEnv } from '../utils/env';

/**
 * Generate a random token and its hash
 * Returns both the raw token (to send to user) and hash (to store in DB)
 */
export function generateToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
}

/**
 * Hash a token for comparison
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Get the base URL for email links
 */
function getBaseUrl(): string {
    const clientUrl = getEnv('CLIENT_URL');
    // Use first URL if multiple are configured
    return clientUrl.split(',')[0].trim();
}

/**
 * Send verification email
 * Phase 1: Just logs to console
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    const baseUrl = getBaseUrl();
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    console.log('\n========================================');
    console.log('📧 VERIFICATION EMAIL (Console Mode)');
    console.log('========================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your email address`);
    console.log(`\nClick here to verify your email:`);
    console.log(`${verifyUrl}`);
    console.log('========================================\n');
}

/**
 * Send password reset email
 * Phase 1: Just logs to console
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    console.log('\n========================================');
    console.log('📧 PASSWORD RESET EMAIL (Console Mode)');
    console.log('========================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Reset your password`);
    console.log(`\nClick here to reset your password:`);
    console.log(`${resetUrl}`);
    console.log('(This link expires in 1 hour)');
    console.log('========================================\n');
}
