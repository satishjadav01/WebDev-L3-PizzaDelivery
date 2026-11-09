import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createQueryClient } from './config/queryClient.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { ClientConfigProvider } from './context/ClientConfigContext.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClientConfigProvider>
          <AuthProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </AuthProvider>
        </ClientConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
