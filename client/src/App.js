import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- Configuration ---
const API_BASE_URL = 'http://localhost:5000';

// --- Style Component ---
const AppStyles = () => {
    const css = `
        body { margin: 0; font-family: sans-serif; background-color: #f9fafb; }
        .app-container { min-height: 100vh; }
        .app-header { background-color: white; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); padding: 1rem 2rem; }
        .header-title { font-size: 1.875rem; font-weight: bold; color: #111827; margin: 0; }
        .main-content { max-width: 80rem; margin: 0 auto; padding: 2rem; }
        .spinner-container { display: flex; justify-content: center; align-items: center; padding: 2rem; }
        .spinner { width: 2.5rem; height: 2.5rem; border: 4px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-message { background-color: #fee2e2; border: 1px solid #f87171; color: #b91c1c; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
        
        /* Search Bar Styles */
        .search-container { margin-bottom: 2rem; }
        .search-input {
            width: 100%;
            padding: 0.75rem 1rem;
            font-size: 1rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            box-sizing: border-box;
        }
        .search-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
        }

        /* Customer List Styles */
        .customer-list-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        .customer-card {
            background-color: white;
            padding: 1.5rem;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .customer-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .card-header .name { font-size: 1.25rem; font-weight: bold; color: #1f2937; }
        .card-header .email { font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem; }
        .card-footer { border-top: 1px solid #e5e7eb; padding-top: 1rem; font-size: 0.875rem; color: #374151; }
        .card-footer .order-count { font-weight: bold; color: #3b82f6; }

        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background-color: white; padding: 2rem; border-radius: 1rem; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; }
        .modal-title { font-size: 1.5rem; font-weight: bold; margin: 0; }
        .modal-close-btn { background: none; border: none; font-size: 2rem; cursor: pointer; line-height: 1; }
        .order-list { margin-top: 1rem; }
        .order-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: 0.5rem; }
        .order-item:nth-child(even) { background-color: #f9fafb; }
        .order-item-id { font-weight: 500; }
        .order-item-status { font-size: 0.875rem; padding: 0.25rem 0.75rem; border-radius: 9999px; }
        .status-shipped { background-color: #dbeafe; color: #1e40af; }
        .status-complete { background-color: #dcfce7; color: #166534; }
        .status-cancelled { background-color: #fee2e2; color: #991b1b; }
        .status-processing { background-color: #fef3c7; color: #92400e; }
    `;
    return <style>{css}</style>;
};

// --- Reusable Components ---
const Spinner = () => <div className="spinner-container"><div className="spinner"></div></div>;
const ErrorMessage = ({ message }) => <div className="error-message"><strong>Error:</strong> {message}</div>;

// --- Feature Components ---

const CustomerList = ({ onCustomerSelect }) => {
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/users`)
            .then(res => {
                setAllUsers(res.data);
                setFilteredUsers(res.data);
            })
            .catch(() => setError('Could not fetch the customer list.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filteredData = allUsers.filter(user =>
            user.first_name.toLowerCase().includes(lowercasedFilter) ||
            user.last_name.toLowerCase().includes(lowercasedFilter) ||
            user.email.toLowerCase().includes(lowercasedFilter)
        );
        setFilteredUsers(filteredData);
    }, [searchTerm, allUsers]);

    if (loading) return <Spinner />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div>
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="search-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="customer-list-container">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <div key={user.id} className="customer-card" onClick={() => onCustomerSelect(user)}>
                            <div className="card-header">
                                <p className="name">{user.first_name} {user.last_name}</p>
                                <p className="email">{user.email}</p>
                            </div>
                            <div className="card-footer">
                                <span>Total Orders: </span>
                                <span className="order-count">{user.order_count}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No customers found.</p>
                )}
            </div>
        </div>
    );
};

const OrderViewModal = ({ user, onClose }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        setLoading(true);
        axios.get(`${API_BASE_URL}/api/users/${user.id}/orders`)
            .then(res => setOrders(res.data))
            .catch(() => setError('Could not fetch orders for this user.'))
            .finally(() => setLoading(false));
    }, [user]);

    const getStatusClass = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'shipped') return 'status-shipped';
        if (s === 'complete') return 'status-complete';
        if (s === 'cancelled') return 'status-cancelled';
        return 'status-processing';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Orders for {user.first_name}</h2>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>
                {loading && <Spinner />}
                {error && <ErrorMessage message={error} />}
                {!loading && !error && (
                    <div className="order-list">
                        {orders.length > 0 ? (
                            orders.map(order => (
                                <div key={order.order_id} className="order-item">
                                    <div>
                                        <p className="order-item-id">Order #{order.order_id}</p>
                                        <p style={{fontSize: '0.8rem', color: '#6b7280'}}>
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`order-item-status ${getStatusClass(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p>This customer has no orders.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main App Component ---
function App() {
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    return (
        <>
            <AppStyles />
            <div className="app-container">
                <header className="app-header">
                    <h1 className="header-title">Customer List</h1>
                </header>
                <main className="main-content">
                    <CustomerList onCustomerSelect={setSelectedCustomer} />
                </main>
                {selectedCustomer && <OrderViewModal user={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
            </div>
        </>
    );
}

export default App;
