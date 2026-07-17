export const API_URL = "http://localhost:5001/api/v1";
const BASE_URL = API_URL;
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string }> {
  const token = localStorage.getItem("arogya.token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || `API request failed with status ${response.status}`);
  }

  return body;
}
