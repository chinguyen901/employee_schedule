// createTables.js
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  try {
    console.log("🧨 Xoá bảng cũ nếu tồn tại...");
    await pool.query(`
      DROP TABLE IF EXISTS 
        photo_sessions,
        work_sessions,
        break_sessions,
        distraction_sessions,
        incident_sessions,
        accounts 
      CASCADE;
    `);

    console.log("🔧 Tạo bảng mới...");
    await pool.query(`
      CREATE TABLE accounts (
        account_id     SERIAL PRIMARY KEY,
        username       VARCHAR(50) NOT NULL UNIQUE,
        password       VARCHAR(100) NOT NULL,
        employee_code  VARCHAR(20) NOT NULL UNIQUE,
        full_name      VARCHAR(100) NOT NULL,
        type           VARCHAR(20) CHECK (type IN ('seo online', 'copy writer', 'linkbuilder', 'dev')) NOT NULL,
        random_from    INT DEFAULT 300,
        random_to      INT DEFAULT 600,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE photo_sessions (
        photo_id     SERIAL PRIMARY KEY,
        account_id   INT NOT NULL REFERENCES accounts(account_id),
        hash         VARCHAR(255) NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE work_sessions (
        session_id   SERIAL PRIMARY KEY,
        account_id   INT NOT NULL REFERENCES accounts(account_id),
        status       VARCHAR(10) CHECK (status IN ('checkin', 'checkout')) NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE break_sessions (
        break_id     SERIAL PRIMARY KEY,
        account_id   INT NOT NULL REFERENCES accounts(account_id),
        status       VARCHAR(15) CHECK (status IN ('break_start', 'break_end')) NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE distraction_sessions (
        distraction_id   SERIAL PRIMARY KEY,
        account_id       INT NOT NULL REFERENCES accounts(account_id),
        status           VARCHAR(10) CHECK (status IN ('start', 'end')) NOT NULL,
        note             TEXT,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE incident_sessions (
        incident_id  SERIAL PRIMARY KEY,
        account_id   INT NOT NULL REFERENCES accounts(account_id),
        status       VARCHAR(255) NOT NULL,
        reason       TEXT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Đã tạo lại toàn bộ bảng thành công!");
  } catch (err) {
    console.error("❌ Lỗi khi tạo bảng:", err.message);
  } finally {
    await pool.end();
  }
};

createTables();
