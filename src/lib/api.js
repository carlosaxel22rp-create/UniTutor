import { getAuth } from "firebase/auth";

export async function apiRequest(endpoint, method = "GET", body = null) {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debes iniciar sesión para realizar esta acción.");
  }

  const token = await user.getIdToken();

  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Error en la comunicación con el servidor");
  }

  return data;
}