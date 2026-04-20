import axios from "axios"
import { useAuthStore } from "../store/authStore"

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://smartseason-cn2j.onrender.com",
})

// Attach token to every request
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — clear auth and redirect to login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default client
