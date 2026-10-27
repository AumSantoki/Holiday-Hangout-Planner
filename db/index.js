import pg from 'pg';
const { Pool } = pg;

// In-memory fallback storage when DATABASE_URL is not provided or fails
const memoryStore = new Map();

let pool = null;
let dbConnected = false;
let dbError = null;

export async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('[DB] No DATABASE_URL provided. Operating in in-memory fallback mode (Neon Ready).');
    return;
  }

  try {
    console.log('[DB] Connecting to Neon PostgreSQL...');
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000
    });

    // Test connection and initialize table
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS holiday_plans (
          id VARCHAR(64) PRIMARY KEY,
          country_code VARCHAR(10) NOT NULL,
          country_name VARCHAR(100) NOT NULL,
          holiday_name VARCHAR(255) NOT NULL,
          holiday_date VARCHAR(30) NOT NULL,
          activity TEXT NOT NULL,
          activity_type VARCHAR(50),
          participants INT DEFAULT 1,
          price NUMERIC(4, 2) DEFAULT 0,
          accessibility VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_holiday_plans_created_at ON holiday_plans(created_at DESC);
      `);
      dbConnected = true;
      dbError = null;
      console.log('[DB] Successfully connected to Neon PostgreSQL and verified holiday_plans schema.');
    } finally {
      client.release();
    }
  } catch (err) {
    dbConnected = false;
    dbError = err.message;
    console.warn('[DB] Failed to connect to Neon PostgreSQL, continuing with in-memory fallback:', err.message);
  }
}

export async function savePlan(plan) {
  const {
    id,
    countryCode,
    countryName,
    holidayName,
    holidayDate,
    activity,
    activityType,
    participants,
    price,
    accessibility,
    notes
  } = plan;

  const now = new Date().toISOString();
  const planRecord = {
    id,
    countryCode,
    countryName,
    holidayName,
    holidayDate,
    activity,
    activityType: activityType || 'social',
    participants: participants || 1,
    price: price || 0,
    accessibility: accessibility || 'Unknown',
    notes: notes || '',
    createdAt: now
  };

  // Always store in memory store as fast buffer / fallback
  memoryStore.set(id, planRecord);

  if (dbConnected && pool) {
    try {
      const query = `
        INSERT INTO holiday_plans (
          id, country_code, country_name, holiday_name, holiday_date,
          activity, activity_type, participants, price, accessibility, notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          activity = EXCLUDED.activity,
          notes = EXCLUDED.notes
        RETURNING *;
      `;
      const values = [
        id,
        countryCode,
        countryName,
        holidayName,
        holidayDate,
        activity,
        activityType || 'social',
        participants || 1,
        price || 0,
        accessibility || 'Unknown',
        notes || ''
      ];
      const res = await pool.query(query, values);
      return res.rows[0];
    } catch (err) {
      console.error('[DB] Error saving plan to PostgreSQL:', err.message);
    }
  }

  return planRecord;
}

export async function getPlanById(id) {
  if (dbConnected && pool) {
    try {
      const res = await pool.query('SELECT * FROM holiday_plans WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          countryCode: row.country_code,
          countryName: row.country_name,
          holidayName: row.holiday_name,
          holidayDate: row.holiday_date,
          activity: row.activity,
          activityType: row.activity_type,
          participants: row.participants,
          price: parseFloat(row.price || 0),
          accessibility: row.accessibility,
          notes: row.notes,
          createdAt: row.created_at
        };
      }
    } catch (err) {
      console.error('[DB] Error querying plan by id:', err.message);
    }
  }

  return memoryStore.get(id) || null;
}

export async function getRecentPlans(limit = 10) {
  if (dbConnected && pool) {
    try {
      const res = await pool.query(
        'SELECT * FROM holiday_plans ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return res.rows.map(row => ({
        id: row.id,
        countryCode: row.country_code,
        countryName: row.country_name,
        holidayName: row.holiday_name,
        holidayDate: row.holiday_date,
        activity: row.activity,
        activityType: row.activity_type,
        participants: row.participants,
        price: parseFloat(row.price || 0),
        accessibility: row.accessibility,
        notes: row.notes,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('[DB] Error fetching recent plans:', err.message);
    }
  }

  // Fallback to memory store values
  const plans = Array.from(memoryStore.values());
  plans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return plans.slice(0, limit);
}

export function getDbStatus() {
  return {
    isConfigured: Boolean(process.env.DATABASE_URL),
    isConnected: dbConnected,
    provider: dbConnected ? 'Neon PostgreSQL' : (process.env.DATABASE_URL ? 'Neon (Connection Issue)' : 'In-Memory (Neon Ready)'),
    error: dbError,
    cachedPlansCount: memoryStore.size
  };
}
