import { request } from './httpClient.js';

export const adminApi = {
  inventory: () => request({ method: 'get', url: '/admin/inventory' }),
  updateInventory: (id, changes) =>
    request({ method: 'patch', url: `/admin/inventory/${id}`, data: changes }),
  orders: (params) => request({ method: 'get', url: '/admin/orders', params }),
  changeOrderStatus: (id, status) =>
    request({ method: 'patch', url: `/admin/orders/${id}/status`, data: { status } }),
};
