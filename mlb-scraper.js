const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
require('dotenv').config();

class MLBDraftScraper {
  constructor() {
    this.baseUrl = 'https://www.mlb.com/draft/tracker';
    this.spotracUrl = 'https://www.spotrac.com/mlb/draft';
    this.statsApiUrl = 'https://statsapi.mlb.com/api/v1/draft/2025';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  async fetchDraftPicksFromStatsAPI() {
    try {
      console.log('Fetching draft picks from StatsAPI...');
      const response = await axios.get(this.statsApiUrl, { timeout: 10000 });
      if (response.status !== 200) throw new Error('Non-200 response from StatsAPI');
      const data = response.data;
      
      console.log('StatsAPI response structure:', Object.keys(data));
      
      if (!data || !data.drafts || !data.drafts.rounds || !Array.isArray(data.drafts.rounds) || data.drafts.rounds.length === 0) {
        throw new Error('No draft data in StatsAPI response');
      }
      
      const picks = [];
      for (const round of data.drafts.rounds) {
        console.log('Round structure:', Object.keys(round));
        if (round.picks && Array.isArray(round.picks)) {
          for (const pick of round.picks) {
            console.log('Pick structure:', Object.keys(pick));
            if (pick && pick.pickNumber && pick.person && pick.person.fullName && pick.isDrafted) {
              picks.push({
                pickNumber: pick.pickNumber,
                playerName: pick.person.fullName,
                position: pick.person.primaryPosition ? pick.person.primaryPosition.name : 'Unknown',
                school: pick.school ? pick.school.name : 'Unknown',
                team: pick.team && pick.team.name ? pick.team.name : 'Unknown',
                timestamp: new Date().toISOString()
              });
              console.log(`Added pick: ${pick.person.fullName} - ${pick.team.name}`);
            }
          }
        }
      }
      console.log(`Fetched ${picks.length} picks from StatsAPI`);
      return picks;
    } catch (err) {
      console.error('Failed to fetch from StatsAPI:', err.message);
      console.error('Full error:', err);
      return null;
    }
  }

  async scrapeDraftData() {
    // Try StatsAPI first
    const apiPicks = await this.fetchDraftPicksFromStatsAPI();
    if (apiPicks && apiPicks.length > 0) {
      return apiPicks;
    }

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
      let foundInitData = false;
      $('script').each((index, element) => {
        const scriptContent = $(element).html();
        if (scriptContent && scriptContent.includes('window.INIT_DATA')) {
          foundInitData = true;
          console.log('Found window.INIT_DATA script');
          // Extract the string assigned to window.INIT_DATA
          const match = scriptContent.match(/window\.INIT_DATA\s*=\s*"([^"]+)"/);
          if (match && match[1]) {
            let jsonString = match[1];
            try {
              // Unescape the string (handle \\ and \")
              jsonString = jsonString.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
              const data = JSON.parse(jsonString);
              // Traverse the data to find draft picks
              if (data && data.draftGroups && Array.isArray(data.draftGroups)) {
                data.draftGroups.forEach((group) => {
                  if (group && group.picks && Array.isArray(group.picks)) {
                    group.picks.forEach((pick) => {
                      if (pick && pick.player && pick.player.fullName) {
                        const pickData = {
                          pickNumber: pick.pickNumber || pick.overallPickNumber || 'Unknown',
                          playerName: pick.player.fullName,
                          position: pick.player.primaryPosition || pick.player.position || 'Unknown',
                          school: pick.player.school || pick.player.college || pick.player.highSchool || 'Unknown',
                          team: pick.team && pick.team.name ? pick.team.name : 'Unknown',
                          timestamp: new Date().toISOString()
                        };
                        draftData.push(pickData);
                        console.log('Added pick from INIT_DATA:', pickData);
                      }
                    });
                  }
                });
                console.log(`Extracted ${draftData.length} picks from INIT_DATA`);
              } else {
                console.log('INIT_DATA does not contain draftGroups or picks');
              }
            } catch (e) {
              console.error('Failed to parse window.INIT_DATA JSON:', e);
            }
          } else {
            console.log('Could not extract JSON string from window.INIT_DATA');
          }
        }
      });
      if (!foundInitData) {
        console.log('No window.INIT_DATA script found on the page');
      }

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
      
      // Method 6: Check if draft has actually started
      console.log('Checking if draft is live...');
      const draftStatusMatch = response.data.match(/draft.*live|live.*draft|draft.*started|started.*draft/gi);
      if (draftStatusMatch) {
        console.log('Draft status indicators found:', draftStatusMatch);
      } else {
        console.log('No draft status indicators found - draft may not have started yet');
      }
      
      // Method 7: Look for any text containing "pick" or "draft"
      const draftTextMatch = response.data.match(/pick|draft/gi);
      if (draftTextMatch) {
        console.log('Found draft-related text:', draftTextMatch.length, 'occurrences');
      }
      
      // Method 8: Try Spotrac as alternative source
      console.log('Trying Spotrac as alternative source...');
      try {
        const spotracResponse = await axios.get(this.spotracUrl, {
          headers: this.headers,
          timeout: 10000
        });
        
        console.log('Spotrac response status:', spotracResponse.status);
        const $spotrac = cheerio.load(spotracResponse.data);
        
        // Debug: Log what tables are found
        const tables = $spotrac('table');
        console.log(`Found ${tables.length} tables on Spotrac page`);
        
        // Look for draft picks in Spotrac tables - be more specific about table selection
        $spotrac('table').each((tableIndex, table) => {
          const $table = $spotrac(table);
          const rows = $table.find('tr');
          console.log(`Table ${tableIndex}: Found ${rows.length} rows`);
          
          $table.find('tr').each((rowIndex, row) => {
            const $row = $spotrac(row);
            const cells = $row.find('td');
            
            if (cells.length >= 4) {
              const cellTexts = cells.map((i, cell) => {
                const text = $spotrac(cell).text().trim();
                // Clean up the text - remove extra whitespace and newlines
                return text.replace(/\s+/g, ' ').trim();
              }).get();
              
              console.log(`Row ${rowIndex}:`, cellTexts);
              
              // Validate that we have meaningful data
              if (cellTexts.length < 4) {
                console.log(`Row ${rowIndex}: Skipping - not enough cells`);
                return;
              }
              
              // Look for pick number in first column - must be a valid number
              const pickNumberMatch = cellTexts[0].match(/^(\d+)$/);
              if (!pickNumberMatch) {
                console.log(`Row ${rowIndex}: Skipping - invalid pick number: "${cellTexts[0]}"`);
                return;
              }
              
              const pickNumber = pickNumberMatch[1];
              
              // Extract player name from the second column - must be a valid name
              let playerName = cellTexts[1];
              
              // Validate player name - must contain at least 2 words with proper capitalization
              const nameWords = playerName.split(' ').filter(word => word.length > 0);
              if (nameWords.length < 2) {
                console.log(`Row ${rowIndex}: Skipping - not enough name words: "${playerName}"`);
                return;
              }
              
              // Check if first letter of each word is capitalized
              const isValidName = nameWords.every(word => /^[A-Z]/.test(word));
              if (!isValidName) {
                console.log(`Row ${rowIndex}: Skipping - invalid name format: "${playerName}"`);
                return;
              }
              
              // Skip if player name is empty or just whitespace
              if (!playerName || playerName === '') {
                console.log(`Row ${rowIndex}: Skipping - empty player name`);
                return;
              }
              
              // Extract position and school
              const position = cellTexts[2] || 'Unknown';
              const school = cellTexts[3] || 'Unknown';
              
              const pickData = {
                pickNumber: pickNumber,
                playerName: playerName,
                position: position,
                school: school,
                team: 'TBD',
                timestamp: new Date().toISOString()
              };
              
              draftData.push(pickData);
              console.log(`Row ${rowIndex}: Added Spotrac pick:`, JSON.stringify(pickData));
            } else {
              console.log(`Row ${rowIndex}: Skipping - only ${cells.length} cells`);
            }
          });
        });
      } catch (spotracError) {
        console.log('Spotrac scraping failed:', spotracError.message);
      }
      
      // Remove duplicates and sort
      const uniqueData = this.removeDuplicates(draftData);
      const sortedData = uniqueData.sort((a, b) => {
        const aNum = parseInt(a.pickNumber) || 0;
        const bNum = parseInt(b.pickNumber) || 0;
        return aNum - bNum;
      });

      console.log(`Found ${draftData.length} raw draft picks`);
      console.log(`After removing duplicates: ${uniqueData.length} picks`);
      console.log(`Final sorted data: ${sortedData.length} picks`);
      
      // Debug: Log first few picks
      if (sortedData.length > 0) {
        console.log('First 5 picks:', sortedData.slice(0, 5).map(pick => ({
          pickNumber: pick.pickNumber,
          playerName: pick.playerName,
          position: pick.position,
          school: pick.school
        })));
      }

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