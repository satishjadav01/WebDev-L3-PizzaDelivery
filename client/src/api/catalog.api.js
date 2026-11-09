import { request } from './httpClient.js';

export const catalogApi = {
  menu: () => request({ method: 'get', url: '/catalog/pizzas' }),
  builder: () => request({ method: 'get', url: '/catalog/builder' }),
};

export const metaApi = {
  clientConfig: () => request({ method: 'get', url: '/meta/client-config' }),
};
