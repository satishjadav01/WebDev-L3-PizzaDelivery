import { ERROR_CODE } from '../config/constants.js';
/** The one error shape the UI deals with, whether the failure was HTTP, validation or network. */
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static fromAxios(error) {
    const body = error.response?.data?.error;
    if (!error.response) {
      return new ApiError({
        code: ERROR_CODE.NETWORK,
        message: 'Cannot reach the server. Check your connection and try again.',
      });
    }
    return new ApiError({
      status: error.response.status,
      code: body?.code,
      message: body?.message ?? 'Something went wrong. Please try again.',
      details: body?.details,
    });
  }
  /** Field-level problems from a validation error, keyed by field path. */
  fieldErrors() {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(this.details.map((issue) => [issue.path, issue.message]));
  }
}
