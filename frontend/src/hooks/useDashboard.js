import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';

export const useDashboardStats = (role, filters = {}) => {
  const [tenders, setTenders] = useState([]);
  const [bids, setBids] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { search, category, sortBy, statusFilter } = filters;

  // STEP 1: Create a internal state for the debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // STEP 2: Only debounce the search string
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400); // 400ms delay for typing
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    if (!role) return;
    try {
      setLoading(true);
      
      let tenderEndpoint = '';
      let bidEndpoint = '';

      switch (role) {
        case 'BIDDER':
          tenderEndpoint = '/tenders/available';
          bidEndpoint = '/bids/my-personal-bids'; 
          break;
        case 'TENDER_POSTER':
          tenderEndpoint = '/tenders/my-posted-tenders'; 
          bidEndpoint = '/bids/received-on-my-tenders'; 
          break;
        case 'COMPANY_ADMIN':
          tenderEndpoint = '/tenders/my-company';
          bidEndpoint = '/bids/my-company';
          break;
        default:
          tenderEndpoint = '/tenders/public';
          bidEndpoint = '/bids/none';
      }

      // STEP 3: Use 'debouncedSearch' here instead of 'search'
      const params = {
        search: debouncedSearch || undefined,
        category: category !== 'All' ? category : undefined,
        sort: sortBy || 'newest',
        statusFilter: statusFilter !== 'All' ? statusFilter : undefined
      };

      const [tendersRes, bidsRes] = await Promise.all([
        api.get(tenderEndpoint, { params }),
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
      setTenders([]); 
    } finally {
      setLoading(false);
    }
  }, [role, debouncedSearch, category, sortBy, statusFilter]);

  // STEP 4: Trigger fetch immediately when role or any filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { tenders, bids, team, loading, refreshData: fetchData };
};