const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt'); // Include bcrypt for password hashing
const MySQLStore = require('express-mysql-session')(session); // For session storage in MySQL

const app = express();
const port = 5000;

app.use(cors({
  origin: 'http://localhost:3000', // Your client-side URL
  credentials: true // Allow credentials (cookies, headers) to be sent
}));

// Use JSON middleware to parse JSON requests
app.use(express.json());
app.use((req, res, next) => {
  console.log('Session:', req.session); // Debugging purpose
  next();
});

// Create a MySQL connection pool
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'solutionhub',
  connectionLimit: 10 // Number of connections in pool
});
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error establishing database connection:', err);
    return;
  }
  console.log('Connected to the database');
  connection.release(); // Release the connection back to the pool
});

// Set up session store in MySQL
const sessionStore = new MySQLStore({}, db);

// Set up session management
app.use(session({
  secret: '12345', // Replace with a strong secret key
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// Middleware to check if user is authenticated
const checkAuth = (req, res, next) => {
  console.log('Session Data in checkAuth:', req.session); // Add logging
  if (!req.session.username) {
    return res.status(401).send('Unauthorized');
  }
  next();
};

// Registration route
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).send('All fields are required');
  }

  // Check if the user already exists
  const checkUserSql = 'SELECT * FROM users WHERE username = ? OR email = ?';
  db.query(checkUserSql, [username, email], (err, results) => {
    if (err) {
      console.error('Error during user check:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      // User already exists
      return res.status(409).send('User already exists');
    } else {
      // Hash the password before storing it
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).send('Server error');
        }

        // Insert new user into the database
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

// Login route
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
          req.session.username = username; // Set session data
          console.log('Login successful, session data:', req.session); // Add logging
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

// Fetch all subjects
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

// Add a new subject
app.post('/subjects', checkAuth, (req, res) => {
  const { subject_name } = req.body;
  const username = req.session.username; // Logged-in user's username

  if (!subject_name || !username) {
    return res.status(400).send('Subject name and username are required');
  }

  // Check if the subject already exists
  const checkSql = 'SELECT * FROM subjects WHERE subject_name = ?';
  db.query(checkSql, [subject_name], (err, results) => {
    if (err) {
      console.error('Error checking subject:', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      return res.status(409).send('Subject already exists');
    }

    // Insert the new subject
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
  const username = req.session.username; // Get logged-in user's username

  if (!subject_name || !username) {
    return res.status(400).send('Subject name and username are required');
  }

  // Check if the subject exists and if the logged-in user is the one who added it
  const checkSql = 'SELECT * FROM subjects WHERE subject_name = ?';
  db.query(checkSql, [subject_name], (err, results) => {
    if (err) {
      console.error('Error checking subject:', err);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).send('Subject not found');
    }

    // If the subject exists, check if the logged-in user is the one who added it
    const subject = results[0];
    if (subject.username !== username) {
      return res.status(403).send('You can only delete subjects you have added');
    }

    // Delete the subject and all associated topics and solutions
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



// Fetch topics for a specific subject
app.get('/subjects/:subjectName/topics', (req, res) => {
  const subjectName = req.params.subjectName;
  
  // Query to fetch topics related to the subject
  const sql = 'SELECT topic_name FROM topics WHERE subject_name = ?';
  db.query(sql, [subjectName], (err, results) => {
    if (err) {
      console.error('Error fetching topics:', err);
      return res.status(500).send('Error fetching topics');
    }
    res.json(results.map(row => row.topic_name)); // Send back the list of topics
  });
});

// Add a new topic
app.post('/subjects/:subjectName/topics', checkAuth, (req, res) => {
  const { topic_name } = req.body;
  const subjectName = req.params.subjectName;
  const username = req.session.username;

  if (!topic_name) {
    return res.status(400).send('Topic name is required');
  }

  // Insert the new topic
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
  const username = req.session.username; // Get logged-in user's username

  if (!topic_name || !subjectName || !username) {
    return res.status(400).send('Topic name, subject name, and username are required');
  }

  // Check if the topic exists for the given subject
  const checkSql = 'SELECT * FROM topics WHERE topic_name = ? AND subject_name = ?';
  db.query(checkSql, [topic_name, subjectName], (err, results) => {
    if (err) {
      console.error('Error checking topic:', err.message);
      return res.status(500).send('Server error');
    }

    if (results.length === 0) {
      return res.status(404).send('Topic not found');
    }

    // If the topic exists, check if the logged-in user is the one who added it
    const topic = results[0];
    if (topic.username !== username) {
      return res.status(403).send('You can only delete topics you have added');
    }

    // Delete the topic (solutions will be deleted automatically due to cascading)
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
  const username = req.session.username; // Retrieve the username from the session

  // Validate input
  if (!content || !username) {
    return res.status(400).send('Content and username are required');
  }

  // Insert the new solution into the database
  const insertSolutionSql = 'INSERT INTO solutions (content, username, topic_name) VALUES (?, ?, ?)';
  db.query(insertSolutionSql, [content, username, topicName], (err, result) => {
    if (err) {
      console.error('Error inserting solution:', err);
      return res.status(500).send('Error adding solution');
    }
    res.send('Solution added successfully');
  });
});


// New endpoint to fetch solutions for a specific topic
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
// Fetch solutions for a specific topic
app.get('/topics/:topicName/solutions', (req, res) => {
  const topicName = req.params.topicName;

  const sql = 'SELECT id, content, username, upvotes FROM solutions WHERE topic_name = ?';
  db.query(sql, [topicName], (err, results) => {
    if (err) {
      console.error('Error fetching solutions:', err);
      return res.status(500).send('Error fetching solutions');
    }
    res.json(results); // Return the results as JSON
  });
});
// Upvote a solution
app.post('/solutions/:solutionId/upvote', checkAuth, (req, res) => {
  const { solutionId } = req.params;
  const username = req.user.username; 

  if (!solutionId) {
    return res.status(400).send('Solution ID is required');
  }

  const checkVoteQuery = 'SELECT id FROM user_upvotes WHERE username = ? AND solution_id = ?';
  db.query(checkVoteQuery, [username, solutionId], (err, result) => {
    if (err) {
      console.error('Error checking vote:', err);
      return res.status(500).send('Error checking vote');
    }

    if (result.length > 0) {
      // User has already upvoted, remove the upvote
      const removeVoteQuery = 'DELETE FROM user_upvotes WHERE username = ? AND solution_id = ?';
      db.query(removeVoteQuery, [username, solutionId], (err) => {
        if (err) {
          console.error('Error removing vote:', err);
          return res.status(500).send('Error removing vote');
        }

        const decrementUpvoteQuery = 'UPDATE solutions SET upvotes = upvotes - 1 WHERE id = ?';
        db.query(decrementUpvoteQuery, [solutionId], (err) => {
          if (err) {
            console.error('Error decrementing upvotes:', err);
            return res.status(500).send('Error decrementing upvotes');
          }
          res.send('Upvote removed successfully');
        });
      });
    } else {
      // User has not yet upvoted, add the upvote
      const addVoteQuery = 'INSERT INTO user_upvotes (username, solution_id) VALUES (?, ?)';
      db.query(addVoteQuery, [username, solutionId], (err) => {
        if (err) {
          console.error('Error adding vote:', err);
          return res.status(500).send('Error adding vote');
        }

        const incrementUpvoteQuery = 'UPDATE solutions SET upvotes = upvotes + 1 WHERE id = ?';
        db.query(incrementUpvoteQuery, [solutionId], (err) => {
          if (err) {
            console.error('Error incrementing upvotes:', err);
            return res.status(500).send('Error incrementing upvotes');
          }
          res.send('Solution upvoted successfully');
        });
      });
    }
  });
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
