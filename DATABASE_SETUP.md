# Database Setup Guide

## Prerequisites

1. **SQL Server**: Ensure you have SQL Server installed and running
2. **Database**: Create a database named `Overwatch` (or update the name in `.env.local`)
3. **User Permissions**: Ensure your database user has read/write permissions

## Configuration

1. **Copy Environment File**:

   ```bash
   cp .env.example .env.local
   ```

2. **Update Database Credentials** in `.env.local`:

   ```env
   DB_SERVER=your_server_name_or_ip
   DB_DATABASE=Overwatch
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_PORT=1433
   ```

3. **Test Connection**:
   - Start the development server: `npm run dev`
   - Visit: `http://localhost:3000/api/test/db-connection`
   - You should see a success message if connected properly

## Database Structure

The API endpoints will expect the following tables (create these in your SQL Server database):

### Core Tables

- **SourceSystems**: Manage source system configurations
- **Domains**: Domain management
- **Synonyms**: Synonym mappings
- **DistributionGroups**: Email distribution groups
- **DistributionGroupMembers**: Members of distribution groups

### Example Table Creation Scripts

```sql
-- Create SourceSystems table
CREATE TABLE SourceSystems (
    id int IDENTITY(1,1) PRIMARY KEY,
    name nvarchar(255) NOT NULL,
    description nvarchar(500),
    isActive bit DEFAULT 1,
    createdAt datetime2 DEFAULT GETDATE(),
    updatedAt datetime2 DEFAULT GETDATE()
);

-- Create Domains table
CREATE TABLE Domains (
    id int IDENTITY(1,1) PRIMARY KEY,
    domainName nvarchar(255) NOT NULL,
    sourceSystemId int,
    isActive bit DEFAULT 1,
    createdAt datetime2 DEFAULT GETDATE(),
    updatedAt datetime2 DEFAULT GETDATE(),
    FOREIGN KEY (sourceSystemId) REFERENCES SourceSystems(id)
);

-- Create Synonyms table
CREATE TABLE Synonyms (
    id int IDENTITY(1,1) PRIMARY KEY,
    sourceSystemId int,
    domainId int,
    synonymValue nvarchar(255) NOT NULL,
    mappedValue nvarchar(255) NOT NULL,
    isActive bit DEFAULT 1,
    createdAt datetime2 DEFAULT GETDATE(),
    updatedAt datetime2 DEFAULT GETDATE(),
    FOREIGN KEY (sourceSystemId) REFERENCES SourceSystems(id),
    FOREIGN KEY (domainId) REFERENCES Domains(id)
);

-- Create DistributionGroups table
CREATE TABLE DistributionGroups (
    id int IDENTITY(1,1) PRIMARY KEY,
    groupName nvarchar(255) NOT NULL,
    emailAddress nvarchar(255),
    description nvarchar(500),
    isActive bit DEFAULT 1,
    createdAt datetime2 DEFAULT GETDATE(),
    updatedAt datetime2 DEFAULT GETDATE()
);

-- Create DistributionGroupMembers table
CREATE TABLE DistributionGroupMembers (
    id int IDENTITY(1,1) PRIMARY KEY,
    groupId int NOT NULL,
    emailAddress nvarchar(255) NOT NULL,
    isActive bit DEFAULT 1,
    createdAt datetime2 DEFAULT GETDATE(),
    updatedAt datetime2 DEFAULT GETDATE(),
    FOREIGN KEY (groupId) REFERENCES DistributionGroups(id)
);
```

## Security Notes

- **Never commit `.env.local`** - it contains sensitive database credentials
- **Use environment variables** for all database configuration
- **Enable SSL/encryption** for production databases
- **Use least privilege principle** for database user permissions

## Troubleshooting

1. **Connection Issues**:

   - Verify SQL Server is running
   - Check firewall settings (port 1433)
   - Confirm database user has proper permissions

2. **Authentication Issues**:

   - For Windows Authentication, use trusted connection
   - For SQL Authentication, ensure user exists and password is correct

3. **SSL/TLS Issues**:
   - Set `DB_TRUST_CERT=true` for development
   - Set `DB_ENCRYPT=true` for production with proper certificates
