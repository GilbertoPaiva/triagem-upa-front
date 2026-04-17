const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

export type Priority = 1 | 2 | 3 | 4 | 5;
export type PatientStatus = "WAITING" | "IN_SERVICE" | "ATTENDED";

export interface Patient {
  id: number;
  name: string;
  ticket: string;
  priority: Priority;
  arrivalTime: string;
  status: PatientStatus;
  attendedAt?: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

export const api = {
  getQueue: () => request<Patient[]>("/patients/queue"),
  getHistory: () => request<Patient[]>("/patients/history"),
  addPatient: (name: string, priority: Priority) =>
    request<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify({ name, priority }),
    }),
  callNext: () => request<Patient>("/patients/next", { method: "POST" }),
  finishCurrent: (id: number) =>
    request<Patient>(`/patients/${id}/finish`, { method: "POST" }),
};
