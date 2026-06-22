// PRODUCTION NOTE: This in-memory OTP store resets on server restart and
// does not work across multiple serverless instances. Replace with Upstash Redis.
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number; name?: string }>();

export default otpStore;
