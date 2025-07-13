const { google } = require('googleapis');
require('dotenv').config();

const SHEET_ID = process.env.SPREADSHEET_ID || process.env.SHEET_ID || '1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I';
const SHEET_RANGE = process.env.SHEET_RANGE || 'Players!A1:Z1000';

console.log('Testing Google Sheets connection...');
console.log('SHEET_ID:', SHEET_ID);
console.log('SHEET_RANGE:', SHEET_RANGE);
console.log('GOOGLE_CREDENTIALS:', process.env.GOOGLE_CREDENTIALS ? 'SET' : 'NOT SET');

async function testGoogleSheets() {
  try {
    if (!process.env.GOOGLE_CREDENTIALS) {
      console.log('❌ GOOGLE_CREDENTIALS not set - falling back to sample data');
      return;
    }

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
    });

    const data = response.data.values;
    console.log('✅ Google Sheets connection successful!');
    console.log('📊 Data received:', data ? data.length : 'null', 'rows');
    
    if (data && data.length > 0) {
      const [header, ...rows] = data;
      console.log('📋 Header row:', header);
      console.log('👥 Number of players:', rows.length);
      console.log('🔍 First 3 players:', rows.slice(0, 3));
      
      // Check for some of the drafted players
      const draftedPlayers = [
        'Seth Hernandez', 'Kade Anderson', 'Ethan Holiday', 'Liam Doyle',
        'Aiva Arquette', 'Eli Willits', 'Jamie Arnold', 'Jo Jo Parker',
        'Billy Carlson', 'Tyler Bremner', 'Gavin Fien', 'Gavin Kilen',
        'Daniel Pierce', 'Steele Hall'
      ];
      
      const foundPlayers = rows.filter(row => {
        const playerName = row[0] || ''; // Assuming Name is first column
        return draftedPlayers.some(drafted => 
          playerName.toLowerCase().includes(drafted.toLowerCase())
        );
      });
      
      console.log('🎯 Found drafted players in sheet:', foundPlayers.length);
      console.log('📝 Drafted players found:', foundPlayers.map(row => row[0]));
    }
    
  } catch (error) {
    console.error('❌ Error connecting to Google Sheets:', error.message);
    console.log('This is why you\'re seeing sample data instead of your 100 players');
  }
}

testGoogleSheets(); 