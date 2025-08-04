import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- Configuration ---
const API_BASE_URL = 'http://localhost:5000';

// --- Style Component ---
// To fix the build error, all CSS is now included directly in the component.
// This removes the need for a separate App.css file.
const AppStyles = () => {
    const css = `
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background-color: #f9fafb;
        }
        .app-container { min-height: 100vh; }
        .app-header { background-color: white; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); padding: 1rem 2rem; }
        .header-title { font-size: 1.875rem; font-weight: bold; color: #111827; margin: 0; }
        .main-content { max-width: 80rem; margin: 0 auto; padding: 2rem; }
        .content-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
        @media (min-width: 1024px) {
          .content-grid { grid-template-columns: repeat(3, 1fr); }
          .grid-col-1 { grid-column: span 1 / span 1; }
          .grid-col-2 { grid-column: span 2 / span 2; }
        }
        .dashboard { margin-bottom: 2rem; }
        .dashboard-title { font-size: 1.5rem; font-weight: bold; color: #1f2937; margin-bottom: 1rem; }
        .stats-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        .stat-card { background-color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); display: flex; align-items: center; }
        .stat-card-icon { background-color: #e0e7ff; padding: 0.75rem; border-radius: 9999px; margin-right: 1rem; }
        .stat-card-info .title { color: #6b7280; font-size: 0.875rem; font-weight: 500; }
        .stat-card-info .value { font-size: 1.5rem; font-weight: bold; color: #1f2937; }
        .card-container { background-color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); height: 100%; box-sizing: border-box; }
        .card-title { font-size: 1.25rem; font-weight: bold; color: #1f2937; margin-bottom: 1rem; }
        .user-list { list-style: none; padding: 0; margin: 0; max-height: 24rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
        .user-list-item { width: 100%; text-align: left; padding: 0.75rem; border-radius: 0.5rem; transition: background-color 0.2s, color 0.2s; border: none; cursor: pointer; background-color: #f3f4f6; }
        .user-list-item:hover { background-color: #dbeafe; }
        .user-list-item.selected { background-color: #3b82f6; color: white; }
        .details-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; }
        .details-content { display: flex; flex-direction: column; gap: 1rem; }
        .details-item .label { font-size: 0.875rem; font-weight: 500; color: #6b7280; }
        .details-item .value { font-size: 1.125rem; color: #111827; }
        .details-item .value.highlight { font-weight: bold; color: #2563eb; }
        .spinner-container { display: flex; justify-content: center; align-items: center; padding: 2rem; }
        .spinner { width: 2.5rem; height: 2.5rem; border: 4px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-message { background-color: #fee2e2; border: 1px solid #f87171; color: #b91c1c; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    `;
    return <style>{css}</style>;
};


// --- Reusable Components ---
const Spinner = () => (
    <div className="spinner-container">
        <div className="spinner"></div>
    </div>
);

const ErrorMessage = ({ message }) => (
    <div className="error-message" role="alert">
        <strong>Error:</strong> {message}
    </div>
);

const StatCard = ({ title, value, icon }) => (
    <div className="stat-card">
        <div className="stat-card-icon">{icon}</div>
        <div className="stat-card-info">
            <p className="title">{title}</p>
            <p className="value">{value}</p>
        </div>
    </div>
);

// --- Main Feature Components ---
const Dashboard = () => {
    const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#2563eb' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
    const OrdersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#2563eb' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;

    return (
        <div className="dashboard">
            <h2 className="dashboard-title">Dashboard</h2>
            <div className="stats-grid">
                <StatCard title="Total Customers" value={"-"} icon={<UsersIcon />} />
                <StatCard title="Total Orders" value={"-"} icon={<OrdersIcon />} />
            </div>
        </div>
    );
};

const UserList = ({ onUserSelect, selectedUserId }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setError('');
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/api/users?limit=50`);
                setUsers(response.data);
            } catch (err) {
                setError('Could not fetch the list of users.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    if (loading) return <Spinner />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="card-container">
            <h3 className="card-title">Customers</h3>
            <ul className="user-list">
                {users.map(user => (
                    <li key={user.id}>
                        <button
                            onClick={() => onUserSelect(user)}
                            className={`user-list-item ${selectedUserId === user.id ? 'selected' : ''}`}
                        >
                            {user.first_name} {user.last_name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const CustomerDetails = ({ user }) => {
    const [userDetails, setUserDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.id) {
            setUserDetails(null);
            return;
        };

        const fetchUserDetails = async () => {
            try {
                setError('');
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/api/users/${user.id}`);
                setUserDetails(response.data);
            } catch (err) {
                setError(`Could not fetch details for ${user.first_name}.`);
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, [user]);

    if (!user) {
        return (
            <div className="card-container">
                <div className="details-placeholder">
                    <p>Select a customer to see their details.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card-container">
            <h3 className="card-title">Details for {user.first_name} {user.last_name}</h3>
            {loading && <Spinner />}
            {error && <ErrorMessage message={error} />}
            {!loading && !error && userDetails && (
                <div className="details-content">
                    <div className="details-item">
                        <p className="label">Email</p>
                        <p className="value">{userDetails.email}</p>
                    </div>
                     <div className="details-item">
                        <p className="label">Location</p>
                        <p className="value">{userDetails.city}, {userDetails.country}</p>
                    </div>
                    <div className="details-item">
                        <p className="label">Total Orders</p>
                        <p className="value highlight">{userDetails.order_count}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main App Component ---
function App() {
    const [selectedUser, setSelectedUser] = useState(null);

    return (
        <>
            <AppStyles />
            <div className="app-container">
                <header className="app-header">
                    <h1 className="header-title">Customer Dashboard</h1>
                </header>
                <main className="main-content">
                    <Dashboard />
                    <div className="content-grid">
                        <div className="grid-col-1">
                            <UserList onUserSelect={setSelectedUser} selectedUserId={selectedUser?.id} />
                        </div>
                        <div className="grid-col-2">
                            <CustomerDetails user={selectedUser} />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

export default App;
