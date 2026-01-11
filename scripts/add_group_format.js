require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function main() {
    try {
        await query("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS group_format VARCHAR(50) DEFAULT 'round_robin';");
        console.log("Column 'group_format' added successfully.");
    } catch (e) {
        console.error("Error adding column:", e);
    }
}

main();
