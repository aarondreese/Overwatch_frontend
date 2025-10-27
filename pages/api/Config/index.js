import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'GET') {
      return await handleGet(req, res);
    } else if (method === 'POST') {
      return await handlePost(req, res);
    } else if (method === 'PUT') {
      return await handlePut(req, res);
    } else if (method === 'DELETE') {
      return await handleDelete(req, res);
    } else {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      });
    }
  } catch (error) {
    console.error('Config API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function handleGet(req, res) {
  try {
    // Get all config data
    const query = `SELECT * FROM pow.Config`;
    const result = await executeQuery(query, {});
    const allData = result.recordset;

    // Find the current environment (Parameter='CurrentEnvironment', Environment=NULL)
    const currentEnvRecord = allData.find(
      r => r.Parameter === 'CurrentEnvironment' && r.Environment === null
    );
    const currentEnvironment = currentEnvRecord ? currentEnvRecord.ConfigValue : null;

    // Get distinct environments (excluding NULL) - case insensitive
    const environmentsMap = new Map();
    allData
      .filter(r => r.Environment !== null)
      .forEach(r => {
        const envLower = r.Environment.toLowerCase();
        if (!environmentsMap.has(envLower)) {
          environmentsMap.set(envLower, r.Environment);
        }
      });
    const environments = Array.from(environmentsMap.values()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Get distinct parameters (excluding 'CurrentEnvironment') - case insensitive
    const parametersMap = new Map();
    allData
      .filter(r => r.Parameter !== 'CurrentEnvironment')
      .forEach(r => {
        const paramLower = r.Parameter.toLowerCase();
        if (!parametersMap.has(paramLower)) {
          parametersMap.set(paramLower, r.Parameter);
        }
      });
    const parameters = Array.from(parametersMap.values()).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Build grid structure
    const grid = parameters.map(param => {
      const row = {
        parameter: param
      };
      
      // Add a value for each environment (case-insensitive match)
      environments.forEach(env => {
        const record = allData.find(r => 
          r.Parameter.toLowerCase() === param.toLowerCase() && 
          r.Environment?.toLowerCase() === env.toLowerCase()
        );
        row[env] = {
          value: record?.ConfigValue || null,
          id: record?.ID || null
        };
      });
      
      return row;
    });

    return res.status(200).json({
      success: true,
      message: 'Configuration data retrieved successfully',
      data: {
        currentEnvironment,
        environments,
        parameters,
        grid,
        raw: allData // Include raw data for debugging
      }
    });
  } catch (error) {
    console.error('Error in handleGet for Config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve configuration data',
      error: error.message
    });
  }
}

async function handlePost(req, res) {
  const { parameter, environment, configValue } = req.body;

  if (!parameter) {
    return res.status(400).json({
      success: false,
      message: 'Parameter is required'
    });
  }

  try {
    // Check if this parameter/environment combination already exists (case-insensitive)
    const checkQuery = `
      SELECT ID FROM pow.Config 
      WHERE LOWER(Parameter) = LOWER(@parameter) AND 
            ${environment === null ? 'Environment IS NULL' : 'LOWER(Environment) = LOWER(@environment)'}
    `;
    
    const checkParams = { parameter };
    if (environment !== null) {
      checkParams.environment = environment;
    }
    
    const checkResult = await executeQuery(checkQuery, checkParams);
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Configuration for parameter '${parameter}' in environment '${environment || 'NULL'}' already exists`
      });
    }

    // Insert new config (only Parameter, Environment, ConfigValue - no Description column)
    const insertQuery = `
      INSERT INTO pow.Config (Parameter, Environment, ConfigValue)
      OUTPUT INSERTED.*
      VALUES (@parameter, @environment, @configValue)
    `;

    const insertResult = await executeQuery(insertQuery, {
      parameter,
      environment: environment || null,
      configValue: configValue || null
    });

    return res.status(201).json({
      success: true,
      message: 'Configuration created successfully',
      data: insertResult.recordset[0]
    });
  } catch (error) {
    console.error('Create config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create configuration',
      error: error.message
    });
  }
}

async function handlePut(req, res) {
  const { id, configValue } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Configuration ID is required'
    });
  }

  try {
    const updateQuery = `
      UPDATE pow.Config
      SET ConfigValue = @configValue
      WHERE ID = @id
    `;

    const result = await executeQuery(updateQuery, {
      id: parseInt(id),
      configValue: configValue !== undefined ? configValue : null
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Configuration updated successfully',
        data: { id: parseInt(id) }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }
  } catch (error) {
    console.error('Update config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error.message
    });
  }
}

async function handleDelete(req, res) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Configuration ID is required'
    });
  }

  try {
    const deleteQuery = `
      DELETE FROM pow.Config WHERE ID = @id
    `;

    const result = await executeQuery(deleteQuery, { id: parseInt(id) });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Configuration deleted successfully',
        data: { id: parseInt(id) }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }
  } catch (error) {
    console.error('Delete config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete configuration',
      error: error.message
    });
  }
}
