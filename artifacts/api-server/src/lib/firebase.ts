const DB_URL = "https://mghrib-arrabi-default-rtdb.firebaseio.com";

export interface FirebaseAccessCode {
  id: string;
  code: string;
  maxUses: number;
  useCount: number;
  used: boolean;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
}

async function fbFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${DB_URL}/${path}.json`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Firebase request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function fbGetAllCodes(): Promise<FirebaseAccessCode[]> {
  const data = await fbFetch<Record<string, Omit<FirebaseAccessCode, "id">> | null>("access_codes");
  if (!data) return [];
  return Object.entries(data).map(([id, val]) => ({ id, ...val }));
}

export async function fbGetCodeByString(code: string): Promise<FirebaseAccessCode | null> {
  const all = await fbGetAllCodes();
  return all.find((c) => c.code === code) ?? null;
}

export async function fbCreateCode(payload: Omit<FirebaseAccessCode, "id">): Promise<FirebaseAccessCode> {
  const result = await fbFetch<{ name: string }>("access_codes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { id: result.name, ...payload };
}

export async function fbUpdateCode(id: string, updates: Partial<Omit<FirebaseAccessCode, "id">>): Promise<void> {
  await fbFetch(`access_codes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function fbDeleteCode(id: string): Promise<boolean> {
  const existing = await fbFetch<FirebaseAccessCode | null>(`access_codes/${id}`);
  if (!existing) return false;
  await fbFetch(`access_codes/${id}`, { method: "DELETE" });
  return true;
}
