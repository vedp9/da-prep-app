import initSqlJs from 'sql.js';

let SQL = null;
let dbInstance = null;
let initPromise = null;

export async function getDatabase() {
  if (dbInstance) return dbInstance;
  
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!SQL) {
        SQL = await initSqlJs({
          // Point locateFile directly to public path for Vite deployment and offline PWA support
          locateFile: file => `/${file}`
        });
      }
      
      const db = new SQL.Database();
      
      // Create tables
      db.run(`
        CREATE TABLE orders (
          order_id INTEGER PRIMARY KEY,
          customer_id INTEGER,
          customer_name TEXT,
          sales REAL,
          order_date TEXT,
          region TEXT
        );

        CREATE TABLE customers (
          customer_id INTEGER PRIMARY KEY,
          name TEXT
        );

        CREATE TABLE products (
          category TEXT,
          price REAL
        );

        CREATE TABLE employees (
          name TEXT,
          salary REAL,
          department_id INTEGER
        );

        CREATE TABLE monthly_revenue (
          month TEXT,
          sales REAL
        );
      `);

      // Seed orders table
      db.run(`
        INSERT INTO orders VALUES (1, 101, 'Acme Corp', 250.00, '2026-06-01', 'East');
        INSERT INTO orders VALUES (2, 102, 'Globex Corp', 500.00, '2026-06-02', 'West');
        INSERT INTO orders VALUES (3, 103, 'Initech', 120.00, '2026-06-05', 'East');
        INSERT INTO orders VALUES (4, 101, 'Acme Corp', 80.00, '2026-06-10', 'East');
        INSERT INTO orders VALUES (5, 104, 'Umbrella Corp', 1500.00, '2026-06-12', 'West');
        INSERT INTO orders VALUES (6, 105, 'Hooli', 600.00, '2026-06-15', 'South');
        INSERT INTO orders VALUES (7, 102, 'Globex Corp', 450.00, '2026-06-20', 'West');
        INSERT INTO orders VALUES (8, 103, 'Initech', 90.00, '2026-06-22', 'East');
        INSERT INTO orders VALUES (9, 101, 'Acme Corp', 310.00, '2026-06-25', 'East');
        INSERT INTO orders VALUES (10, 106, 'Soylent Corp', 55.00, '2026-06-28', 'North');
      `);

      // Seed customers table
      db.run(`
        INSERT INTO customers VALUES (101, 'Acme Corp');
        INSERT INTO customers VALUES (102, 'Globex Corp');
        INSERT INTO customers VALUES (103, 'Initech');
        INSERT INTO customers VALUES (104, 'Umbrella Corp');
        INSERT INTO customers VALUES (105, 'Hooli');
        INSERT INTO customers VALUES (106, 'Soylent Corp');
      `);

      // Seed products table
      db.run(`
        INSERT INTO products VALUES ('Electronics', 299.99);
        INSERT INTO products VALUES ('Electronics', 149.50);
        INSERT INTO products VALUES ('Furniture', 450.00);
        INSERT INTO products VALUES ('Furniture', 89.99);
        INSERT INTO products VALUES ('Office Supplies', 15.00);
        INSERT INTO products VALUES ('Office Supplies', 45.00);
        INSERT INTO products VALUES ('Electronics', 899.99);
        INSERT INTO products VALUES ('Furniture', 199.99);
        INSERT INTO products VALUES ('Office Supplies', 120.00);
      `);

      // Seed employees table
      db.run(`
        INSERT INTO employees VALUES ('Alice', 95000, 1);
        INSERT INTO employees VALUES ('Bob', 80000, 1);
        INSERT INTO employees VALUES ('Charlie', 110000, 2);
        INSERT INTO employees VALUES ('David', 75000, 1);
        INSERT INTO employees VALUES ('Eva', 120000, 2);
        INSERT INTO employees VALUES ('Frank', 60000, 3);
        INSERT INTO employees VALUES ('Grace', 90000, 2);
        INSERT INTO employees VALUES ('Henry', 85000, 3);
        INSERT INTO employees VALUES ('Ivy', 105000, 2);
        INSERT INTO employees VALUES ('Jack', 95000, 1);
      `);

      // Seed monthly_revenue table
      db.run(`
        INSERT INTO monthly_revenue VALUES ('2026-01', 45000.00);
        INSERT INTO monthly_revenue VALUES ('2026-02', 48000.00);
        INSERT INTO monthly_revenue VALUES ('2026-03', 52000.00);
        INSERT INTO monthly_revenue VALUES ('2026-04', 49000.00);
        INSERT INTO monthly_revenue VALUES ('2026-05', 55000.00);
        INSERT INTO monthly_revenue VALUES ('2026-06', 62000.00);
      `);

      // Register DATE_TRUNC function to mock PostgreSQL behavior in SQLite
      db.create_function("DATE_TRUNC", (unit, dateStr) => {
        if (!dateStr) return null;
        // Check standard date formats like YYYY-MM-DD
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return dateStr;
        const [_, year, month, day] = match;
        
        if (unit.toLowerCase() === 'year') {
          return `${year}-01-01`;
        } else if (unit.toLowerCase() === 'month') {
          return `${year}-${month}-01`;
        } else {
          return `${year}-${month}-${day}`;
        }
      });

      dbInstance = db;
      return dbInstance;
    } catch (e) {
      console.error("Failed to initialize sql.js database:", e);
      throw e;
    }
  })();

  return initPromise;
}

export function executeQuery(db, queryStr) {
  if (!db) return { error: "Database not loaded." };
  try {
    const result = db.exec(queryStr);
    if (result.length === 0) {
      return { columns: [], rows: [], rowCount: 0 };
    }
    return {
      columns: result[0].columns,
      rows: result[0].values,
      rowCount: result[0].values.length
    };
  } catch (err) {
    return { error: err.message };
  }
}
