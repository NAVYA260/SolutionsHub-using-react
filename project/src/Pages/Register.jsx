import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/Styles2.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const navigate = useNavigate();

    const handleRegister = (e) => {
        e.preventDefault();
        if (!email.endsWith('@svecw.edu.in')) {
            setMessage({ text: 'Please provide your college email ID', type: 'error' });
            return;
        }
        fetch('http://localhost:5000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, email })
        })
            .then(response => response.text())
            .then(data => {
                if (data === 'Registration successful') {
                    setMessage({ text: data, type: 'success' });
                    navigate('/login');
                } else {
                    setMessage({ text: data, type: 'error' });
                }
            })
            .catch(error => setMessage({ text: 'Error: ' + error, type: 'error' }));
    };

    return (
        <div>
            <form onSubmit={handleRegister}>
                <h1>Register</h1>
                <div>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        required
                    />
                </div>
                <div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                    />
                </div>
                <div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter college mail only"
                        required
                    />
                </div>
                <div className="login-link">
                    <p>Already have an account? <a href="/login">Login</a></p>
                </div>
                <button type="submit">Register</button>
                <p style={{ color: message.type === 'success' ? 'green' : 'red' }}>
                    {message.text}
                </p>
            </form>
        </div>
    );
}
export default Register;
