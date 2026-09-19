import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Parse the given env file manually (defaults to .env.local; pass a path to
// test a different one, e.g. `node test-smtp.mjs .env.production`).
const envPath = path.join(process.cwd(), process.argv[2] || '.env.local');
if (!fs.existsSync(envPath)) {
  console.error(`Error: ${envPath} not found.`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  }
});

const gmailUser = env.GMAIL_USER;
const gmailPass = env.GMAIL_PASS;

console.log('Testing SMTP connection with:');
console.log('GMAIL_USER:', gmailUser);
console.log('GMAIL_PASS:', gmailPass ? '****' + gmailPass.slice(-4) : 'undefined');

if (!gmailUser || !gmailPass || gmailUser === 'yourname@gmail.com' || gmailPass === 'xxxx-xxxx-xxxx-xxxx') {
  console.error('\nError: Please replace the placeholder values in .env.local with your real Gmail credentials first.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass,
  },
  tls: {
    rejectUnauthorized: false
  }
});

console.log('\nSending test email...');
transporter.sendMail({
  from: `"NAAMI Test" <${gmailUser}>`,
  to: gmailUser,
  subject: 'SMTP Diagnostics Test',
  text: 'If you receive this, your Gmail SMTP configurations are correct!',
}, (err, info) => {
  if (err) {
    console.error('\nSMTP Test FAILED!');
    console.error('Error Details:', err);
  } else {
    console.log('\nSMTP Test SUCCESSFUL!');
    console.log('Message sent successfully. Response:', info.response);
  }
});
