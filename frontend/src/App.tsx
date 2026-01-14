import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HITLReview from './pages/HITLReview';
import Analytics from './pages/Analytics';
import DataUpload from './pages/DataUpload';
import Catalog from './pages/Catalog';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="review" element={<HITLReview />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="upload" element={<DataUpload />} />
        <Route path="catalog" element={<Catalog />} />
      </Route>
    </Routes>
  );
}

export default App;
