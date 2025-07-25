const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const MLBDraftScraper = require('./mlb-scraper');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Configuration
const SHEET_ID = process.env.SPREADSHEET_ID || process.env.SHEET_ID || '1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I';
const SHEET_RANGE = process.env.SHEET_RANGE || 'A1:Z1000';

// Debug environment variables
console.log('Environment check:');
console.log('SPREADSHEET_ID:', process.env.SPREADSHEET_ID ? 'SET' : 'NOT SET');
console.log('SHEET_ID:', process.env.SHEET_ID ? 'SET' : 'NOT SET');
console.log('SHEET_RANGE:', process.env.SHEET_RANGE ? 'SET' : 'NOT SET');
console.log('GOOGLE_CREDENTIALS:', process.env.GOOGLE_CREDENTIALS ? 'SET' : 'NOT SET');
console.log('Using SHEET_ID:', SHEET_ID);
console.log('Using SHEET_RANGE:', SHEET_RANGE);
const MLB_DRAFT_URL = 'https://www.mlb.com/draft/tracker';

// Cache for data
let players = [];
let draftPicks = [];
let lastUpdate = null;

// Google Sheets authentication
function getCredentials() {
  try {
    if (process.env.GOOGLE_CREDENTIALS) {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }
    throw new Error('GOOGLE_CREDENTIALS environment variable not set');
  } catch (error) {
    console.error('Error loading credentials:', error);
    throw new Error('Failed to load Google credentials');
  }
}

// Fetch player data from Google Sheets
async function fetchPlayersFromSheet() {
  try {
    const credentials = getCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
    });

    const data = response.data.values;
    console.log('Raw sheet data received:', data ? data.length : 'null', 'rows');
    console.log('First few rows:', data ? data.slice(0, 3) : 'null');
    
    if (!data || data.length === 0) {
      console.log('No data found in sheet');
      return getSampleData();
    }

    // Convert to objects using header row
    const [header, ...rows] = data;
    console.log('Header row:', header);
    console.log('Number of data rows:', rows.length);
    console.log('First few data rows:', rows.slice(0, 3));
    
    return rows.map(row => {
      const player = {};
      header.forEach((key, index) => {
        player[key] = row[index] || '';
      });
      
      // Ensure we have the required fields for the app
      if (!player.Name) player.Name = 'Unknown Player';
      if (!player.Position) player.Position = 'N/A';
      if (!player.School) player.School = 'N/A';
      if (!player.Rank) player.Rank = 'N/A';
      
      return player;
    });
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    console.log('Falling back to sample data...');
    return getSampleData();
  }
}

// Sample data for testing when Google Sheets is not available
function getSampleData() {
  return [
    {
      Name: 'Charlie Condon',
      Position: 'OF/1B',
      School: 'Georgia',
      Rank: '1'
    },
    {
      Name: 'Corey Collins',
      Position: 'C',
      School: 'Georgia',
      Rank: '15'
    },
    {
      Name: 'Kolten Smith',
      Position: 'RHP',
      School: 'Georgia',
      Rank: '45'
    },
    {
      Name: 'Fernando Gonzalez',
      Position: 'C',
      School: 'Georgia',
      Rank: '78'
    },
    {
      Name: 'Daniel Pierce',
      Position: 'SS',
      School: 'Mill Creek HS',
      Rank: '13'
    },
    {
      Name: 'Eli Willits',
      Position: 'SS',
      School: 'Fort Cobb-Broxton HS',
      Rank: '5'
    },
    {
      Name: 'Ethan Holliday',
      Position: 'SS',
      School: 'Stillwater HS',
      Rank: '1'
    }
  ];
}

// Scrape MLB Draft Tracker using the new scraper
async function scrapeMLBDraftPicks() {
  try {
    console.log('Scraping MLB Draft Tracker with enhanced scraper...');
    const scraper = new MLBDraftScraper();
    const picks = await scraper.scrapeDraftData();
    
    console.log('Raw picks from scraper:', picks.length);
    console.log('First few picks:', picks.slice(0, 3));
    
    // Convert to the format expected by the rest of the application
    const formattedPicks = picks.map(pick => ({
      pickNumber: pick.pickNumber,
      playerName: pick.playerName,
      team: pick.team,
      position: pick.position,
      timestamp: pick.timestamp
    }));

    console.log(`Found ${formattedPicks.length} draft picks`);
    console.log('First few formatted picks:', formattedPicks.slice(0, 3));
    
    // Update Google Sheet if credentials are available
    if (process.env.GOOGLE_CREDENTIALS && process.env.SPREADSHEET_ID) {
      try {
        await scraper.updateGoogleSheet(picks);
        console.log('Successfully updated Google Sheet with draft data');
      } catch (sheetError) {
        console.error('Error updating Google Sheet:', sheetError);
      }
    }
    
    return formattedPicks;
  } catch (error) {
    console.error('Error scraping MLB Draft Tracker:', error);
    return [];
  }
}

