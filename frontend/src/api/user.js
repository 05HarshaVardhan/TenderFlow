// frontend/src/api/user.js
import api from './axios';

export const getUsers = async () => {
  const { data } = await api.get('/users/my-company');
  return data;
};

export const createUser = async (userData) => {
  const { data } = await api.post('/users', userData);
  return data;
};

export const updateUser = async (id, updates) => {
  const { data } = await api.patch(`/users/${id}`, updates);
  return data;
};

export const deleteUser = async (id) => {
  await api.delete(`/users/${id}`);
};