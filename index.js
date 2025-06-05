const http = require('http');
const { Pool } = require('pg');
const { parse } = require('url');
require('dotenv').config();
const createTables = require('./createTables'); // 👈 Thêm dòng này

// Kết nối tới cơ sở dữ liệu PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Thêm SSL nếu cần
});

// Kiểm tra kết nối tới cơ sở dữ liệu khi ứng dụng khởi động
pool.connect()
  .then(() => {
    console.log("✅ Database connected successfully.");
  })
  .catch(err => {
    console.error("❌ Failed to connect to the database:", err);
    process.exit(1);  // Dừng ứng dụng nếu không thể kết nối cơ sở dữ liệu
  });

// Hàm để phân tích body của request
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

// Hàm khởi tạo server
const startServer = () => {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const path = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
      // Xử lý login
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

      // Xử lý log event
      else if (req.method === 'POST' && path === '/log-event') {
        const data = await parseBody(req);
        await pool.query(
          `INSERT INTO incident_sessions (account_id, status, reason, created_at)
           VALUES ($1, $2, $3, $4)`,
          [data.account_id, data.status || 'unknown', data.reason || '', new Date()]
        );
        return res.end(JSON.stringify({ success: true }));
      }

      // Xử lý log session (checkin)
      else if (req.method === 'POST' && path === '/log-session') {
        const data = await parseBody(req);
        await pool.query(
          `INSERT INTO work_sessions (account_id, status, created_at)
           VALUES ($1, 'checkin', $2)`,
          [data.account_id, new Date()]
        );
        return res.end(JSON.stringify({ success: true }));
      }

      // Xử lý log session (checkout)
      else if (req.method === 'POST' && path === '/log-session-out') {
        const data = await parseBody(req);
        await pool.query(
          `INSERT INTO work_sessions (account_id, status, created_at)
           VALUES ($1, 'checkout', $2)`,
          [data.account_id, new Date()]
        );
        return res.end(JSON.stringify({ success: true }));
      }

      // Xử lý log screenshot
      else if (req.method === 'POST' && path === '/log-screenshot') {
        const data = await parseBody(req);
        await pool.query(
          `INSERT INTO photo_sessions (account_id, hash, created_at)
           VALUES ($1, $2, $3)`,
          [data.account_id, data.hash, new Date()]
        );
        return res.end(JSON.stringify({ success: true }));
      }

      // Nếu không tìm thấy endpoint
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

  // Cấu hình server lắng nghe
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
};

// Tạo các bảng trong cơ sở dữ liệu và khởi động server
createTables().then(() => {
  console.log("✅ Database ready. Starting server...");
  startServer();
}).catch(err => {
  console.error("❌ Failed to create tables:", err);
  process.exit(1);  // Nếu tạo bảng thất bại, dừng ứng dụng
});

// Lắng nghe tín hiệu SIGTERM và dừng server một cách gọn gàng
process.on('SIGTERM', () => {
  console.log('Application is shutting down...');
  pool.end(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
