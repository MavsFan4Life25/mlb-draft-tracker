# MLB Draft Tracker - Google Sheets Setup

This guide will help you set up Google Sheets integration to automatically populate draft data from MLB.com.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "MLB Draft Tracker 2025"
4. Create two sheets:
   - **Sheet1**: For your Georgia Bulldogs players (existing)
   - **Draft Picks**: For scraped MLB draft data (new)

## Step 2: Set up the Draft Picks Sheet

In the "Draft Picks" sheet, set up these columns in row 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Pick Number | Player Name | Position | School | Team | Timestamp |

## Step 3: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 4: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in:
   - Service account name: "mlb-draft-scraper"
   - Description: "Service account for MLB draft data scraping"
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

## Step 5: Generate JSON Key

1. Click on your new service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON"
5. Download the JSON file
6. **Keep this file secure - it contains sensitive credentials**

## Step 6: Share Google Sheet

1. Open your Google Sheet
2. Click "Share" button
3. Add your service account email (found in the JSON file)
4. Give it "Editor" permissions
5. Click "Send"

## Step 7: Environment Variables

Add these to your `.env` file:

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...}
SPREADSHEET_ID=your-spreadsheet-id-here
```

**Important**: The `GOOGLE_CREDENTIALS` should be the entire JSON content from your service account key file, all on one line.

## Step 8: Test the Integration

Run the test script:

```bash
node test-scraper.js
```

## Step 9: Integration with Your App

The scraper is already integrated into your `server.js`. It will:

1. Scrape MLB.com every 30 seconds during draft time
2. Update the "Draft Picks" sheet automatically
3. Match drafted players with your Georgia Bulldogs list
4. Update the UI in real-time

## Troubleshooting

### Common Issues:

1. **"Invalid credentials" error**
   - Check that the JSON credentials are properly formatted
   - Ensure the service account has access to the sheet

2. **"Permission denied" error**
   - Make sure you shared the sheet with the service account email
   - Verify the service account has "Editor" permissions

3. **"API not enabled" error**
   - Enable Google Sheets API in Google Cloud Console

4. **No data being scraped**
   - The draft may not have started yet
   - MLB.com structure may have changed
   - Check the console logs for errors

### Manual Testing:

You can test the scraper independently:

```bash
node mlb-scraper.js
```

This will scrape the data and attempt to update your Google Sheet if credentials are configured.

## Data Format

The scraper will populate the "Draft Picks" sheet with:

- **Pick Number**: The draft pick number (1, 2, 3, etc.)
- **Player Name**: Full name of the drafted player
- **Position**: Player's position (OF, P, C, etc.)
- **School**: Player's college/university
- **Team**: MLB team that drafted them (or "TBD" if not yet assigned)
- **Timestamp**: When the pick was recorded

## Real-time Updates

During the draft (July 13-15, 2025), the system will:

1. Check MLB.com every 30 seconds
2. Extract new draft picks
3. Update your Google Sheet automatically
4. Send real-time updates to your web app
5. Highlight Georgia Bulldogs players when they're drafted

## Security Notes

- Keep your service account JSON file secure
- Don't commit credentials to version control
- Use environment variables for sensitive data
- Regularly rotate service account keys 