const axios = require('axios');
const cheerio = require('cheerio');

async function testInitData() {
  try {
    console.log('Testing window.INIT_DATA extraction...');
    
    const response = await axios.get('https://www.mlb.com/draft/tracker', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // Look for window.INIT_DATA script
    $('script').each((index, element) => {
      const scriptContent = $(element).html();
      if (scriptContent && scriptContent.includes('window.INIT_DATA')) {
        console.log(`Found window.INIT_DATA in script ${index}`);
        console.log('Script content length:', scriptContent.length);
        
        // Find the start of window.INIT_DATA
        const initDataStart = scriptContent.indexOf('window.INIT_DATA');
        if (initDataStart !== -1) {
          console.log('Found window.INIT_DATA at position:', initDataStart);
          
          // Find the assignment operator
          const assignmentStart = scriptContent.indexOf('=', initDataStart);
          if (assignmentStart !== -1) {
            console.log('Found assignment at position:', assignmentStart);
            
            // Find the opening quote
            const quoteStart = scriptContent.indexOf('"', assignmentStart);
            if (quoteStart !== -1) {
              console.log('Found opening quote at position:', quoteStart);
              
              // Now we need to find the closing quote, but we need to handle escaped quotes
              let quoteEnd = quoteStart + 1;
              let braceCount = 0;
              let inString = true;
              
              while (quoteEnd < scriptContent.length && inString) {
                const char = scriptContent[quoteEnd];
                const nextChar = scriptContent[quoteEnd + 1];
                
                if (char === '\\' && nextChar === '"') {
                  // Escaped quote, skip both characters
                  quoteEnd += 2;
                } else if (char === '"') {
                  // Found closing quote
                  inString = false;
                } else {
                  quoteEnd++;
                }
              }
              
              if (!inString) {
                console.log('Found closing quote at position:', quoteEnd);
                const jsonString = scriptContent.substring(quoteStart + 1, quoteEnd);
                console.log('Extracted JSON string length:', jsonString.length);
                console.log('First 500 chars:', jsonString.substring(0, 500));
                console.log('Last 500 chars:', jsonString.substring(jsonString.length - 500));
                
                try {
                  // Unescape the string
                  let unescapedString = jsonString.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                  const data = JSON.parse(unescapedString);
                  
                  console.log('Successfully parsed JSON!');
                  console.log('Data keys:', Object.keys(data));
                  
                  // Look for draft-related data
                  if (data.draftGroups) {
                    console.log('Found draftGroups:', data.draftGroups.length);
                    data.draftGroups.forEach((group, index) => {
                      console.log(`Group ${index}:`, Object.keys(group));
                      if (group.picks) {
                        console.log(`  Picks in group ${index}:`, group.picks.length);
                        if (group.picks.length > 0) {
                          console.log('  Sample pick:', group.picks[0]);
                        }
                      }
                    });
                  }
                  
                  if (data.picks) {
                    console.log('Found picks array:', data.picks.length);
                    if (data.picks.length > 0) {
                      console.log('Sample pick:', data.picks[0]);
                    }
                  }
                  
                  // Save the full data to a file for inspection
                  const fs = require('fs');
                  fs.writeFileSync('init-data-full.json', JSON.stringify(data, null, 2));
                  console.log('Full data saved to init-data-full.json');
                  
                  return data;
                } catch (parseError) {
                  console.error('Failed to parse JSON:', parseError.message);
                  console.log('Error position:', parseError.message.match(/position (\d+)/)?.[1]);
                  
                  // Save the raw string for debugging
                  const fs = require('fs');
                  fs.writeFileSync('init-data-raw.txt', jsonString);
                  console.log('Raw data saved to init-data-raw.txt');
                }
              } else {
                console.log('Could not find closing quote - data might be truncated');
              }
            }
          }
        }
      }
    });
    
    console.log('No window.INIT_DATA found or could not be parsed');
    
  } catch (error) {
    console.error('Error testing INIT_DATA:', error.message);
  }
}

testInitData(); 