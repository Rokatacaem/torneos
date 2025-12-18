const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Adding identification column to players table...');

        // Add identification column if it doesn't exist
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='identification') THEN 
          ALTER TABLE players ADD COLUMN identification TEXT;
          CREATE INDEX idx_players_identification ON players(identification);
          RAISE NOTICE 'Added identification column';
        END IF;
      END $$;
    `);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
