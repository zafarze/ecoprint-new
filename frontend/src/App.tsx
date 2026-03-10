// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import OrdersPage from './pages/OrdersPage';
import ArchivePage from './pages/ArchivePage';
import StatisticsPage from './pages/StatisticsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';

// === ДОБАВЛЕННЫЕ ИМПОРТЫ ДЛЯ РАЗДЕЛА НАСТРОЕК ===
import SettingsLayout from './settings/SettingsLayout';
import CompanySettings from './settings/CompanySettings';
import IntegrationsSettings from './settings/IntegrationsSettings';
import NotificationSettings from './settings/NotificationSettings';
import ProductManagement from './settings/ProductManagement';
import UserManagement from './settings/UserManagement';

import '@fortawesome/fontawesome-free/css/all.min.css';

// === ЗАЩИТНИК МАРШРУТОВ (Protected Route) ===
// Проверяет токен до того, как пустить пользователя к компонентам
const RequireAuth = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    // Если токена нет, моментально перекидываем на логин, заменяя историю (replace)
    return <Navigate to="/login" replace />;
  }
  return <Outlet />; // Если токен есть, рендерим вложенные маршруты
};

function App() {
  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            marginTop: '16px',
            background: '#ffffff',
            color: '#1e293b',
            fontWeight: '700',
            fontSize: '14px',
            borderRadius: '100px',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
            border: '1px solid #f1f5f9',
            padding: '12px 24px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />

      <BrowserRouter>
        <Routes>
          {/* Публичный маршрут */}
          <Route path="/login" element={<LoginPage />} />

          {/* Защищенные маршруты обернуты в RequireAuth */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<OrdersPage />} />
              <Route path="archive" element={<ArchivePage />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="products" element={<ProductsPage />} />

              {/* === ПРАВИЛЬНЫЙ РОУТИНГ НАСТРОЕК === */}
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<SettingsPage />} /> {/* Главная страница настроек */}
                <Route path="company" element={<CompanySettings />} />
                <Route path="integrations" element={<IntegrationsSettings />} />
                <Route path="notifications" element={<NotificationSettings />} />
                <Route path="products" element={<ProductManagement />} />
                <Route path="users" element={<UserManagement />} />
              </Route>

              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;