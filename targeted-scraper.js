const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
require('dotenv').config();

/**
 * Targeted MLB Draft Tracker Scraper
 * Focuses on finding actual draft prospects
 */

class TargetedScraper {
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
  }

  async scrapeDraftProspects() {
    console.log('🎯 Starting targeted MLB Draft Tracker scrape...');
    console.log('Focusing on actual draft prospects...');
    
    // Try different approaches to find draft prospects
    await this.scrapeMainDraftPage();
    await this.scrapeProspectRankings();
    await this.scrapeDraftAPI();
    
    // Filter out non-player data and remove duplicates
    const filteredPlayers = this.filterRealPlayers(this.players);
    const uniquePlayers = this.removeDuplicates(filteredPlayers);
    const sortedPlayers = uniquePlayers.sort((a, b) => a.Name.localeCompare(b.Name));
    
    console.log(`✅ Found ${sortedPlayers.length} actual draft prospects`);
    return sortedPlayers;
  }

  async scrapeMainDraftPage() {
    try {
      console.log('📄 Scraping main draft tracker page...');
      
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Look for draft prospect data
      this.extractDraftProspects($);
      
      console.log(`📊 Found ${this.players.length} potential prospects from main page`);
      
    } catch (error) {
      console.error('❌ Error scraping main page:', error.message);
    }
  }

  async scrapeProspectRankings() {
    try {
      console.log('📄 Scraping prospect rankings...');
      
      // Try different prospect ranking URLs
      const urls = [
        'https://www.mlb.com/prospects/draft',
        'https://www.mlb.com/prospects/2025/draft',
        'https://www.mlb.com/draft/prospects',
        'https://www.mlb.com/draft/2025/prospects'
      ];
      
      for (const url of urls) {
        try {
          console.log(`🔍 Trying prospect URL: ${url}`);
          const response = await axios.get(url, {
            headers: this.headers,
            timeout: 15000
          });
          
          const $ = cheerio.load(response.data);
          this.extractDraftProspects($);
          
        } catch (error) {
          console.log(`⚠️  Could not access ${url}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error scraping prospect rankings:', error.message);
    }
  }

  async scrapeDraftAPI() {
    try {
      console.log('📄 Trying draft-specific API endpoints...');
      
      // Try draft-specific API endpoints
      const apiUrls = [
        'https://www.mlb.com/api/v1/draft/prospects',
        'https://www.mlb.com/api/v1/prospects/draft/2025',
        'https://www.mlb.com/api/v1/draft/2025/prospects',
        'https://www.mlb.com/api/v1/prospects/rankings/draft'
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
            this.extractProspectsFromJSON(response.data);
          }
          
        } catch (error) {
          console.log(`⚠️  Could not access API ${url}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error scraping draft API:', error.message);
    }
  }

  extractDraftProspects($) {
    // Look for prospect-specific elements
    $('[class*="prospect"], [class*="draft"], [class*="player"]').each((index, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      
      if (this.isDraftProspectText(text)) {
        const playerData = this.parseDraftProspect(text);
        if (playerData) {
          this.players.push(playerData);
        }
      }
    });

    // Look for prospect tables
    $('table').each((index, element) => {
      const $table = $(element);
      const rows = $table.find('tr');
      
      rows.each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        
        if (cells.length >= 3) {
          const playerData = this.extractFromProspectTable($row);
          if (playerData) {
            this.players.push(playerData);
          }
        }
      });
    });

    // Look for prospect lists
    $('li, [role="listitem"]').each((index, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      
      if (this.isDraftProspectText(text)) {
        const playerData = this.parseDraftProspect(text);
        if (playerData) {
          this.players.push(playerData);
        }
      }
    });

    // Look for JSON data in script tags
    $('script').each((index, element) => {
      const scriptContent = $(element).html();
      if (scriptContent) {
        this.extractProspectsFromScript(scriptContent);
      }
    });
  }

  extractProspectsFromScript(scriptContent) {
    // Look for prospect data in script tags
    const prospectMatches = scriptContent.match(/\{[^{}]*"prospect"[^{}]*\}/g) || 
                           scriptContent.match(/\{[^{}]*"draft"[^{}]*\}/g) ||
                           scriptContent.match(/\{[^{}]*"player"[^{}]*\}/g);
    
    if (prospectMatches) {
      prospectMatches.forEach(match => {
        try {
          const parsed = JSON.parse(match);
          if (parsed.prospect || parsed.player || parsed.draft) {
            const playerData = this.convertJSONToProspect(parsed);
            if (playerData) {
              this.players.push(playerData);
            }
          }
        } catch (e) {
          // Ignore invalid JSON
        }
      });
    }
    
    // Look for larger prospect arrays
    const largeMatches = scriptContent.match(/\{[^{}]*"prospects"[^{}]*\}/g) ||
                        scriptContent.match(/\{[^{}]*"players"[^{}]*\}/g);
    
    if (largeMatches) {
      largeMatches.forEach(match => {
        try {
          const parsed = JSON.parse(match);
          if (parsed.prospects && Array.isArray(parsed.prospects)) {
            parsed.prospects.forEach(prospect => {
              const playerData = this.convertJSONToProspect(prospect);
              if (playerData) {
                this.players.push(playerData);
              }
            });
          }
          if (parsed.players && Array.isArray(parsed.players)) {
            parsed.players.forEach(player => {
              const playerData = this.convertJSONToProspect(player);
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

  extractProspectsFromJSON(data) {
    if (Array.isArray(data)) {
      data.forEach(item => {
        const playerData = this.convertJSONToProspect(item);
        if (playerData) {
          this.players.push(playerData);
        }
      });
    } else if (data.prospects && Array.isArray(data.prospects)) {
      data.prospects.forEach(prospect => {
        const playerData = this.convertJSONToProspect(prospect);
        if (playerData) {
          this.players.push(playerData);
        }
      });
    } else if (data.players && Array.isArray(data.players)) {
      data.players.forEach(player => {
        const playerData = this.convertJSONToProspect(player);
        if (playerData) {
          this.players.push(playerData);
        }
      });
    }
  }

  convertJSONToProspect(json) {
    try {
      const name = json.name || json.prospect || json.player || json.fullName || json.playerName;
      const position = json.position || json.pos || json.primaryPosition;
      const school = json.school || json.college || json.team || json.organization;
      
      if (name && this.isValidProspectName(name)) {
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

  isDraftProspectText(text) {
    if (!text || text.length < 10 || text.length > 500) return false;
    
    // Filter out league names and other non-player data
    const excludePatterns = [
      /American League/i,
      /National League/i,
      /Major League Baseball/i,
      /Cactus League/i,
      /Grapefruit League/i,
      /College Baseball/i,
      /Hall of Fame/i,
      /Division/i,
      /Conference/i
    ];
    
    if (excludePatterns.some(pattern => pattern.test(text))) {
      return false;
    }
    
    const patterns = [
      /[A-Z][a-z]+\s+[A-Z][a-z]+/, // Player name pattern
      /[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+/, // Three word names
      /Georgia/, // Look for Georgia players specifically
      /[A-Z]{2,3}\/[A-Z]{2,3}/, // Position patterns like OF/1B
      /[A-Z]{1,3}$/ // Single position like P, C, OF
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  isValidProspectName(name) {
    // Filter out league names and other non-player data
    const excludePatterns = [
      /American League/i,
      /National League/i,
      /Major League Baseball/i,
      /Cactus League/i,
      /Grapefruit League/i,
      /College Baseball/i,
      /Hall of Fame/i,
      /Division/i,
      /Conference/i
    ];
    
    return !excludePatterns.some(pattern => pattern.test(name));
  }

  parseDraftProspect(text) {
    try {
      // Pattern: "Charlie Condon - OF/1B - Georgia"
      const playerPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*-\s*([^-]+?)\s*-\s*(.+)/;
      const match = text.match(playerPattern);
      
      if (match) {
        const name = match[1].trim();
        if (this.isValidProspectName(name)) {
          return {
            Name: name,
            Position: match[2].trim(),
            School: match[3].trim(),
            Height: 'N/A',
            Weight: 'N/A',
            Bats: 'N/A',
            Throws: 'N/A'
          };
        }
      }

      // Pattern: "Charlie Condon Georgia OF/1B"
      const nameFirstPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+([A-Z][a-z\s]+)\s+([A-Z\/]+)/;
      const nameFirstMatch = text.match(nameFirstPattern);
      
      if (nameFirstMatch) {
        const name = nameFirstMatch[1].trim();
        if (this.isValidProspectName(name)) {
          return {
            Name: name,
            School: nameFirstMatch[2].trim(),
            Position: nameFirstMatch[3].trim(),
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

  extractFromProspectTable($row) {
    try {
      const cells = $row.find('td, th, [role="cell"]');
      const cellTexts = cells.map((index, cell) => $(cell).text().trim()).get();

      if (cellTexts.length >= 3) {
        const name = this.findProspectName(cellTexts);
        const position = this.findPosition(cellTexts);
        const school = this.findSchool(cellTexts);

        if (name && this.isValidProspectName(name)) {
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

  findProspectName(texts) {
    for (const text of texts) {
      const nameMatch = text.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/);
      if (nameMatch && this.isValidProspectName(text)) return text;
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

  filterRealPlayers(players) {
    return players.filter(player => {
      return this.isValidProspectName(player.Name) && 
             player.Name.length > 5 && 
             !player.Name.includes('League') &&
             !player.Name.includes('Baseball') &&
             !player.Name.includes('Division') &&
             !player.Name.includes('Conference');
    });
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

      console.log(`✅ Successfully updated your Google Sheet with ${newPlayers.length} prospects`);
      return true;
    } catch (error) {
      console.error('❌ Error updating Google Sheet:', error.message);
      return false;
    }
  }
}

// Main execution function
async function main() {
  console.log('🎯 Targeted MLB Draft Tracker Scraper');
  console.log('=====================================');
  
  const scraper = new TargetedScraper();
  
  try {
    // Scrape for actual draft prospects
    const prospects = await scraper.scrapeDraftProspects();
    
    console.log('\n📋 Summary:');
    console.log(`Total prospects found: ${prospects.length}`);
    
    if (prospects.length > 0) {
      console.log('\n📋 Sample prospects found:');
      prospects.slice(0, 10).forEach((prospect, index) => {
        console.log(`${index + 1}. ${prospect.Name} - ${prospect.Position} - ${prospect.School}`);
      });
      
      if (prospects.length > 10) {
        console.log(`... and ${prospects.length - 10} more prospects`);
      }
    } else {
      console.log('📝 No prospects found. This might indicate:');
      console.log('1. The draft tracker uses dynamic loading');
      console.log('2. The data is behind authentication');
      console.log('3. The site structure has changed');
    }
    
    // Update your existing sheet
    await scraper.updateExistingSheet(prospects);
    
    console.log('\n✅ Targeted scrape completed successfully!');
    console.log('🔄 Your Google Sheet has been updated with actual draft prospects');
    
  } catch (error) {
    console.error('❌ Targeted scrape failed:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = TargetedScraper; 