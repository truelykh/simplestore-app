import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

const endpoints = {
  Users: '/api/users',
  Products: '/api/products',
  Orders: '/api/orders',
  Payments: '/api/payments',
  Notifications: '/api/notifications'
};

function App() {
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchData(name) {
    setSelected(name);
    setError('');
    setData(null);
    setLoading(true);

    try {
      const res = await fetch(endpoints[name]);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Simple Store</h1>
      <p>React → Nginx → Spring Boot microservices</p>
      <div className="buttons">
        {Object.keys(endpoints).map(name => (
          <button 
            key={name} 
            disabled={loading} 
            onClick={() => fetchData(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {loading && <p className="loading">Fetching data from {selected}...</p>}
      {selected && !loading && <h2>{selected}</h2>}
      {error && <pre className="error">{error}</pre>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
