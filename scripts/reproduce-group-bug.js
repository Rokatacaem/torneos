const { createTournament, generateGroups, getTournamentPhases, deleteTournament } = require('../app/lib/tournament-actions');
const { query } = require('../app/lib/db');

async function run() {
    console.log('--- Reproduction Script: Group Generation Bug ---');

    // 1. Create Tournament
    const formData = new FormData();
    formData.append('name', 'Reproduction Tournament ' + Date.now());
    formData.append('start_date', new Date().toISOString());
    formData.append('max_players', '64');
    formData.append('group_size', '4');
    formData.append('format', 'groups');

    console.log('Creating tournament...');
    // We need to mock FormData since we are in node environment, or adjust createTournament to accept object
    // Looking at createTournament, it expects formData.get(). We can mock it.

    const mockFormData = {
        get: (key) => {
            if (key === 'name') return 'Reproduction Tournament ' + Date.now();
            if (key === 'start_date') return new Date().toISOString();
            if (key === 'max_players') return '64';
            if (key === 'group_size') return '4';
            if (key === 'format') return 'groups';
            return null;
        }
    };

    // Actually createTournament is exported as 'use server' so it expects FormData.
    // Let's manually insert for speed and to avoid mocking complexity if possible, 
    // OR just use the function if it works in this context. 
    // Since 'use server' is for Next.js, importing it directly in a node script likely works if db is set up.

    // Let's try to simulate the data insertion directly to control the state perfectly.

    const tRes = await query(`
        INSERT INTO tournaments (name, max_players, group_size, start_date)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `, ['Repro Tournament', 64, 4, new Date()]);
    const tournamentId = tRes.rows[0].id;
    console.log(`Tournament created with ID: ${tournamentId}`);

    try {
        // 2. Add 64 Active Players
        console.log('Adding 64 active players...');
        for (let i = 1; i <= 64; i++) {
            await query(`
                INSERT INTO tournament_players (tournament_id, player_name, status, ranking)
                VALUES ($1, $2, 'active', $3)
            `, [tournamentId, `Player ${i}`, i]);
        }

        // 3. Add 20 Waitlist/Inactive Players (Total 84)
        // If bug exists: 84 / 4 = 21 groups
        console.log('Adding 20 waitlist players...');
        for (let i = 65; i <= 84; i++) {
            await query(`
                INSERT INTO tournament_players (tournament_id, player_name, status, ranking)
                VALUES ($1, $2, 'waitlist', $3)
            `, [tournamentId, `Waitlist Player ${i}`, i]);
        }

        // 4. Generate Groups
        console.log('Generating groups...');
        await generateGroups(tournamentId);

        // 5. Check Group Count
        const phaseRes = await query(`SELECT id FROM tournament_phases WHERE tournament_id = $1 AND type = 'group'`, [tournamentId]);
        const phaseId = phaseRes.rows[0].id;

        const groupsRes = await query(`SELECT COUNT(*) as count FROM tournament_groups WHERE phase_id = $1`, [phaseId]);
        const groupCount = parseInt(groupsRes.rows[0].count);

        console.log(`Groups Generated: ${groupCount}`);

        if (groupCount === 21) {
            console.error('FAIL: Generated 21 groups (included waitlist/inactive players).');
        } else if (groupCount === 16) {
            console.log('SUCCESS: Generated 16 groups (correctly filtered active players).');
        } else {
            console.log(`WARNING: Generated ${groupCount} groups (unexpected).`);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await deleteTournament(tournamentId);
    }
}

run();
