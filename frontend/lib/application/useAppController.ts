import { useCallback, useEffect, useRef, useState } from "react";

import { browserResources } from "../domain/catalog";
import type {
  AccountData,
  AuthenticationInput,
  CatalogData,
  DashboardDto,
  ProfilePayload,
  ResourceKey,
  ResourceKind,
  Screen,
  ToastDto,
  ToastKind,
} from "../domain/types";
import { appApi, catalogApi, exportOwnData, sessionApi } from "../infrastructure/api";

export type Theme = "light" | "dark";

export type AdmissionInput = { full_name: string; email: string; faculty: string; motivation: string };

export interface AppState {
  screen: Screen;
  menuOpen: boolean;
  account: AccountData | null;
  canModerate: boolean;
  csrf: string;
  ready: boolean;
  data: CatalogData;
  dashboard: DashboardDto | null;
  views: Record<string, unknown>;
  params: Record<string, string | number>;
  loading: boolean;
  busy: boolean;
  theme: Theme;
  toasts: ToastDto[];
}

export interface AppController {
  state: AppState;
  toggleMenu(): void;
  navigate(screen: Screen): void;
  dismissToast(id: number): void;
  toggleTheme(): void;
  login(input: AuthenticationInput): Promise<void>;
  register(input: AuthenticationInput): Promise<void>;
  saveProfile(payload: ProfilePayload): Promise<void>;
  createEntity(resource: ResourceKey, body: Record<string, unknown>): Promise<boolean>;
  updateEntity(resource: ResourceKey, id: number, body: Record<string, unknown>): Promise<boolean>;
  logout(): Promise<void>;
  openDetail(kind: ResourceKind, id: number): void;
  openPerson(id: number): void;
  openEvent(id: number): void;
  openFaculty(name: string): void;
  setCalendarMonth(year: number, month: number): void;
  joinEntity(kind: "project" | "club", id: number): Promise<void>;
  reviewApplication(projectId: number, userId: number, action: "approve" | "reject"): Promise<void>;
  leaveEntity(kind: "project" | "club", id: number): Promise<void>;
  sendComment(kind: ResourceKind, id: number, text: string): Promise<boolean>;
  voteIdea(id: number): Promise<void>;
  toggleFavorite(kind: ResourceKind, id: number): Promise<void>;
  registerEvent(id: number): Promise<void>;
  cancelEvent(id: number): Promise<void>;
  toggleEventReminder(id: number): Promise<void>;
  applyToProject(projectId: number, role: string): Promise<boolean>;
  submitAdmission(data: AdmissionInput): Promise<boolean>;
  awardAchievement(userId: number, title: string, icon: string): Promise<boolean>;
  moderationDecide(resource: string, resourceId: number, action: "approve" | "reject"): Promise<boolean>;
  exportData(): Promise<void>;
}

const THEME_KEY = "birge-theme";
const TOAST_DURATION = 5200;

