import axios from "axios";
import { toast } from "../lib/toast";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("anom_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message || "";

    const message =
      status === 429 || /rate.limit|ibm|watson/i.test(serverMessage)
        ? "IBM AI is busy. Please try again."
        : !error.response
        ? "Unable to connect to the server."
        : serverMessage || "Network error. Please try again.";

    toast(message, "error");

    return Promise.reject(error);
  }
);

export default api;