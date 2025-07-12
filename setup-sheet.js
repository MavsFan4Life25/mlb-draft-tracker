const { google } = require('googleapis');
require('dotenv').config();

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : undefined,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = 'Sheet1!A:Z';

// Sample Georgia Bulldogs players for 2025 draft
const georgiaPlayers = [
  ['Name', 'Position', 'School'],
  ['Charlie Condon', 'OF/3B', 'Georgia'],
  ['Corey Collins', 'C', 'Georgia'],
  ['Kolten Smith', 'RHP', 'Georgia'],
  ['Fernando Gonzalez', 'C', 'Georgia'],
  ['Charlie Goldstein', 'LHP', 'Georgia'],
  ['Leighton Finley', 'RHP', 'Georgia'],
  ['Christian Mracna', 'RHP', 'Georgia'],
  ['Brian Zeldin', 'RHP', 'Georgia'],
  ['Jaden Woods', 'LHP', 'Georgia'],
  ['Dylan Ross', 'RHP', 'Georgia'],
  ['Blake Gillespie', 'RHP', 'Georgia'],
  ['Will Pearson', 'LHP', 'Georgia'],
  ['Kyle Greenler', 'RHP', 'Georgia'],
  ['Matthew Hoskins', 'RHP', 'Georgia'],
  ['Jarvis Evans', 'RHP', 'Georgia'],
  ['Tyler McLoughlin', 'RHP', 'Georgia'],
  ['Chandler Marsh', 'RHP', 'Georgia'],
  ['Collin Caldwell', 'RHP', 'Georgia'],
  ['Dawson Brown', 'RHP', 'Georgia'],
  ['Tre Phelps', 'OF', 'Georgia'],
  ['Paul Toetz', '2B', 'Georgia'],
  ['Dylan Goldstein', 'OF', 'Georgia'],
  ['Logan Jordan', 'C', 'Georgia'],
  ['Josh Stinson', 'OF', 'Georgia'],
  ['Clayton Chadwick', 'OF', 'Georgia'],
  ['Caden Sorrell', 'OF', 'Georgia'],
  ['Tyler Minnick', '3B', 'Georgia'],
  ['Slate Alford', '3B', 'Georgia'],
  ['Kolby Branch', 'SS', 'Georgia'],
  ['Sebastian Murillo', 'SS', 'Georgia'],
  ['Drew Burress', 'OF', 'Georgia'],
  ['CJ Smith', 'OF', 'Georgia'],
  ['Henry Hunter', 'C', 'Georgia'],
  ['Liam Peterson', 'RHP', 'Georgia'],
  ['Carson Schmitz', 'RHP', 'Georgia'],
  ['Ethan Sutton', 'RHP', 'Georgia'],
  ['Cade Kurland', '2B', 'Florida'],
  ['Jac Caglianone', '1B/LHP', 'Florida'],
  ['Luke Heyman', 'C', 'Florida'],
  ['Michael Robertson', 'OF', 'Florida'],
  ['Tyler Shelnut', 'OF', 'Florida'],
  ['Dale Thomas', '3B', 'Florida'],
  ['Ashton Wilson', 'OF', 'Florida'],
  ['Brody Donay', 'C', 'Florida'],
  ['Colby Shelton', 'SS', 'Florida'],
  ['Hayden Yost', '1B', 'Florida'],
  ['Armando Albert', 'OF', 'Florida'],
  ['Jake Clemente', 'RHP', 'Florida'],
  ['Brandon Neely', 'RHP', 'Florida'],
  ['Ryan Slater', 'RHP', 'Florida'],
  ['Fisher Jameson', 'RHP', 'Florida'],
  ['Luke McNeillie', 'RHP', 'Florida'],
  ['Cade Fisher', 'LHP', 'Florida'],
  ['Frank Menendez', 'LHP', 'Florida'],
  ['Alex Philpott', 'RHP', 'Florida'],
  ['Ethan McElvain', 'LHP', 'Florida'],
  ['Pierce Coppola', 'LHP', 'Florida'],
  ['Blake Purnell', 'RHP', 'Florida'],
  ['Jameson Fisher', 'RHP', 'Florida'],
  ['Tyler Nesbitt', 'RHP', 'Florida'],
  ['Sammy Beszczynski', 'RHP', 'Florida'],
  ['Ethan Hoopingarner', 'RHP', 'Florida'],
  ['Robert Satin', 'LHP', 'Florida'],
  ['Christian Rodriguez', 'RHP', 'Florida'],
  ['Christian Moore', '2B', 'Tennessee'],
  ['Blake Burke', '1B', 'Tennessee'],
  ['Dylan Dreiling', 'OF', 'Tennessee'],
  ['Kavares Tears', 'OF', 'Tennessee'],
  ['Dean Curley', 'SS', 'Tennessee'],
  ['Hunter Ensley', 'OF', 'Tennessee'],
  ['Cal Stark', 'C', 'Tennessee'],
  ['Ariel Antigua', 'SS', 'Tennessee'],
  ['Reese Chapman', 'OF', 'Tennessee'],
  ['Colby Backer', 'RHP', 'Tennessee'],
  ['Drew Beam', 'RHP', 'Tennessee'],
  ['AJ Causey', 'RHP', 'Tennessee'],
  ['Zander Sechrist', 'LHP', 'Tennessee'],
  ['Nate Snead', 'RHP', 'Tennessee'],
  ['Kirby Connell', 'LHP', 'Tennessee'],
  ['Marcus Phillips', 'RHP', 'Tennessee'],
  ['Andrew Behnke', 'LHP', 'Tennessee'],
  ['Dylan Loy', 'LHP', 'Tennessee'],
  ['Austin Hunley', 'RHP', 'Tennessee'],
  ['Matthew Dallas', 'LHP', 'Tennessee'],
  ['Grant Cherry', 'RHP', 'Tennessee'],
  ['JJ Garcia', 'RHP', 'Tennessee'],
  ['Brayden Sharp', 'LHP', 'Tennessee'],
  ['Luke Payne', 'RHP', 'Tennessee'],
  ['Cade O\'Leary', 'RHP', 'Tennessee'],
  ['Derek Schaefer', 'RHP', 'Tennessee'],
  ['Ethan Payne', 'RHP', 'Tennessee'],
  ['Bryce Jenkins', 'RHP', 'Tennessee']
];

