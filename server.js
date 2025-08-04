// server.js
// This script sets up an Express server to provide API endpoints for the e-commerce dashboard.

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 5000; // Port for the backend server
const DB_PATH = './ecommerce.db'; // Path to the SQLite database

// --- DATABASE CONNECTION ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log(`Connected to the SQLite database at ${DB_PATH}`);
    }
});

// --- MIDDLEWARE ---
app.use(cors()); // Enable Cross-Origin Resource Sharing to allow frontend requests
app.use(express.json()); // Enable parsing of JSON request bodies

// --- API ENDPOINTS ---

// A simple root endpoint to confirm the server is running
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the E-commerce API. The server is running correctly." });
});

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Public
 */
app.get('/api/users', (req, res) => {
    // We'll limit this to 100 users to avoid sending a massive payload to the frontend.
    const sql = `SELECT id, first_name, last_name, email, gender, country, city FROM users LIMIT 100`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error querying users:", err.message);
            res.status(500).json({ error: "Failed to retrieve users from the database." });
            return;
        }
        res.json(rows);
    });
});

/**
 * @route   GET /api/users/:userId/orders
 * @desc    Get all orders for a specific user
 * @access  Public
 */
app.get('/api/users/:userId/orders', (req, res) => {
    const userId = req.params.userId;
    const sql = `SELECT order_id, status, created_at, num_of_item FROM orders WHERE user_id = ?`;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error(`Error querying orders for user ${userId}:`, err.message);
            res.status(500).json({ error: "Failed to retrieve orders." });
            return;
        }
        res.json(rows);
    });
});

/**
 * @route   GET /api/stats
 * @desc    Get summary statistics for the dashboard
 * @access  Public
 */
app.get('/api/stats', async (req, res) => {
    try {
        // We run these queries in parallel for efficiency
        const totalUsersPromise = new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as totalUsers FROM users`, (err, row) => {
                if (err) reject(err);
                resolve(row.totalUsers);
            });
        });

        const totalOrdersPromise = new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as totalOrders FROM orders`, (err, row) => {
                if (err) reject(err);
                resolve(row.totalOrders);
            });
        });
        
        // NOTE: To calculate total revenue, you would need to load `order_items.csv`
        // and sum the `sale_price` column. For this milestone, we'll return a placeholder.
        const totalRevenue = 0; 

        const [totalUsers, totalOrders] = await Promise.all([totalUsersPromise, totalOrdersPromise]);

        res.json({
            totalUsers,
            totalOrders,
            totalRevenue // Placeholder value
        });

    } catch (err) {
        console.error("Error fetching stats:", err.message);
        res.status(500).json({ error: "Failed to calculate statistics." });
    }
});


// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Gracefully close the database connection when the app terminates
process.on('exit', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Database connection closed.');
    });
});