function fromHash(hash: string): Screen {
  const id = hash.replace(/^#/, "").split("?")[0];
  return (id || "overview") as Screen;
}

function initialScreen(): Screen {
  if (typeof window === "undefined") return "overview";
  return fromHash(window.location.hash);
}

function isResourceKey(value: Screen): value is ResourceKey {
  return browserResources.some(resource => resource === value);
}

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useAppController(): AppController {
  const [screen, setScreen] = useState<Screen>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [csrf, setCsrf] = useState("");
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<CatalogData>({});
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [views, setViews] = useState<Record<string, unknown>>({});
  const [params, setParams] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [toasts, setToasts] = useState<ToastDto[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const toastId = useRef(0);
  const toastTimers = useRef<number[]>([]);

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = ++toastId.current;
    setToasts(list => [...list, { id, kind, message }]);
    const timer = window.setTimeout(() => {
      setToasts(list => list.filter(t => t.id !== id));
    }, TOAST_DURATION);
    toastTimers.current.push(timer);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => { setTheme(initialTheme()); }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* приватный режим — игнорируем */
    }
  }, [theme]);

  useEffect(() => {
    const sync = () => {
      setScreen(fromHash(window.location.hash));
      setParams(Object.fromEntries(new URLSearchParams(window.location.hash.split("?")[1] || "")));
      setViews({});
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    sync();
    window.addEventListener("hashchange", sync);
    sessionApi
      .fetch()
      .then(d => {
        setAccount(d.account);
        setCsrf(d.csrf);
      })
      .catch(() => {
        notify("error", "Не удалось подключиться к серверу. Обновите страницу.");
      })
      .finally(() => setReady(true));
    return () => window.removeEventListener("hashchange", sync);
  }, [notify]);

  const accountKey = account?.profile.user.username ?? null;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        if (["profile", "cabinet", "notifications", "favorites", "settings"].includes(screen) && !accountKey) {
          window.location.hash = "login";
          return;
        }
        if (screen === "profile") {
          setAccount(await sessionApi.account(controller.signal));
        } else if (screen === "admin") {
          const moderationPayload = await catalogApi.moderation();
          setViews(v => ({ ...v, moderation: moderationPayload }));
        } else if (screen === "overview") {
          const targets: ResourceKey[] = browserResources.filter(resource => resource !== "people");
          const entries = await Promise.all(
            targets.map(async resource => [resource, await catalogApi.list(resource, controller.signal)] as const),
          );
          setData(Object.fromEntries(entries));
          if (screen === "overview") {
            setDashboard(await catalogApi.dashboard());
          }
        } else if (screen === "cabinet") {
          const cabinetPayload = await appApi.cabinet(controller.signal);
          setViews(v => ({ ...v, cabinet: cabinetPayload }));
        } else if (screen === "favorites") {
          const payload = await appApi.favorites(controller.signal);
          setViews(v => ({ ...v, favorites: payload }));
        } else if (screen === "team") {
          const payload = await appApi.matching(controller.signal);
          setViews(v => ({ ...v, team: payload }));
        } else if (screen === "feed") {
          const payload = await appApi.feed(controller.signal);
          setViews(v => ({ ...v, feed: payload }));
        } else if (screen === "achievements") {
          const payload = await appApi.achievements(controller.signal);
          setViews(v => ({ ...v, achievements: payload }));
          if (canModerateValue()) {
            const people = await catalogApi.list("people", controller.signal);
            setViews(v2 => ({ ...v2, people }));
          }
        } else if (screen === "calendar") {
          const now = new Date();
          const year = Number(params.year ?? now.getFullYear());
          const month = Number(params.month ?? now.getMonth() + 1);
          const payload = await appApi.calendar(year, month, controller.signal);
          setViews(v => ({ ...v, calendar: payload }));
        } else if (screen === "faculty" && !params.faculty) {
          const list = await appApi.faculties(controller.signal);
          setViews(v => ({ ...v, faculties: list }));
        } else if (screen === "faculty" && params.faculty) {
          const payload = await appApi.faculty(String(params.faculty), controller.signal);
          setViews(v => ({ ...v, faculty: payload }));
        } else if (screen === "person" && params.id) {
          const payload = await appApi.person(Number(params.id), controller.signal);
          setViews(v => ({ ...v, person: payload }));
        } else if (screen === "detail" && params.kind && params.id) {
          const payload = await appApi.detail(params.kind as ResourceKind, Number(params.id), controller.signal);
          setViews(v => ({ ...v, detail: payload }));
        } else if (screen === "event" && params.id) {
          const payload = await appApi.eventDetail(Number(params.id), controller.signal);
          setViews(v => ({ ...v, event: payload }));
        } else if (screen === "admission") {
          if (canModerateValue()) {
            const payload = await appApi.admissions(controller.signal);
            setViews(v => ({ ...v, admissions: payload }));
          }
        }
      } catch {
        if (!controller.signal.aborted) notify("error", "Не удалось загрузить данные. Попробуйте обновить страницу.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    function canModerateValue(): boolean {
      return account?.can_moderate ?? false;
    }

    load();
    return () => controller.abort();
  }, [screen, ready, accountKey, reloadKey, params, notify, account?.can_moderate]);

  const toggleMenu = useCallback(() => setMenuOpen(open => !open), []);

  const toggleTheme = useCallback(() => setTheme(current => (current === "dark" ? "light" : "dark")), []);

  const navigate = useCallback(
    (next: Screen) => {
      if (next !== screen) window.location.hash = next;
    },
    [screen],
  );

  const resetReload = useCallback(() => setReloadKey(key => key + 1), []);

  const openDetail = useCallback(
    (kind: ResourceKind, id: number) => {
      window.location.hash = `detail?kind=${kind}&id=${id}`;
    },
    [],
  );
  const openPerson = useCallback(
    (id: number) => {
      window.location.hash = `person?id=${id}`;
    },
    [],
  );
  const openEvent = useCallback(
    (id: number) => {
      window.location.hash = `event?id=${id}`;
    },
    [],
  );
  const openFaculty = useCallback(
    (name: string) => {
      window.location.hash = `faculty?faculty=${encodeURIComponent(name)}`;
    },
    [],
  );
  const setCalendarMonth = useCallback(
    (year: number, month: number) => setParams(p => ({ ...p, year, month })),
    [],
  );

  async function run(signalError: string, task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      notify("error", messageFor(e, signalError));
    } finally {
      setBusy(false);
    }
  }

  const login = useCallback(
    async (input: AuthenticationInput) => {
      setBusy(true);
      try {
        const result = await sessionApi.login(input, csrf);
        setAccount(result.account);
        setCsrf(result.csrf);
        window.location.hash = "profile";
        notify("success", "Добро пожаловать!");
      } catch (e) {
        notify("error", messageFor(e, "Войти не удалось."));
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify],
  );

  const register = useCallback(
    async (input: AuthenticationInput) => {
      setBusy(true);
      try {
        const result = await sessionApi.register(input, csrf);
        setAccount(result.account);
        setCsrf(result.csrf);
        window.location.hash = "profile";
        notify("success", "Аккаунт создан. Заполните профиль!");
      } catch (e) {
        notify("error", messageFor(e, "Зарегистрироваться не удалось."));
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify],
  );

  const saveProfile = useCallback(
    async (payload: ProfilePayload) => {
      setBusy(true);
      try {
        setAccount(await sessionApi.updateProfile(csrf, payload));
        notify("success", "Профиль сохранён.");
      } catch (e) {
        notify("error", messageFor(e, "Не удалось сохранить профиль."));
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify],
  );

  const createEntity = useCallback(
    async (resource: ResourceKey, body: Record<string, unknown>) => {
      setBusy(true);
      try {
        await catalogApi.create(resource, csrf, body);
        resetReload();
        notify("success", resource === "clubs" ? "Клуб отправлен на модерацию." : "Публикация создана.");
        return true;
      } catch (e) {
        notify("error", messageFor(e, "Не удалось создать."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify, resetReload],
  );

  const updateEntity = useCallback(async (resource: ResourceKey, id: number, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await catalogApi.update(resource, id, csrf, body);
      resetReload();
      notify("success", resource === "clubs" ? "Изменения отправлены на модерацию." : "Изменения сохранены.");
      return true;
    } catch (error) {
      notify("error", messageFor(error, "Не удалось сохранить изменения."));
      return false;
    } finally {
      setBusy(false);
    }
  }, [csrf, notify, resetReload]);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      const result = await sessionApi.logout(csrf);
      setCsrf(result.csrf);
      setAccount(null);
      setViews({});
      window.location.hash = "overview";
      notify("info", "Вы вышли из аккаунта.");
    } catch {
      notify("error", "Не удалось выйти. Повторите попытку.");
    } finally {
      setBusy(false);
    }
  }, [csrf, notify]);

  const joinEntity = useCallback(
    (kind: "project" | "club", id: number) =>
      run("Не удалось присоединиться.", async () => {
        await appApi.join(kind, id, csrf);
        notify("success", kind === "project" ? "Заявка отправлена руководителю." : "Вы вступили в клуб.");
        resetReload();
      }),
    [csrf, notify, resetReload],
  );

  const leaveEntity = useCallback(
    (kind: "project" | "club", id: number) =>
      run("Не удалось покинуть.", async () => {
        await appApi.leave(kind, id, csrf);
        notify("success", "Вы покинули команду.");
        resetReload();
      }),
    [csrf, notify, resetReload],
  );

  const reviewApplication = useCallback(
    (projectId: number, userId: number, action: "approve" | "reject") => run("Не удалось рассмотреть заявку.", async () => {
      await appApi.reviewApplication(projectId, userId, action, csrf);
      notify("success", action === "approve" ? "Участник принят в команду." : "Заявка отклонена.");
      resetReload();
    }), [csrf, notify, resetReload],
  );

  const sendComment = useCallback(
    async (kind: ResourceKind, id: number, text: string): Promise<boolean> => {
      setBusy(true);
      try {
        await appApi.addComment(kind, id, csrf, text);
        notify("success", "Комментарий добавлен.");
        resetReload();
        return true;
      } catch (e) {
        notify("error", messageFor(e, "Не удалось добавить комментарий."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify, resetReload],
  );

  const voteIdea = useCallback(
    (id: number) =>
      run("Не удалось проголосовать.", async () => {
        const result = await appApi.vote(id, csrf);
        notify("success", result.voted ? "Голос учтён. +1 в рейтинге идеи." : "Голос отозван.");
        resetReload();
      }),
    [csrf, notify, resetReload],
  );

  const toggleFavorite = useCallback(
    (kind: ResourceKind, id: number) =>
      run("Не удалось обновить избранное.", async () => {
        const result = await appApi.favoriteToggle(csrf, kind, id);
        notify("success", result.added ? "Добавлено в избранное." : "Убрано из избранного.");
        resetReload();
      }),
    [csrf, notify, resetReload],
  );

  const registerEvent = useCallback(
    (id: number) =>
      run("Не удалось зарегистрироваться.", async () => {
        await appApi.eventRegister(id, csrf);
        notify("success", "Вы зарегистрированы на событие.");
        resetReload();
      }),
    [csrf, notify, resetReload],
  );

  const cancelEvent = useCallback(
    (id: number) =>
      run("Не удалось отменить регистрацию.", async () => {
        await appApi.eventCancel(id, csrf);
        notify("success", "Регистрация отменена.");
        resetReload();
      }),
    [csrf, notify, resetReload],
  );

  const toggleEventReminder = useCallback(
    (id: number) =>
      run("Не удалось обновить напоминание.", async () => {
        const result = await appApi.eventReminder(id, csrf);
        notify("success", result.reminder ? "Напоминание включено." : "Напоминание выключено.");
        resetReload();
      }),
    [csrf, notify, resetReload],
  );

  const applyToProject = useCallback(
    async (projectId: number, role: string): Promise<boolean> => {
      setBusy(true);
      try {
        await appApi.applyToProject(csrf, projectId, role);
        notify("success", "Заявка отправлена владельцу проекта.");
        resetReload();
        return true;
      } catch (e) {
        notify("error", messageFor(e, "Не удалось отправить заявку."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify, resetReload],
  );

  const submitAdmission = useCallback(
    async (input: AdmissionInput): Promise<boolean> => {
      setBusy(true);
      try {
        await appApi.submitAdmission(csrf, input);
        notify("success", "Заявка отправлена. Мы свяжемся с вами.");
        return true;
      } catch (e) {
        notify("error", messageFor(e, "Не удалось отправить заявку."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify],
  );

  const awardAchievement = useCallback(
    async (userId: number, title: string, icon: string): Promise<boolean> => {
      setBusy(true);
      try {
        await appApi.awardAchievement(csrf, userId, title, icon);
        notify("success", "Достижение присвоено.");
        resetReload();
        return true;
      } catch (e) {
        notify("error", messageFor(e, "Не удалось присвоить достижение."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify, resetReload],
  );

  const moderationDecide = useCallback(
    async (resource: string, resourceId: number, action: "approve" | "reject"): Promise<boolean> => {
      setBusy(true);
      try {
        await appApi.moderationDecide(csrf, resource, resourceId, action);
        notify("success", action === "approve" ? "Одобрено." : "Отклонено.");
        resetReload();
        return true;
      } catch (e) {
        notify("error", messageFor(e, "Не удалось обработать запрос."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [csrf, notify, resetReload],
  );

  const exportData = useCallback(
    () =>
      run("Не удалось выгрузить данные.", async () => {
        const text = await exportOwnData();
        const blob = new Blob([text], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `birge-${account?.profile.user.username ?? "user"}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        notify("success", "Данные выгружены.");
      }),
    [account, notify],
  );

  return {
    state: {
      screen,
      menuOpen,
      account,
      canModerate: account?.can_moderate ?? false,
      csrf,
      ready,
      data,
      dashboard,
      views,
      params,
      loading,
      busy,
      theme,
      toasts,
    },
    toggleMenu,
    navigate,
    dismissToast,
    toggleTheme,
    login,
    register,
    saveProfile,
    createEntity,
    updateEntity,
    logout,
    openDetail,
    openPerson,
    openEvent,
    openFaculty,
    setCalendarMonth,
    joinEntity,
    reviewApplication,
    leaveEntity,
    sendComment,
    voteIdea,
    toggleFavorite,
    registerEvent,
    cancelEvent,
    toggleEventReminder,
    applyToProject,
    submitAdmission,
    awardAchievement,
    moderationDecide,
    exportData,
  };
}
