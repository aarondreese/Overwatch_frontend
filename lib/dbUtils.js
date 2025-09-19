// Database utility functions for common operations
import { executeQuery, executeStoredProcedure, sql } from './db';

// Generic CRUD operations
export const dbUtils = {
  // GET operations
  async getAll(tableName, orderBy = 'id') {
    const query = `SELECT * FROM ${tableName} ORDER BY ${orderBy}`;
    const result = await executeQuery(query);
    return result.recordset;
  },

  async getById(tableName, id, idColumn = 'id') {
    const query = `SELECT * FROM ${tableName} WHERE ${idColumn} = @id`;
    const result = await executeQuery(query, { id });
    return result.recordset[0];
  },

  async getByCondition(tableName, whereClause, params = {}) {
    const query = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
    const result = await executeQuery(query, params);
    return result.recordset;
  },

  // INSERT operations
  async insert(tableName, data) {
    const columns = Object.keys(data).join(', ');
    const values = Object.keys(data).map(key => `@${key}`).join(', ');
    const query = `
      INSERT INTO ${tableName} (${columns})
      VALUES (${values});
      SELECT SCOPE_IDENTITY() as id;
    `;
    const result = await executeQuery(query, data);
    return result.recordset[0]?.id;
  },

  // UPDATE operations
  async update(tableName, id, data, idColumn = 'id') {
    const setClause = Object.keys(data)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
    const query = `
      UPDATE ${tableName} 
      SET ${setClause}
      WHERE ${idColumn} = @id
    `;
    
    const params = { ...data, id };
    const result = await executeQuery(query, params);
    return result.rowsAffected[0];
  },

  // DELETE operations
  async delete(tableName, id, idColumn = 'id') {
    const query = `DELETE FROM ${tableName} WHERE ${idColumn} = @id`;
    const result = await executeQuery(query, { id });
    return result.rowsAffected[0];
  },

  // Soft delete (if you have isActive or isDeleted columns)
  async softDelete(tableName, id, idColumn = 'id') {
    const query = `
      UPDATE ${tableName} 
      SET isActive = 0, updatedAt = GETDATE()
      WHERE ${idColumn} = @id
    `;
    const result = await executeQuery(query, { id });
    return result.rowsAffected[0];
  },

  // Check if record exists
  async exists(tableName, id, idColumn = 'id') {
    const query = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${idColumn} = @id`;
    const result = await executeQuery(query, { id });
    return result.recordset[0].count > 0;
  },

  // Custom query with error handling
  async customQuery(query, params = {}) {
    try {
      const result = await executeQuery(query, params);
      return {
        success: true,
        data: result.recordset,
        rowsAffected: result.rowsAffected
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Execute stored procedure with error handling
  async callStoredProcedure(procedureName, params = {}) {
    try {
      const result = await executeStoredProcedure(procedureName, params);
      return {
        success: true,
        data: result.recordset,
        returnValue: result.returnValue
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// SQL data types for parameter binding
export const sqlTypes = sql;

// Common response handlers for API endpoints
export const apiResponse = {
  success: (res, data, message = 'Success') => {
    res.status(200).json({
      success: true,
      message,
      data
    });
  },

  created: (res, data, message = 'Created successfully') => {
    res.status(201).json({
      success: true,
      message,
      data
    });
  },

  error: (res, error, statusCode = 500) => {
    console.error('API Error:', error);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  },

  notFound: (res, message = 'Resource not found') => {
    res.status(404).json({
      success: false,
      message
    });
  },

  badRequest: (res, message = 'Bad request') => {
    res.status(400).json({
      success: false,
      message
    });
  },

  methodNotAllowed: (res, allowedMethods = []) => {
    res.setHeader('Allow', allowedMethods.join(', '));
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
};
