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

    return <MatchControlClient initialMatch={match} />;
}
