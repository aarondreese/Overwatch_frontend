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
    console.error('DistributionGroupMembers API error:', error);
    return apiResponse(res, 500, false, 'Internal server error', null, error.message);
  }
}

async function handleGet(req, res) {
  const { id, distributionGroupId } = req.query;

  let query, params;
  
  if (id) {
    // Get single member
    query = `
      SELECT 
        dgm.ID as id,
        dgm.EmailAddress as emailAddress,
        dgm.IsActive as isActive,
        dgm.DistributionGroup_ID as distributionGroupId
      FROM pow.DistributionGroupMember dgm
      WHERE dgm.ID = @id
    `;
    params = { id: parseInt(id) };
  } else if (distributionGroupId) {
    // Get all members for a specific distribution group
    query = `
      SELECT 
        dgm.ID as id,
        dgm.EmailAddress as emailAddress,
        dgm.IsActive as isActive,
        dgm.DistributionGroup_ID as distributionGroupId
      FROM pow.DistributionGroupMember dgm
      WHERE dgm.DistributionGroup_ID = @distributionGroupId
      ORDER BY dgm.EmailAddress
    `;
    params = { distributionGroupId: parseInt(distributionGroupId) };
  } else {
    // Get all members
    query = `
      SELECT 
        dgm.ID as id,
        dgm.EmailAddress as emailAddress,
        dgm.IsActive as isActive,
        dgm.DistributionGroup_ID as distributionGroupId
      FROM pow.DistributionGroupMember dgm
      ORDER BY dgm.EmailAddress
    `;
    params = {};
  }

  const result = await executeQuery(query, params);
  
  // Convert IsActive to boolean
  const members = result.recordset.map(member => ({
    ...member,
    isActive: Boolean(member.isActive)
  }));

  return apiResponse(res, 200, true, 'Distribution group members retrieved successfully', id ? members[0] : members);
}

async function handlePost(req, res) {
  const { distributionGroupId, emailAddress, isActive = true } = req.body;

  if (!distributionGroupId) {
    return apiResponse(res, 400, false, 'Distribution group ID is required');
  }

  if (!emailAddress) {
    return apiResponse(res, 400, false, 'Email address is required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailAddress)) {
    return apiResponse(res, 400, false, 'Invalid email address format');
  }

  // Check if distribution group exists
  const existingGroup = await executeQuery(
    'SELECT ID FROM pow.DistributionGroup WHERE ID = @distributionGroupId',
    { distributionGroupId: parseInt(distributionGroupId) }
  );

  if (existingGroup.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Distribution group not found');
  }

  // Check if member already exists in this group
  const existingMember = await executeQuery(
    'SELECT ID FROM pow.DistributionGroupMember WHERE DistributionGroup_ID = @distributionGroupId AND EmailAddress = @emailAddress',
    { distributionGroupId: parseInt(distributionGroupId), emailAddress }
  );

  if (existingMember.recordset.length > 0) {
    return apiResponse(res, 400, false, 'Member already exists in this distribution group');
  }

  const query = `
    INSERT INTO pow.DistributionGroupMember (DistributionGroup_ID, EmailAddress, IsActive)
    OUTPUT INSERTED.ID, INSERTED.EmailAddress, INSERTED.IsActive, INSERTED.DistributionGroup_ID
    VALUES (@distributionGroupId, @emailAddress, @isActive)
  `;

  const result = await executeQuery(query, { 
    distributionGroupId: parseInt(distributionGroupId), 
    emailAddress, 
    isActive: isActive ? 1 : 0 
  });
  
  const newMember = {
    id: result.recordset[0].ID,
    emailAddress: result.recordset[0].EmailAddress,
    isActive: Boolean(result.recordset[0].IsActive),
    distributionGroupId: result.recordset[0].DistributionGroup_ID
  };

  return apiResponse(res, 201, true, 'Distribution group member added successfully', newMember);
}

async function handlePut(req, res) {
  const { id, emailAddress, isActive } = req.body;

  if (!id) {
    return apiResponse(res, 400, false, 'Member ID is required');
  }

  // Check if member exists
  const existingMember = await executeQuery(
    'SELECT ID, DistributionGroup_ID FROM pow.DistributionGroupMember WHERE ID = @id',
    { id: parseInt(id) }
  );

  if (existingMember.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Distribution group member not found');
  }

  // If email address is being updated, validate format and uniqueness
  if (emailAddress) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return apiResponse(res, 400, false, 'Invalid email address format');
    }

    // Check if email already exists in the same group (excluding current member)
    const duplicateMember = await executeQuery(
      'SELECT ID FROM pow.DistributionGroupMember WHERE DistributionGroup_ID = @distributionGroupId AND EmailAddress = @emailAddress AND ID != @id',
      { 
        distributionGroupId: existingMember.recordset[0].DistributionGroup_ID, 
        emailAddress, 
        id: parseInt(id) 
      }
    );

    if (duplicateMember.recordset.length > 0) {
      return apiResponse(res, 400, false, 'Email address already exists in this distribution group');
    }
  }

  // Build dynamic query based on provided fields
  let setClause = '';
  let params = { id: parseInt(id) };

  if (emailAddress !== undefined) {
    setClause += 'EmailAddress = @emailAddress';
    params.emailAddress = emailAddress;
  }

  if (isActive !== undefined) {
    if (setClause) setClause += ', ';
    setClause += 'IsActive = @isActive';
    params.isActive = isActive ? 1 : 0;
  }

  if (!setClause) {
    return apiResponse(res, 400, false, 'No fields to update');
  }

  const query = `
    UPDATE pow.DistributionGroupMember 
    SET ${setClause}
    OUTPUT INSERTED.ID, INSERTED.EmailAddress, INSERTED.IsActive, INSERTED.DistributionGroup_ID
    WHERE ID = @id
  `;

  const result = await executeQuery(query, params);
  
  if (result.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Distribution group member not found');
  }

  const updatedMember = {
    id: result.recordset[0].ID,
    emailAddress: result.recordset[0].EmailAddress,
    isActive: Boolean(result.recordset[0].IsActive),
    distributionGroupId: result.recordset[0].DistributionGroup_ID
  };

  return apiResponse(res, 200, true, 'Distribution group member updated successfully', updatedMember);
}

async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return apiResponse(res, 400, false, 'Member ID is required');
  }

  // Check if member exists
  const existingMember = await executeQuery(
    'SELECT ID FROM pow.DistributionGroupMember WHERE ID = @id',
    { id: parseInt(id) }
  );

  if (existingMember.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Distribution group member not found');
  }

  // Delete the member
  await executeQuery(
    'DELETE FROM pow.DistributionGroupMember WHERE ID = @id',
    { id: parseInt(id) }
  );

  return apiResponse(res, 200, true, 'Distribution group member deleted successfully');
}
  