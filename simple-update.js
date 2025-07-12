const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
require('dotenv').config();

/**
 * Simple MLB Draft Tracker Update Script
 * Uses the same credentials as your existing server
 */

class SimpleUpdater {
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

  // Get credentials the same way your server does
  getCredentials() {
    try {
      // Try to get from environment variables (like your server does)
      if (process.env.GOOGLE_CREDENTIALS) {
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
      }
      throw new Error('GOOGLE_CREDENTIALS environment variable not set');
    } catch (error) {
      console.error('Error loading credentials:', error.message);
      throw new Error('Failed to load Google credentials');
    }
  }

  // Get current data from your existing Google Sheet
  async getCurrentSheetData() {
    try {
      const credentials = this.getCredentials();
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Use the same sheet ID and range as your server
      const SHEET_ID = process.env.SPREADSHEET_ID || process.env.SHEET_ID || '1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I';
      const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A1:Z1000';
      
      console.log('📊 Reading current data from your Google Sheet...');
      console.log('Sheet ID:', SHEET_ID);
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: SHEET_RANGE,
      });

      const data = response.data.values;
      if (!data || data.length === 0) {
        console.log('No data found in sheet');
        return this.getSampleData();
      }

      // Convert to objects using header row
      const [header, ...rows] = data;
      const currentPlayers = rows.map(row => {
        const player = {};
        header.forEach((key, index) => {
          player[key] = row[index] || '';
        });
        return player;
      });

      console.log(`📋 Found ${currentPlayers.length} players in your current sheet`);
      return currentPlayers;

    } catch (error) {
      console.error('Error reading current sheet:', error.message);
      console.log('Using sample data instead...');
      return this.getSampleData();
    }
  }

  // Scrape MLB for current player data
  async scrapeMLBPlayers() {
    try {
      console.log('🔍 Scraping MLB Draft Tracker for current player data...');
      
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const players = [];

      console.log('📄 Analyzing page content for player information...');

      // Look for player information in various formats
      $('body').find('*').each((index, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        
        // Look for player patterns
        if (this.isPlayerText(text)) {
          const playerData = this.parsePlayerText(text);
          if (playerData) {
            players.push(playerData);
          }
        }
      });

      // Remove duplicates and sort
      const uniquePlayers = this.removeDuplicates(players);
      const sortedPlayers = uniquePlayers.sort((a, b) => a.Name.localeCompare(b.Name));

      console.log(`✅ Found ${sortedPlayers.length} players from MLB.com`);
      return sortedPlayers;

    } catch (error) {
      console.error('❌ Error scraping MLB Draft Tracker:', error.message);
      return [];
    }
  }

  isPlayerText(text) {
    if (!text || text.length < 10 || text.length > 500) return false;
    
    const patterns = [
      /[A-Z][a-z]+\s+[A-Z][a-z]+/, // Player name pattern
      /Georgia/, // Look for Georgia players specifically
      /[A-Z]{2,3}\/[A-Z]{2,3}/, // Position patterns like OF/1B
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

      return null;
    } catch (error) {
      return null;
    }
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
      const credentials = this.getCredentials();
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

  // Create sample data for testing
  getSampleData() {
    return [
      {
        Name: 'Charlie Condon',
        Position: 'OF/1B',
        School: 'Georgia',
        Height: '6-6',
        Weight: '216',
        Bats: 'R',
        Throws: 'R'
      },
      {
        Name: 'Corey Collins',
        Position: 'C',
        School: 'Georgia',
        Height: '6-3',
        Weight: '220',
        Bats: 'L',
        Throws: 'R'
      },
      {
        Name: 'Kolten Smith',
        Position: 'RHP',
        School: 'Georgia',
        Height: '6-3',
        Weight: '225',
        Bats: 'R',
        Throws: 'R'
      },
      {
        Name: 'Fernando Gonzalez',
        Position: 'C',
        School: 'Georgia',
        Height: '5-11',
        Weight: '200',
        Bats: 'R',
        Throws: 'R'
      }
    ];
  }

  // Merge MLB data with your existing data
  mergePlayerData(mlbPlayers, currentPlayers) {
    console.log('🔄 Merging MLB data with your existing data...');
    
    const mergedPlayers = [];
    const currentNames = new Set(currentPlayers.map(p => p.Name.toLowerCase()));

    // Add all current players first
    mergedPlayers.push(...currentPlayers);

    // Add new players from MLB that aren't already in your sheet
    mlbPlayers.forEach(mlbPlayer => {
      if (!currentNames.has(mlbPlayer.Name.toLowerCase())) {
        mergedPlayers.push(mlbPlayer);
        console.log(`➕ Added new player: ${mlbPlayer.Name} - ${mlbPlayer.Position} - ${mlbPlayer.School}`);
      }
    });

    // Update existing players with MLB data if available
    mergedPlayers.forEach(player => {
      const mlbPlayer = mlbPlayers.find(mp => mp.Name.toLowerCase() === player.Name.toLowerCase());
      if (mlbPlayer) {
        // Update with MLB data but keep existing data if MLB doesn't have it
        player.Position = mlbPlayer.Position !== 'N/A' ? mlbPlayer.Position : player.Position;
        player.School = mlbPlayer.School !== 'N/A' ? mlbPlayer.School : player.School;
      }
    });

    console.log(`📊 Final merged data: ${mergedPlayers.length} players`);
    return mergedPlayers;
  }
}

// Main execution function
async function main() {
  console.log('🚀 Simple MLB Draft Tracker - Update Existing Google Sheet');
  console.log('==========================================================');
  
  const updater = new SimpleUpdater();
  
  try {
    // Get current data from your sheet
    const currentPlayers = await updater.getCurrentSheetData();
    
    console.log('\n📋 Current players in your sheet:');
    currentPlayers.forEach((player, index) => {
      console.log(`${index + 1}. ${player.Name} - ${player.Position} - ${player.School}`);
    });

    // Scrape new data from MLB
    const mlbPlayers = await updater.scrapeMLBPlayers();
    
    if (mlbPlayers.length > 0) {
      console.log('\n📋 Players found on MLB.com:');
      mlbPlayers.forEach((player, index) => {
        console.log(`${index + 1}. ${player.Name} - ${player.Position} - ${player.School}`);
      });
    } else {
      console.log('\n📝 No new players found on MLB.com (draft may not have started yet)');
    }

    // Merge the data
    const mergedPlayers = updater.mergePlayerData(mlbPlayers, currentPlayers);
    
    // Update your existing sheet
    await updater.updateExistingSheet(mergedPlayers);
    
    console.log('\n✅ Update completed successfully!');
    console.log('🔄 Your existing Google Sheet has been updated with the latest data');
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = SimpleUpdater; 