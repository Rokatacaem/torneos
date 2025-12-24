require('dotenv').config({ path: '.env.local' });
const { getTournament } = require('../app/lib/tournament-actions');

(async () => {
    try {
        console.log("Testing getTournament(24)...");
        const t = await getTournament(24); // Assuming 24 is the ID from screenshot
        console.log("Result:", t);
    } catch (e) {
        console.error("FATAL ERROR in getTournament:", e);
    }
})();
