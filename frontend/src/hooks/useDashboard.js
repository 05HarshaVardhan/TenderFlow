import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';

export const useDashboardStats = (role) => {
  const [tenders, setTenders] = useState([]);
  const [bids, setBids] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      let tenderEndpoint = '';
      let bidEndpoint = '';

      switch (role) {
        case 'BIDDER':
          // Bids MADE by the user personally
          tenderEndpoint = '/tenders/available';
          bidEndpoint = '/bids/my-personal-bids'; 
          break;
          
        case 'TENDER_POSTER':
          // Bids RECEIVED on tenders created by this specific poster
          tenderEndpoint = '/tenders/my-posted-tenders'; 
          bidEndpoint = '/bids/received-on-my-tenders'; 
          break;
          
        case 'COMPANY_ADMIN':
          // All bids made by EVERYONE in the company
          tenderEndpoint = '/tenders/my-company';
          bidEndpoint = '/bids/my-company';
          break;
          
        default:
          tenderEndpoint = '/tenders/public';
          bidEndpoint = '/bids/none';
      }

      const [tendersRes, bidsRes] = await Promise.all([
        api.get(tenderEndpoint),
        api.get(bidEndpoint)
      ]);

      setTenders(tendersRes.data || []);
      setBids(bidsRes.data || []);
      
      if (role === 'COMPANY_ADMIN') {
        const teamRes = await api.get('/users/my-company');
        setTeam(teamRes.data || []);
      }
    } catch (err) {
  console.error("Dashboard fetch error:", err);
  setTenders([]); // Set to empty array on error so .map() doesn't fail
  setBids([]);
} finally {
  setLoading(false);
}
  }, [role]);

  useEffect(() => {
    if (role) {
      fetchData();
    }
  }, [fetchData, role]);

  return { tenders, bids, team, loading, refreshData: fetchData };
};  