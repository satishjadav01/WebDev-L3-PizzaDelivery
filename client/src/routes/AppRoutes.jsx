import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '../config/routes.js';
import { AdminLoginPage } from '../features/admin/AdminLoginPage.jsx';
import { AdminOrdersPage } from '../features/admin/AdminOrdersPage.jsx';
import { InventoryPage } from '../features/admin/InventoryPage.jsx';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage.jsx';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage.jsx';
import { BuilderPage } from '../features/builder/BuilderPage.jsx';
import { DashboardPage } from '../features/catalog/DashboardPage.jsx';
import { CartPage } from '../features/orders/CartPage.jsx';
import { MyOrdersPage } from '../features/orders/MyOrdersPage.jsx';
import { OrderDetailPage } from '../features/orders/OrderDetailPage.jsx';
import { SummaryPage } from '../features/orders/SummaryPage.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { CustomerLayout } from '../layouts/CustomerLayout.jsx';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { GuestOnly, RequireAdmin, RequireCustomer } from './guards.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route element={<GuestOnly />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.admin.login} element={<AdminLoginPage />} />
        </Route>
        {/* Email links must work whether or not someone is signed in. */}
        <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />
        <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
      </Route>

      <Route element={<RequireCustomer />}>
        <Route element={<CustomerLayout />}>
          <Route path={ROUTES.home} element={<DashboardPage />} />
          <Route path={ROUTES.builder} element={<BuilderPage />} />
          <Route path={ROUTES.cart} element={<CartPage />} />
          <Route path={ROUTES.summary} element={<SummaryPage />} />
          <Route path={ROUTES.orders} element={<MyOrdersPage />} />
          <Route path={ROUTES.order(':id')} element={<OrderDetailPage />} />
        </Route>
      </Route>

      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.admin.orders} element={<AdminOrdersPage />} />
          <Route path={ROUTES.admin.inventory} element={<InventoryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
