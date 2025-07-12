const fs = require('fs');
const path = require('path');

// Content for the .env file
const envContent = `SPREADSHEET_ID=1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I
SHEET_ID=1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I
SHEET_RANGE=Sheet1!A1:Z1000
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"mlb-draft-tracker-auto","private_key_id":"8223658e9764a48d49eb368b0f8d950c889f7e9c","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDS2I+1Acv4k7C5\\nJhxFsYU5v64L+ICZE5pNnoNe/CWFPUb9RTIqKFX2TzCyfLt5lVTwISIG5wbaj4tD\\nNVPoxtbKtlT2Wkbzy5HE2xxGgLF89x6YK5Sm5if8V3/gwro12Zvcmiz1htRQbSjX\\nhDZaz+OMOyaSLDstpxiSptOlglj5NAoFi2XdUVhfrx5CssmGZBOI+gD5Ph4ZS7XW\\nD1C5KZJipJwkS7WXouhFam7sYDq3+NY72QvJhZA+nGjXWgH+zVxrt8FjdXEU2ZLQ\\nPYiL/KOrlh+ymfubDYB9gUUXmJgUabtP1Vq96TBmhiGI61j5hcD2VEW0zewGeE/x\\n6yK0IyKJAgMBAAECggEABH0iUBj18fiY+FQgoXY2TySuzKfxevDRJepkQxsspFHJ\\n5134A7BApkII2B/yMNQ2TvdxnUKBYZlRPnDN9MR48a9gjy8cWBfjJlUA3NpkDPRI\\n5TX2T/hR7Rwix5L1umxD1nY800xXzE+KoU36B0RqRIPE3jNNXjsyuXqOQnWMNd/1\\nEpAui2nHPw2oGLLYgZY3kMggT4zayZgg6td0LclM/zrEXLm12zUmKDURKvMlD5he\\ni7X37IJxOvV6c05A4d9pdWGTEMqMasJYTPopk8H7wmkrx4EU/vC5MMsiRYBnXw9h\\n806QllFoQ+qwCWhDZqsWCcxdxvnaue3c6L8KA8bLoQKBgQD8UEQRNgCD6iLt20u9\\nPhdgAEYT5jXTdWKkOl36ZoPDMGk0m2ivGYRsfCKA8c/OzAExkm243t4bbiMPwr4I\\nsq09ngVLVhFt/8rMEFezpQ8t9Du5cQ372f+lweWZC768LsEsSX/loP7lKy6c6yvi\\nm28xqI1MRSK7rMe9KYGmTpbKMQKBgQDV7TF6EOUZHIgrwHJXG8+KTBLQX48WT+Rj\\nTtagLNrIcqF+eJb1QrdwTJx9o+eGzaj/DoOQemOd1xY9Xmwkk061kews3lpjE9Ep\\nfoo4LeCRNjI6dsgK8TkhsMTlrg+M0vFaMZYbjO45MPvg45k99chEjpvjflKrLw9q\\niPAFNu7v2QKBgQCrlYo0ihzfmKIYT0G6eDc9OfJuJegE3ZcvR+IRHxYL7ygcdnNC\\nYIAFpoVwWwGPCHznUUT8q9MvpD6DwVOqZpgZhxTinq1LuOAY1iROLrmb7rOO8Ksp\\n0p5gAvQ4mBwlrUYA8Brh9hJhlnQkkmlNuZZslstASuPL7TwID+nzRw6UgQKBgFCA\\nf7vlm7DFceC0/NIW3xS15+aN7zSAP/u28UE5X+NKb8c97eDBiHI0AjetdDTgM5Y3\\nif7Wb6I4DGBvpdZlsJrXHL8NtYnPLUimG7FkYjuC34fspv6nI86vzIh55dQilTxR\\nqKEZeZQAAOjx/Pq6APD7kWIcaVON1AlNGrV7pJKRAoGBAJ81lnOYkUHE9HprD//W\\ndrvF+aUcD5IdacE8Waq77xoQBLDaex1nLr8cvOUNGBC3tASfUaSBnc+mA7p12MLH\\n6yhwX8bYXxTO3PDboCB+d//TdxPoVmy/5hg34qHZ5MXsG1rI3Ruq/kMdavRe5BI2\\npOxomWS0C4ChfFP8gN5Ayd2A\\n-----END PRIVATE KEY-----\\n","client_email":"mlb-draft-tracker-auto@mlb-draft-tracker-auto.iam.gserviceaccount.com","client_id":"114795013283426706463","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/mlb-draft-tracker-auto%40mlb-draft-tracker-auto.iam.gserviceaccount.com","universe_domain":"googleapis.com"}`;

// Path to the .env file
const envPath = path.join(__dirname, '.env');

console.log('🔧 Creating .env file...');
console.log('========================');

try {
  // Check if .env file already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists!');
    console.log('Do you want to overwrite it? (y/n)');
    
    // For now, just create it
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created/updated successfully!');
  } else {
    // Create the .env file
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
  }
  
  console.log('📁 File location:', envPath);
  console.log('📋 File contents:');
  console.log('SPREADSHEET_ID=1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I');
  console.log('SHEET_ID=1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I');
  console.log('SHEET_RANGE=Sheet1!A1:Z1000');
  console.log('GOOGLE_CREDENTIALS=[Your credentials are set]');
  
  console.log('\n🚀 Now you can test it:');
  console.log('node check-env.js');
  
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  console.log('\n📝 Manual creation instructions:');
  console.log('1. Create a new text file named ".env"');
  console.log('2. Copy and paste the content above');
  console.log('3. Save the file in your mlb-draft-tracker folder');
} 