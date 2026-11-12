const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');
const TOKEN_KEY = 'medicontrol.token';

/** Error de la API con el status y el cuerpo que devolvió, por ejemplo `existing` en un 409. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isConflict() {
    return this.status === 409;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sin almacenamiento (modo privado estricto): la sesión dura lo que la pestaña.
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Avisa cuando la API rechaza el token, para que la sesión se cierre en un solo lugar. */
export function onUnauthorized(listener: Listener) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Para login y registro: un 401 ahí es un error del formulario, no una sesión vencida. */
  anonymous?: boolean;
}

export async function api<T>(path: string, { method = 'GET', body, anonymous }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = anonymous ? null : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.');
  }

  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok) return data as T;

  const error = new ApiError(response.status, messageFrom(data, response.status), data);
  if (error.isUnauthorized && !anonymous) unauthorizedListeners.forEach((listener) => listener());
  throw error;
}

function messageFrom(data: Record<string, unknown>, status: number): string {
  const { message } = data;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;
  if (status >= 500) return 'El servidor tuvo un problema. Intentá de nuevo en unos segundos.';
  return 'No se pudo completar la acción.';
}
