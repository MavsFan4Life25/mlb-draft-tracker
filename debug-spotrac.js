const axios = require('axios');
const cheerio = require('cheerio');

async function debugSpotrac() {
  try {
    console.log('Testing Spotrac parsing...');
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    const response = await axios.get('https://www.spotrac.com/mlb/draft', {
      headers: headers,
      timeout: 10000
    });

    console.log('Spotrac response status:', response.status);
    const $ = cheerio.load(response.data);
    
    // Look for any text that might contain player names
    console.log('\n=== SEARCHING FOR PLAYER NAMES ===');
    const bodyText = $('body').text();
    
    // Look for patterns that might indicate actual draft picks
    const playerNamePatterns = [
      /[A-Z][a-z]+\s+[A-Z][a-z]+/g,  // First Last names
      /Round\s+\d+.*Pick\s+\d+/gi,   // Round X Pick Y
      /has\s+selected|selected\s+by/gi, // "has selected" or "selected by"
      /draft\s+pick.*[A-Z][a-z]+/gi  // draft pick followed by name
    ];
    
    playerNamePatterns.forEach((pattern, index) => {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`Pattern ${index + 1} matches:`, matches.slice(0, 10));
      }
    });
    
    // Look for any tables that might contain actual picks
    console.log('\n=== SEARCHING FOR TABLES WITH PLAYER DATA ===');
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      const tableText = $table.text();
      
      // Check if this table contains player names
      const hasPlayerNames = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(tableText);
      const hasPickNumbers = /\d+\.\s*[A-Z]/.test(tableText);
      
      if (hasPlayerNames || hasPickNumbers) {
        console.log(`Table ${tableIndex} might contain picks:`, tableText.substring(0, 200));
        
        // Look at the rows in this table
        $table.find('tr').each((rowIndex, row) => {
          const $row = $(row);
          const rowText = $row.text().trim();
          
          if (rowText.length > 10 && /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(rowText)) {
            console.log(`  Row ${rowIndex}: ${rowText}`);
          }
        });
      }
    });
    
    // Check if there are any divs or other elements with draft pick data
    console.log('\n=== SEARCHING FOR DRAFT PICK ELEMENTS ===');
    $('[class*="draft"], [class*="pick"], [id*="draft"], [id*="pick"]').each((index, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      
      if (text.length > 20 && /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text)) {
        console.log(`Draft element ${index}:`, text.substring(0, 100));
      }
    });
    
    // Check page title and meta information
    console.log('\n=== PAGE INFO ===');
    console.log('Page title:', $('title').text());
    console.log('Meta description:', $('meta[name="description"]').attr('content'));
    
    // Look for any JavaScript data
    console.log('\n=== SEARCHING FOR JAVASCRIPT DATA ===');
    $('script').each((index, element) => {
      const scriptContent = $(element).html();
      if (scriptContent && (scriptContent.includes('draft') || scriptContent.includes('pick'))) {
        console.log(`Script ${index} contains draft/pick data:`, scriptContent.substring(0, 200));
      }
    });
    
  } catch (error) {
    console.error('Error testing Spotrac:', error.message);
  }
}

debugSpotrac(); 