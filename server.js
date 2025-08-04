// server.js
// This script sets up an Express server with API endpoints for customers and orders.
// MILESTONE 4 UPDATE: The /api/users endpoint is enhanced to include order counts for efficient frontend searching.

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
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};


// --- API ENDPOINTS ---

/**
 * @route   GET /api/users
 * @desc    Get all customers with their order counts for the frontend list.
 * @access  Public
 */
app.get('/api/users', async (req, res) => {
    try {
        // This query now joins users with orders to get the count for each user.
        // It's more efficient for the frontend search feature.
        const sql = `
            SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.country,
                u.city,
                COUNT(o.order_id) as order_count
            FROM
                users u
            LEFT JOIN
                orders o ON u.id = o.user_id
            GROUP BY
                u.id
            ORDER BY
                u.id
            LIMIT 200
        `; // Increased limit for better client-side search experience
        
        const rows = await dbAll(sql);
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An unexpected error occurred while retrieving users." });
    }
});

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
            SELECT oi.id as order_item_id, oi.sale_price, p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?`;

        const order = await dbGet(orderSql, [orderId]);
        if (!order) {
            return res.status(404).json({ error: "Order not found." });
        }

        const items = await dbAll(itemsSql, [orderId]);
        
        res.status(200).json({ ...order, items: items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An unexpected error occurred while fetching order details." });
    }
});


// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
