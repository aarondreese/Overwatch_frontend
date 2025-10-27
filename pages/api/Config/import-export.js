import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    // Export all configuration data
    try {
      const query = `
        SELECT 
          Parameter,
          Environment,
          ConfigValue
        FROM pow.Config
        ORDER BY Parameter, Environment
      `;
      
      const result = await executeQuery(query, {});
      const configs = result.recordset;

      // Get distinct parameters and environments
      const currentEnvRecord = configs.find(
        c => c.Parameter === 'CurrentEnvironment' && c.Environment === null
      );
      
      const regularConfigs = configs.filter(
        c => c.Parameter !== 'CurrentEnvironment'
      );

      // Create export data
      const exportData = {
        exportDate: new Date().toISOString(),
        currentEnvironment: currentEnvRecord?.ConfigValue || null,
        configurations: regularConfigs.map(c => ({
          parameter: c.Parameter,
          environment: c.Environment,
          configValue: c.ConfigValue
        }))
      };

      return res.status(200).json({
        success: true,
        data: exportData
      });
    } catch (error) {
      console.error('Export error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export configuration',
        error: error.message
      });
    }
  } else if (method === 'POST') {
    // Validate and preview import
    try {
      const { importData, validateOnly = true } = req.body;

      if (!importData || !importData.configurations) {
        return res.status(400).json({
          success: false,
          message: 'Invalid import data format'
        });
      }

      // Get current configuration
      const currentQuery = `SELECT Parameter, Environment, ConfigValue, ID FROM pow.Config`;
      const currentResult = await executeQuery(currentQuery, {});
      const currentConfigs = currentResult.recordset;

      // Analyze differences
      const newRecords = [];
      const updatedRecords = [];
      const unchangedRecords = [];
      const errors = [];

      for (const importConfig of importData.configurations) {
        const { parameter, environment, configValue } = importConfig;

        // Validate required fields
        if (!parameter) {
          errors.push({ error: 'Missing parameter name', config: importConfig });
          continue;
        }

        // Find existing record
        const existing = currentConfigs.find(
          c => c.Parameter === parameter && 
               ((c.Environment === null && environment === null) || 
                (c.Environment === environment))
        );

        if (existing) {
          if (existing.ConfigValue !== configValue) {
            updatedRecords.push({
              parameter,
              environment,
              oldValue: existing.ConfigValue,
              newValue: configValue,
              id: existing.ID
            });
          } else {
            unchangedRecords.push({
              parameter,
              environment,
              value: configValue
            });
          }
        } else {
          newRecords.push({
            parameter,
            environment,
            configValue
          });
        }
      }

      // If not validate only, perform the actual import
      if (!validateOnly && errors.length === 0) {
        // Insert new records
        for (const record of newRecords) {
          const insertQuery = `
            INSERT INTO pow.Config (Parameter, Environment, ConfigValue)
            VALUES (@parameter, @environment, @configValue)
          `;
          await executeQuery(insertQuery, {
            parameter: record.parameter,
            environment: record.environment || null,
            configValue: record.configValue || null
          });
        }

        // Update existing records
        for (const record of updatedRecords) {
          const updateQuery = `
            UPDATE pow.Config
            SET ConfigValue = @configValue
            WHERE ID = @id
          `;
          await executeQuery(updateQuery, {
            id: record.id,
            configValue: record.newValue || null
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Configuration imported successfully',
          data: {
            imported: true,
            newRecords: newRecords.length,
            updatedRecords: updatedRecords.length,
            unchangedRecords: unchangedRecords.length,
            errors: errors.length
          }
        });
      }

      // Return validation results
      return res.status(200).json({
        success: true,
        message: 'Validation complete',
        data: {
          imported: false,
          validation: {
            totalRecords: importData.configurations.length,
            newRecords,
            updatedRecords,
            unchangedRecords,
            errors
          }
        }
      });
    } catch (error) {
      console.error('Import error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to import configuration',
        error: error.message
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}
