const axios = require('axios');

async function testMLBAPI() {
  try {
    console.log('Testing MLB StatsAPI directly...');
    
    const response = await axios.get('https://statsapi.mlb.com/api/v1/draft/2025', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data keys:', Object.keys(response.data));
    
    const data = response.data;
    
    if (data.drafts && Array.isArray(data.drafts)) {
      console.log('Number of drafts:', data.drafts.length);
      
      data.drafts.forEach((draft, index) => {
        console.log(`Draft ${index} keys:`, Object.keys(draft));
        
        if (draft.rounds && Array.isArray(draft.rounds)) {
          console.log(`Draft ${index} has ${draft.rounds.length} rounds`);
          
          draft.rounds.forEach((round, roundIndex) => {
            console.log(`Round ${roundIndex} keys:`, Object.keys(round));
            
            if (round.picks && Array.isArray(round.picks)) {
              console.log(`Round ${roundIndex} has ${round.picks.length} picks`);
              
              const draftedPicks = round.picks.filter(pick => pick.isDrafted);
              console.log(`Round ${roundIndex} has ${draftedPicks.length} drafted picks`);
              
              draftedPicks.forEach((pick, pickIndex) => {
                console.log(`Pick ${pickIndex + 1}: ${pick.person?.fullName} - ${pick.team?.name} (${pick.pickNumber})`);
              });
            }
          });
        }
      });
    } else {
      console.log('No drafts found in response');
      console.log('Full response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
    }
    
  } catch (error) {
    console.error('Error testing MLB API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testMLBAPI(); 