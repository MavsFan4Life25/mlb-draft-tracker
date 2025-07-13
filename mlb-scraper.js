const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
require('dotenv').config();

class MLBDraftScraper {
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
      console.log('Scraping MLB Draft Tracker...');
      
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 15000
      });

      console.log('Response status:', response.status);
      console.log('Response length:', response.data.length);
      
      const $ = cheerio.load(response.data);
      const draftData = [];
      
      // Debug: Log the page title and some content
      console.log('Page title:', $('title').text());
      console.log('First 500 chars of body:', $('body').text().substring(0, 500));

      // Method 1: Look for draft pick containers
      $('[class*="draft"], [class*="pick"], [class*="round"]').each((index, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        
        // Look for patterns that indicate draft picks
        if (this.isDraftPickText(text)) {
          const pickData = this.parseDraftPickText(text);
          if (pickData) {
            draftData.push(pickData);
          }
        }
      });

      // Method 2: Look for specific data attributes
      $('[data-testid*="pick"], [data-testid*="draft"]').each((index, element) => {
        const $el = $(element);
        const pickData = this.extractFromDataAttributes($el);
        if (pickData) {
          draftData.push(pickData);
        }
      });

      // Method 3: Look for table structures
      $('table, [role="table"]').each((index, element) => {
        const $table = $(element);
        const rows = $table.find('tr, [role="row"]');
        
        rows.each((rowIndex, row) => {
          const $row = $(row);
          const cells = $row.find('td, th, [role="cell"]');
          
          if (cells.length >= 3) {
            const pickData = this.extractFromTableRow($row);
            if (pickData) {
              draftData.push(pickData);
            }
          }
        });
      });

      // Method 4: Look for JSON data in script tags
      $('script').each((index, element) => {
        const scriptContent = $(element).html();
        if (scriptContent && scriptContent.includes('draft') || scriptContent.includes('pick')) {
          const jsonData = this.extractJSONFromScript(scriptContent);
          if (jsonData && jsonData.length > 0) {
            draftData.push(...jsonData);
          }
        }
      });

      // Method 5: Look for specific MLB draft tracker elements
      $('[class*="draft-pick"], [class*="pick-card"], [class*="draft-card"]').each((index, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        console.log('Found draft element:', text.substring(0, 100));
        
        if (this.isDraftPickText(text)) {
          const pickData = this.parseDraftPickText(text);
          if (pickData) {
            draftData.push(pickData);
          }
        }
      });

      // Method 6: Look for draft data in the raw HTML
      console.log('Searching for draft data patterns in HTML...');
      
      // Look for patterns like "Pick 1:", "1st Round:", etc.
      const pickPatterns = [
        /(\d+)(?:st|nd|rd|th)?\s*(?:Round|Pick)?\s*[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
        /Pick\s*(\d+)\s*[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
        /(\d+)\.\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
      ];
      
      pickPatterns.forEach((pattern, index) => {
        const matches = response.data.match(pattern);
        if (matches) {
          console.log(`Pattern ${index + 1} found matches:`, matches.length);
          matches.forEach(match => {
            console.log('Found pick match:', match);
            const pickData = {
              pickNumber: match[1] || 'Unknown',
              playerName: match[2] || 'Unknown',
              position: 'Unknown',
              school: 'Unknown',
              team: 'TBD',
              timestamp: new Date().toISOString()
            };
            draftData.push(pickData);
          });
        }
      });
      
      // Method 7: Check if draft has actually started
      console.log('Checking if draft is live...');
      const draftStatusMatch = response.data.match(/draft.*live|live.*draft|draft.*started|started.*draft/gi);
      if (draftStatusMatch) {
        console.log('Draft status indicators found:', draftStatusMatch);
      } else {
        console.log('No draft status indicators found - draft may not have started yet');
      }
      
      // Method 8: Look for any text containing "pick" or "draft"
      const draftTextMatch = response.data.match(/pick|draft/gi);
      if (draftTextMatch) {
        console.log('Found draft-related text:', draftTextMatch.length, 'occurrences');
      }
      
      // Method 7: Look for any text containing pick numbers
      $('*').each((index, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        
        // Look for patterns like "1.", "2.", "3." followed by names
        const pickMatch = text.match(/(\d+)\.\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
        if (pickMatch) {
          console.log('Found pick pattern:', pickMatch[0]);
          const pickData = {
            pickNumber: pickMatch[1],
            playerName: pickMatch[2],
            position: 'Unknown',
            school: 'Unknown',
            team: 'TBD',
            timestamp: new Date().toISOString()
          };
          draftData.push(pickData);
        }
      });

      // Method 7: Look for any text containing pick numbers
      $('*').each((index, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        
        // Look for patterns like "1.", "2.", "3." followed by names
        const pickMatch = text.match(/(\d+)\.\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
        if (pickMatch) {
          console.log('Found pick pattern:', pickMatch[0]);
          const pickData = {
            pickNumber: pickMatch[1],
            playerName: pickMatch[2],
            position: 'Unknown',
            school: 'Unknown',
            team: 'TBD',
            timestamp: new Date().toISOString()
          };
          draftData.push(pickData);
        }
      });

      // Remove duplicates and sort
      const uniqueData = this.removeDuplicates(draftData);
      const sortedData = uniqueData.sort((a, b) => {
        const aNum = parseInt(a.pickNumber) || 0;
        const bNum = parseInt(b.pickNumber) || 0;
        return aNum - bNum;
      });

      console.log(`Found ${sortedData.length} draft picks`);
      return sortedData;

    } catch (error) {
      console.error('Error scraping MLB Draft Tracker:', error);
      return [];
    }
  }

  isDraftPickText(text) {
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
      console.error('Error parsing draft pick text:', error);
      return null;
    }
  }

  extractFromDataAttributes($el) {
    try {
      const pickNumber = $el.attr('data-pick-number') || $el.attr('data-pick') || '';
      const playerName = $el.attr('data-player-name') || $el.attr('data-name') || '';
      const position = $el.attr('data-position') || $el.attr('data-pos') || '';
      const team = $el.attr('data-team') || $el.attr('data-franchise') || '';

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

      return null;
    } catch (error) {
      return null;
    }
  }

  extractFromTableRow($row) {
    try {
      const cells = $row.find('td, th, [role="cell"]');
      const cellTexts = cells.map((index, cell) => $(cell).text().trim()).get();

      if (cellTexts.length >= 3) {
        // Try to identify which column is which
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
      // Look for name patterns (First Last)
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
      // Look for JSON objects in script tags
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
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const sheetData = this.convertToGoogleSheetsFormat(draftData);

      // Write draft data to a separate range (columns F onwards) to preserve player data
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Draft Picks!F1',
        valueInputOption: 'RAW',
        resource: {
          values: sheetData,
        },
      });

      console.log(`Updated Google Sheet with ${draftData.length} draft picks`);
      return true;
    } catch (error) {
      console.error('Error updating Google Sheet:', error);
      return false;
    }
  }
}

// Export for use in other files
module.exports = MLBDraftScraper;

// If run directly, execute the scraper
if (require.main === module) {
  const scraper = new MLBDraftScraper();
  
  scraper.scrapeDraftData()
    .then(async (data) => {
      console.log('Scraped data:', JSON.stringify(data, null, 2));
      
      if (process.env.GOOGLE_CREDENTIALS && process.env.SPREADSHEET_ID) {
        await scraper.updateGoogleSheet(data);
      } else {
        console.log('Google credentials not found, skipping sheet update');
        console.log('To update Google Sheet, set GOOGLE_CREDENTIALS and SPREADSHEET_ID environment variables');
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
} 