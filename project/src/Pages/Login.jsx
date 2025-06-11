import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/Styles3.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', 
            body: JSON.stringify({ username, password })
        })
        .then(response => response.text())
        .then(data => {
            if (data === 'Login successful') {
                setMessage({ text: data, type: 'success' });
                navigate('/subjects');
            } else {
                setMessage({ text: data, type: 'error' }); 
            }
        })
        .catch(error => setMessage('Error: ' + error.message)); 
    };

    return (
        <div>
            <form onSubmit={handleLogin}>
                <h1>Login</h1>
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
                <button type="submit">Login</button>
                <div className="forgot-password">
                    <a href="/ForgotPassword">Forgot password?</a>
                </div>
                <div className="create-account">
                    <a href='Register' className="btn-continue">Create an account</a>
                </div>
                <p style={{ color: message.type === 'success' ? 'green' : 'red' }}>
                    {message.text}
                </p>
            </form>
        </div>
    );
};

export default Login;
