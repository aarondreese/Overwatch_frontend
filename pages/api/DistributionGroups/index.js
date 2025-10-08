import { executeQuery } from '../../../lib/db';

// Helper function for API responses
function apiResponse(res, status, success, message, data = null, error = null) {
  return res.status(status).json({
    success,
    message,
    data,
    ...(error && { error })
  });
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res);
        break;
      case 'PUT':
        await handlePut(req, res);
        break;
      case 'DELETE':
        await handleDelete(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return apiResponse(res, 405, false, `Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('DistributionGroups API error:', error);
    return apiResponse(res, 500, false, 'Internal server error', null, error.message);
  }
}

async function handleGet(req, res) {
  const { id } = req.query;

  let query, params;
  
  if (id) {
    // Get single distribution group
    query = `
      SELECT 
        ID as id,
        GroupName as groupName
      FROM pow.DistributionGroup
      WHERE ID = @id
    `;
    params = { id: parseInt(id) };
  } else {
    // Get all distribution groups
    query = `
      SELECT 
        ID as id,
        GroupName as groupName
      FROM pow.DistributionGroup
      ORDER BY GroupName
    `;
    params = {};
  }

  const result = await executeQuery(query, params);
  
  if (id && result.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Distribution group not found');
  }

  const groups = result.recordset;
  return apiResponse(res, 200, true, 'Distribution groups retrieved successfully', id ? groups[0] : groups);
}

async function handlePost(req, res) {
  const { groupName } = req.body;

  if (!groupName) {
    return apiResponse(res, 400, false, 'Group name is required');
  }

  // Check if group name already exists
  const existingGroup = await executeQuery(
    'SELECT ID FROM pow.DistributionGroup WHERE GroupName = @groupName',
    { groupName }
  );

  if (existingGroup.recordset.length > 0) {
    return apiResponse(res, 400, false, 'Group name already exists');
  }

  const query = `
    INSERT INTO pow.DistributionGroup (GroupName)
    OUTPUT INSERTED.ID, INSERTED.GroupName
    VALUES (@groupName)
  `;

  const result = await executeQuery(query, { groupName });
  
  const newGroup = {
    id: result.recordset[0].ID,
    groupName: result.recordset[0].GroupName
  };

  return apiResponse(res, 201, true, 'Distribution group created successfully', newGroup);
}

async function handlePut(req, res) {
  const { id, groupName } = req.body;

  if (!id) {
    return apiResponse(res, 400, false, 'Group ID is required');
  }

  if (!groupName) {
    return apiResponse(res, 400, false, 'Group name is required');
  }

  // Check if group exists
  const existingGroup = await executeQuery(
    'SELECT ID FROM pow.DistributionGroup WHERE ID = @id',
    { id: parseInt(id) }
  );

  if (existingGroup.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Distribution group not found');
  }

  // Check if group name already exists for another group
  const duplicateGroup = await executeQuery(
    'SELECT ID FROM pow.DistributionGroup WHERE GroupName = @groupName AND ID != @id',
    { groupName, id: parseInt(id) }
  );

  if (duplicateGroup.recordset.length > 0) {
    return apiResponse(res, 400, false, 'Group name already exists');
  }

  const query = `
    UPDATE pow.DistributionGroup 
    SET GroupName = @groupName
    OUTPUT INSERTED.ID, INSERTED.GroupName
    WHERE ID = @id
  `;

  const result = await executeQuery(query, { groupName, id: parseInt(id) });
  
  if (result.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Distribution group not found');
  }

  const updatedGroup = {
    id: result.recordset[0].ID,
    groupName: result.recordset[0].GroupName
  };

  return apiResponse(res, 200, true, 'Distribution group updated successfully', updatedGroup);
}

async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return apiResponse(res, 400, false, 'Group ID is required');
  }

  // Check if group exists
  const existingGroup = await executeQuery(
    'SELECT ID FROM pow.DistributionGroup WHERE ID = @id',
    { id: parseInt(id) }
  );

  if (existingGroup.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Distribution group not found');
  }

  // Delete members first (if any)
  await executeQuery(
    'DELETE FROM pow.DistributionGroupMember WHERE DistributionGroup_ID = @id',
    { id: parseInt(id) }
  );

  // Delete the group
  await executeQuery(
    'DELETE FROM pow.DistributionGroup WHERE ID = @id',
    { id: parseInt(id) }
  );

  return apiResponse(res, 200, true, 'Distribution group deleted successfully');
}
