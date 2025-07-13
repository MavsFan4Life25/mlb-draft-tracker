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
const SHEET_RANGE = process.env.SHEET_RANGE || 'Players!A1:Z1000';

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
    }
  ];
}

// Scrape MLB Draft Tracker using the new scraper
async function scrapeMLBDraftPicks() {
  try {
    console.log('Scraping MLB Draft Tracker with enhanced scraper...');
    const scraper = new MLBDraftScraper();
    const picks = await scraper.scrapeDraftData();
    
    // Convert to the format expected by the rest of the application
    const formattedPicks = picks.map(pick => ({
      pickNumber: pick.pickNumber,
      playerName: pick.playerName,
      team: pick.team,
      position: pick.position,
      timestamp: pick.timestamp
    }));

    console.log(`Found ${formattedPicks.length} draft picks`);
    
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
  return players.map(player => {
    const matchingPick = picks.find(pick => {
      const pickName = pick.playerName.toLowerCase();
      const playerName = player.Name ? player.Name.toLowerCase() : '';
      const playerSchool = player.School ? player.School.toLowerCase() : '';
      
      // Try exact name match first
      if (pickName === playerName) return true;
      
      // Try partial name matches
      if (pickName.includes(playerName) || playerName.includes(pickName)) return true;
      
      // Try matching last names
      const pickLastName = pickName.split(' ').pop();
      const playerLastName = playerName.split(' ').pop();
      if (pickLastName && playerLastName && pickLastName === playerLastName) return true;
      
      // If we have school info from MLB, try matching by school too
      if (pick.school && playerSchool) {
        const pickSchool = pick.school.toLowerCase();
        if (pickSchool === playerSchool || pickSchool.includes(playerSchool) || playerSchool.includes(pickSchool)) {
          // If schools match, be more lenient with name matching
          const nameSimilarity = pickName.split(' ').some(namePart => 
            playerName.includes(namePart) || namePart.includes(playerName.split(' ')[0])
          );
          if (nameSimilarity) return true;
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
    const picks = await scraper.scrapeDraftData();
    res.json({
      success: true,
      picksFound: picks.length,
      picks: picks,
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

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/frontend/index.html');
});

server.listen(PORT, () => {
  console.log(`MLB Draft Tracker server running on port ${PORT}`);
  console.log(`Draft starts: ${DRAFT_START_TIME.toLocaleString()}`);
  console.log(`Draft ends: ${DRAFT_END_TIME.toLocaleString()}`);
}); 