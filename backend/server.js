const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require("multer");
const path = require("path");
const MySQLStore = require('express-mysql-session')(session);
const app = express();
const port = 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use((req, res, next) => {
  console.log('Session:', req.session);
  next();
});
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'solutionhub',
  connectionLimit: 10
});
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error establishing database connection:', err);
    return;
  }
  console.log('Connected to the database');
  connection.release();
});
const sessionStore = new MySQLStore({}, db);
app.use(session({
  secret: '12345',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60
  }
}));

const checkAuth = (req, res, next) => {
  console.log('Session Data in checkAuth:', req.session); // Add logging
  if (!req.session.username) {
    return res.status(401).send('Unauthorized');
  }
  next();
};

app.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).send('All fields are required');
  }
  if (!email.endsWith('@svecw.edu.in')) {
    return res.status(400).send('Only college email IDs are allowed');
  }

  const checkUserSql = 'SELECT * FROM users WHERE username = ? OR email = ?';
  db.query(checkUserSql, [username, email], (err, results) => {
    if (err) {
      console.error('Error during user check:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      return res.status(409).send('User already exists');
    } else {
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).send('Server error');
        }
        const insertUserSql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        db.query(insertUserSql, [username, hashedPassword, email], (err, result) => {
          if (err) {
            console.error('Error during user registration:', err);
            return res.status(500).send('Error registering user');
          }
          res.send('Registration successful');
        });
      });
    }
  });
});
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Error during query:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      bcrypt.compare(password, results[0].password, (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          return res.status(500).send('Server error');
        }

        if (isMatch) {
          req.session.username = username;
          console.log('Login successful, session data:', req.session);
          res.send('Login successful');
        } else {
          res.status(401).send('Invalid username or password');
        }
      });
    } else {
      res.status(401).send('Invalid username or password');
    }
  });
});
app.get('/subjects', (req, res) => {
  const sql = 'SELECT subject_name FROM subjects';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching subjects:', err);
      return res.status(500).send('Error fetching subjects');
    }
    res.json(results.map(row => row.subject_name));
  });
});
app.post('/subjects', checkAuth, (req, res) => {
  const { subject_name } = req.body;
  const username = req.session.username;
  if (!subject_name || !username) {
    return res.status(400).send('Subject name and username are required');
  }

  const checkSql = 'SELECT * FROM subjects WHERE subject_name = ?';
  db.query(checkSql, [subject_name], (err, results) => {
    if (err) {
      console.error('Error checking subject:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      return res.status(409).send('Subject already exists');
    }

    const insertSql = 'INSERT INTO subjects (subject_name, username) VALUES (?, ?)';
    db.query(insertSql, [subject_name, username], (err, result) => {
      if (err) {
        console.error('Error inserting subject:', err);
        return res.status(500).send('Error adding subject');
      }
      res.send('Subject added successfully');
    });
  });
});

app.post('/subjects/delete', checkAuth, (req, res) => {
  const { subject_name } = req.body;
  const username = req.session.username;
  if (!subject_name || !username) {
    return res.status(400).send('Subject name and username are required');
  }
  const checkSql = 'SELECT * FROM subjects WHERE subject_name = ?';
  db.query(checkSql, [subject_name], (err, results) => {
    if (err) {
      console.error('Error checking subject:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).send('Subject not found');
    }
    const subject = results[0];
    if (subject.username !== username) {
      return res.status(403).send('You can only delete subjects you have added');
    }
    const deleteSql = 'DELETE FROM subjects WHERE subject_name = ?';
    db.query(deleteSql, [subject_name], (err, result) => {
      if (err) {
        console.error('Error deleting subject:', err);
        return res.status(500).send('Error deleting subject');
      }
      res.send('Subject deleted successfully');
    });
  });
});
app.get('/subjects/:subjectName/topics', (req, res) => {
  const subjectName = req.params.subjectName;
  const sql = 'SELECT topic_name FROM topics WHERE subject_name = ?';
  db.query(sql, [subjectName], (err, results) => {
    if (err) {
      console.error('Error fetching topics:', err);
      return res.status(500).send('Error fetching topics');
    }
    res.json(results.map(row => row.topic_name));
  });
});
app.post('/subjects/:subjectName/topics', checkAuth, (req, res) => {
  const { topic_name } = req.body;
  const subjectName = req.params.subjectName;
  const username = req.session.username;

  if (!topic_name) {
    return res.status(400).send('Topic name is required');
  }
  const insertTopicSql = 'INSERT INTO topics (topic_name, subject_name, username) VALUES (?, ?, ?)';
  db.query(insertTopicSql, [topic_name, subjectName, username], (err, result) => {
    if (err) {
      console.error('Error inserting topic:', err);
      return res.status(500).send('Error adding topic');
    }
    res.send('Topic added successfully');
  });
});

app.post('/subjects/:subjectName/topics/delete', checkAuth, (req, res) => {
  const { topic_name } = req.body;
  const subjectName = req.params.subjectName;
  const username = req.session.username;
  if (!topic_name || !subjectName || !username) {
    return res.status(400).send('Topic name, subject name, and username are required');
  }

  const checkSql = 'SELECT * FROM topics WHERE topic_name = ? AND subject_name = ?';
  db.query(checkSql, [topic_name, subjectName], (err, results) => {
    if (err) {
      console.error('Error checking topic:', err.message);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).send('Topic not found');
    }
    const topic = results[0];
    if (topic.username !== username) {
      return res.status(403).send('You can only delete topics you have added');
    }
    const deleteSql = 'DELETE FROM topics WHERE topic_name = ? AND subject_name = ?';
    db.query(deleteSql, [topic_name, subjectName], (err, result) => {
      if (err) {
        console.error('Error deleting topic:', err.message);
        return res.status(500).send('Error deleting topic');
      }

      res.send('Topic and associated solutions deleted successfully');
    });
  });
});

const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
app.use("/uploads", express.static("uploads"));
app.get("/topics/:topicName/solutions", (req, res) => {
  const topicName = req.params.topicName;
  const sql = "SELECT * FROM solutions WHERE topic_name = ?";
  db.query(sql, [topicName], (err, results) => {
    if (err) {
      console.error("Error fetching solutions:", err);
      return res.status(500).send("Error fetching solutions");
    }
    res.json(results);
  });
});
app.post("/topics/:topicName/solutions", upload.single("pdf"), (req, res) => {
  const { topicName } = req.params;
  const username = req.session.username;

  if (!req.file || !username) {
    return res.status(400).send("PDF file and username are required");
  }

  const pdfPath = req.file.filename;
  const sql = "INSERT INTO solutions (pdf_path, username, topic_name) VALUES (?, ?, ?)";

  db.query(sql, [pdfPath, username, topicName], (err, result) => {
    if (err) {
      console.error("Error adding solution:", err);
      return res.status(500).send("Error adding solution");
    }
    res.send("Solution added successfully");
  });
});

const fs = require('fs');

app.delete('/topics/:topicName/solutions/:solutionId', checkAuth, (req, res) => {
  const { topicName, solutionId } = req.params;
  const username = req.session.username;
  const getSql = 'SELECT * FROM solutions WHERE id = ?';
  db.query(getSql, [solutionId], (err, results) => {
    if (err) {
      console.error('Error retrieving solution:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).send('Solution not found');
    }

    const solution = results[0];
    if (solution.username !== username) {
      return res.status(403).send('Only the user who uploaded this solution can delete it');
    }

    const deleteSql = 'DELETE FROM solutions WHERE id = ?';
    db.query(deleteSql, [solutionId], (err, result) => {
      if (err) {
        console.error('Error deleting solution:', err);
        return res.status(500).send('Error deleting solution');
      }
      const filePath = path.join(__dirname, 'uploads', solution.pdf_path);
      fs.unlink(filePath, (fsErr) => {
        if (fsErr) {
          console.error('File deletion error:', fsErr);
        }
        return res.send('Solution deleted successfully');
      });
    });
  });
});
const crypto = require('crypto');
const nodemailer = require('nodemailer');

app.post('/request-reset', (req, res) => {
  const { email } = req.body;

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  const sql = 'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?';
  db.query(sql, [token, expiry, email], (err, result) => {
    if (err) return res.status(500).send('Server error');
    if (result.affectedRows === 0) return res.status(404).send('Email not found');

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'navyajangala2004@gmail.com',
        pass: 'lqhymwdqayqylnbz'
      }
    });

    const mailOptions = {
      from: 'your_email@gmail.com',
      to: email,
      subject: 'Reset your password',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. Link expires in 15 minutes.</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) return res.status(500).send('Email failed');
      res.send('Reset link sent to your email');
    });
  });
});
app.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  const sql = 'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()';
  db.query(sql, [token], (err, results) => {
    if (err || results.length === 0) return res.status(400).send('Invalid or expired token');

    const hashed = bcrypt.hashSync(newPassword, 10);
    const updateSql = 'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = ?';

    db.query(updateSql, [hashed, token], (err, result) => {
      if (err) return res.status(500).send('Password update failed');
      res.send('Password successfully reset');
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
