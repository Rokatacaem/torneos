
import { getTournament, getTournamentPlayers, getMatches } from '@/app/lib/tournament-actions';
import ManageClient from './ManageClient';

export default async function ManageTournamentPage({ params }) {
    // In Next.js 15, params might be an async prop, but typically in 14 it's direct.
    // However, to be safe and future proof or fix "async" issues:
    // If we treat it as sync for now, or await it if it's a promise.
    const { id } = await params; // Awaiting params is the modern way if it is a promise.

    const tournament = await getTournament(id);
    const players = await getTournamentPlayers(id);
    const matches = await getMatches(id);

    // Group Logic reconstruction
    const groupsMap = {};
    matches.forEach(m => {
        if (m.group_name) {
            if (!groupsMap[m.group_name]) groupsMap[m.group_name] = new Set();
            if (m.player1_id) groupsMap[m.group_name].add(m.player1_id);
            if (m.player2_id) groupsMap[m.group_name].add(m.player2_id);
        }
    });

    // Map Player IDs to Objects
    const playerMap = {};
    players.forEach(p => playerMap[p.id] = p);

    const groups = Object.entries(groupsMap).map(([name, pIds]) => ({
        name,
        players: Array.from(pIds).map(pid => playerMap[pid]).filter(Boolean)
    }));

    // Waitlist
    const waitlist = players.filter(p => p.status === 'waitlist');

    return <ManageClient tournament={tournament} groups={groups} waitlist={waitlist} />;
}
