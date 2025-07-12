# 🔄 Update Your Existing Google Sheet with MLB Data

This script will scrape MLB.com and update your **existing** Google Sheet with the latest player information.

## 🎯 What This Does

- Reads your current Google Sheet (the one your website uses)
- Scrapes MLB.com for the latest player data
- Merges the data intelligently (keeps your existing data, adds new players)
- Updates your existing sheet with the merged data
- **Won't break your website** - it uses the same sheet format

## 🚀 Quick Start

1. **Make sure your `.env` file has your Google credentials:**
   ```env
   SPREADSHEET_ID=your_existing_sheet_id
   GOOGLE_CREDENTIALS=your_existing_credentials
   SHEET_RANGE=Sheet1!A1:Z1000
   ```

2. **Run the update script:**
   ```bash
   cd mlb-draft-tracker
   node update-existing-sheet.js
   ```

## 📊 What Happens

The script will:

1. **Read your current sheet** - Gets all your existing players
2. **Scrape MLB.com** - Looks for current player information
3. **Merge the data** - Combines both sources intelligently
4. **Update your sheet** - Writes the merged data back to your existing sheet

## 🔄 Data Merging Logic

- **Keeps your existing players** - Won't delete anyone you already have
- **Adds new players** - If MLB has players not in your sheet, they get added
- **Updates information** - If MLB has updated position/school info, it gets updated
- **Preserves your data** - Your height, weight, bats, throws data stays intact

## 📋 Example Output

```
🚀 MLB Draft Tracker - Update Existing Google Sheet
==================================================

📊 Reading current data from your Google Sheet...
📋 Found 4 players in your current sheet

📋 Current players in your sheet:
1. Charlie Condon - OF/1B - Georgia
2. Corey Collins - C - Georgia
3. Kolten Smith - RHP - Georgia
4. Fernando Gonzalez - C - Georgia

🔍 Scraping MLB Draft Tracker for current player data...
📄 Analyzing page content for player information...
✅ Found 0 players from MLB.com

📝 No new players found on MLB.com (draft may not have started yet)

🔄 Merging MLB data with your existing data...
📊 Final merged data: 4 players

🔐 Authenticating with Google...
📊 Updating your existing Google Sheet...
✅ Successfully updated your Google Sheet with 4 players

✅ Update completed successfully!
🔄 Your existing Google Sheet has been updated with the latest data
```

## 🧪 Testing

You can run this script anytime to:

- **Test the connection** to your Google Sheet
- **See what data is currently in your sheet**
- **Check if MLB.com has new information**
- **Update your sheet with any new data found**

## 🔧 Troubleshooting

### "Google credentials not found"
- Check your `.env` file has the correct variables
- Make sure the JSON credentials are all on one line

### "Permission denied"
- Verify your service account has access to the sheet
- Check the sheet is shared with the correct email

### "No data found"
- The draft may not have started yet (normal)
- MLB.com structure may have changed
- Your existing data will still be preserved

### "Error updating Google Sheet"
- Check your internet connection
- Verify your Google Cloud API is enabled
- Make sure your service account has write permissions

## 📅 When to Use

- **Before the draft** - To get the latest player information
- **During the draft** - To update with new players as they're announced
- **After the draft** - To get final draft results and team assignments

## 🎉 Benefits

- ✅ **Safe** - Won't break your existing website
- ✅ **Smart** - Preserves your existing data
- ✅ **Automatic** - Updates with latest MLB information
- ✅ **Reversible** - You can always revert if needed

## 🔒 Security

- Uses your existing Google credentials
- Only reads and writes to your own sheet
- No data is sent anywhere else
- Your existing website continues working normally

Your Georgia Bulldogs draft tracker website will continue working exactly as it does now, but with updated player information from MLB.com! 🐾 