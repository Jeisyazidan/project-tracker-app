import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Dispatch custom event — AuthContext listens and clears user
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export default client;
