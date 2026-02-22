// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './context/authContext';
// Import from the consolidated Context file
import { WebSocketProvider } from './contexts/WebSocketContext/WebSocketContext';
// Components & Layout
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import BrowseTenders from './pages/BrowserTenders';
import Layout from './components/Layout';
import ManageTenders from './pages/ManageTenders';
import TenderDetails from './pages/TenderDetails';
import MyBids from './pages/MyBids';
import TenderEvaluation from './pages/TenderEvaluation';
import TeamsPage from './components/teams';
import MessagesPage from './pages/MessagesPage';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { state } = useAuth();
  
  if (state.loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(state.user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginForm />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MessagesPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/browse-tenders"
              element={
                <ProtectedRoute allowedRoles={['BIDDER', 'COMPANY_ADMIN', 'TENDER_POSTER']}>
                  <Layout>
                    <BrowseTenders />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tenders"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'TENDER_POSTER']}>
                  <Layout>
                    <ManageTenders />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route 
              path="/tenders/:id" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <TenderDetails />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/my-bids" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyBids />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route
              path="/tenders/evaluate/:id"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'TENDER_POSTER']}>
                  <Layout>
                    <TenderEvaluation />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teams"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'TENDER_POSTER']}>
                  <Layout>
                    <TeamsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

export default App;