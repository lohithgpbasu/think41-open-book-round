// loadData.js
// This script reads user and order data from CSV files and loads it into a SQLite database.

const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

// Path to your SQLite database file
const DB_PATH = './ecommerce.db';

// Paths to your CSV files
const USERS_CSV_PATH = './archive/users.csv';
const ORDERS_CSV_PATH = './archive/orders.csv';

// Initialize the database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        return;
    }
    console.log("Connected to the SQLite database.");
});

// This function creates the necessary tables
const createTables = () => {
    // Use serialize to ensure table creation happens in order before data loading
    db.serialize(() => {
        console.log("Creating tables if they don't exist...");

        // Drop tables if they exist to start fresh on each run
        db.run(`DROP TABLE IF EXISTS users`);
        db.run(`DROP TABLE IF EXISTS orders`);

        // Create the users table based on the plan
        db.run(`CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            age INTEGER,
            gender TEXT,
            state TEXT,
            street_address TEXT,
            postal_code TEXT,
            city TEXT,
            country TEXT,
            latitude REAL,
            longitude REAL,
            traffic_source TEXT,
            created_at TEXT
        )`, (err) => {
            if (err) {
                console.error("Error creating users table:", err.message);
            } else {
                console.log("Table 'users' created successfully.");
                loadCsvData(USERS_CSV_PATH, 'users');
            }
        });

        // Create the orders table based on the plan
        db.run(`CREATE TABLE orders (
            order_id INTEGER PRIMARY KEY,
            user_id INTEGER,
            status TEXT,
            gender TEXT,
            created_at TEXT,
            returned_at TEXT,
            shipped_at TEXT,
            delivered_at TEXT,
            num_of_item INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) {
                console.error("Error creating orders table:", err.message);
            } else {
                console.log("Table 'orders' created successfully.");
                loadCsvData(ORDERS_CSV_PATH, 'orders');
            }
        });
    });
};

// Generic function to load data from a CSV file into a specified table
const loadCsvData = (csvPath, tableName) => {
    const records = [];
    fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
            // Collect all rows to perform a bulk insert
            records.push(row);
        })
        .on('end', () => {
            console.log(`CSV file '${csvPath}' successfully processed. Inserting ${records.length} records into '${tableName}'...`);

            if (records.length === 0) {
                console.log(`No records to insert for ${tableName}.`);
                return;
            }

            const columns = Object.keys(records[0]);
            const placeholders = columns.map(() => '?').join(', ');
            const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

            const stmt = db.prepare(sql);

            // Use a transaction for bulk inserts, which is much faster
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                records.forEach(record => {
                    const values = columns.map(col => record[col]);
                    stmt.run(values, (err) => {
                        if (err) {
                            console.error(`Error inserting row into ${tableName}:`, err.message);
                        }
                    });
                });
                db.run("COMMIT", (err) => {
                     if (err) {
                        console.error("Error committing transaction:", err.message);
                     } else {
                        console.log(`All records from '${csvPath}' inserted into '${tableName}'.`);
                     }
                });
            });

            stmt.finalize();
        })
        .on('error', (err) => {
             console.error(`Error reading CSV file ${csvPath}:`, err);
        });
};


// Run the table creation and data loading process
createTables();

// Close the database connection when the script is about to exit
process.on('exit', (code) => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Closed the database connection.');
    });
});
