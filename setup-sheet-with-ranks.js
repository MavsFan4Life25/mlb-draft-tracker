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

// Sample Georgia Bulldogs players for 2025 draft with ranks
const georgiaPlayers = [
  ['Name', 'Position', 'School', 'Rank'],
  ['Charlie Condon', 'OF/3B', 'Georgia', '1'],
  ['Corey Collins', 'C', 'Georgia', '15'],
  ['Kolten Smith', 'RHP', 'Georgia', '45'],
  ['Fernando Gonzalez', 'C', 'Georgia', '78'],
  ['Charlie Goldstein', 'LHP', 'Georgia', '125'],
  ['Leighton Finley', 'RHP', 'Georgia', '156'],
  ['Christian Mracna', 'RHP', 'Georgia', '189'],
  ['Brian Zeldin', 'RHP', 'Georgia', '234'],
  ['Jaden Woods', 'LHP', 'Georgia', '267'],
  ['Dylan Ross', 'RHP', 'Georgia', '298'],
  ['Blake Gillespie', 'RHP', 'Georgia', '345'],
  ['Will Pearson', 'LHP', 'Georgia', '378'],
  ['Kyle Greenler', 'RHP', 'Georgia', '412'],
  ['Matthew Hoskins', 'RHP', 'Georgia', '445'],
  ['Jarvis Evans', 'RHP', 'Georgia', '478'],
  ['Tyler McLoughlin', 'RHP', 'Georgia', '512'],
  ['Chandler Marsh', 'RHP', 'Georgia', '545'],
  ['Collin Caldwell', 'RHP', 'Georgia', '578'],
  ['Dawson Brown', 'RHP', 'Georgia', '612'],
  ['Tre Phelps', 'OF', 'Georgia', '645'],
  ['Paul Toetz', '2B', 'Georgia', '678'],
  ['Dylan Goldstein', 'OF', 'Georgia', '712'],
  ['Logan Jordan', 'C', 'Georgia', '745'],
  ['Josh Stinson', 'OF', 'Georgia', '778'],
  ['Clayton Chadwick', 'OF', 'Georgia', '812'],
  ['Caden Sorrell', 'OF', 'Georgia', '845'],
  ['Tyler Minnick', '3B', 'Georgia', '878'],
  ['Slate Alford', '3B', 'Georgia', '912'],
  ['Kolby Branch', 'SS', 'Georgia', '945'],
  ['Sebastian Murillo', 'SS', 'Georgia', '978'],
  ['Drew Burress', 'OF', 'Georgia', '1012'],
  ['CJ Smith', 'OF', 'Georgia', '1045'],
  ['Henry Hunter', 'C', 'Georgia', '1078'],
  ['Liam Peterson', 'RHP', 'Georgia', '1112'],
  ['Carson Schmitz', 'RHP', 'Georgia', '1145'],
  ['Ethan Sutton', 'RHP', 'Georgia', '1178'],
  ['Cade Kurland', '2B', 'Florida', '23'],
  ['Jac Caglianone', '1B/LHP', 'Florida', '8'],
  ['Luke Heyman', 'C', 'Florida', '34'],
  ['Michael Robertson', 'OF', 'Florida', '67'],
  ['Tyler Shelnut', 'OF', 'Florida', '89'],
  ['Dale Thomas', '3B', 'Florida', '112'],
  ['Ashton Wilson', 'OF', 'Florida', '134'],
  ['Brody Donay', 'C', 'Florida', '167'],
  ['Colby Shelton', 'SS', 'Florida', '189'],
  ['Hayden Yost', '1B', 'Florida', '212'],
  ['Armando Albert', 'OF', 'Florida', '234'],
  ['Jake Clemente', 'RHP', 'Florida', '267'],
  ['Brandon Neely', 'RHP', 'Florida', '289'],
  ['Ryan Slater', 'RHP', 'Florida', '312'],
  ['Fisher Jameson', 'RHP', 'Florida', '334'],
  ['Luke McNeillie', 'RHP', 'Florida', '367'],
  ['Cade Fisher', 'LHP', 'Florida', '389'],
  ['Frank Menendez', 'LHP', 'Florida', '412'],
  ['Alex Philpott', 'RHP', 'Florida', '434'],
  ['Ethan McElvain', 'LHP', 'Florida', '467'],
  ['Pierce Coppola', 'LHP', 'Florida', '489'],
  ['Blake Purnell', 'RHP', 'Florida', '512'],
  ['Jameson Fisher', 'RHP', 'Florida', '534'],
  ['Tyler Nesbitt', 'RHP', 'Florida', '567'],
  ['Sammy Beszczynski', 'RHP', 'Florida', '589'],
  ['Ethan Hoopingarner', 'RHP', 'Florida', '612'],
  ['Robert Satin', 'LHP', 'Florida', '634'],
  ['Christian Rodriguez', 'RHP', 'Florida', '667'],
  ['Christian Moore', '2B', 'Tennessee', '12'],
  ['Blake Burke', '1B', 'Tennessee', '56'],
  ['Dylan Dreiling', 'OF', 'Tennessee', '78'],
  ['Kavares Tears', 'OF', 'Tennessee', '101'],
  ['Dean Curley', 'SS', 'Tennessee', '123'],
  ['Hunter Ensley', 'OF', 'Tennessee', '145'],
  ['Cal Stark', 'C', 'Tennessee', '167'],
  ['Ariel Antigua', 'SS', 'Tennessee', '189'],
  ['Reese Chapman', 'OF', 'Tennessee', '212'],
  ['Colby Backer', 'RHP', 'Tennessee', '234'],
  ['Drew Beam', 'RHP', 'Tennessee', '256'],
  ['AJ Causey', 'RHP', 'Tennessee', '278'],
  ['Zander Sechrist', 'LHP', 'Tennessee', '301'],
  ['Nate Snead', 'RHP', 'Tennessee', '323'],
  ['Kirby Connell', 'LHP', 'Tennessee', '345'],
  ['Marcus Phillips', 'RHP', 'Tennessee', '367'],
  ['Andrew Behnke', 'LHP', 'Tennessee', '389'],
  ['Dylan Loy', 'LHP', 'Tennessee', '412'],
  ['Austin Hunley', 'RHP', 'Tennessee', '434'],
  ['Matthew Dallas', 'LHP', 'Tennessee', '456'],
  ['Grant Cherry', 'RHP', 'Tennessee', '478'],
  ['JJ Garcia', 'RHP', 'Tennessee', '501'],
  ['Brayden Sharp', 'LHP', 'Tennessee', '523'],
  ['Luke Payne', 'RHP', 'Tennessee', '545'],
  ['Cade O\'Leary', 'RHP', 'Tennessee', '567'],
  ['Derek Schaefer', 'RHP', 'Tennessee', '589'],
  ['Ethan Payne', 'RHP', 'Tennessee', '612'],
  ['Bryce Jenkins', 'RHP', 'Tennessee', '634']
];

