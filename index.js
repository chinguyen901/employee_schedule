// index.js

// Load các module cần thiết
const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const cors = require("cors");

// Khởi tạo Express app
const app = express();
const port = process.env.PORT || 3000;

// Cấu hình middleware
app.use(cors());
app.use(bodyParser.json());

// Thiết lập kết nối đến PostgreSQL (Railway cung cấp biến môi trường DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Railway yêu cầu SSL
});

// ========= ✅ GET: Login bằng email và password =========
app.get("/api", async (req, res) => {
  const { action, email, password } = req.query;

  if (action !== "login") {
    return res.status(400).json({ success: false, error: "Invalid GET action" });
  }

  const lowerEmail = (email || "").toLowerCase().trim();
  const trimmedPassword = (password || "").trim();

  try {
    const result = await pool.query(
      "SELECT id, name, email FROM employee WHERE LOWER(email) = $1 AND password = $2 LIMIT 1",
      [lowerEmail, trimmedPassword]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      return res.json({ success: true, ...user });
    } else {
      return res.json({ success: false, error: "Email hoặc mật khẩu không đúng" });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ========= ✅ POST: Các hành động logEvent, logSession =========
app.post("/api", async (req, res) => {
  const { action, data } = req.body;

  if (!action || !data) {
    return res.status(400).json({ success: false, error: "Thiếu 'action' hoặc 'data'" });
  }

  try {
    switch (action) {
      case "logEvent":
        await pool.query(
          `INSERT INTO events (id, session_id, event_type, event_status, source, timestamp, type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            data.id || "unknown",
            data.session_id || "no-session",
            data.event_type || "unknown",
            data.event_status || "unknown",
            data.source || "unknown",
            data.timestamp || new Date().toISOString(),
            data.type || ""
          ]
        );
        break;

      case "logSession":
        await pool.query(
          `INSERT INTO session (session_id, email, start_time, end_time, session_status, device_info)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            data.session_id || "unknown",
            data.email || "unknown",
            data.start_time || new Date().toISOString(),
            data.end_time || "",
            data.session_status || "active",
            data.device_info || ""
          ]
        );
        break;

      case "logSession_out":
        await pool.query(
          `INSERT INTO session (session_id, email, start_time, end_time, session_status, device_info)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            data.session_id || "unknown",
            data.email || "unknown",
            data.start_time || "",
            data.end_time || new Date().toISOString(),
            data.session_status || "active",
            data.device_info || ""
          ]
        );
        break;

      case "logScreenshot":
        await pool.query(
          `INSERT INTO log (id, name, hash, session_id, timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            data.id || "",
            data.name || "",
            data.hash || "",
            data.session_id || "",
            data.timestamp || new Date().toISOString()
          ]
        );
        break;

      default:
        return res.status(400).json({ success: false, error: "Invalid POST action: " + action });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
const createTables = async () => {
  try {
    console.log("🔧 Đang tạo các bảng...");
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
    console.log("✅ Tạo bảng thành công!");
  } catch (err) {
    console.error("❌ Lỗi tạo bảng:", err.message);
  }
};
createTables();
// ========= ✅ Khởi động server =========
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
