import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET() {
    const dbUrl = process.env.DATABASE_URL;

    // Status Report
    const status = {
        hasEnvVar: !!dbUrl,
        envVarLength: dbUrl ? dbUrl.length : 0,
        envVarPreview: dbUrl ? `${dbUrl.substring(0, 15)}...` : 'N/A',
        connectionStatus: 'Pending'
    };

    if (!dbUrl) {
        status.connectionStatus = 'Failed: DATABASE_URL is missing';
        return NextResponse.json(status, { status: 500 });
    }

    // Try connection
    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        client.release();

        status.connectionStatus = 'Success';
        status.timestamp = res.rows[0].now;
        await pool.end();

        return NextResponse.json(status);
    } catch (error) {
        status.connectionStatus = 'Failed: Connection Error';
        status.error = error.message;
        status.code = error.code;
        await pool.end();

        return NextResponse.json(status, { status: 500 });
    }
}
