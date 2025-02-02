const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt'); 
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

app.post('/topics/:topicName/solutions', (req, res) => {
  const { topicName } = req.params;
  const { content } = req.body;
  const username = req.session.username; 
  if (!content || !username) {
    return res.status(400).send('Content and username are required');
  }
  const insertSolutionSql = 'INSERT INTO solutions (content, username, topic_name) VALUES (?, ?, ?)';
  db.query(insertSolutionSql, [content, username, topicName], (err, result) => {
    if (err) {
      console.error('Error inserting solution:', err);
      return res.status(500).send('Error adding solution');
    }
    res.send('Solution added successfully');
  });
});

app.get('/topics/:topicName/solutions', (req, res) => {
  const topicName = req.params.topicName;

  const sql = 'SELECT * FROM solutions WHERE topic_name = ?';
  db.query(sql, [topicName], (err, results) => {
    if (err) {
      console.error('Error fetching solutions:', err);
      return res.status(500).send('Error fetching solutions');
    }
    res.json(results);
  });
});
app.post('/topics/:topicName/solutions', (req, res) => {
  const { content, username } = req.body;
  const topicName = req.params.topicName;

  if (!content || !username) {
    return res.status(400).send('Content and username are required');
  }

  const sql = 'INSERT INTO solutions (content, username, topic_name, upvotes) VALUES (?, ?, ?, 0)';
  db.query(sql, [content, username, topicName], (err, result) => {
    if (err) {
      console.error('Error adding solution:', err);
      return res.status(500).send('Error adding solution');
    }
    res.send('Solution added successfully');
  });
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
