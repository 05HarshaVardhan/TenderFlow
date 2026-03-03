import api from './axios';

export const getUsersByCompany = async () => {
  const { data } = await api.get('/users/admin/users-by-company');
  return data;
};

export const getAllCompanies = async () => {
  const { data } = await api.get('/companies/admin/all');
  return data;
};

export const createCompany = async (payload) => {
  const { data } = await api.post('/companies/admin', payload);
  return data;
};

export const deleteCompany = async ({ companyId, force = false }) => {
  const { data } = await api.delete(`/companies/admin/${companyId}`, {
    params: { force },
  });
  return data;
};
