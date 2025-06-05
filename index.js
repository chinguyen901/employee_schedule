const http = require('http');
const { Pool } = require('pg');
const { parse } = require('url');
require('dotenv').config();
const createTables = require('./createTables'); // 👈 Thêm dòng này

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
  });

const startServer = () => {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const path = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
      if (req.method === 'POST' && path === '/login') {
        const { username, password } = await parseBody(req);
        const lowerUsername = (username || '').toLowerCase().trim();
        const trimmedPassword = (password || '').trim();

        const result = await pool.query(
          'SELECT account_id AS id, full_name AS name FROM accounts WHERE LOWER(username) = $1 AND password = $2',
          [lowerUsername, trimmedPassword]
        );
        console.log(`✅ result.rows.length: ${result.rows.length}`);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          return res.end(JSON.stringify({ success: true, ...user }));
        } else {
          return res.end(JSON.stringify({ success: false, error: 'Username hoặc mật khẩu không đúng' }));
        }
      }

      else if (req.method === 'POST' && path === '/log-event') {
        const data = await parseBody(req);
        await pool.query(
          `INSERT INTO incident_sessions (account_id, status, reason)
           VALUES ($1, $2, $3)`,
          [data.id, data.event_type || 'unknown', data.event_status || '']
        );
        return res.end(JSON.stringify({ success: true }));
      }

      else if (req.method === 'POST' && path === '/log-session') {
        const data = await parseBody(req);
        await pool.query(
          `INSERT INTO work_sessions (account_id, status)
           VALUES ($1, 'checkin')`,
          [data.account_id]
        );
        return res.end(JSON.stringify({ success: true }));
      }

      else if (req.method === 'POST' && path === '/log-session-out') {
        const data = await parseBody(req);
        await pool.query(
          `INSERT INTO work_sessions (account_id, status)
           VALUES ($1, 'checkout')`,
          [data.account_id]
        );
        return res.end(JSON.stringify({ success: true }));
      }

      else if (req.method === 'POST' && path === '/log-screenshot') {
        const data = await parseBody(req);
        await pool.query(
          `INSERT INTO photo_sessions (account_id, hash)
           VALUES ($1, $2)`,
          [data.id, data.hash]
        );
        return res.end(JSON.stringify({ success: true }));
      }

      else {
        res.statusCode = 404;
        return res.end(JSON.stringify({ success: false, error: 'Not Found' }));
      }

    } catch (err) {
      console.error("❌ Server Error:", err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
};

createTables().then(() => {
  console.log("✅ Database ready. Starting server...");
  startServer();
}).catch(err => {
  console.error("❌ Failed to create tables:", err);
});
