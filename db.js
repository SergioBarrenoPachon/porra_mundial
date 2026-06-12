const { Pool } = require('pg');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');
let pool = null;

// Determine if we should use PostgreSQL
const usePostgres = !!process.env.DATABASE_URL;

if (usePostgres) {
  console.log('🔌 [DB] Database URL detected. Configuring PostgreSQL connection pool...');
  // Configure SSL only for non-local PostgreSQL instances (e.g. Render)
  const isLocalDb = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalDb ? false : { rejectUnauthorized: false }
  });
} else {
  console.log('📁 [DB] No DATABASE_URL environment variable found. Falling back to local data.json storage.');
}

/**
 * Initialize the database (tables and seeding)
 */
async function initDb() {
  if (usePostgres) {
    try {
      console.log('⚙️ [DB] Initializing PostgreSQL schema...');
      // Create schema table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS porra_store (
          key VARCHAR(50) PRIMARY KEY,
          data JSONB NOT NULL
        );
      `);

      // Check if data is already seeded
      const res = await pool.query("SELECT data FROM porra_store WHERE key = 'database'");
      if (res.rows.length === 0) {
        console.log('🌱 [DB] PostgreSQL database is empty. Attempting to seed with local data.json template...');
        
        let initialData = { config: {}, users: [], predictions: {}, matches: [], rankingHistory: [] };
        
        if (fsSync.existsSync(DB_FILE)) {
          try {
            const fileContent = await fs.readFile(DB_FILE, 'utf8');
            initialData = JSON.parse(fileContent);
            console.log(`✅ [DB] Loaded seed data from data.json (${initialData.users?.length || 0} users, ${initialData.matches?.length || 0} matches).`);
          } catch (fileErr) {
            console.error('⚠️ [DB] Could not parse local data.json for seeding. Using defaults.', fileErr);
          }
        } else {
          console.warn('⚠️ [DB] data.json not found for seeding. Creating empty default structure.');
        }

        // Apply defaults if necessary
        ensureDefaults(initialData);

        await pool.query(
          "INSERT INTO porra_store (key, data) VALUES ('database', $1) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data",
          [JSON.stringify(initialData)]
        );
        console.log('🌱 [DB] PostgreSQL database seeded successfully!');
      } else {
        console.log('✅ [DB] PostgreSQL database is already initialized and seeded.');
      }
    } catch (err) {
      console.error('❌ [DB] Error initializing PostgreSQL database:', err);
      throw err;
    }
  } else {
    // Local JSON setup: Ensure data.json file exists and is populated
    try {
      if (!fsSync.existsSync(DB_FILE)) {
        console.warn('⚠️ [DB] Local data.json file does not exist. Creating empty default structure.');
        const defaultData = { config: {}, users: [], predictions: {}, matches: [], rankingHistory: [] };
        ensureDefaults(defaultData);
        await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
      } else {
        // Just make sure it can be parsed and defaults exist
        try {
          const content = await fs.readFile(DB_FILE, 'utf8');
          const data = JSON.parse(content);
          if (ensureDefaults(data)) {
            // If defaults were applied, save it back
            await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
          }
          console.log('✅ [DB] Local data.json parsed and verified.');
        } catch (e) {
          console.error('❌ [DB] Local data.json is corrupt. Backing up and resetting.', e);
          if (fsSync.existsSync(DB_FILE)) {
            await fs.rename(DB_FILE, DB_FILE + '.corrupt.' + Date.now());
          }
          const defaultData = { config: {}, users: [], predictions: {}, matches: [], rankingHistory: [] };
          ensureDefaults(defaultData);
          await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
        }
      }
    } catch (err) {
      console.error('❌ [DB] Error initializing local database file:', err);
    }
  }
}

/**
 * Ensure default database structure and values exist to prevent API crashes
 * Returns true if modifications were made.
 */
function ensureDefaults(data) {
  let modified = false;

  if (!data.config) {
    data.config = {};
    modified = true;
  }
  
  if (!data.config.points) {
    data.config.points = {
      outcome: 1,
      exact: 3,
      balon_oro: 10,
      balon_plata: 5,
      balon_bronce: 3,
      bota_oro: 10,
      bota_plata: 5,
      bota_bronce: 3
    };
    modified = true;
  }

  if (!data.config.winners) {
    data.config.winners = {
      balon_oro: "",
      balon_plata: "",
      balon_bronce: "",
      bota_oro: "",
      bota_plata: "",
      bota_bronce: ""
    };
    modified = true;
  }

  if (!data.users) {
    data.users = [];
    modified = true;
  }

  if (!data.predictions) {
    data.predictions = {};
    modified = true;
  }

  if (!data.matches) {
    data.matches = [];
    modified = true;
  }

  if (!data.rankingHistory) {
    data.rankingHistory = [];
    modified = true;
  }

  return modified;
}

/**
 * Read the complete database state
 */
async function readDb() {
  if (usePostgres) {
    try {
      const res = await pool.query("SELECT data FROM porra_store WHERE key = 'database'");
      if (res.rows.length === 0) {
        throw new Error('Database record not found in PostgreSQL store');
      }
      const data = res.rows[0].data;
      ensureDefaults(data);
      return data;
    } catch (err) {
      console.error('❌ [DB] Error reading from PostgreSQL database:', err);
      // Return basic fallback structure to prevent complete crash
      const fallback = { config: {}, users: [], predictions: {}, matches: [], rankingHistory: [] };
      ensureDefaults(fallback);
      return fallback;
    }
  } else {
    try {
      const dataStr = await fs.readFile(DB_FILE, 'utf8');
      const data = JSON.parse(dataStr);
      ensureDefaults(data);
      return data;
    } catch (err) {
      console.error('❌ [DB] Error reading from local database file:', err);
      const fallback = { config: {}, users: [], predictions: {}, matches: [], rankingHistory: [] };
      ensureDefaults(fallback);
      return fallback;
    }
  }
}

/**
 * Write the complete database state
 */
async function writeDb(data) {
  ensureDefaults(data);
  if (usePostgres) {
    try {
      await pool.query(
        "INSERT INTO porra_store (key, data) VALUES ('database', $1) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data",
        [JSON.stringify(data)]
      );
    } catch (err) {
      console.error('❌ [DB] Error writing to PostgreSQL database:', err);
      throw err;
    }
  } else {
    try {
      // Write using atomic write logic via temp file
      const tempFile = DB_FILE + '.tmp';
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tempFile, DB_FILE);
    } catch (err) {
      console.error('❌ [DB] Error writing to local database file:', err);
      throw err;
    }
  }
}

module.exports = {
  initDb,
  readDb,
  writeDb,
  isPostgres: usePostgres
};
