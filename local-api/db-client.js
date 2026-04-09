const sql = require("mssql");
const { getRuntimeConfig } = require("./runtime-config");

let poolPromise;
let activeConfigKey;

function getConfigKey(profile) {
  return JSON.stringify({
    profileName: profile.profileName,
    authMode: profile.authMode,
    server: profile.server,
    database: profile.database,
    port: profile.port,
    user: profile.user,
    domain: profile.domain,
  });
}

function getSqlAuthConfig(profile) {
  if (!profile.user || !profile.password) {
    throw new Error(
      `SQL auth requires username/password for profile ${profile.profileName}. ` +
        `Set ${profile.profileName}_DB_USER and ${profile.profileName}_DB_PASSWORD (or DB_USER/DB_PASSWORD).`
    );
  }

  return {
    user: profile.user,
    password: profile.password,
    server: profile.server,
    database: profile.database,
    options: {
      encrypt: profile.encrypt,
      trustServerCertificate: profile.trustServerCertificate,
      enableArithAbort: true,
    },
    port: profile.port,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

function getDomainIntegratedConfig(profile) {
  // mssql + tedious does not provide true service-account integrated auth for Node processes.
  // We support domain mode via NTLM credentials as a bridge for phase 2.
  if (!profile.user || !profile.password || !profile.domain) {
    throw new Error(
      `Domain-integrated mode requires domain/user/password for profile ${profile.profileName}. ` +
        `Set ${profile.profileName}_DB_DOMAIN, ${profile.profileName}_DB_USER and ${profile.profileName}_DB_PASSWORD.`
    );
  }

  return {
    server: profile.server,
    database: profile.database,
    options: {
      encrypt: profile.encrypt,
      trustServerCertificate: profile.trustServerCertificate,
    },
    authentication: {
      type: "ntlm",
      options: {
        userName: profile.user,
        password: profile.password,
        domain: profile.domain,
      },
    },
    port: profile.port,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

function buildConnectionConfig(profile) {
  if (profile.authMode === "local-sql-auth") {
    return getSqlAuthConfig(profile);
  }

  if (profile.authMode === "domain-integrated") {
    return getDomainIntegratedConfig(profile);
  }

  throw new Error(`Unsupported auth mode '${profile.authMode}'`);
}

async function getConnection() {
  const { profile } = getRuntimeConfig();
  const configKey = getConfigKey(profile);

  if (poolPromise && activeConfigKey !== configKey) {
    const existing = await poolPromise;
    await existing.close();
    poolPromise = null;
  }

  if (!poolPromise) {
    const connectionConfig = buildConnectionConfig(profile);
    activeConfigKey = configKey;
    poolPromise = new sql.ConnectionPool(connectionConfig).connect();
  }

  return poolPromise;
}

async function executeQuery(query, params = {}) {
  const pool = await getConnection();
  const request = pool.request();

  Object.keys(params).forEach((key) => {
    request.input(key, params[key]);
  });

  return request.query(query);
}

async function closeConnection() {
  if (!poolPromise) return;

  const pool = await poolPromise;
  await pool.close();
  poolPromise = null;
  activeConfigKey = undefined;
}

module.exports = {
  executeQuery,
  closeConnection,
};
