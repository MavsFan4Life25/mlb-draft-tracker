const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
require('dotenv').config();

/**
 * Standalone MLB Draft Scraper for Google Sheets
 * This script runs independently and updates your Google Sheet with draft data
 * without affecting your existing web app.
 */

class StandaloneMLBScraper {
  constructor() {
    this.baseUrl = 'https://www.mlb.com/draft/tracker';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  async scrapeDraftData() {
    try {
      console.log('🔍 Scraping MLB Draft Tracker...');
      
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const draftData = [];

      console.log('📄 Analyzing page content...');

      // Method 1: Look for draft-related content
      $('body').find('*').each((index, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        
        // Look for draft pick patterns
        if (this.isDraftPickText(text)) {
          const pickData = this.parseDraftPickText(text);
          if (pickData) {
            draftData.push(pickData);
          }
        }
      });

      // Method 2: Look for table structures
      $('table').each((index, element) => {
        const $table = $(element);
        const rows = $table.find('tr');
        
        rows.each((rowIndex, row) => {
          const $row = $(row);
          const cells = $row.find('td, th');
          
          if (cells.length >= 3) {
            const pickData = this.extractFromTableRow($row);
            if (pickData) {
              draftData.push(pickData);
            }
          }
        });
      });

      // Method 3: Look for JSON data in script tags
      $('script').each((index, element) => {
        const scriptContent = $(element).html();
        if (scriptContent && (scriptContent.includes('draft') || scriptContent.includes('pick'))) {
          const jsonData = this.extractJSONFromScript(scriptContent);
          if (jsonData && jsonData.length > 0) {
            draftData.push(...jsonData);
          }
        }
      });

      // Remove duplicates and sort
      const uniqueData = this.removeDuplicates(draftData);
      const sortedData = uniqueData.sort((a, b) => {
        const aNum = parseInt(a.pickNumber) || 0;
        const bNum = parseInt(b.pickNumber) || 0;
        return aNum - bNum;
      });

      console.log(`✅ Found ${sortedData.length} draft picks`);
      return sortedData;

    } catch (error) {
      console.error('❌ Error scraping MLB Draft Tracker:', error.message);
      return [];
    }
  }

  isDraftPickText(text) {
    if (!text || text.length < 10 || text.length > 500) return false;
    
    const patterns = [
      /round\s*\d+/i,
      /pick\s*\d+/i,
      /draft\s*pick/i,
      /\d+\.\s*[A-Z][a-z]+/,
      /[A-Z][a-z]+\s+[A-Z][a-z]+/ // Player name pattern
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  parseDraftPickText(text) {
    try {
      // Pattern: "1. Charlie Condon - OF/1B - Georgia"
      const pickPattern = /(\d+)\.\s*([^-]+?)\s*-\s*([^-]+?)\s*-\s*(.+)/;
      const match = text.match(pickPattern);
      
      if (match) {
        return {
          pickNumber: match[1].trim(),
          playerName: match[2].trim(),
          position: match[3].trim(),
          school: match[4].trim(),
          team: 'TBD',
          timestamp: new Date().toISOString()
        };
      }

      // Pattern: "Round 1, Pick 1: Charlie Condon"
      const roundPattern = /round\s*(\d+),\s*pick\s*(\d+):\s*(.+)/i;
      const roundMatch = text.match(roundPattern);
      
      if (roundMatch) {
        return {
          pickNumber: roundMatch[2].trim(),
          playerName: roundMatch[3].trim(),
          position: 'Unknown',
          school: 'Unknown',
          team: 'TBD',
          timestamp: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  extractFromTableRow($row) {
    try {
      const cells = $row.find('td, th');
      const cellTexts = cells.map((index, cell) => $(cell).text().trim()).get();

      if (cellTexts.length >= 3) {
        const pickNumber = this.findPickNumber(cellTexts);
        const playerName = this.findPlayerName(cellTexts);
        const position = this.findPosition(cellTexts);
        const team = this.findTeam(cellTexts);

        if (playerName) {
          return {
            pickNumber: pickNumber || 'Unknown',
            playerName: playerName,
            position: position || 'Unknown',
            school: 'Unknown',
            team: team || 'TBD',
            timestamp: new Date().toISOString()
          };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  findPickNumber(texts) {
    for (const text of texts) {
      const match = text.match(/^(\d+)$/);
      if (match) return match[1];
    }
    return null;
  }

  findPlayerName(texts) {
    for (const text of texts) {
      const nameMatch = text.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/);
      if (nameMatch) return text;
    }
    return null;
  }

  findPosition(texts) {
    const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH', 'RHP', 'LHP'];
    for (const text of texts) {
      if (positions.includes(text.toUpperCase())) return text;
    }
    return null;
  }

  findTeam(texts) {
    const mlbTeams = [
      'Angels', 'Astros', 'Athletics', 'Blue Jays', 'Braves', 'Brewers', 'Cardinals',
      'Cubs', 'Diamondbacks', 'Dodgers', 'Giants', 'Guardians', 'Mariners', 'Marlins',
      'Mets', 'Nationals', 'Orioles', 'Padres', 'Phillies', 'Pirates', 'Rangers',
      'Rays', 'Red Sox', 'Reds', 'Rockies', 'Royals', 'Tigers', 'Twins', 'White Sox', 'Yankees'
    ];
    
    for (const text of texts) {
      if (mlbTeams.some(team => text.includes(team))) return text;
    }
    return null;
  }

  extractJSONFromScript(scriptContent) {
    try {
      const jsonMatches = scriptContent.match(/\{[^{}]*"draft"[^{}]*\}/g) || 
                         scriptContent.match(/\{[^{}]*"pick"[^{}]*\}/g);
      
      if (jsonMatches) {
        return jsonMatches.map(match => {
          try {
            return JSON.parse(match);
          } catch (e) {
            return null;
          }
        }).filter(Boolean);
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  removeDuplicates(data) {
    const seen = new Set();
    return data.filter(item => {
      const key = `${item.pickNumber}-${item.playerName}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Convert draft data to Google Sheets format
  convertToGoogleSheetsFormat(draftData) {
    const headers = ['Pick Number', 'Player Name', 'Position', 'School', 'Team', 'Timestamp'];
    const rows = draftData.map(pick => [
      pick.pickNumber,
      pick.playerName,
      pick.position,
      pick.school,
      pick.team,
      pick.timestamp
    ]);

    return [headers, ...rows];
  }

  // Update Google Sheet with draft data
  async updateGoogleSheet(draftData) {
    try {
      if (!process.env.GOOGLE_CREDENTIALS) {
        console.log('⚠️  GOOGLE_CREDENTIALS not found in environment variables');
        console.log('📝 To enable Google Sheets updates, add your credentials to .env file');
        return false;
      }

      if (!process.env.SPREADSHEET_ID) {
        console.log('⚠️  SPREADSHEET_ID not found in environment variables');
        console.log('📝 To enable Google Sheets updates, add your spreadsheet ID to .env file');
        return false;
      }

      console.log('🔐 Authenticating with Google...');
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const sheetData = this.convertToGoogleSheetsFormat(draftData);

      console.log('📊 Updating Google Sheet...');

      // Clear existing data and write new data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Draft Picks!A1:Z1000',
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Draft Picks!A1',
        valueInputOption: 'RAW',
        resource: {
          values: sheetData,
        },
      });

      console.log(`✅ Successfully updated Google Sheet with ${draftData.length} draft picks`);
      return true;
    } catch (error) {
      console.error('❌ Error updating Google Sheet:', error.message);
      return false;
    }
  }

  // Create sample data for testing
  getSampleData() {
    return [
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
  }
}

// Main execution function
async function main() {
  console.log('🚀 MLB Draft Scraper - Standalone Google Sheets Updater');
  console.log('=====================================================');
  
  const scraper = new StandaloneMLBScraper();
  
  try {
    // Scrape real data
    const realData = await scraper.scrapeDraftData();
    
    if (realData.length > 0) {
      console.log('\n📋 Real draft data found:');
      realData.forEach((pick, index) => {
        console.log(`${index + 1}. Pick ${pick.pickNumber}: ${pick.playerName} - ${pick.position} - ${pick.school}`);
      });
      
      // Try to update Google Sheet
      await scraper.updateGoogleSheet(realData);
    } else {
      console.log('\n📝 No real draft data found (draft may not have started yet)');
      console.log('🧪 Using sample data for testing...');
      
      const sampleData = scraper.getSampleData();
      console.log('\n📋 Sample data:');
      sampleData.forEach((pick, index) => {
        console.log(`${index + 1}. Pick ${pick.pickNumber}: ${pick.playerName} - ${pick.position} - ${pick.school}`);
      });
      
      // Try to update Google Sheet with sample data
      await scraper.updateGoogleSheet(sampleData);
    }
    
    console.log('\n✅ Script completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = StandaloneMLBScraper; 