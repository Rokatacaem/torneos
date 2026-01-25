export async function getPlayerFullHistory(playerId) {
    if (!playerId) return null;

    try {
        // 1. Get Tournament History
        const tournamentsRes = await query(`
            SELECT 
                t.id, 
                t.name, 
                t.start_date, 
                tp.ranking as initial_ranking,
                tp.final_position,
                tp.average,
                tp.status
            FROM tournament_players tp
            JOIN tournaments t ON tp.tournament_id = t.id
            WHERE tp.player_id = $1
            ORDER BY t.start_date DESC
        `, [playerId]);

        // 2. Get Match History
        // We need matches where player was either player1 or player2
        const matchesRes = await query(`
            SELECT 
                m.id,
                m.tournament_id,
                t.name as tournament_name,
                t.start_date,
                m.round_label,
                m.instance_stage,
                
                m.player1_id,
                p1.name as player1_name,
                m.score_p1,
                
                m.player2_id,
                p2.name as player2_name,
                m.score_p2,
                
                m.innings,
                m.winner_id,
                m.status
            FROM tournament_matches m
            JOIN tournaments t ON m.tournament_id = t.id
            LEFT JOIN players p1 ON m.player1_id = p1.id
            LEFT JOIN players p2 ON m.player2_id = p2.id
            WHERE (m.player1_id = $1 OR m.player2_id = $1)
            AND m.status = 'completed'
            ORDER BY t.start_date DESC, m.id DESC
        `, [playerId]);

        return {
            tournaments: tournamentsRes.rows,
            matches: matchesRes.rows
        };

    } catch (e) {
        console.error('Error fetching player history:', e);
        return null;
    }
}