// Update player draft status
function updatePlayerDraftStatus(players, picks) {
  console.log(`Matching ${picks.length} picks to ${players.length} players`);
  console.log('First few picks:', picks.slice(0, 3).map(p => ({ playerName: p.playerName, pickNumber: p.pickNumber })));
  console.log('First few players:', players.slice(0, 3).map(p => ({ Name: p.Name, School: p.School })));
  
  return players.map(player => {
    const matchingPick = picks.find(pick => {
      const pickName = pick.playerName.toLowerCase().trim();
      const playerName = player.Name ? player.Name.toLowerCase().trim() : '';
      const playerSchool = player.School ? player.School.toLowerCase().trim() : '';
      
      // Only match if we have valid names
      if (!pickName || !playerName) return false;
      
      // Try exact name match first (most strict)
      if (pickName === playerName) {
        console.log(`Exact match: ${playerName} = ${pickName}`);
        return true;
      }
      
      // Try exact first and last name match
      const pickNameParts = pickName.split(' ').filter(part => part.length > 0);
      const playerNameParts = playerName.split(' ').filter(part => part.length > 0);
      
      if (pickNameParts.length >= 2 && playerNameParts.length >= 2) {
        const pickFirst = pickNameParts[0];
        const pickLast = pickNameParts[pickNameParts.length - 1];
        const playerFirst = playerNameParts[0];
        const playerLast = playerNameParts[playerNameParts.length - 1];
        
        if (pickFirst === playerFirst && pickLast === playerLast) {
          console.log(`First/Last match: ${playerName} = ${pickName}`);
          return true;
        }
      }
      
      // Try fuzzy matching for common variations
      const normalizedPickName = pickName.replace(/\s+/g, ' ').trim();
      const normalizedPlayerName = playerName.replace(/\s+/g, ' ').trim();
      
      if (normalizedPickName === normalizedPlayerName) {
        console.log(`Normalized match: ${playerName} = ${pickName}`);
        return true;
      }
      
      // Handle specific cases like "JoJo" vs "Jo Jo" and "Holliday" vs "Holiday"
      const pickNameNormalized = pickName.replace(/([A-Z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
      const playerNameNormalized = playerName.replace(/([A-Z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
      
      if (pickNameNormalized === playerNameNormalized) {
        console.log(`Special case match: ${playerName} = ${pickName}`);
        return true;
      }
      
      // Handle "Holliday" vs "Holiday" specifically
      if (pickName.includes('holliday') && playerName.includes('holiday')) {
        console.log(`Holliday/Holiday match: ${playerName} = ${pickName}`);
        return true;
      }
      
      if (playerName.includes('holliday') && pickName.includes('holiday')) {
        console.log(`Holiday/Holliday match: ${playerName} = ${pickName}`);
        return true;
      }
      
      // Only try school matching if we have school info from the pick
      if (pick.school && playerSchool) {
        const pickSchool = pick.school.toLowerCase().trim();
        if (pickSchool === playerSchool) {
          // If schools match exactly, try last name match
          const pickLastName = pickName.split(' ').pop();
          const playerLastName = playerName.split(' ').pop();
          if (pickLastName && playerLastName && pickLastName === playerLastName) {
            console.log(`School + Last name match: ${playerName} (${playerSchool}) = ${pickName} (${pickSchool})`);
            return true;
          }
        }
        
        // Debug school matching
        if (pickName.includes('eli') || pickName.includes('willits')) {
          console.log(`Debug school match attempt: Player "${playerName}" (${playerSchool}) vs Pick "${pickName}" (${pickSchool})`);
        }
      }
      
      return false;
    });

    return {
      ...player,
      isDrafted: !!matchingPick,
      draftInfo: matchingPick ? {
        pickNumber: matchingPick.pickNumber,
        team: matchingPick.team,
        timestamp: matchingPick.timestamp
      } : null
    };
  });
}

// Main update function
async function updateData() {
  try {
    console.log('Updating data...');
    
    // Fetch data in parallel
    const [sheetPlayers, mlbPicks] = await Promise.all([
      fetchPlayersFromSheet(),
      scrapeMLBDraftPicks()
    ]);

    // Update players with draft status
    const updatedPlayers = updatePlayerDraftStatus(sheetPlayers, mlbPicks);
    
    // Update cache
    players = updatedPlayers;
    draftPicks = mlbPicks;
    lastUpdate = new Date().toISOString();

    // Emit to connected clients
    io.emit('dataUpdate', {
      players: updatedPlayers,
      draftPicks: mlbPicks,
      lastUpdate: lastUpdate
    });

    console.log(`Updated ${updatedPlayers.length} players, ${mlbPicks.length} draft picks`);
  } catch (error) {
    console.error('Error updating data:', error);
  }
}

// Schedule updates during draft time (July 13th, 6:00 PM EST onwards)
const DRAFT_START_TIME = new Date('2025-07-13T18:00:00-04:00');
const DRAFT_END_TIME = new Date('2025-07-15T23:59:59-04:00');

function isDraftTime() {
  const now = new Date();
  return now >= DRAFT_START_TIME && now <= DRAFT_END_TIME;
}

// Schedule updates
cron.schedule('*/30 * * * * *', () => {
  // Force updates during draft time, or run every 2 minutes for testing
  if (isDraftTime() || true) { // Temporarily force updates
    updateData();
  }
});

// Initial data load
console.log('Starting initial data load...');
updateData().then(() => {
  console.log('Initial data load completed');
  console.log('Players loaded:', players.length);
  console.log('Draft picks loaded:', draftPicks.length);
}).catch(error => {
  console.error('Initial data load failed:', error);
});

// Force data refresh every 5 minutes for debugging
setInterval(() => {
  console.log('Forcing data refresh...');
  updateData();
}, 5 * 60 * 1000);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send current data to new client
  socket.emit('dataUpdate', {
    players: players,
    draftPicks: draftPicks,
    lastUpdate: lastUpdate
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Routes
app.get('/api/players', (req, res) => {
  res.json({
    players: players,
    draftPicks: draftPicks,
    lastUpdate: lastUpdate
  });
});

app.get('/api/draft-picks', (req, res) => {
  res.json({
    picks: draftPicks,
    lastUpdate: lastUpdate
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    draftTime: isDraftTime(),
    playersCount: players.length,
    picksCount: draftPicks.length
  });
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>TEST ROUTE - Server is working!</title>
    </head>
    <body style="background: red; color: white; font-size: 2rem; text-align: center; padding: 50px;">
        <h1>🎉 SERVER ROUTE SUCCESS! 🎉</h1>
        <p>If you can see this red page, the server is working!</p>
        <p>This means the issue is with static file serving.</p>
        <p>Players loaded: ${players.length}</p>
        <p>Draft picks loaded: ${draftPicks.length}</p>
    </body>
    </html>
  `);
});

// Simple test API that returns sample data directly
app.get('/api/test', (req, res) => {
  const sampleData = [
    {
      Name: 'Charlie Condon',
      Position: 'OF/1B',
      School: 'Georgia',
      Rank: '1',
      isDrafted: false
    },
    {
      Name: 'Corey Collins',
      Position: 'C',
      School: 'Georgia',
      Rank: '15',
      isDrafted: false
    }
  ];
  
  res.json({
    players: sampleData,
    draftPicks: [],
    lastUpdate: new Date().toISOString()
  });
});

// Manual scraper test endpoint
app.get('/api/test-scraper', async (req, res) => {
  try {
    console.log('Manual scraper test triggered...');
    const scraper = new MLBDraftScraper();
    
    // Capture console.log output
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    const picks = await scraper.scrapeDraftData();
    
    // Restore console.log
    console.log = originalLog;
    
    res.json({
      success: true,
      picksFound: picks.length,
      picks: picks,
      logs: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual scraper test failed:', error);
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to test Google Sheets connection
app.get('/api/debug-sheets', async (req, res) => {
  try {
    console.log('Debug Google Sheets connection test triggered...');
    
    // Test Google Sheets connection
    const sheetPlayers = await fetchPlayersFromSheet();
    
    res.json({
      success: true,
      totalPlayers: sheetPlayers.length,
      samplePlayers: sheetPlayers.slice(0, 5),
      isUsingSampleData: sheetPlayers.length <= 10, // If <= 10, likely using sample data
      environmentCheck: {
        SPREADSHEET_ID: process.env.SPREADSHEET_ID ? 'SET' : 'NOT SET',
        SHEET_ID: process.env.SHEET_ID ? 'SET' : 'NOT SET',
        SHEET_RANGE: process.env.SHEET_RANGE ? 'SET' : 'NOT SET',
        GOOGLE_CREDENTIALS: process.env.GOOGLE_CREDENTIALS ? 'SET' : 'NOT SET'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug Google Sheets test failed:', error);
    res.json({
      success: false,
      error: error.message,
      environmentCheck: {
        SPREADSHEET_ID: process.env.SPREADSHEET_ID ? 'SET' : 'NOT SET',
        SHEET_ID: process.env.SHEET_ID ? 'SET' : 'NOT SET',
        SHEET_RANGE: process.env.SHEET_RANGE ? 'SET' : 'NOT SET',
        GOOGLE_CREDENTIALS: process.env.GOOGLE_CREDENTIALS ? 'SET' : 'NOT SET'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to test MLB API directly
app.get('/api/debug-mlb-api', async (req, res) => {
  try {
    console.log('Debug MLB API test triggered...');
    
    const axios = require('axios');
    const response = await axios.get('https://statsapi.mlb.com/api/v1/draft/2025', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = response.data;
    let totalPicks = 0;
    let draftedPicks = [];
    
    console.log('Full API response structure:', JSON.stringify(data, null, 2).substring(0, 2000));
    
    if (data.drafts && data.drafts.rounds && Array.isArray(data.drafts.rounds)) {
      console.log('Found drafts object with rounds array, length:', data.drafts.rounds.length);
      
      data.drafts.rounds.forEach((round, roundIndex) => {
        console.log(`Round ${roundIndex} keys:`, Object.keys(round));
        
        if (round.picks && Array.isArray(round.picks)) {
          console.log(`Round ${roundIndex} has ${round.picks.length} total picks`);
          
          const roundDraftedPicks = round.picks.filter(pick => pick.isDrafted);
          console.log(`Round ${roundIndex} has ${roundDraftedPicks.length} drafted picks`);
          totalPicks += roundDraftedPicks.length;
          
          roundDraftedPicks.forEach(pick => {
            console.log('Drafted pick:', pick.person?.fullName, '-', pick.team?.name);
            draftedPicks.push({
              pickNumber: pick.pickNumber,
              playerName: pick.person?.fullName,
              team: pick.team?.name,
              school: pick.school?.name,
              position: pick.person?.primaryPosition?.name
            });
          });
        } else {
          console.log(`Round ${roundIndex} has no picks array`);
        }
      });
    } else {
      console.log('No drafts.rounds array found in response');
    }
    
    res.json({
      success: true,
      totalPicks: totalPicks,
      draftedPicks: draftedPicks.slice(0, 10), // Show first 10 picks
      responseKeys: Object.keys(data),
      fullResponse: JSON.stringify(data, null, 2).substring(0, 3000), // Show first 3000 chars
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug MLB API test failed:', error);
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to test player matching
app.get('/api/debug-matching', async (req, res) => {
  try {
    console.log('Debug matching test triggered...');
    
    // Fetch current data
    const [sheetPlayers, mlbPicks] = await Promise.all([
      fetchPlayersFromSheet(),
      scrapeMLBDraftPicks()
    ]);
    
    // Test matching logic
    const updatedPlayers = updatePlayerDraftStatus(sheetPlayers, mlbPicks);
    const draftedPlayers = updatedPlayers.filter(p => p.isDrafted);
    
    res.json({
      success: true,
      totalPlayers: sheetPlayers.length,
      totalPicks: mlbPicks.length,
      draftedPlayers: draftedPlayers.length,
      samplePicks: mlbPicks.slice(0, 5),
      samplePlayers: sheetPlayers.slice(0, 5),
      draftedPlayerNames: draftedPlayers.map(p => p.Name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug matching test failed:', error);
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/frontend/index.html');
});

server.listen(PORT, () => {
  console.log(`MLB Draft Tracker server running on port ${PORT}`);
  console.log(`Draft starts: ${DRAFT_START_TIME.toLocaleString()}`);
  console.log(`Draft ends: ${DRAFT_END_TIME.toLocaleString()}`);
}); 