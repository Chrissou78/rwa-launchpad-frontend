// scripts/test-email.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import after env is loaded
import { sendTestEmail, verifyEmailConnection } from '../src/lib/notifications/email-templates';

async function main() {
  console.log('\n🔧 SMTP Configuration Test\n');
  console.log('='.repeat(50));
  
  // Show loaded config (mask password)
  console.log('\n📋 Loaded Configuration:');
  console.log(`  SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
  console.log(`  SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET'}`);
  console.log(`  SMTP_SECURE: ${process.env.SMTP_SECURE || 'NOT SET'}`);
  console.log(`  SMTP_USER: ${process.env.SMTP_USER || 'NOT SET'}`);
  console.log(`  SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET'}`);
  console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM || 'NOT SET'}`);
  
  console.log('\n🔌 Testing SMTP connection...');
  const verify = await verifyEmailConnection();
  console.log('Verification result:', verify);
  
  if (verify.connected) {
    const testEmail = process.argv[2];
    if (testEmail) {
      console.log(`\n📧 Sending test email to: ${testEmail}`);
      const result = await sendTestEmail(testEmail);
      console.log('Send result:', result);
    } else {
      console.log('\n💡 To send a test email, run:');
      console.log('   npx tsx scripts/test-email.ts your-email@gmail.com');
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

main().catch(console.error);
