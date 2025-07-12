# 🚀 MLB Draft Scraper - Google Sheets Setup Guide

This guide will help you set up automatic Google Sheets updates for MLB draft data **without affecting your existing website**.

## 📋 What This Does

- Scrapes MLB.com draft tracker for real-time draft picks
- Updates a Google Sheet with the latest draft data
- Runs independently from your existing web app
- Won't break anything you already have working

## 🛠️ Setup Steps

### Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet called "MLB Draft Data 2025"
3. Create a sheet called "Draft Picks"
4. Add these headers in row 1:
   ```
   A: Pick Number | B: Player Name | C: Position | D: School | E: Team | F: Timestamp
   ```

### Step 2: Get Your Google Sheet ID

1. Open your Google Sheet
2. Copy the ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   ```
3. Save this ID - you'll need it later

### Step 3: Set Up Google Cloud (One Time)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search "Google Sheets API"
   - Click "Enable"

### Step 4: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Name it "mlb-draft-scraper"
4. Click "Create and Continue" (skip role assignment)
5. Click "Done"

### Step 5: Get Your Credentials

1. Click on your service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key" > "JSON"
4. Download the JSON file
5. **Keep this file secure!**

### Step 6: Share Your Google Sheet

1. Open your Google Sheet
2. Click "Share"
3. Add your service account email (from the JSON file)
4. Give it "Editor" permissions
5. Click "Send"

### Step 7: Set Up Environment Variables

Create or update your `.env` file in the `mlb-draft-tracker` folder:

```env
# Your existing variables (don't change these)
SPREADSHEET_ID=your_existing_sheet_id
GOOGLE_CREDENTIALS=your_existing_credentials

# New variables for draft data
DRAFT_SHEET_ID=your_new_draft_sheet_id
DRAFT_GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...}
```

**Important**: Copy the entire JSON content from your service account file into `DRAFT_GOOGLE_CREDENTIALS` (all on one line).

## 🧪 Testing the Setup

Run the standalone scraper:

```bash
cd mlb-draft-tracker
node standalone-sheets-updater.js
```

You should see output like:
```
🚀 MLB Draft Scraper - Standalone Google Sheets Updater
=====================================================
🔍 Scraping MLB Draft Tracker...
📄 Analyzing page content...
✅ Found 0 draft picks

📝 No real draft data found (draft may not have started yet)
🧪 Using sample data for testing...

📋 Sample data:
1. Pick 1: Charlie Condon - OF/1B - Georgia
2. Pick 2: Travis Bazzana - 2B - Oregon State
3. Pick 3: Braden Montgomery - OF/RHP - Texas A&M

🔐 Authenticating with Google...
📊 Updating Google Sheet...
✅ Successfully updated Google Sheet with 3 draft picks

✅ Script completed successfully!
```

## 📅 During the Draft

When the MLB draft starts (July 13-15, 2025), you can:

1. **Run manually**: `node standalone-sheets-updater.js`
2. **Set up automatic updates**: Create a simple script to run every few minutes
3. **Check your Google Sheet**: It will automatically populate with real draft data

## 🔧 Troubleshooting

### "Credentials not found"
- Check your `.env` file has the correct variables
- Make sure the JSON credentials are all on one line

### "Permission denied"
- Verify you shared the sheet with the service account email
- Check the service account has "Editor" permissions

### "No data found"
- The draft hasn't started yet (normal)
- MLB.com structure may have changed
- Check the console output for errors

### "API not enabled"
- Enable Google Sheets API in Google Cloud Console

## 🎯 What You Get

Your Google Sheet will be automatically populated with:

| Pick Number | Player Name | Position | School | Team | Timestamp |
|-------------|-------------|----------|--------|------|-----------|
| 1 | Charlie Condon | OF/1B | Georgia | TBD | 2025-07-13T18:00:00Z |
| 2 | Travis Bazzana | 2B | Oregon State | TBD | 2025-07-13T18:05:00Z |

## 🔒 Security Notes

- Keep your service account JSON file secure
- Don't commit credentials to GitHub
- Use environment variables for sensitive data
- The standalone script won't affect your existing web app

## 📞 Need Help?

If something doesn't work:
1. Check the console output for error messages
2. Verify your Google Cloud setup
3. Make sure your Google Sheet is shared correctly
4. Test with the sample data first

Your existing website will continue working exactly as it does now! 🎉 