import { endpointFor, endpointForKind } from "../domain/catalog";
import type {
  AccountBundle,
  AchievementDto,
  AdmissionDto,
  AuthenticationInput,
  AuthResponse,
  CabinetDto,
  CalendarDto,
  CommentDto,
  ChatPageDto,
  ProjectMessageDto,
  DashboardDto,
  DetailBundle,
  FacultyDto,
  FavoriteDto,
  FeedDto,
  ItemDto,
  ListResponse,
  MatchingDto,
  ModerationData,
  NotificationDto,
  PersonDto,
  ProfilePayload,
  ResourceKey,
  ResourceKind,
  SessionDto,
  VoteResult,
} from "../domain/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly fields?: unknown,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  csrf?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.csrf) headers["X-CSRFToken"] = options.csrf;

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const details = Object.entries(result).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(" ") : String(value)}`).join("; ");
    throw new ApiError(typeof result.error === "string" ? result.error : typeof result.detail === "string" ? result.detail : details || "Сервер недоступен.", result.fields, response.status);
  }
  return result as T;
}

interface CsrfDto {
  csrf: string;
}

export const sessionApi = {
  resetPassword(email: string, csrf: string): Promise<{ message: string }> {
    return request("/api/auth/password-reset/", { method: "POST", csrf, body: { email } });
  },
  confirmPassword(body: Record<string, string>, csrf: string): Promise<{ message: string }> {
    return request("/api/auth/password-reset-confirm/", { method: "POST", csrf, body });
  },
  fetch(signal?: AbortSignal): Promise<SessionDto> {
    return request("/api/auth/session/", { signal });
  },

  login(input: AuthenticationInput, csrf: string): Promise<AuthResponse> {
    return request("/api/auth/login/", { method: "POST", csrf, body: input });
  },

  register(input: AuthenticationInput, csrf: string): Promise<AuthResponse> {
    return request("/api/auth/register/", { method: "POST", csrf, body: input });
  },

  logout(csrf: string): Promise<CsrfDto> {
    return request("/api/auth/logout/", { method: "POST", csrf });
  },

  account(signal?: AbortSignal): Promise<AccountBundle> {
    return request("/api/auth/me/", { signal });
  },

  updateProfile(csrf: string, payload: ProfilePayload): Promise<AccountBundle> {
    return request("/api/auth/me/", { method: "PATCH", csrf, body: payload });
  },
};

function unwrapList(result: ListResponse | ItemDto[] | NotificationDto[]): ItemDto[] | NotificationDto[] {
  return Array.isArray(result) ? result : (result.results ?? []);
}

export const catalogApi = {
  update(resource: ResourceKey, id: number, csrf: string, body: Record<string, unknown>): Promise<ItemDto> {
    return request(`/api/${endpointFor(resource)}/${id}/`, { method: "PATCH", csrf, body });
  },
  page(resource: ResourceKey, page: number, search: string, signal?: AbortSignal, filters: Record<string, string> = {}): Promise<{ count: number; next: string | null; results: ItemDto[] }> {
    const query = new URLSearchParams({...filters, ordering: "-created_at", page: String(page), search});
    return request(`/api/${endpointFor(resource)}/?${query}`, { signal });
  },
  list(resource: ResourceKey, signal?: AbortSignal): Promise<ItemDto[]> {
    return request<ListResponse | ItemDto[]>(`/api/${endpointFor(resource)}/?ordering=-created_at`, { signal }).then(unwrapList);
  },

  create(resource: ResourceKey, csrf: string, body: Record<string, unknown>): Promise<ItemDto> {
    return request(`/api/${endpointFor(resource)}/`, { method: "POST", csrf, body });
  },

  moderation(): Promise<ModerationData> {
    return request("/api/moderation/");
  },

  dashboard(): Promise<DashboardDto> {
    return request("/api/dashboard/");
  },
};

export const appApi = {
  chat(projectId: number, cursor: {before?: number; after?: number}, signal?: AbortSignal): Promise<ChatPageDto> {
    const query = new URLSearchParams(Object.entries(cursor).map(([key, value]) => [key, String(value)]));
    return request(`/api/projects/${projectId}/messages/?${query}`, {signal});
  },
  sendMessage(projectId: number, csrf: string, text: string, clientId: string): Promise<ProjectMessageDto> {
    return request(`/api/projects/${projectId}/messages/`, {method: "POST", csrf, body: {text, client_id: clientId}});
  },
  readChat(projectId: number, csrf: string, lastReadId: number, signal?: AbortSignal): Promise<{ok: boolean}> {
    return request(`/api/projects/${projectId}/messages/read/`, {method: "POST", csrf, body: {last_read_id: lastReadId}, signal});
  },
  reviewApplication(projectId: number, userId: number, action: "approve" | "reject", csrf: string): Promise<{ ok: boolean }> {
    return request(`/api/projects/${projectId}/applications/decide/`, { method: "POST", csrf, body: { user_id: userId, action } });
  },
  cabinet(signal?: AbortSignal): Promise<CabinetDto> {
    return request("/api/cabinet/", { signal });
  },

  person(profileId: number, signal?: AbortSignal): Promise<PersonDto> {
    return request(`/api/profiles/${profileId}/`, { signal });
  },

  detail(kind: ResourceKind, id: number, signal?: AbortSignal): Promise<DetailBundle> {
    return request(`/api/${endpointForKind(kind)}/${id}/`, { signal });
  },

  addComment(kind: ResourceKind, id: number, csrf: string, text: string): Promise<CommentDto> {
    return request(`/api/${endpointForKind(kind)}/${id}/comments/`, { method: "POST", csrf, body: { text } });
  },

  join(kind: "project" | "club", id: number, csrf: string): Promise<{ ok: boolean }> {
    return request(`/api/${endpointForKind(kind)}/${id}/join/`, { method: "POST", csrf, body: {} });
  },

  leave(kind: "project" | "club", id: number, csrf: string): Promise<{ ok: boolean }> {
    return request(`/api/${endpointForKind(kind)}/${id}/leave/`, { method: "POST", csrf, body: {} });
  },

  vote(ideaId: number, csrf: string): Promise<VoteResult> {
    return request(`/api/ideas/${ideaId}/vote/`, { method: "POST", csrf, body: {} });
  },

  eventDetail(id: number, signal?: AbortSignal): Promise<DetailBundle> {
    return request(`/api/events/${id}/`, { signal });
  },

  eventRegister(id: number, csrf: string): Promise<{ ok: boolean }> {
    return request(`/api/events/${id}/register/`, { method: "POST", csrf, body: {} });
  },

  eventCancel(id: number, csrf: string): Promise<{ ok: boolean }> {
    return request(`/api/events/${id}/cancel/`, { method: "POST", csrf, body: {} });
  },

  eventReminder(id: number, csrf: string): Promise<{ ok: boolean; reminder: boolean }> {
    return request(`/api/events/${id}/reminder/`, { method: "POST", csrf, body: {} });
  },

  calendar(year: number, month: number, signal?: AbortSignal): Promise<CalendarDto> {
    return request(`/api/events/calendar/?year=${year}&month=${month}`, { signal });
  },

  faculties(signal?: AbortSignal): Promise<string[]> {
    return request("/api/faculties/", { signal });
  },

  faculty(name: string, signal?: AbortSignal): Promise<FacultyDto> {
    return request(`/api/faculties/${encodeURIComponent(name)}/`, { signal });
  },

  favorites(signal?: AbortSignal): Promise<FavoriteDto[]> {
    return request("/api/favorites/", { signal });
  },

  favoriteToggle(csrf: string, resource_type: ResourceKind, resource_id: number): Promise<{ ok: boolean; added: boolean }> {
    return request("/api/favorites/", { method: "POST", csrf, body: { resource_type, resource_id } });
  },

  matching(signal?: AbortSignal): Promise<MatchingDto> {
    return request("/api/matching/", { signal });
  },

  applyToProject(csrf: string, projectId: number, role: string): Promise<{ ok: boolean }> {
    return request("/api/matching/apply/", { method: "POST", csrf, body: { project_id: projectId, role } });
  },

  feed(signal?: AbortSignal): Promise<FeedDto> {
    return request("/api/feed/", { signal });
  },

  achievements(signal?: AbortSignal): Promise<AchievementDto[]> {
    return request("/api/achievements/", { signal });
  },

  awardAchievement(csrf: string, userId: number, title: string, icon: string): Promise<AchievementDto> {
    return request("/api/achievements/", { method: "POST", csrf, body: { user_id: userId, title, icon } });
  },

  admissions(signal?: AbortSignal): Promise<AdmissionDto[]> {
    return request("/api/admissions/", { signal });
  },

  submitAdmission(csrf: string, data: { full_name: string; email: string; faculty: string; motivation: string }): Promise<AdmissionDto> {
    return request("/api/admissions/", { method: "POST", csrf, body: data });
  },

  moderationDecide(csrf: string, resource: string, resourceId: number, action: "approve" | "reject"): Promise<{ ok: boolean }> {
    return request("/api/moderation/decide/", { method: "POST", csrf, body: { resource, resource_id: resourceId, action } });
  },

  notifications(page: number, kind: string, signal?: AbortSignal): Promise<{count: number; next: string | null; results: NotificationDto[]}> {
    return request(`/api/notifications/?page=${page}&kind=${encodeURIComponent(kind)}`, { signal });
  },

  notificationRead(id: number, csrf: string): Promise<{ ok: boolean }> {
    return request(`/api/notifications/${id}/read/`, { method: "POST", csrf, body: {} });
  },

  notificationReadAll(csrf: string): Promise<{ ok: boolean; updated: number }> {
    return request("/api/notifications/read-all/", { method: "POST", csrf, body: {} });
  },
};

interface UploadDto {
  url: string;
  csrf: string;
}

export const uploadsApi = {
  upload(csrf: string, file: File): Promise<UploadDto> {
    const form = new FormData();
    form.append("file", file);
    const headers: Record<string, string> = { "X-CSRFToken": csrf };
    return fetch(`${BASE_URL}/api/upload/`, { method: "POST", headers, body: form }).then(async response => {
      const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new ApiError(typeof result.error === "string" ? result.error : "Не удалось загрузить файл.", result.fields);
      }
      return result as unknown as UploadDto;
    });
  },
};

export async function exportOwnData(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/export/`);
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(typeof result.error === "string" ? result.error : "Не удалось выгрузить данные.", result.fields);
  }
  return JSON.stringify(result, null, 2);
}
