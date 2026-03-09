import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import LeadsDashboard from './components/LeadsDashboard';
import LeadDetailsPage from './pages/LeadDetailsPage';
import LoginPage from './pages/LoginPage';
import AuthActionPage from './pages/AuthActionPage';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/action',
    element: <AuthActionPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <LeadsDashboard />,
      },
      {
        path: 'leads/:id',
        element: <LeadDetailsPage />,
      },
    ],
  },
]);
