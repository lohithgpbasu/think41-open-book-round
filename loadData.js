// loadData.js
// REFACTORED FOR SPEED: This script now loads only a limited number of rows
// to make the setup process extremely fast for development and testing.

const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

// --- CONFIGURATION ---
const DB_PATH = './ecommerce.db';
const ROW_LIMIT = 5000; // <<< We will only load this many rows from each file.
const CSV_FILES = {
    users: './archive/users.csv',
    orders: './archive/orders.csv',
    products: './archive/products.csv',
    order_items: './archive/order_items.csv'
};

// --- DATABASE INITIALIZATION ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        return console.error("Error opening database:", err.message);
    }
    console.log("Connected to the SQLite database.");
    runETL();
});

// --- PROMISIFIED DB HELPER ---
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

// --- CORE ETL PROCESS ---
const runETL = async () => {
    try {
        console.log(`Starting ETL process with a limit of ${ROW_LIMIT} rows per file.`);

        // Step 1: Create Tables
        console.log("\n[Phase 1] Creating database tables...");
        await dbRun(`DROP TABLE IF EXISTS order_items`);
        await dbRun(`DROP TABLE IF EXISTS products`);
        await dbRun(`DROP TABLE IF EXISTS orders`);
        await dbRun(`DROP TABLE IF EXISTS users`);

        await dbRun(`CREATE TABLE users (id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, email TEXT, age INTEGER, gender TEXT, state TEXT, street_address TEXT, postal_code TEXT, city TEXT, country TEXT, latitude REAL, longitude REAL, traffic_source TEXT, created_at TEXT)`);
        await dbRun(`CREATE TABLE orders (order_id INTEGER PRIMARY KEY, user_id INTEGER, status TEXT, gender TEXT, created_at TEXT, returned_at TEXT, shipped_at TEXT, delivered_at TEXT, num_of_item INTEGER, FOREIGN KEY (user_id) REFERENCES users(id))`);
        await dbRun(`CREATE TABLE products (id INTEGER PRIMARY KEY, cost REAL, category TEXT, name TEXT, brand TEXT, retail_price REAL, department TEXT, sku TEXT, distribution_center_id INTEGER)`);
        await dbRun(`CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, user_id INTEGER, product_id INTEGER, inventory_item_id INTEGER, status TEXT, created_at TEXT, shipped_at TEXT, delivered_at TEXT, returned_at TEXT, sale_price REAL, FOREIGN KEY (order_id) REFERENCES orders(order_id), FOREIGN KEY (product_id) REFERENCES products(id))`);
        console.log("Tables created successfully.");

        // Step 2: Load Data from CSVs
        console.log("\n[Phase 2] Loading data from CSV files...");
        await loadCsvStream(CSV_FILES.users, 'users');
        await loadCsvStream(CSV_FILES.orders, 'orders');
        await loadCsvStream(CSV_FILES.products, 'products');
        await loadCsvStream(CSV_FILES.order_items, 'order_items');
        console.log("\nAll data loaded successfully.");

    } catch (error) {
        console.error("\n--- A critical error occurred during the ETL process ---", error);
    } finally {
        db.close((err) => {
            if (err) return console.error("Error closing database:", err.message);
            console.log('\nDatabase connection closed. Process finished.');
        });
    }
};

// Optimized function to stream a limited number of CSV rows
const loadCsvStream = (csvPath, tableName) => {
    return new Promise((resolve, reject) => {
        console.log(` -> Streaming data for '${tableName}'...`);
        const stream = fs.createReadStream(csvPath);
        let stmt;
        let rowCount = 0;

        const parser = csv();
        stream.pipe(parser);

        db.run("BEGIN TRANSACTION");

        parser.on('data', (row) => {
            if (rowCount >= ROW_LIMIT) {
                // Once we hit the limit, destroy the stream and parser
                stream.unpipe(parser);
                parser.end();
                stream.destroy();
                return;
            }

            if (rowCount === 0) { // Prepare statement on first row
                const columns = Object.keys(row);
                const placeholders = columns.map(() => '?').join(', ');
                const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
                stmt = db.prepare(sql, (err) => { if (err) reject(err); });
            }

            const values = Object.values(row);
            stmt.run(values, (err) => { if (err) console.error(`DB Insert Error in ${tableName}:`, err.message); });
            rowCount++;
        });

        parser.on('end', () => {
            db.run("COMMIT", (err) => {
                if (err) {
                    console.error(`Commit Error for ${tableName}:`, err.message);
                    if (stmt) stmt.finalize();
                    reject(err);
                } else {
                    console.log(`    '${tableName}' streamed successfully (${rowCount} rows).`);
                    if (stmt) stmt.finalize(resolve);
                    else resolve();
                }
            });
        });

        parser.on('error', (err) => {
            db.run("ROLLBACK");
            reject(err);
        });
    });
};
