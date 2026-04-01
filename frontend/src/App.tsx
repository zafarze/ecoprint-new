import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';

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
import { useEffect } from 'react';
import api from './api/api';

// === ГЛОБАЛЬНЫЙ НАБЛЮДАТЕЛЬ ЗА НОВЫМИ ЗАКАЗАМИ ===
const GlobalObserver = () => {
  useEffect(() => {
    let lastOrderIdStr = localStorage.getItem('last_known_order_id');
    
    // Каждые 15 секунд тихо спрашиваем сервер, есть ли новые заказы
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || token === 'undefined') return;

        const settingsStr = localStorage.getItem('notify_settings');
        // Если настроек нет, считаем что разрешено
        const settings = settingsStr ? JSON.parse(settingsStr) : { sound: true, popup: true };

        // Если мы только что вошли и last_id нет в локалсторадже, 
        // сервер вернет has_new: false, но выдаст актуальный latest_id
        const res = await api.get(`/orders/poll/?last_id=${lastOrderIdStr || 0}`);
        const { has_new, latest_id, new_orders } = res.data;

        if (latest_id) {
            localStorage.setItem('last_known_order_id', latest_id.toString());
            lastOrderIdStr = latest_id.toString();
        }

        if (has_new && new_orders && new_orders.length > 0) {
           // Звук
           if (settings.sound) {
               const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
               audio.volume = 0.5;
               audio.play().catch(e => console.error("Звук заблокирован политикой автоплея:", e));
           }

           // Всплывающие окна
           if (settings.popup) {
               new_orders.forEach((o: any) => {
                   toast.success(`Новый заказ: ${o.client} (№${o.id})!`, { icon: '🔥', duration: 10000 });
               });
           }
        }
      } catch (err) {
         // Молча игнорируем сетевые ошибки, чтобы не спамить в консоль
      }
    }, 15000); 

    return () => clearInterval(interval);
  }, []);

  return null;
}

// === ЗАЩИТНИК МАРШРУТОВ (Protected Route) ===
const RequireAuth = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <GlobalObserver />
      <Outlet />
    </>
  ); 
};

// === РОЛЕВОЙ ЗАЩИТНИК (RBAC Route) ===
const RequireRole = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;
  // По умолчанию предполагаем самую низкую роль (worker)
  const role = user?.role || 'worker';
  
  if (!allowedRoles.includes(role)) {
    // Всплывающее уведомление, что доступ запрещен
    console.warn("Доступ запрещен. Роль:", role);
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
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
              {/* Свободные маршруты для всех (Главная страница) */}
              <Route index element={<OrdersPage />} />

              {/* Маршруты для Администраторов и Менеджеров */}
              <Route element={<RequireRole allowedRoles={['superadmin', 'manager']} />}>
                <Route path="archive" element={<ArchivePage />} />
                <Route path="products" element={<ProductsPage />} />
              </Route>

              {/* Строго для Супер Администраторов */}
              <Route element={<RequireRole allowedRoles={['superadmin']} />}>
                <Route path="statistics" element={<StatisticsPage />} />
                
                {/* === ПРАВИЛЬНЫЙ РОУТИНГ НАСТРОЕК === */}
                <Route path="settings" element={<SettingsLayout />}>
                  <Route index element={<SettingsPage />} /> 
                  <Route path="company" element={<CompanySettings />} />
                  <Route path="integrations" element={<IntegrationsSettings />} />
                  <Route path="notifications" element={<NotificationSettings />} />
                  <Route path="products" element={<ProductManagement />} />
                  <Route path="users" element={<UserManagement />} />
                </Route>
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