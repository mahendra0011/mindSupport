export const PORT = Number(process.env.PORT || 5001);
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindsupport";
function databaseFromMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0] || "");
    return database || "";
  } catch {
    return "";
  }
}

export const MONGODB_DATABASE =
  process.env.MONGODB_DATABASE || process.env.MONGODB_DB_NAME || databaseFromMongoUri(MONGODB_URI) || "mindsupport";
export const JWT_SECRET = process.env.JWT_SECRET || "change-this-dev-secret";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:8080";
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

export function getMongoOptions(extra = {}) {
  return {
    ...extra,
    dbName: MONGODB_DATABASE,
  };
}

export function maskMongoUri(uri = MONGODB_URI) {
  return uri.replace(/\/\/.*@/, "//***@");
}
