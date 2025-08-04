// server.js
// This script sets up an Express server with API endpoints for customers and orders.
// REFACTORED: Now uses async/await and try/catch for robust error handling.

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = './ecommerce.db';

// --- DATABASE CONNECTION ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log(`Connected to the SQLite database at ${DB_PATH}`);
    }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- DATABASE HELPERS (Promisification) ---
// Helper to wrap db.all in a Promise to use with async/await
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('DB Error:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Helper to wrap db.get in a Promise
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('DB Error:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};


// --- CUSTOMER API ENDPOINTS (Milestone 2) ---

/**
 * @route   GET /api/users
 * @desc    Get all customers with pagination.
 */
app.get('/api/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const sql = `SELECT id, first_name, last_name, email, country, city FROM users LIMIT ? OFFSET ?`;
        
        const rows = await dbAll(sql, [limit, offset]);
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: "An unexpected error occurred while retrieving users." });
    }
});

/**
 * @route   GET /api/users/:userId
 * @desc    Get specific customer details including their total order count.
 */
app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID provided." });
        }
        const sql = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.age, u.gender, u.country, u.city,
                   (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count
            FROM users u WHERE u.id = ?`;
        
        const row = await dbGet(sql, [userId]);
        if (!row) {
            return res.status(404).json({ error: "Customer not found." });
        }
        res.status(200).json(row);
    } catch (err) {
        res.status(500).json({ error: "An unexpected error occurred while retrieving user details." });
    }
});


// --- ORDERS API ENDPOINTS (Milestone 3) ---

/**
 * @route   GET /api/users/:userId/orders
 * @desc    Get all orders for a specific customer.
 */
app.get('/api/users/:userId/orders', async (req, res) => {
    try {
        const { userId } = req.params;
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID provided." });
        }
        const sql = `SELECT order_id, status, created_at, num_of_item FROM orders WHERE user_id = ? ORDER BY created_at DESC`;
        
        const rows = await dbAll(sql, [userId]);
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: "An unexpected error occurred while fetching orders." });
    }
});

/**
 * @route   GET /api/orders/:orderId
 * @desc    Get specific order details, including line items.
 */
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        if (isNaN(orderId)) {
            return res.status(400).json({ error: "Invalid order ID provided." });
        }

        const orderSql = `SELECT * FROM orders WHERE order_id = ?`;
        const itemsSql = `
            SELECT
                oi.id as order_item_id,
                oi.sale_price,
                p.name as product_name,
                p.brand as product_brand,
                p.category as product_category
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?`;

        const order = await dbGet(orderSql, [orderId]);
        if (!order) {
            return res.status(404).json({ error: "Order not found." });
        }

        const items = await dbAll(itemsSql, [orderId]);
        
        res.status(200).json({
            ...order,
            items: items
        });
    } catch (err) {
        res.status(500).json({ error: "An unexpected error occurred while fetching order details." });
    }
});


// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
