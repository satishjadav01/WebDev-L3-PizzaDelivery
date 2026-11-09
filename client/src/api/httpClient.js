import axios from 'axios';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../config/constants.js';
import { sessionStore } from '../storage/sessionStore.js';
import { ApiError } from './ApiError.js';

export const httpClient = axios.create({ baseURL: env.apiBaseUrl });

httpClient.interceptors.request.use((request) => {
  const session = sessionStore.read();
  if (session?.accessToken) {
    request.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return request;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = ApiError.fromAxios(error);
    // A 401 on a request that carried a session means it expired or was revoked.
    if (apiError.status === HTTP_STATUS.UNAUTHORIZED && sessionStore.read()) {
      sessionStore.clear();
    }
    return Promise.reject(apiError);
  },
);

/** Unwraps `response.data` so API modules read like plain async functions. */
export const request = (config) => httpClient.request(config).then((response) => response.data);
