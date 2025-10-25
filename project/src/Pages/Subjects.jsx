import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/Styles4.css';
import { Link } from 'react-router-dom';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [subjectToDelete, setSubjectToDelete] = useState('');
  const [message, setMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [loggedInUsername, setLoggedInUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/auth/username', {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => setLoggedInUsername(data.username))
      .catch((error) => console.error('Error fetching username:', error));
    fetch('http://localhost:5000/subjects', {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => setSubjects(data))
      .catch((error) => console.error('Error fetching subjects:', error));
  }, []);

  const handleAddSubject = (e) => {
    e.preventDefault();
  
    console.log('Adding subject:', newSubject);
    console.log('Logged in user:', loggedInUsername);
  
    fetch('http://localhost:5000/subjects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        subject_name: newSubject,
        username: loggedInUsername,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setMessage('Subject added successfully');
          setNewSubject('');
          return fetch('http://localhost:5000/subjects', { credentials: 'include' });
        } else {
          return response.text().then((text) => setMessage(text));
        }
      })
      .then((response) => response.json())
      .then((data) => setSubjects(data))
      .catch((error) => {
        console.error('Error adding subject:', error);
        setMessage('An error occurred while adding the subject');
      });
  };
  

  const handleDeleteSubject = (e) => {
    e.preventDefault();
  
    fetch('http://localhost:5000/subjects/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        subject_name: subjectToDelete,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setDeleteMessage('Subject deleted successfully');
          setSubjectToDelete('');
          return fetch('http://localhost:5000/subjects', { credentials: 'include' });
        } else {
          return response.text().then((text) => setDeleteMessage(text));
        }
      })
      .then((response) => response.json())
      .then((data) => setSubjects(data))
      .catch((error) => console.error('Error deleting subject:', error));
  };  

  const handleSubjectClick = (subject) => {
    navigate(`/Subjects/${subject}/Topics`);
  };

  return (
    <div>
      <div className="navbar">
      <div className="navbar-brand">SolutionsHub</div>
        <div className="navbar-options">
          <Link to="/Subjects">Subjects</Link>
          <Link to="/Login">Log out</Link>
        </div>
      </div>

      <div className="subjects-card">
        <div className="question-card">
          <h2>SUBJECTS</h2>
          <ul>
            {subjects.map((subject, index) => (
              <li key={index}>
                <button className="subject-button" onClick={() => handleSubjectClick(subject)}>
                  {subject}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="question-form">
          <div className="question-card">
            <h2>Add Subject</h2>
            <form onSubmit={handleAddSubject}>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Enter subject name"
                required
              />
              <input type="submit" value="Submit" />
            </form>
            <p>{message}</p>
          </div>

          <div className="question-card">
            <h2>Delete Subject</h2>
            <form onSubmit={handleDeleteSubject}>
              <input
                type="text"
                value={subjectToDelete}
                onChange={(e) => setSubjectToDelete(e.target.value)}
                placeholder="Enter subject to delete"
                required
              />
              <input type="submit" value="Delete" />
            </form>
            <p>{deleteMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subjects;
