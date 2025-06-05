// index.js

// Load các module cần thiết
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const cors = require("cors");

// Khởi tạo Express app
const app = express();

// Cấu hình middleware
app.use(cors());
app.use(bodyParser.json());

// Thiết lập kết nối đến PostgreSQL (Railway cung cấp biến môi trường DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Railway yêu cầu SSL
});

// ========= ✅ POST: Các hành động Login logEvent, logSession =========
const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }
    if (req.method === "POST" && req.url === "/login") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
        try {
            const { email, password } = JSON.parse(body);
            const result = await pool.query(
            "SELECT id, name, email FROM employee WHERE LOWER(email) = $1 AND password = $2 LIMIT 1",
            [email.toLowerCase().trim(), password.trim()]
            );

            if (result.rows.length > 0) {
            const user = result.rows[0];
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ success: true, ...user }));
            } else {
            res.writeHead(401, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ success: false, error: "Invalid credentials" }));
            }
        } catch (err) {
            console.error("❌ Login error:", err.message);
            res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify({ success: false, error: "Server error" }));
        }
        });
    }

    else if (req.method === "POST" && req.url === "/logEvent") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
        try {
            const data = JSON.parse(body);
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
                data.type || "",
            ]
            );
            res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            console.error("❌ logEvent error:", err.message);
            res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify({ success: false, error: "Server error" }));
        }
        });
    }

    else if (req.method === "POST" && req.url === "/logSession") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
        try {
            const data = JSON.parse(body);
            await pool.query(
            `INSERT INTO session (session_id, email, start_time, end_time, session_status, device_info)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                data.session_id || "unknown",
                data.email || "unknown",
                data.start_time || new Date().toISOString(),
                data.end_time || "",
                data.session_status || "active",
                data.device_info || "",
            ]
            );
            res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            console.error("❌ logSession error:", err.message);
            res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify({ success: false, error: "Server error" }));
        }
        });
    }

    else if (req.method === "POST" && req.url === "/logSession_out") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
        try {
            const data = JSON.parse(body);
            await pool.query(
            `INSERT INTO session (session_id, email, start_time, end_time, session_status, device_info)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                data.session_id || "unknown",
                data.email || "unknown",
                data.start_time || "",
                data.end_time || new Date().toISOString(),
                data.session_status || "active",
                data.device_info || "",
            ]
            );
            res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            console.error("❌ logSession_out error:", err.message);
            res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify({ success: false, error: "Server error" }));
        }
        });
    }

    else if (req.method === "POST" && req.url === "/logScreenshot") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
        try {
            const data = JSON.parse(body);
            await pool.query(
            `INSERT INTO log (id, name, hash, session_id, timestamp)
            VALUES ($1, $2, $3, $4, $5)`,
            [
                data.id || "",
                data.name || "",
                data.hash || "",
                data.session_id || "",
                data.timestamp || new Date().toISOString(),
            ]
            );
            res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            console.error("❌ logScreenshot error:", err.message);
            res.writeHead(500, { "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify({ success: false, error: "Server error" }));
        }
        });
    }

    else {
        res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
        res.end("Not Found");
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
    `);
 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT,
        session_id TEXT,
        event_type TEXT,
        event_status TEXT,
        source TEXT,
        timestamp TIMESTAMP,
        type TEXT
      );
    `);
 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session (
        session_id TEXT,
        email TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        session_status TEXT,
        device_info TEXT
      );
    `);
 
    await pool.query(`
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
