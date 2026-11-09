import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { metaApi } from '../api/catalog.api.js';
import { createQueryClient } from '../config/queryClient.js';
import { AuthProvider } from '../context/AuthContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { ClientConfigProvider } from '../context/ClientConfigContext.jsx';
import { clientConfigFixture } from './fixtures.js';

/**
 * Renders UI inside the real provider stack. The test must `vi.mock` the API modules it
 * touches; client config is stubbed here so every component sees realistic settings.
 */
export function renderWithProviders(ui, { route = '/', config = clientConfigFixture } = {}) {
  vi.spyOn(metaApi, 'clientConfig').mockResolvedValue(config);
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <ClientConfigProvider>
          <AuthProvider>
            <CartProvider>{ui}</CartProvider>
          </AuthProvider>
        </ClientConfigProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
