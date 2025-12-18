const fs = require('fs');

async function fetchRankingData() {
    try {
        console.log('Fetching ranking data from API...');
        const res = await fetch('http://45.7.228.40:8090/billar/admin/Controlador?accion=FINDRANKING', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded' // Typically for these older servlet backends
            }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        console.log('Fetched records:', json.data ? json.data.length : 'Unknown');
        fs.writeFileSync('ranking_data.json', JSON.stringify(json, null, 2));
        console.log('Saved to ranking_data.json');

    } catch (e) {
        console.error(e);
    }
}

fetchRankingData();
