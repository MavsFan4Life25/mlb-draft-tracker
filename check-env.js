// Simple script to check environment variables
require('dotenv').config();

console.log('🔍 Checking environment variables...');
console.log('====================================');

console.log('SPREADSHEET_ID:', process.env.SPREADSHEET_ID ? 'SET' : 'NOT SET');
console.log('SHEET_ID:', process.env.SHEET_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CREDENTIALS:', process.env.GOOGLE_CREDENTIALS ? 'SET' : 'NOT SET');
console.log('SHEET_RANGE:', process.env.SHEET_RANGE ? 'SET' : 'NOT SET');

if (process.env.GOOGLE_CREDENTIALS) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('✅ GOOGLE_CREDENTIALS is valid JSON');
    console.log('Project ID:', credentials.project_id || 'Not found');
    console.log('Client Email:', credentials.client_email || 'Not found');
  } catch (error) {
    console.log('❌ GOOGLE_CREDENTIALS is not valid JSON');
  }
} else {
  console.log('❌ GOOGLE_CREDENTIALS is not set');
}

console.log('\n📝 To set environment variables, create a .env file with:');
console.log('SPREADSHEET_ID=your_sheet_id');
console.log('GOOGLE_CREDENTIALS={"type":"service_account",...}');
console.log('SHEET_RANGE=Sheet1!A1:Z1000'); 