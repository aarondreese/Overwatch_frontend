// Database configuration for MSSQL connection
const sql = require('mssql');

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'your_username',
  password: process.env.DB_PASSWORD || 'your_password',
  server: process.env.DB_SERVER || 'localhost', // You can use 'localhost\\instance' to connect to named instance
  database: process.env.DB_DATABASE || 'your_database',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || false, // Use this if you're on Azure
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true, // Change to false for production
    enableArithAbort: true,
  },
  port: parseInt(process.env.DB_PORT) || 1433,
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Connection pool instance
let poolPromise;

const getConnection = async () => {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(dbConfig).connect();
    }
    return await poolPromise;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

// Function to execute queries
const executeQuery = async (query, params = {}) => {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Add parameters to the request
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
};

// Function to execute stored procedures
const executeStoredProcedure = async (procedureName, params = {}) => {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Add parameters to the request
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.execute(procedureName);
    return result;
  } catch (error) {
    console.error('Stored procedure execution failed:', error);
    throw error;
  }
};

// Close connection pool
const closeConnection = async () => {
  try {
    if (poolPromise) {
      const pool = await poolPromise;
      await pool.close();
      poolPromise = null;
    }
  } catch (error) {
    console.error('Error closing connection:', error);
  }
};

module.exports = {
  sql,
  getConnection,
  executeQuery,
  executeStoredProcedure,
  closeConnection,
  dbConfig
};