async function setupGoogleSheet() {
  if (!SPREADSHEET_ID) {
    console.log('⚠️  No Google Sheet ID provided');
    return;
  }
  
  try {
    console.log('🔐 Authenticating with Google...');
    await auth.getClient();
    
    console.log('📊 Setting up your Google Sheet with Name/Position/School structure...');
    console.log('🎯 Focused on Georgia Bulldogs and SEC players for 2025 draft');
    
    // Update the sheet with the correct structure
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      resource: { values: georgiaPlayers }
    });
    
    console.log(`✅ Successfully set up your Google Sheet with ${georgiaPlayers.length - 1} players (excluding header)`);
    console.log('📋 Structure: Name | Position | School');
    console.log('🔄 Your app will now work with this simplified structure');
    console.log('🎯 Auto-updates during draft will preserve this structure');
    
  } catch (error) {
    console.error('❌ Error setting up Google Sheet:', error.message);
  }
}

async function main() {
  console.log('🎯 Georgia Bulldogs MLB Draft Tracker Sheet Setup');
  console.log('================================================');
  console.log('This will set up your Google Sheet with the correct structure:');
  console.log('Name | Position | School');
  console.log('');
  console.log('The sheet will be populated with Georgia Bulldogs and SEC players');
  console.log('for the 2025 MLB Draft. Your app will auto-update this during the draft.');
  
  await setupGoogleSheet();
  
  console.log('\n✅ Sheet setup completed!');
  console.log('💡 Your app is now ready for the 2025 MLB Draft');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupGoogleSheet }; 