// server.js
// This script sets up an Express server to provide the Customer API for Milestone 2.

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 5000; // Port for the backend server
const DB_PATH = './ecommerce.db'; // Path to your SQLite database

// --- DATABASE CONNECTION ---
// Connect to the SQLite database.
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log(`Connected to the SQLite database at ${DB_PATH}`);
    }
});

// --- MIDDLEWARE ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable parsing of JSON request bodies

// --- API ENDPOINTS ---

/**
 * @route   GET /api/users
 * @desc    Get all customers with pagination.
 * @access  Public
 * @query   page - The page number to retrieve.
 * @query   limit - The number of users per page.
 * @example /api/users?page=1&limit=20
 */
app.get('/api/users', (req, res) => {
    // Parse query parameters for pagination, with default values.
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const sql = `SELECT id, first_name, last_name, email, country, city FROM users LIMIT ? OFFSET ?`;
    
    db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
            console.error("Error querying users:", err.message);
            // Return a 500 status code for server errors.
            res.status(500).json({ error: "Failed to retrieve users from the database." });
            return;
        }
        // Return the list of users.
        res.status(200).json(rows);
    });
});

/**
 * @route   GET /api/users/:userId
 * @desc    Get specific customer details including their total order count.
 * @access  Public
 */
app.get('/api/users/:userId', (req, res) => {
    const userId = req.params.userId;

    // --- Error Handling: Check for valid ID ---
    // Ensure the provided ID is a number.
    if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID provided. Must be a number." });
    }

    // This SQL query fetches user details and uses a subquery to count their orders.
    const sql = `
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.age,
            u.gender,
            u.country,
            u.city,
            (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count
        FROM
            users u
        WHERE
            u.id = ?
    `;

    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error(`Error querying user ${userId}:`, err.message);
            return res.status(500).json({ error: "Database error while retrieving user details." });
        }
        
        // --- Error Handling: Check if customer was found ---
        if (!row) {
            // If no user is found, return a 404 status code.
            return res.status(404).json({ error: "Customer not found." });
        }
        
        // If successful, return the user data with a 200 OK status.
        res.status(200).json(row);
    });
});


// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log("You can now test your endpoints using Postman or your browser.");
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