async function setupGoogleSheetWithRanks() {
  if (!SPREADSHEET_ID) {
    console.log('⚠️  No Google Sheet ID provided');
    return;
  }
  
  try {
    console.log('🔐 Authenticating with Google...');
    await auth.getClient();
    
    console.log('📊 Setting up your Google Sheet with Name/Position/School/Rank structure...');
    console.log('🎯 Focused on Georgia Bulldogs and SEC players for 2025 draft');
    console.log('📈 Includes ranking data for better draft analysis');
    
    // Update the sheet with the correct structure
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      resource: { values: georgiaPlayers }
    });
    
    console.log(`✅ Successfully set up your Google Sheet with ${georgiaPlayers.length - 1} players (excluding header)`);
    console.log('📋 Structure: Name | Position | School | Rank');
    console.log('🔄 Your app will now work with this enhanced structure');
    console.log('🎯 Auto-updates during draft will preserve this structure');
    console.log('📊 Players will be sortable by rank in each position tab');
    
  } catch (error) {
    console.error('❌ Error setting up Google Sheet:', error.message);
  }
}

async function main() {
  console.log('🎯 Georgia Bulldogs MLB Draft Tracker Sheet Setup (With Ranks)');
  console.log('============================================================');
  console.log('This will set up your Google Sheet with the enhanced structure:');
  console.log('Name | Position | School | Rank');
  console.log('');
  console.log('The sheet will be populated with Georgia Bulldogs and SEC players');
  console.log('for the 2025 MLB Draft, including ranking data.');
  console.log('Your app will auto-update this during the draft.');
  console.log('Players will be sortable by rank in each position tab.');
  
  await setupGoogleSheetWithRanks();
  
  console.log('\n✅ Sheet setup completed!');
  console.log('💡 Your app is now ready for the 2025 MLB Draft with ranking data');
  console.log('📊 You can now see which players are highest-ranked at each position');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupGoogleSheetWithRanks }; 