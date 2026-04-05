'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './register.css';

const API_URL = 'http://localhost:5000';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          ...(fullName.trim() && { full_name: fullName.trim() }),
          ...(email.trim() && { email: email.trim() }),
          ...(phone.trim() && { phone: phone.trim() }),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message + ' - Redirecting to login...');
        setMessageType('success');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setMessage(data.error);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error connecting to server');
      setMessageType('error');
    }
  };

  return (
    <div className="container">
      <div className="register-box">
        <h1>Register</h1>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div style={{ borderTop: '1px solid rgba(128,128,128,0.3)', margin: '10px 0', paddingTop: '10px' }}>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>Optional Information</p>
          </div>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit" className="btn-primary">Register</button>
        </form>
        {message && <p className={messageType}>{message}</p>}
        <div className="hint">
          <p>Already have an account? <Link href="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  );
}
