const puppeteer = require('puppeteer');
const { google } = require('googleapis');
require('dotenv').config();

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = 'Sheet1!A:Z';

async function scrapeMLBDraftWithPuppeteer() {
  console.log('🌐 Puppeteer MLB Draft Tracker Scraper');
  console.log('=====================================');
  
  let browser;
  let prospects = [];
  
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('📄 Navigating to MLB Draft Tracker...');
    
    // Try multiple draft-related URLs
    const urls = [
      'https://www.mlb.com/draft/tracker',
      'https://www.mlb.com/draft/2025/tracker',
      'https://www.mlb.com/prospects/draft',
      'https://www.mlb.com/prospects/2025/draft',
      'https://www.mlb.com/draft/prospects/2025',
      'https://www.mlb.com/draft'
    ];
    
    for (const url of urls) {
      try {
        console.log(`🔍 Trying URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for content to load
        await page.waitForTimeout(5000);
        
        // Try to find draft data in various formats
        const data = await page.evaluate(() => {
          const results = [];
          
          // Look for JSON data in script tags
          const scripts = document.querySelectorAll('script');
          scripts.forEach(script => {
            if (script.textContent) {
              try {
                // Look for draft-related JSON data
                const jsonMatches = script.textContent.match(/\{[^{}]*"draft"[^{}]*\}/g) || [];
                const prospectMatches = script.textContent.match(/\{[^{}]*"prospects"[^{}]*\}/g) || [];
                const playerMatches = script.textContent.match(/\{[^{}]*"players"[^{}]*\}/g) || [];
                
                [...jsonMatches, ...prospectMatches, ...playerMatches].forEach(match => {
                  try {
                    const parsed = JSON.parse(match);
                    if (parsed && typeof parsed === 'object') {
                      results.push(parsed);
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                });
              } catch (e) {
                // Ignore errors
              }
            }
          });
          
          // Look for table data
          const tables = document.querySelectorAll('table');
          tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td, th');
              if (cells.length > 2) {
                const rowData = Array.from(cells).map(cell => cell.textContent.trim());
                if (rowData.some(cell => cell.length > 0)) {
                  results.push({ type: 'table_row', data: rowData });
                }
              }
            });
          });
          
          // Look for list items that might be prospects
          const lists = document.querySelectorAll('ul, ol');
          lists.forEach(list => {
            const items = list.querySelectorAll('li');
            items.forEach(item => {
              const text = item.textContent.trim();
              if (text.length > 10 && text.includes(' ')) {
                results.push({ type: 'list_item', data: text });
              }
            });
          });
          
          // Look for specific draft elements
          const draftElements = document.querySelectorAll('[class*="draft"], [class*="prospect"], [class*="player"]');
          draftElements.forEach(element => {
            const text = element.textContent.trim();
            if (text.length > 5) {
              results.push({ type: 'draft_element', data: text });
            }
          });
          
          return results;
        });
        
        if (data && data.length > 0) {
          console.log(`✅ Found ${data.length} potential data sources on ${url}`);
          prospects.push(...data);
          break; // Found data, stop trying other URLs
        }
        
      } catch (error) {
        console.log(`⚠️  Could not access ${url}: ${error.message}`);
      }
    }
    
    // If no data found, try to scrape the main MLB prospects page
    if (prospects.length === 0) {
      console.log('📄 Trying MLB Prospects main page...');
      try {
        await page.goto('https://www.mlb.com/prospects', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(5000);
        
        const prospectData = await page.evaluate(() => {
          const results = [];
          
          // Look for prospect rankings
          const prospectElements = document.querySelectorAll('[class*="prospect"], [class*="player"], [class*="rank"]');
          prospectElements.forEach(element => {
            const text = element.textContent.trim();
            if (text.length > 5 && !text.includes('©') && !text.includes('Privacy')) {
              results.push({ type: 'prospect_element', data: text });
            }
          });
          
          return results;
        });
        
        prospects.push(...prospectData);
        console.log(`✅ Found ${prospectData.length} potential prospects from main page`);
      } catch (error) {
        console.log(`⚠️  Error accessing prospects page: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during scraping:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
  
  // Process and clean the data
  const cleanedProspects = processProspectData(prospects);
  
  console.log(`\n📋 Summary:`);
  console.log(`Total data sources found: ${prospects.length}`);
  console.log(`Cleaned prospects: ${cleanedProspects.length}`);
  
  if (cleanedProspects.length > 0) {
    console.log('\n📋 Sample prospects found:');
    cleanedProspects.slice(0, 5).forEach((prospect, index) => {
      console.log(`${index + 1}. ${prospect.name || prospect.data || 'Unknown'}`);
    });
  }
  
  return cleanedProspects;
}

function processProspectData(rawData) {
  const prospects = [];
  
  rawData.forEach(item => {
    if (item.type === 'table_row' && item.data) {
      // Process table row data
      const row = item.data;
      if (row.length >= 3) {
        prospects.push({
          name: row[0] || '',
          position: row[1] || '',
          school: row[2] || '',
          source: 'table_row'
        });
      }
    } else if (item.type === 'list_item' && item.data) {
      // Process list item data
      const text = item.data;
      if (text.length > 10 && text.includes(' ')) {
        prospects.push({
          name: text,
          position: '',
          school: '',
          source: 'list_item'
        });
      }
    } else if (item.type === 'draft_element' && item.data) {
      // Process draft element data
      const text = item.data;
      if (text.length > 5) {
        prospects.push({
          name: text,
          position: '',
          school: '',
          source: 'draft_element'
        });
      }
    } else if (item.type === 'prospect_element' && item.data) {
      // Process prospect element data
      const text = item.data;
      if (text.length > 5) {
        prospects.push({
          name: text,
          position: '',
          school: '',
          source: 'prospect_element'
        });
      }
    } else if (typeof item === 'object' && item !== null) {
      // Process JSON data
      prospects.push({
        name: item.name || item.player || item.prospect || JSON.stringify(item),
        position: item.position || '',
        school: item.school || item.team || '',
        source: 'json_data'
      });
    }
  });
  
  // Remove duplicates and clean up
  const uniqueProspects = prospects.filter((prospect, index, self) => 
    index === self.findIndex(p => p.name === prospect.name)
  );
  
  return uniqueProspects.filter(prospect => 
    prospect.name && 
    prospect.name.length > 2 && 
    !prospect.name.includes('©') &&
    !prospect.name.includes('Privacy') &&
    !prospect.name.includes('Terms')
  );
}

async function updateGoogleSheet(prospects) {
  if (!SPREADSHEET_ID) {
    console.log('⚠️  No Google Sheet ID provided, skipping update');
    return;
  }
  
  try {
    console.log('🔐 Authenticating with Google...');
    await auth.getClient();
    
    console.log('📊 Updating your existing Google Sheet...');
    
    // Prepare data for Google Sheets
    const values = prospects.map(prospect => [
      prospect.name || '',
      prospect.position || '',
      prospect.school || '',
      prospect.source || 'puppeteer_scraper',
      new Date().toISOString()
    ]);
    
    // Add header if sheet is empty
    const header = [['Name', 'Position', 'School', 'Source', 'Last Updated']];
    
    // Update the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      resource: { values: header.concat(values) }
    });
    
    console.log(`✅ Successfully updated your Google Sheet with ${prospects.length} prospects`);
    
  } catch (error) {
    console.error('❌ Error updating Google Sheet:', error.message);
  }
}

async function main() {
  console.log('🎯 Starting Puppeteer MLB Draft Tracker scrape...');
  
  const prospects = await scrapeMLBDraftWithPuppeteer();
  
  if (prospects.length > 0) {
    await updateGoogleSheet(prospects);
    console.log('\n✅ Puppeteer scrape completed successfully!');
    console.log('🔄 Your Google Sheet has been updated with scraped prospects');
  } else {
    console.log('\n⚠️  No prospects found. The site may be blocking automated access.');
    console.log('💡 Consider running this during the actual draft period when data is available.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { scrapeMLBDraftWithPuppeteer, processProspectData }; 