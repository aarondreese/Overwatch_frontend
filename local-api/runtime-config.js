const fs = require("fs");
const path = require("path");

const DEFAULT_PROFILE = "TEST";
const SUPPORTED_PROFILES = ["TEST", "LIVE"];
const SUPPORTED_AUTH_MODES = ["local-sql-auth", "domain-integrated"];

function toBool(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
}

function toInt(value, defaultValue) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function toCsvArray(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function readOptionalJsonConfig() {
  const configPath =
    process.env.LOCAL_API_CONFIG_PATH ||
    path.join(process.cwd(), "local-api", "config", "runtime.json");

  if (!fs.existsSync(configPath)) {
    return { fileConfig: {}, configPath, loaded: false };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return { fileConfig: parsed, configPath, loaded: true };
  } catch (error) {
    throw new Error(`Invalid JSON in runtime config file (${configPath}): ${error.message}`);
  }
}

function getEnvByProfile(profile, key, fallbackKey) {
  const profileKey = `${profile}_${key}`;
  if (process.env[profileKey] !== undefined) {
    return process.env[profileKey];
  }

  if (fallbackKey && process.env[fallbackKey] !== undefined) {
    return process.env[fallbackKey];
  }

  return undefined;
}

function getAllowedProfiles(fileConfig) {
  const allowedFromEnv = toCsvArray(process.env.LOCAL_API_ALLOWED_PROFILES);
  const allowedFromFile = Array.isArray(fileConfig.allowedProfiles)
    ? fileConfig.allowedProfiles.map((p) => String(p).toUpperCase())
    : [];

  const resolved = allowedFromEnv.length > 0 ? allowedFromEnv : allowedFromFile;
  if (resolved.length === 0) return SUPPORTED_PROFILES;

  const unsupported = resolved.filter((p) => !SUPPORTED_PROFILES.includes(p));
  if (unsupported.length > 0) {
    throw new Error(
      `LOCAL_API_ALLOWED_PROFILES contains unsupported profiles: ${unsupported.join(", ")}`
    );
  }

  return resolved;
}

function resolveProfileName(fileConfig, requestedProfile) {
  const profileFromEnv = process.env.LOCAL_API_PROFILE;
  const profileFromFile = fileConfig.activeProfile;
  const candidate = (
    requestedProfile ||
    profileFromEnv ||
    profileFromFile ||
    DEFAULT_PROFILE
  ).toUpperCase();

  if (!SUPPORTED_PROFILES.includes(candidate)) {
    throw new Error(
      `Unsupported LOCAL_API_PROFILE '${candidate}'. Supported profiles: ${SUPPORTED_PROFILES.join(", ")}`
    );
  }

  const allowedProfiles = getAllowedProfiles(fileConfig);
  if (!allowedProfiles.includes(candidate)) {
    throw new Error(
      `Profile '${candidate}' is not allowed by LOCAL_API_ALLOWED_PROFILES. Allowed: ${allowedProfiles.join(", ")}`
    );
  }

  return candidate;
}

function resolveProfileConfig(fileConfig, profileName) {
  const fileProfile = (fileConfig.profiles && fileConfig.profiles[profileName]) || {};

  const authMode =
    process.env.LOCAL_API_AUTH_MODE ||
    fileProfile.authMode ||
    "local-sql-auth";

  if (!SUPPORTED_AUTH_MODES.includes(authMode)) {
    throw new Error(
      `Unsupported LOCAL_API_AUTH_MODE '${authMode}'. Supported auth modes: ${SUPPORTED_AUTH_MODES.join(", ")}`
    );
  }

  const profileConfig = {
    profileName,
    authMode,
    server:
      getEnvByProfile(profileName, "DB_SERVER", "DB_SERVER") ||
      fileProfile.server ||
      "localhost",
    database:
      getEnvByProfile(profileName, "DB_DATABASE", "DB_DATABASE") ||
      fileProfile.database ||
      "your_database",
    port: toInt(
      getEnvByProfile(profileName, "DB_PORT", "DB_PORT") || fileProfile.port,
      1433
    ),
    encrypt: toBool(
      getEnvByProfile(profileName, "DB_ENCRYPT", "DB_ENCRYPT") ?? fileProfile.encrypt,
      false
    ),
    trustServerCertificate: toBool(
      getEnvByProfile(profileName, "DB_TRUST_CERT", "DB_TRUST_CERT") ??
        fileProfile.trustServerCertificate,
      true
    ),
    user:
      getEnvByProfile(profileName, "DB_USER", "DB_USER") ||
      fileProfile.user ||
      undefined,
    password:
      getEnvByProfile(profileName, "DB_PASSWORD", "DB_PASSWORD") ||
      fileProfile.password ||
      undefined,
    domain:
      getEnvByProfile(profileName, "DB_DOMAIN", "DB_DOMAIN") ||
      fileProfile.domain ||
      undefined,
  };

  return profileConfig;
}

function validateProfileConfig(profile, strictMode) {
  const problems = [];

  if (!profile.server) {
    problems.push("DB server is required");
  }

  if (!profile.database) {
    problems.push("DB database is required");
  }

  if (profile.authMode === "local-sql-auth") {
    if (!profile.user) problems.push("DB user is required for local-sql-auth");
    if (!profile.password) problems.push("DB password is required for local-sql-auth");
  }

  if (profile.authMode === "domain-integrated") {
    if (!profile.domain) problems.push("DB domain is required for domain-integrated");
    if (!profile.user) problems.push("DB user is required for domain-integrated");
    if (!profile.password) problems.push("DB password is required for domain-integrated");
  }

  if (strictMode && problems.length > 0) {
    throw new Error(
      `Invalid runtime config for profile ${profile.profileName}: ${problems.join("; ")}`
    );
  }

  return problems;
}

function getRuntimeConfig(options = {}) {
  const { requestedProfile } = options;
  const { fileConfig, configPath, loaded } = readOptionalJsonConfig();
  const strictMode = toBool(process.env.LOCAL_API_STRICT_CONFIG, true);
  const allowedProfiles = getAllowedProfiles(fileConfig);
  const profileName = resolveProfileName(fileConfig, requestedProfile);
  const profile = resolveProfileConfig(fileConfig, profileName);
  const validationProblems = validateProfileConfig(profile, strictMode);

  return {
    profile,
    strictMode,
    validationProblems,
    source: {
      configPath,
      configFileLoaded: loaded,
      allowedProfiles,
    },
  };
}

function getSafeRuntimeConfig(options = {}) {
  const runtime = getRuntimeConfig(options);
  return {
    ...runtime,
    profile: {
      ...runtime.profile,
      user: runtime.profile.user ? "***set***" : undefined,
      password: runtime.profile.password ? "***set***" : undefined,
    },
  };
}

module.exports = {
  getRuntimeConfig,
  getSafeRuntimeConfig,
  validateProfileConfig,
  SUPPORTED_PROFILES,
  SUPPORTED_AUTH_MODES,
};
