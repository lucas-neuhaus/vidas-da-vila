type ErrorResponse = { detail?: string; fields?: Record<string, string> };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { ...options, headers });
  if (!response.ok) {
    const body: ErrorResponse = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail ?? "O serviço está indisponível.", body.fields);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
