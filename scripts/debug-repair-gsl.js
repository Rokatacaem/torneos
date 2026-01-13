require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const fs = require('fs');
const logFile = 'debug_repair.log';
// Clear log file
try { fs.unlinkSync(logFile); } catch (e) { }

function logToFile(msg) {
    fs.appendFileSync(logFile, msg + '\n');
    process.stdout.write(msg + '\n');
}

console.log = function (...args) {
    logToFile(args.join(' '));
};
console.error = function (...args) {
    logToFile('[ERROR] ' + args.join(' '));
};

const query = async (text, params) => {
    try {
        return await pool.query(text, params);
    } catch (error) {
        logToFile('Database query error: ' + error.message);
        throw error;
    }
};

async function checkGSLAdvancement(matchId) {
    console.log(`Checking GSL Advancement for Match ${matchId}...`);

    // 1. Get Match Info & Group Context
    // COPIED FROM gsl-logic.js (with fix)
    const matchRes = await query(`
        SELECT m.*, t.group_format, ph.type as phase_type
        FROM tournament_matches m
        JOIN tournaments t ON m.tournament_id = t.id
        JOIN tournament_phases ph ON m.phase_id = ph.id
        WHERE m.id = $1
    `, [matchId]);

    console.log(`Match Query Result Rows: ${matchRes.rowCount}`);

    if (matchRes.rowCount === 0) {
        console.log('Match not found or join failed.');
        return;
    }

    const match = matchRes.rows[0];
    console.log(`Match Found: Phase Type=${match.phase_type}, Group Format=${match.group_format}`);

    if (match.phase_type !== 'group' || match.group_format !== 'gsl') {
        console.log('Not a GSL group match. Aborting.');
        return;
    }

    const { group_id, tournament_id, phase_id } = match;

    // 2. Fetch all matches in this group
    const groupMatchesRes = await query(`
        SELECT * FROM tournament_matches 
        WHERE group_id = $1 
        ORDER BY id ASC
    `, [group_id]);

    const matches = groupMatchesRes.rows;
    console.log(`Group Matches Found: ${matches.length}`);

    // Helper to determine W/L
    const getResult = (m) => {
        if (m.status !== 'completed' || !m.winner_id) return null;
        const winner = m.winner_id;
        const loser = m.winner_id === m.player1_id ? m.player2_id : m.player1_id;
        return { winner, loser };
    };

    // CASE B: Pre-filled (5 matches exist)
    if (matches.length === 5) {
        console.log('Case B: 5 matches found.');
        const m1 = matches[0];
        const m2 = matches[1];
        const m3 = matches[2];
        const m4 = matches[3];

        console.log(`M1 Status: ${m1.status}, Winner: ${m1.winner_id}`);
        console.log(`M2 Status: ${m2.status}, Winner: ${m2.winner_id}`);

        if (m1.status === 'completed' && m2.status === 'completed') {
            const r1 = getResult(m1);
            const r2 = getResult(m2);
            console.log(`R1: Winner=${r1?.winner}, Loser=${r1?.loser}`);
            console.log(`R2: Winner=${r2?.winner}, Loser=${r2?.loser}`);

            if (!m3.player1_id || !m3.player2_id) {
                console.log(`Updating Match 3 (ID: ${m3.id})...`);
                if (r1 && r2) {
                    console.log('Update Params:', {
                        p1: r1.winner, type1: typeof r1.winner,
                        p2: r2.winner, type2: typeof r2.winner,
                        id: m3.id
                    });
                    await query(`
                        UPDATE tournament_matches 
                        SET player1_id = $1, player2_id = $2 
                        WHERE id = $3
                    `, [r1.winner, r2.winner, m3.id]);
                } else {
                    console.log('Cannot update M3: Results incomplete.');
                }
            } else {
                console.log(`Match 3 already has players: ${m3.player1_id} vs ${m3.player2_id}`);
            }

            if (!m4.player1_id || !m4.player2_id) {
                console.log(`Updating Match 4 (ID: ${m4.id})...`);
                if (r1 && r2) {
                    await query(`
                        UPDATE tournament_matches 
                        SET player1_id = $1, player2_id = $2 
                        WHERE id = $3
                    `, [r1.loser, r2.loser, m4.id]);
                } else {
                    console.log('Cannot update M4: Results incomplete.');
                }
            } else {
                console.log(`Match 4 already has players: ${m4.player1_id} vs ${m4.player2_id}`);
            }
        } else {
            console.log('M1 and M2 not both completed.');
        }
    } else {
        console.log(`Case A or other: matches length is ${matches.length}`);
    }
}

async function main() {
    console.log('--- REPAIRING ALL GSL GROUPS ---');

    // 1. Get latest tournament
    const tRes = await query(`SELECT * FROM tournaments ORDER BY id DESC LIMIT 1`);
    if (tRes.rows.length === 0) return;
    const t = tRes.rows[0];
    console.log(`Tournament: ${t.id} - ${t.name}`);

    // 2. Get all completed group matches to find groups
    const matchesRes = await query(`
        SELECT m.id, m.group_id 
        FROM tournament_matches m
        JOIN tournament_phases p ON m.phase_id = p.id
        WHERE m.tournament_id = $1 AND p.type = 'group' AND m.status = 'completed'
    `, [t.id]);

    // 3. Group by group_id
    const groupMap = new Map();
    matchesRes.rows.forEach(m => groupMap.set(m.group_id, m.id));

    console.log(`Found ${groupMap.size} groups with completed matches.`);

    // 4. Run loop
    for (const [gid, mid] of groupMap) {
        console.log(`\nProcessing Group ${gid} (Trigger Match: ${mid})...`);
        try {
            await checkGSLAdvancement(mid);
        } catch (e) {
            console.log("GRP_FAIL: " + e.message);
        }
    }

    pool.end();
}

main().catch(console.error);
