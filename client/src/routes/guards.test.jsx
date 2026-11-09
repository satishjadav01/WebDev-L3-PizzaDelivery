import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth.api.js';
import { ROUTES } from '../config/routes.js';
import { sessionStore } from '../storage/sessionStore.js';
import { renderWithProviders } from '../test/render.jsx';
import { GuestOnly, RequireAdmin, RequireCustomer } from './guards.jsx';

const customer = { id: 'u1', name: 'Asha', email: 'a@x.test', role: 'customer' };
const admin = { id: 'u2', name: 'Admin', email: 'admin@x.test', role: 'admin' };

function renderRoutes(route) {
  return renderWithProviders(
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path={ROUTES.login} element={<p>login page</p>} />
        <Route path={ROUTES.admin.login} element={<p>admin login page</p>} />
      </Route>
      <Route element={<RequireCustomer />}>
        <Route path={ROUTES.home} element={<p>customer home</p>} />
      </Route>
      <Route element={<RequireAdmin />}>
        <Route path={ROUTES.admin.orders} element={<p>admin orders board</p>} />
        <Route path={ROUTES.admin.inventory} element={<p>admin inventory</p>} />
      </Route>
    </Routes>,
    { route },
  );
}

beforeEach(() => vi.restoreAllMocks());

describe('route guards', () => {
  it('sends anonymous visitors to sign in', async () => {
    renderRoutes(ROUTES.home);
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('restores a stored customer session before deciding', async () => {
    sessionStore.write({ accessToken: 't' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ user: customer });
    renderRoutes(ROUTES.home);
    expect(await screen.findByText('customer home')).toBeInTheDocument();
  });

  it('drops an expired stored session back to sign in', async () => {
    sessionStore.write({ accessToken: 'stale' });
    vi.spyOn(authApi, 'me').mockRejectedValue(new Error('expired'));
    renderRoutes(ROUTES.home);
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('keeps customers out of the admin area', async () => {
    sessionStore.write({ accessToken: 't' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ user: customer });
    renderRoutes(ROUTES.admin.inventory);
    expect(await screen.findByText('customer home')).toBeInTheDocument();
  });

  it('keeps admins out of the customer area', async () => {
    sessionStore.write({ accessToken: 't' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ user: admin });
    renderRoutes(ROUTES.home);
    expect(await screen.findByText('admin orders board')).toBeInTheDocument();
  });

  it('sends anonymous visitors of the admin area to the staff sign-in', async () => {
    renderRoutes(ROUTES.admin.inventory);
    expect(await screen.findByText('admin login page')).toBeInTheDocument();
  });

  it('turns signed-in visitors away from the sign-in page', async () => {
    sessionStore.write({ accessToken: 't' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ user: customer });
    renderRoutes(ROUTES.login);
    expect(await screen.findByText('customer home')).toBeInTheDocument();
  });
});
