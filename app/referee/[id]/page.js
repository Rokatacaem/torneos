import { query } from '@/app/lib/db';
import MatchControlClient from '@/app/components/referee/MatchControlClient';

export default async function RefereeMatchPage({ params }) {
    const { id } = await params;

    const res = await query(`
        SELECT m.*, 
               p1.player_name as player1_name, 
               p2.player_name as player2_name,
               t.shot_clock_seconds as config_shot_clock,
               t.group_points_limit as config_group_points,
               t.group_innings_limit as config_group_innings,
               t.playoff_points_limit as config_playoff_points,
               t.playoff_innings_limit as config_playoff_innings,
               t.semifinal_points_limit as config_semifinal_points,
               t.semifinal_innings_limit as config_semifinal_innings,
               t.final_points_limit as config_final_points,
               t.final_innings_limit as config_final_innings,
               t.playoff_target_size as config_target_size,
               t.use_handicap,
               p1.handicap as player1_handicap,
               p2.handicap as player2_handicap,
               ph.type as phase_type,
               ph.name as phase_name
        FROM tournament_matches m
        JOIN tournaments t ON m.tournament_id = t.id
        JOIN tournament_phases ph ON m.phase_id = ph.id
        LEFT JOIN tournament_players p1 ON m.player1_id = p1.id
        LEFT JOIN tournament_players p2 ON m.player2_id = p2.id
        WHERE m.id = $1
    `, [id]);

    const match = res.rows[0];

    if (!match) return <div className="text-white p-10">Partido no encontrado</div>;

    // --- Calculate Effective Limits ---
    let calculated_points_limit = null;
    let calculated_innings_limit = null;

    if (match.phase_type === 'group') {
        calculated_points_limit = match.config_group_points || 30;
        calculated_innings_limit = match.config_group_innings || 20;
    } else {
        // Elimination Phase (Semis, Finals, etc)
        const targetSize = match.config_target_size || 16;
        const totalRounds = Math.ceil(Math.log2(targetSize)); // e.g. 16 -> 4 rounds (16, 8, 4, 2)
        const currentRound = match.round_number || 1; // Default to 1 if missing

        const isFinal = currentRound === totalRounds;
        const isSemi = currentRound === totalRounds - 1;

        if (isFinal) {
            calculated_points_limit = match.config_final_points || match.config_playoff_points || 40;
            calculated_innings_limit = match.config_final_innings || match.config_playoff_innings || 30;
        } else if (isSemi) {
            calculated_points_limit = match.config_semifinal_points || match.config_playoff_points || 40;
            calculated_innings_limit = match.config_semifinal_innings || match.config_playoff_innings || 30;
        } else {
            // Standard Playoff Round
            calculated_points_limit = match.config_playoff_points || 40;
            calculated_innings_limit = match.config_playoff_innings || 30;
        }
    }

    // Attach calculated values to match object for client
    match.calculated_innings_limit = calculated_innings_limit;
    match.calculated_points_limit = calculated_points_limit;

    return <MatchControlClient initialMatch={match} />;
}
