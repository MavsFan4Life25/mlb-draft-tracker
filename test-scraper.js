const MLBDraftScraper = require('./mlb-scraper');

async function testScraper() {
  console.log('Testing MLB Draft Scraper...');
  console.log('================================');
  
  const scraper = new MLBDraftScraper();
  
  try {
    const data = await scraper.scrapeDraftData();
    
    console.log(`\nFound ${data.length} draft picks:`);
    console.log('================================');
    
    if (data.length === 0) {
      console.log('No draft picks found. This could mean:');
      console.log('1. The draft hasn\'t started yet');
      console.log('2. The website structure has changed');
      console.log('3. The scraper needs to be updated');
      console.log('\nLet\'s try to get some sample data to test the Google Sheets integration...');
      
      // Create sample data for testing
      const sampleData = [
        {
          pickNumber: '1',
          playerName: 'Charlie Condon',
          position: 'OF/1B',
          school: 'Georgia',
          team: 'TBD',
          timestamp: new Date().toISOString()
        },
        {
          pickNumber: '2',
          playerName: 'Travis Bazzana',
          position: '2B',
          school: 'Oregon State',
          team: 'TBD',
          timestamp: new Date().toISOString()
        },
        {
          pickNumber: '3',
          playerName: 'Braden Montgomery',
          position: 'OF/RHP',
          school: 'Texas A&M',
          team: 'TBD',
          timestamp: new Date().toISOString()
        }
      ];
      
      console.log('\nSample data for Google Sheets:');
      console.log(JSON.stringify(sampleData, null, 2));
      
      const sheetFormat = scraper.convertToGoogleSheetsFormat(sampleData);
      console.log('\nGoogle Sheets format:');
      console.log(sheetFormat);
      
    } else {
      data.forEach((pick, index) => {
        console.log(`${index + 1}. Pick ${pick.pickNumber}: ${pick.playerName} - ${pick.position} - ${pick.school}`);
      });
      
      console.log('\nGoogle Sheets format:');
      const sheetFormat = scraper.convertToGoogleSheetsFormat(data);
      console.log(sheetFormat);
    }
    
  } catch (error) {
    console.error('Error testing scraper:', error);
  }
}

// Run the test
testScraper(); 