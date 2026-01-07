/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are set
 */

const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL'
] as const;

const optionalEnvVars = {
    NODE_ENV: 'development',
    PORT: '5000',
    CLIENT_URL: 'http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173',
    JWT_EXPIRES_IN: '1h',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    TRUST_PROXY: 'false',
    RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
    RATE_LIMIT_MAX: '100', // General API limit
    RATE_LIMIT_AUTH_MAX: '5', // Auth endpoints limit
} as const;

export function validateEnv(): void {
    const missing: string[] = [];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(envVar => console.error(`   - ${envVar}`));
        console.error('\nPlease set these in your .env file');
        process.exit(1);
    }

    // Validate JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
        console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for production');
    }
    if (jwtSecret === 'fallback-secret-change-this' || jwtSecret === 'secret') {
        console.error('❌ ERROR: JWT_SECRET must be changed from default value!');
        process.exit(1);
    }
}

export function getEnv(key: keyof typeof optionalEnvVars): string {
    return process.env[key] || optionalEnvVars[key];
}

export function getRequiredEnv(key: typeof requiredEnvVars[number]): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}
