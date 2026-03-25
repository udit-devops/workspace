import axios from "axios";

// Later, when backend is ready, make sure this matches backend URL:
const API_BASE_URL = "http://localhost:5000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send cookies (for JWT)
});
