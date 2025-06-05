// createTables.js

const { Pool } = require("pg");

// Kết nối đến Railway PostgreSQL qua DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  try {
    console.log("Đang tạo các bảng...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT,
        session_id TEXT,
        event_type TEXT,
        event_status TEXT,
        source TEXT,
        timestamp TIMESTAMP,
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS session (
        session_id TEXT,
        email TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        session_status TEXT,
        device_info TEXT
      );

      CREATE TABLE IF NOT EXISTS log (
        id TEXT,
        name TEXT,
        hash TEXT,
        session_id TEXT,
        timestamp TIMESTAMP
      );
    `);

    console.log("✅ Đã tạo các bảng thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi tạo bảng:", error.message);
  } finally {
    await pool.end();
  }
};

createTables();
