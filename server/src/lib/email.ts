/**
 * Email Service using Nodemailer with Gmail SMTP
 * Production-grade email delivery for verification and password reset
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getEnv } from '../utils/env';

// Email configuration from environment
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || `Habit Tracer <${EMAIL_USER}>`;

// Create transporter
const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

// Verify connection on startup (optional, logs to console)
transporter.verify()
    .then(() => console.log('[Email] SMTP connection verified successfully'))
    .catch((err) => console.error('[Email] SMTP connection failed:', err.message));

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
 * Send verification email using Gmail SMTP
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    const baseUrl = getBaseUrl();
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    const mailOptions = {
        from: EMAIL_FROM,
        to: email,
        subject: 'Verify your email address - Habit Tracer',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your Email</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Habit Tracer</h1>
                    </div>
                    <div style="padding: 32px;">
                        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Verify your email address</h2>
                        <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">
                            Thanks for signing up! Please click the button below to verify your email address and activate your account.
                        </p>
                        <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Verify Email Address
                        </a>
                        <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0 0; line-height: 1.6;">
                            This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[Email] Verification email sent successfully:', info.messageId);
    } catch (error) {
        console.error('[Email] Failed to send verification email:', error);
        throw new Error(`Failed to send verification email: ${(error as Error).message}`);
    }
}

/**
 * Send password reset email using Gmail SMTP
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
        from: EMAIL_FROM,
        to: email,
        subject: 'Reset your password - Habit Tracer',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Habit Tracer</h1>
                    </div>
                    <div style="padding: 32px;">
                        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Reset your password</h2>
                        <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">
                            We received a request to reset your password. Click the button below to choose a new password.
                        </p>
                        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Reset Password
                        </a>
                        <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0 0; line-height: 1.6;">
                            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[Email] Password reset email sent successfully:', info.messageId);
    } catch (error) {
        console.error('[Email] Failed to send password reset email:', error);
        throw new Error(`Failed to send password reset email: ${(error as Error).message}`);
    }
}
