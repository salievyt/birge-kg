export type ResourceKey = "projects" | "ideas" | "clubs" | "events" | "people";

export type ResourceKind = "project" | "idea" | "club" | "event";

export type Screen =
  | "overview"
  | "profile"
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "admin"
  | "cabinet"
  | "notifications"
  | "favorites"
  | "team"
  | "feed"
  | "achievements"
  | "calendar"
  | "faculty"
  | "person"
  | "detail"
  | "event"
  | "admission"
  | "help"
  | "settings"
  | ResourceKey;

export interface UserDto {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

export interface ProjectMessageDto {
  id: number;
  sender: UserDto;
  text: string;
  created_at: string;
  client_id: string;
}

export interface ChatPageDto {
  results: ProjectMessageDto[];
  unread: number;
  next_before: number | null;
  next_after: number | null;
}

export interface ProfileDto {
  id: number;
  email?: string;
  user: UserDto;
  faculty: string;
  course: number;
  specialty: string;
  bio: string;
  skills: string[];
  interests: string[];
  privacy_level: "public" | "private";
  is_available: boolean;
  looking_for_team?: boolean;
}

export interface ItemDto {
  report?: string;
  report_url?: string;
  report_photos?: string[];
  is_moderated?: boolean;
  is_rejected?: boolean;
  owner?: UserDto;
  author?: UserDto;
  lead?: UserDto;
  organizer?: UserDto;
  id: number;
  title?: string;
  name?: string;
  description?: string;
  body?: string;
  goal?: string;
  status?: string;
  status_label?: string;
  category?: string;
  direction?: string;
  location?: string;
  faculty?: string;
  skills?: string[];
  needed_roles?: string[];
  purpose?: string;
  starts_at?: string;
  created_at?: string;
  updated_at?: string;
  user?: UserDto;
  image?: string;
  progress?: number;
  capacity?: number;
  attendees_count?: number;
  members_count?: number;
  votes?: number;
  official_response?: string;
  is_published?: boolean;
  published_by?: UserDto;
  email?: string;
  full_name?: string;
  motivation?: string;
  kind_label?: string;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface ActivityPoint {
  month: string;
  count: number;
}

export interface DashboardDto {
  stats: { projects: number; participants: number; clubs: number; events: number };
  activity: ActivityPoint[];
  top_faculties: CategoryCount[];
  directions: CategoryCount[];
  latest_projects: ItemDto[];
  top_ideas: ItemDto[];
}

export type ToastKind = "success" | "error" | "info";

export interface ToastDto {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface AccountData {
  profile: ProfileDto;
  can_moderate: boolean;
}

export interface AccountBundle extends AccountData {
  projects?: ItemDto[];
  clubs?: ItemDto[];
  events?: ItemDto[];
  notifications?: ItemDto[];
}

export interface SessionDto {
  csrf: string;
  account: AccountData | null;
}

export interface AuthResponse {
  account: AccountData;
  csrf: string;
}

export interface ProfilePayload {
  email?: string;
  current_password?: string;
  faculty: string;
  course: number;
  specialty: string;
  bio: string;
  skills: string[];
  interests: string[];
  privacy_level: string;
  is_available: boolean;
  looking_for_team?: boolean;
}

export interface AuthenticationInput {
  email?: string;
  username: string;
  password: string;
  first_name?: string;
}

export type CatalogData = Partial<Record<ResourceKey, ItemDto[]>>;

export interface ListResponse {
  results?: ItemDto[];
}

export type ModerationData = Record<string, ItemDto[]>;

export interface CommentDto {
  id: number;
  user: UserDto;
  text: string;
  created_at: string;
}

export interface MembershipDto {
  user: UserDto;
  role: string;
  accepted: boolean;
}

export interface DetailBundle {
  chat_unread?: number;
  is_pending?: boolean;
  applications?: MembershipDto[];
  item: ItemDto;
  members?: MembershipDto[];
  comments?: CommentDto[];
  is_member?: boolean;
  is_owner?: boolean;
  is_favorited?: boolean;
  attendees?: UserDto[];
  attendees_count?: number;
  registered?: boolean;
  is_organizer?: boolean;
  reminder?: boolean;
  voted?: boolean;
}

export interface FavoriteDto {
  id: number;
  resource_type: ResourceKind;
  resource_id: number;
  created_at: string;
  item: ItemDto;
}

export interface NotificationDto extends ItemDto {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  kind: string;
  kind_label?: string;
  created_at: string;
}

export interface AchievementDto {
  id: number;
  user: UserDto;
  title: string;
  icon: string;
  awarded_at: string;
}

export interface CabinetDto {
  account: AccountData;
  projects: ItemDto[];
  clubs: ItemDto[];
  events: ItemDto[];
  ideas: ItemDto[];
  notifications: NotificationDto[];
  unread_notifications: number;
  favorites: FavoriteDto[];
  achievements: AchievementDto[];
}

export interface PersonDto {
  profile: ProfileDto;
  projects: ItemDto[];
  clubs: ItemDto[];
  events: ItemDto[];
}

export interface MatchingDto {
  projects: ItemDto[];
  people: ProfileDto[];
}

export interface FeedDto {
  announcements: ItemDto[];
  events: ItemDto[];
  projects: ItemDto[];
  ideas: ItemDto[];
}

export interface AdmissionDto {
  id: number;
  full_name: string;
  email: string;
  faculty: string;
  motivation: string;
  status: string;
  status_label?: string;
  created_at: string;
}

export interface FacultyDto {
  name: string;
  students_count: number;
  projects_count: number;
  clubs_count: number;
  events_count: number;
  students: ProfileDto[];
  projects: ItemDto[];
  clubs: ItemDto[];
  events: ItemDto[];
}

export interface CalendarDto {
  year: number;
  month: number;
  events: ItemDto[];
}

export interface VoteResult {
  votes: number;
  voted: boolean;
}