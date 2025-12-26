  import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
  import { AuthProvider } from './contexts/AuthContext';
  import ProtectedRoute from './components/ProtectedRoute';
  import Login from './pages/Login';
  import Dashboard from './pages/Dashboard';
  import Tenders from './pages/Tenders';
  import TenderDetail from './pages/TenderDetail';

  function App() {
    return (
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
            path="/tenders"
            element={
              <ProtectedRoute>
                <Tenders />
              </ProtectedRoute>
            }
            />
            <Route
            path="/tenders/:id"
            element={
              <ProtectedRoute>
                <TenderDetail />
              </ProtectedRoute>
            }
          />
            <Route path="/" element={<Login />} />
          </Routes>
        </Router>
      </AuthProvider>
    )
  }

  export default App
