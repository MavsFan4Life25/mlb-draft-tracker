const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
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
const SHEET_ID = process.env.SPREADSHEET_ID || '1XS51hUBt5rUoCJGZCgQhnzUCvLN3zDczwNC0yV4hz9I';
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A1:Z1000';
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
    if (!data || data.length === 0) {
      console.log('No data found in sheet');
      return [];
    }

    // Convert to objects using header row
    const [header, ...rows] = data;
    return rows.map(row => {
      const player = {};
      header.forEach((key, index) => {
        player[key] = row[index] || '';
      });
      return player;
    });
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return [];
  }
}

// Scrape MLB Draft Tracker
async function scrapeMLBDraftPicks() {
  try {
    console.log('Scraping MLB Draft Tracker...');
    const response = await axios.get(MLB_DRAFT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const picks = [];

    // Try multiple selectors to find draft picks
    const selectors = [
      '.draft-pick',
      '.pick-item',
      '[data-testid*="pick"]',
      '.draft-tracker-pick',
      '.mlb-draft-pick',
      '.pick',
      '.round-pick'
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        const $el = $(element);
        const pickNumber = $el.find('.pick-number, .round-pick, .pick-num').text().trim();
        const playerName = $el.find('.player-name, .name, .player').text().trim();
        const team = $el.find('.team-name, .franchise, .team').text().trim();
        const position = $el.find('.position, .pos').text().trim();

        if (playerName && playerName !== 'TBD' && playerName !== 'To be determined') {
          picks.push({
            pickNumber: pickNumber || `Pick ${picks.length + 1}`,
            playerName: playerName,
            team: team || 'Unknown',
            position: position || 'Unknown',
            timestamp: new Date().toISOString()
          });
        }
      });

      if (picks.length > 0) break;
    }

    // If no picks found, try alternative approach
    if (picks.length === 0) {
      console.log('No picks found with standard selectors, trying alternative approach...');
      $('body').find('*').each((index, element) => {
        const text = $(element).text().trim();
        if (text.includes('Round') && text.includes('Pick') && text.length < 200) {
          picks.push({
            pickNumber: text,
            playerName: 'To be determined',
            team: 'Unknown',
            position: 'Unknown',
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    console.log(`Found ${picks.length} draft picks`);
    return picks;
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
      
      // Try exact match first
      if (pickName === playerName) return true;
      
      // Try partial matches
      if (pickName.includes(playerName) || playerName.includes(pickName)) return true;
      
      // Try matching last names
      const pickLastName = pickName.split(' ').pop();
      const playerLastName = playerName.split(' ').pop();
      if (pickLastName && playerLastName && pickLastName === playerLastName) return true;
      
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
const DRAFT_START_TIME = new Date('2024-07-13T18:00:00-04:00');
const DRAFT_END_TIME = new Date('2024-07-15T23:59:59-04:00');

function isDraftTime() {
  const now = new Date();
  return now >= DRAFT_START_TIME && now <= DRAFT_END_TIME;
}

// Schedule updates
cron.schedule('*/30 * * * * *', () => {
  if (isDraftTime()) {
    updateData();
  }
});

// Initial data load
updateData();

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
    </body>
    </html>
  `);
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