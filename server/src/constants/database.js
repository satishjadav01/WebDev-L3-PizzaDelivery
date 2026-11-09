export const MONGO_DUPLICATE_KEY_CODE = 11_000;

// Mongoose connection.readyState values.
export const DB_READY_STATE = Object.freeze({
  DISCONNECTED: 0,
  CONNECTED: 1,
  CONNECTING: 2,
  DISCONNECTING: 3,
});

// 24 hex characters: the string form of a MongoDB ObjectId.
export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
