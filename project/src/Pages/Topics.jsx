import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import '../Styles/Styles4.css'; 
import { Link } from 'react-router-dom';

const Topics = () => {
  const { subjectName } = useParams(); 
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState(''); 
  const [message, setMessage] = useState(''); 
  const [topicToDelete, setTopicToDelete] = useState(''); 
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
    fetch(`http://localhost:5000/subjects/${subjectName}/topics`, {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => setTopics(data))
      .catch((error) => console.error('Error fetching topics:', error));
  }, [subjectName]);

  const handleAddTopic = (event) => {
    event.preventDefault();

    fetch(`http://localhost:5000/subjects/${subjectName}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        topic_name: newTopic,
        username: loggedInUsername, 
      }),
    })
      .then(response => response.text())
      .then(data => {
        if (data === 'Topic added successfully') {
          setTopics(prevTopics => [...prevTopics, newTopic]);
          setNewTopic('');
          setMessage('Topic added successfully');
        } else {
          setMessage(data);
        }
      })
      .catch(error => {
        console.error('Error adding topic:', error);
        setMessage('Error adding topic. Please try again.');
      });
  };

  const handleDeleteTopic = (e) => {
    e.preventDefault();
  
    fetch(`http://localhost:5000/subjects/${subjectName}/topics/delete`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        topic_name: topicToDelete,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setDeleteMessage('Topic deleted successfully');
          setTopicToDelete('');
          return fetch(`http://localhost:5000/subjects/${subjectName}/topics`, { credentials: 'include' }); 
        } else {
          return response.text().then((text) => setDeleteMessage(text));
        }
      })
      .then((response) => response.json())
      .then((data) => setTopics(data))
      .catch((error) => console.error('Error deleting topic:', error));
  };
  
  

  const handleTopicClick = (topic) => {
    navigate(`/Topics/${topic}/Solutions`); 
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
        <h2>Topics for {subjectName}</h2>
        <ul>
          {topics.map((topic, index) => (
            <li key={index}>
              <button className="subject-button" onClick={() => handleTopicClick(topic)}>
                {topic}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="question-form">
        <div className="question-card">
          <h2>Add Topic</h2>
          <form onSubmit={handleAddTopic}>
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Enter topic name"
              required
            />
            <input type="submit" value="Submit" />
          </form>
          {message && <p>{message}</p>}
        </div>

        <div className="question-card">
          <h2>Delete Topic</h2>
          <form onSubmit={handleDeleteTopic}>
            <input
              type="text"
              value={topicToDelete}
              onChange={(e) => setTopicToDelete(e.target.value)}
              placeholder="Enter Topic to delete"
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

export default Topics;
