import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/authContext';
import LoginForm from './components/LoginForm'; 
import Dashboard from './components/Dashboard';
import BrowseTenders from './pages/BrowserTenders'; // Import added
import Layout from './components/Layout';
import ManageTenders from './pages/ManageTenders';
import TenderDetails from './pages/TenderDetails';
import MyBids from './pages/MyBids';
import TenderEvaluation from './pages/TenderEvaluation';
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { state } = useAuth();
  if (state.loading) {
    return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  // Role check logic
  if (allowedRoles && !allowedRoles.includes(state.user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginForm />} />

        {/* Poster/Admin Route */}
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

        {/* Bidder Marketplace Route */}
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
<Route path="/tenders/:id" element={<ProtectedRoute><Layout><TenderDetails /></Layout></ProtectedRoute>} />
        <Route path="/my-bids" element={<ProtectedRoute><Layout><MyBids /></Layout></ProtectedRoute>} />
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;