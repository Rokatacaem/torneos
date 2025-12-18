const fs = require('fs');

async function fetchRanking() {
    try {
        const res = await fetch('http://45.7.228.40:8090/billar/ranking.html');
        const text = await res.text();
        console.log('Fetched bytes:', text.length);
        fs.writeFileSync('ranking_dump.html', text);
    } catch (e) {
        console.error(e);
    }
}

fetchRanking();
