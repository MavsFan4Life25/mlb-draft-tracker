const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
require('dotenv').config();

/**
 * Comprehensive MLB Draft Tracker Scraper
 * Scrapes all pages to get complete player data
 */

class ComprehensiveScraper {
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
    this.players = [];
    this.totalPages = 79;
  }

  async scrapeAllPages() {
    console.log('🚀 Starting comprehensive MLB Draft Tracker scrape...');
    console.log(`📄 Planning to scrape ${this.totalPages} pages...`);
    
    // Try different approaches to get all players
    await this.scrapeMainPage();
    await this.scrapePlayerListings();
    await this.scrapeAPIEndpoints();
    
    // Remove duplicates and sort
    const uniquePlayers = this.removeDuplicates(this.players);
    const sortedPlayers = uniquePlayers.sort((a, b) => a.Name.localeCompare(b.Name));
    
    console.log(`✅ Found ${sortedPlayers.length} unique players total`);
    return sortedPlayers;
  }

  async scrapeMainPage() {
    try {
      console.log('📄 Scraping main draft tracker page...');
      
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Look for player data in various formats
      this.extractPlayersFromHTML($);
      
      // Look for JSON data in script tags
      this.extractJSONFromScripts($);
      
      console.log(`📊 Found ${this.players.length} players from main page`);
      
    } catch (error) {
      console.error('❌ Error scraping main page:', error.message);
    }
  }

  async scrapePlayerListings() {
    try {
      console.log('📄 Scraping player listing pages...');
      
      // Try different URL patterns for player listings
      const urls = [
        'https://www.mlb.com/draft/tracker/players',
        'https://www.mlb.com/draft/tracker/prospects',
        'https://www.mlb.com/draft/tracker/rankings',
        'https://www.mlb.com/draft/tracker/2025',
        'https://www.mlb.com/draft/tracker/2025/players'
      ];
      
      for (const url of urls) {
        try {
          console.log(`🔍 Trying URL: ${url}`);
          const response = await axios.get(url, {
            headers: this.headers,
            timeout: 15000
          });
          
          const $ = cheerio.load(response.data);
          this.extractPlayersFromHTML($);
          this.extractJSONFromScripts($);
          
        } catch (error) {
          console.log(`⚠️  Could not access ${url}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error scraping player listings:', error.message);
    }
  }

  async scrapeAPIEndpoints() {
    try {
      console.log('📄 Trying API endpoints...');
      
      // Try common API endpoints that might contain player data
      const apiUrls = [
        'https://www.mlb.com/api/v1/draft/players',
        'https://www.mlb.com/api/v1/draft/prospects',
        'https://www.mlb.com/api/v1/draft/2025/players',
        'https://www.mlb.com/api/v1/draft/rankings',
        'https://www.mlb.com/api/v1/prospects/draft'
      ];
      
      for (const url of apiUrls) {
        try {
          console.log(`🔍 Trying API: ${url}`);
          const response = await axios.get(url, {
            headers: {
              ...this.headers,
              'Accept': 'application/json'
            },
            timeout: 10000
          });
          
          if (response.data) {
            this.extractPlayersFromJSON(response.data);
          }
          
        } catch (error) {
          console.log(`⚠️  Could not access API ${url}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error scraping API endpoints:', error.message);
    }
  }

  extractPlayersFromHTML($) {
    // Method 1: Look for player cards/containers
    $('[class*="player"], [class*="prospect"], [class*="draft"]').each((index, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      
      if (this.isPlayerText(text)) {
        const playerData = this.parsePlayerText(text);
        if (playerData) {
          this.players.push(playerData);
        }
      }
    });

    // Method 2: Look for table structures
    $('table, [role="table"]').each((index, element) => {
      const $table = $(element);
      const rows = $table.find('tr, [role="row"]');
      
      rows.each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td, th, [role="cell"]');
        
        if (cells.length >= 3) {
          const playerData = this.extractFromTableRow($row);
          if (playerData) {
            this.players.push(playerData);
          }
        }
      });
    });

    // Method 3: Look for list items
    $('li, [role="listitem"]').each((index, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      
      if (this.isPlayerText(text)) {
        const playerData = this.parsePlayerText(text);
        if (playerData) {
          this.players.push(playerData);
        }
      }
    });
  }

  extractJSONFromScripts($) {
    $('script').each((index, element) => {
      const scriptContent = $(element).html();
      if (scriptContent) {
        // Look for JSON data in script tags
        const jsonMatches = scriptContent.match(/\{[^{}]*"player"[^{}]*\}/g) || 
                           scriptContent.match(/\{[^{}]*"name"[^{}]*\}/g) ||
                           scriptContent.match(/\{[^{}]*"prospect"[^{}]*\}/g);
        
        if (jsonMatches) {
          jsonMatches.forEach(match => {
            try {
              const parsed = JSON.parse(match);
              if (parsed.name || parsed.player || parsed.prospect) {
                const playerData = this.convertJSONToPlayer(parsed);
                if (playerData) {
                  this.players.push(playerData);
                }
              }
            } catch (e) {
              // Ignore invalid JSON
            }
          });
        }
        
        // Look for larger JSON objects
        const largeJsonMatches = scriptContent.match(/\{[^{}]*"players"[^{}]*\}/g) ||
                                scriptContent.match(/\{[^{}]*"prospects"[^{}]*\}/g);
        
        if (largeJsonMatches) {
          largeJsonMatches.forEach(match => {
            try {
              const parsed = JSON.parse(match);
              if (parsed.players && Array.isArray(parsed.players)) {
                parsed.players.forEach(player => {
                  const playerData = this.convertJSONToPlayer(player);
                  if (playerData) {
                    this.players.push(playerData);
                  }
                });
              }
              if (parsed.prospects && Array.isArray(parsed.prospects)) {
                parsed.prospects.forEach(player => {
                  const playerData = this.convertJSONToPlayer(player);
                  if (playerData) {
                    this.players.push(playerData);
                  }
                });
              }
            } catch (e) {
              // Ignore invalid JSON
            }
          });
        }
      }
    });
  }

  extractPlayersFromJSON(data) {
    if (Array.isArray(data)) {
      data.forEach(item => {
        const playerData = this.convertJSONToPlayer(item);
        if (playerData) {
          this.players.push(playerData);
        }
      });
    } else if (data.players && Array.isArray(data.players)) {
      data.players.forEach(player => {
        const playerData = this.convertJSONToPlayer(player);
        if (playerData) {
          this.players.push(playerData);
        }
      });
    } else if (data.prospects && Array.isArray(data.prospects)) {
      data.prospects.forEach(player => {
        const playerData = this.convertJSONToPlayer(player);
        if (playerData) {
          this.players.push(playerData);
        }
      });
    }
  }

  convertJSONToPlayer(json) {
    try {
      const name = json.name || json.player || json.prospect || json.fullName || json.playerName;
      const position = json.position || json.pos || json.primaryPosition;
      const school = json.school || json.college || json.team || json.organization;
      
      if (name) {
        return {
          Name: name,
          Position: position || 'N/A',
          School: school || 'N/A',
          Height: json.height || 'N/A',
          Weight: json.weight || 'N/A',
          Bats: json.bats || 'N/A',
          Throws: json.throws || 'N/A'
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  isPlayerText(text) {
    if (!text || text.length < 10 || text.length > 500) return false;
    
    const patterns = [
      /[A-Z][a-z]+\s+[A-Z][a-z]+/, // Player name pattern
      /[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+/, // Three word names
      /Georgia/, // Look for Georgia players specifically
      /[A-Z]{2,3}\/[A-Z]{2,3}/, // Position patterns like OF/1B
      /[A-Z]{1,3}$/ // Single position like P, C, OF
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  parsePlayerText(text) {
    try {
      // Pattern: "Charlie Condon - OF/1B - Georgia"
      const playerPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*-\s*([^-]+?)\s*-\s*(.+)/;
      const match = text.match(playerPattern);
      
      if (match) {
        return {
          Name: match[1].trim(),
          Position: match[2].trim(),
          School: match[3].trim(),
          Height: 'N/A',
          Weight: 'N/A',
          Bats: 'N/A',
          Throws: 'N/A'
        };
      }

      // Pattern: "Charlie Condon Georgia OF/1B"
      const nameFirstPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+([A-Z][a-z\s]+)\s+([A-Z\/]+)/;
      const nameFirstMatch = text.match(nameFirstPattern);
      
      if (nameFirstMatch) {
        return {
          Name: nameFirstMatch[1].trim(),
          School: nameFirstMatch[2].trim(),
          Position: nameFirstMatch[3].trim(),
          Height: 'N/A',
          Weight: 'N/A',
          Bats: 'N/A',
          Throws: 'N/A'
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
        const name = this.findPlayerName(cellTexts);
        const position = this.findPosition(cellTexts);
        const school = this.findSchool(cellTexts);

        if (name) {
          return {
            Name: name,
            Position: position || 'N/A',
            School: school || 'N/A',
            Height: 'N/A',
            Weight: 'N/A',
            Bats: 'N/A',
            Throws: 'N/A'
          };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  findPlayerName(texts) {
    for (const text of texts) {
      const nameMatch = text.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/);
      if (nameMatch) return text;
    }
    return null;
  }

  findPosition(texts) {
    const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH', 'RHP', 'LHP', 'OF/1B', 'OF/RHP'];
    for (const text of texts) {
      if (positions.includes(text.toUpperCase())) return text;
    }
    return null;
  }

  findSchool(texts) {
    const schools = ['Georgia', 'Oregon State', 'Texas A&M', 'Wake Forest', 'Florida', 'LSU', 'Arkansas', 'Vanderbilt', 'Tennessee', 'Auburn', 'Alabama', 'Mississippi State', 'South Carolina', 'Kentucky', 'Missouri', 'Ole Miss'];
    for (const text of texts) {
      if (schools.some(school => text.includes(school))) return text;
    }
    return null;
  }

  removeDuplicates(data) {
    const seen = new Set();
    return data.filter(item => {
      const key = item.Name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Update your existing Google Sheet with new data
  async updateExistingSheet(newPlayers) {
    try {
      if (!process.env.GOOGLE_CREDENTIALS || !process.env.SPREADSHEET_ID) {
        console.log('⚠️  Google credentials not found. Cannot update sheet.');
        return false;
      }

      console.log('🔐 Authenticating with Google...');
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Convert players to sheet format
      const headers = ['Name', 'Position', 'School', 'Height', 'Weight', 'Bats', 'Throws'];
      const rows = newPlayers.map(player => [
        player.Name,
        player.Position,
        player.School,
        player.Height,
        player.Weight,
        player.Bats,
        player.Throws
      ]);

      const sheetData = [headers, ...rows];

      // Use the same sheet ID as your server
      const SHEET_ID = process.env.SPREADSHEET_ID || process.env.SHEET_ID || '1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I';
      const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A1:Z1000';

      console.log('📊 Updating your existing Google Sheet...');

      // Clear existing data and write new data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: SHEET_RANGE,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: SHEET_RANGE.split('!')[0] + '!A1',
        valueInputOption: 'RAW',
        resource: {
          values: sheetData,
        },
      });

      console.log(`✅ Successfully updated your Google Sheet with ${newPlayers.length} players`);
      return true;
    } catch (error) {
      console.error('❌ Error updating Google Sheet:', error.message);
      return false;
    }
  }
}

// Main execution function
async function main() {
  console.log('🚀 Comprehensive MLB Draft Tracker Scraper');
  console.log('==========================================');
  
  const scraper = new ComprehensiveScraper();
  
  try {
    // Scrape all pages for comprehensive data
    const allPlayers = await scraper.scrapeAllPages();
    
    console.log('\n📋 Summary:');
    console.log(`Total players found: ${allPlayers.length}`);
    
    if (allPlayers.length > 0) {
      console.log('\n📋 Sample players found:');
      allPlayers.slice(0, 10).forEach((player, index) => {
        console.log(`${index + 1}. ${player.Name} - ${player.Position} - ${player.School}`);
      });
      
      if (allPlayers.length > 10) {
        console.log(`... and ${allPlayers.length - 10} more players`);
      }
    }
    
    // Update your existing sheet
    await scraper.updateExistingSheet(allPlayers);
    
    console.log('\n✅ Comprehensive scrape completed successfully!');
    console.log('🔄 Your Google Sheet has been updated with all available players');
    
  } catch (error) {
    console.error('❌ Comprehensive scrape failed:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = ComprehensiveScraper; 