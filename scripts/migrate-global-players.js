const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Beginning Global Player Migration (UUID Compatible)...');
    await client.query('BEGIN');

    // 1. Ensure players table has necessary columns
    console.log('Checking/Updating players table...');
    // We know players exists and has UUID id.
    // Add current_club if missing
    await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS current_club TEXT;
        `);

    // We assume 'name' exists.

    // 2. Add player_id to tournament_players
    console.log('Adding player_id to tournament_players...');
    // Change type to UUID
    await client.query(`
            ALTER TABLE tournament_players 
            ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id);
        `);

    // 3. Migrate existing players
    console.log('Migrating distinct players...');
    const existing = await client.query(`
            SELECT DISTINCT ON (player_name) player_name, team_name 
            FROM tournament_players 
            ORDER BY player_name, id DESC
        `);

    let count = 0;
    for (const row of existing.rows) {
      // Insert into players if not exists
      // Using 'name' column
      // On conflict on 'name' (assuming unique constraint exists on name or email) 
      // Wait, does 'name' have unique constraint? 
      // Better to check existence first or use ON CONFLICT if we know the constraint name or index.
      // Let's try select first to be safe or assuming name is unique.
      // 'full_name' was UNIQUE in the old script. 'name' might not be?
      // Let's try to find by name.

      let playerId = null;
      const check = await client.query("SELECT id FROM players WHERE name = $1", [row.player_name]);

      if (check.rows.length > 0) {
        playerId = check.rows[0].id;
        // Update club optionally?
        if (row.team_name) {
          await client.query("UPDATE players SET current_club = $1 WHERE id = $2 AND current_club IS NULL", [row.team_name, playerId]);
        }
      } else {
        // Create new
        // matches existing schema: name (required?), email (nullable?)
        const res = await client.query(`
                    INSERT INTO players (name, current_club)
                    VALUES ($1, $2)
                    RETURNING id
                `, [row.player_name, row.team_name]);
        playerId = res.rows[0].id;
      }

      // Update tournament_players
      await client.query(`
                UPDATE tournament_players 
                SET player_id = $1 
                WHERE player_name = $2
            `, [playerId, row.player_name]);

      count++;
    }

    console.log(`Migrated ${count} players.`);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
