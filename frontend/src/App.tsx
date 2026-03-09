// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import OrdersPage from './pages/OrdersPage';
import ArchivePage from './pages/ArchivePage';
import StatisticsPage from './pages/StatisticsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';

import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  return (
    <>
      {/* Глобальный компонент уведомлений - выпадает сверху по центру */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            marginTop: '16px', // Отступ от верхнего края, чтобы не прилипало к хедеру
            background: '#ffffff',
            color: '#1e293b',
            fontWeight: '700',
            fontSize: '14px',
            borderRadius: '100px', // Делаем "таблеткой" под стиль нового хедера
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
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<OrdersPage />} />
            <Route path="archive" element={<ArchivePage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="settings/*" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="products" element={<ProductsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;