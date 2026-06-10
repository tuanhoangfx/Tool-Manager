
export interface Profile {
  id: string; // should match user.id
  created_at?: string;
  updated_at: string | null;
  last_sign_in_at?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null; // Added email field
  role: 'admin' | 'manager' | 'employee';
  default_project_id?: number | null;
}

export interface TaskAttachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface TimeLog {
  id: number;
  task_id: number;
  user_id: string;
  start_time: string;
  end_time: string | null;
}

export interface TaskComment {
  id: number;
  created_at: string;
  task_id: number;
  user_id: string;
  content: string;
  profiles: Profile;
}

export interface Project {
  id: number;
  created_at: string;
  name: string;
  created_by: string;
  project_members?: { count: number }[];
  color?: string | null;
}

export interface ProjectMember {
    project_id: number;
    user_id: string;
    created_at: string;
    projects: Project | null;
    profiles?: Profile;
}

export interface MemberDetails extends ProjectMember {
    profiles: Profile;
    task_count: number;
}

export interface TaskAssignee {
    user_id: string;
    completed_at: string | null;
}

export interface Task {
  id: number;
  user_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  status: 'todo' | 'inprogress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  project_id?: number | null;
  project_ids?: number[]; // Support multiple projects
  assignees?: TaskAssignee[]; // Support multiple assignees with status
  projects?: Project; // For showing project info
  task_attachments?: TaskAttachment[];
  assignee?: Profile; // For showing assignee info
  creator?: Profile; // For showing creator info
  task_time_logs?: TimeLog[];
  task_comments?: TaskComment[];
}

export interface ActivityLog {
  id: number;
  created_at: string;
  user_id: string;
  task_id: number | null;
  action: string;
  details: {
    task_title?: string;
    from?: Task['status'];
    to?: Task['status'];
    count?: number;
    files?: string[];
  } | null;
  profiles: Profile; // for user info
}

export interface Notification {
  id: number;
  created_at: string;
  user_id: string;
  actor_id: string;
  type: 'new_task_assigned' | 'new_comment' | 'new_project_created' | 'new_user_registered' | 'task_part_completed';
  data: {
    task_id?: number;
    task_title?: string;
    assigner_name?: string;
    commenter_name?: string;
    project_id?: number;
    project_name?: string;
    creator_name?: string;
    new_user_id?: string;
    new_user_name?: string;
    actor_name?: string;
    completed_count?: number;
    total_count?: number;
  };
  is_read: boolean;
  profiles: Profile; // For actor info
}

export type Translation = {
  // Header
  facebookAria: string;
  phoneAria: string;
  telegramAria: string;
  backToTopAria: string;
  scrollToTopAria: string;
  settingsAria: string;
  openUserGuideAria: string;
  howToUseThisApp: string;
  adminDashboard: string;
  employeeDashboard: string;
  activityLog: string;
  notifications: string;
  notifications_new_task: (assigner: string, task: string) => string;
  notifications_new_comment: (commenter: string, task: string) => string;
  notifications_new_project: (creator: string, project: string) => string;
  notifications_new_user: (newUser: string) => string;
  notifications_task_part_completed: (actor: string, task: string, count: number, total: number) => string;
  notifications_empty: string;
  mark_all_as_read: string;
  view_task: string;
  
  // ThemeController
  toggleThemeAria: string;
  appearanceSettingsAria: string;
  themeLabel: string;
  lightTheme: string;
  darkTheme: string;
  accentColorLabel: string;

  // LanguageSwitcher
  language: string;

  // Footer
  copyright: (year: number) => string;
  contactUs: string;

  // TopBar (Simplified)
  liveActivity: string;
  totalTasks: string;
  myTasks: string;
  tasksTodo: string;
  tasksInProgress: string;
  tasksDone: string;
  ipAddress: string;
  sessionTime: string;
  
  // Auth
  authHeader: string;
  authPrompt: string;
  authPromptLogin: string;
  emailLabel: string;
  passwordLabel: string;
  signIn: string;
  signUp: string;
  signOut: string;
  signingIn: string;
  signingUp: string;
  magicLinkSent: string;
  signInToContinue: string;
  cancel: string;

  // Account Modal
  accountSettings: string;
  profile: string;
  password: string;
  updateProfile: string;
  fullName: string;
  avatar: string;
  uploading: string;
  uploadAvatar: string;
  update: string;
  updating: string;
  profileUpdated: string;
  changePassword: string;
  newPassword: string;
  confirmNewPassword: string;
  passwordUpdated: string;
  passwordsDoNotMatch: string;
  
  // Task Dashboard
  dashboardTitle: string;
  myTasksTitle: string;
  allTasksTitle: string;
  signInToManageTasks: string;
  noTasksFound: string;
  addNewTask: string;
  editTask: string;
  deleteTask: string;
  confirmDeleteTask: string;
  deleteTaskConfirmationMessage: (taskTitle: string) => string;
  taskDeleted: string;
  taskNotFound: string;
  boardView: string;
  calendarView: string;
  summaryView: string;

  // Task Status
  status: string;
  todo: string;
  inprogress: string;
  done: string;
  cancelled: string;
  overdue: string;
  cannotMoveToDone: (count: number) => string;

  // Task Priority
  priority: string;
  low: string;
  medium: string;
  high: string;

  // Task Card
  creationTime: string;
  completionTime: string; // for sorting
  completionDate: string; // for card display
  assignee: string;
  createdBy: string;
  totalTimeLogged: string;
  startTimer: string;
  stopTimer: string;
  timerRunningOnAnotherTask: string;
  cancelTask: string;
  copyTaskId: string;
  project: string;

  // Task Modal
  taskTitleLabel: string;
  descriptionLabel: string;
  dueDateLabel: string;
  attachments: string;
  addAttachment: string;
  pasteOrDrop: string;
  comments: string;
  addComment: string;
  post: string;
  posting: string;
  noCommentsYet: string;
  saveTaskToComment: string;

  // Admin Dashboard
  allEmployees: string;
  selectEmployeePrompt: string;
  tasksFor: (name: string) => string;
  addTaskFor: (name: string) => string;
  overallSummary: string;
  performanceSummary: string;
  tasksByStatus: string;
  tasksByPriority: string;
  today: string;
  thisWeek: string;
  thisMonth: string;
  lastWeek: string;
  last30Days: string; // Added
  avgCompletionTime: string;
  allTasksBoard: string;
  customMonth: string;
  customRange: string;
  userManagement: string;
  projectManagement: string;
  management: string;
  searchUsers: string;
  lastUpdated: string;
  actions: string;
  editUser: string;
  deleteUser: string;
  confirmDeleteUser: (name: string) => string;
  
  // Generic Actions
  close: string;
  save: string;
  
  // Admin Modals
  employee: string;
  manager: string;
  selectEmployee: string;
  editEmployeeProfile: string;
  role: string;
  admin: string;
  addNewTimeEntry: string;
  date: string;
  startTime: string;
  endTime: string;
  editPerformanceReview: string;
  score: string;

  // Activity Log
  noActivity: string;
  log_created_task: (user: string, task: string) => string;
  log_updated_task: (user: string, task: string) => string;
  log_deleted_task: (user: string, task: string) => string;
  log_status_changed: (user: string, task: string, from: string, to: string) => string;
  log_added_attachments: (user: string, count: number, task: string) => string;
  log_removed_attachments: (user: string, count: number, task: string) => string;
  log_cleared_cancelled_tasks: (user: string, count: number) => string;
  a_user: string;
  a_task: string;
  log_searchPlaceholder: string;
  log_filterByUser: string;
  log_allUsers: string;
  log_filterByAction: string;
  log_allActions: string;
  log_action_created_task: string;
  log_action_updated_task: string;
  log_action_deleted_task: string;
  log_action_status_changed: string;
  log_action_added_attachments: string;
  log_action_removed_attachments: string;
  log_action_cleared_cancelled_tasks: string;

  // Notifications filters
  notif_searchPlaceholder: string;
  notif_filterByActor: string;
  notif_allActors: string;
  notif_filterByType: string;
  notif_allTypes: string;
  notif_type_new_task: string;
  notif_type_new_comment: string;
  notif_type_new_project: string;
  notif_type_new_user: string;
  notif_type_task_part_completed: string;
  notif_filterByStatus: string;
  notif_allStatuses: string;
  notif_status_read: string;
  notif_status_unread: string;

  // Settings
  defaultDueDateIn: string;
  days: string;
  clearCancelledTasksTitle: string;
  clearCancelledTasksConfirmation: (count: number) => string;
  timezone: string;
  defaultProject: string;
  personalProject: string;

  // User Guide
  userGuide_searchPlaceholder: string;
  userGuide_s1_title: string;
  userGuide_s1_l1_strong: string;
  userGuide_s1_l1_text: string;
  userGuide_s1_l2_strong: string;
  userGuide_s1_l2_text: string;

  userGuide_s2_title: string;
  userGuide_s2_l1_strong: string;
  userGuide_s2_l1_text: string;
  userGuide_s2_l2_strong: string;
  userGuide_s2_l2_text: string;
  userGuide_s2_l3_strong: string;
  userGuide_s2_l3_text: string;

  userGuide_s3_title: string;
  userGuide_s3_l1_strong: string;
  userGuide_s3_l1_text: string;
  userGuide_s3_l2_strong: string;
  userGuide_s3_l2_text: string;

  userGuide_s4_title: string;
  userGuide_s4_l1_strong: string;
  userGuide_s4_l1_text: string;
  userGuide_s4_l2_strong: string;
  userGuide_s4_l2_text: string;

  userGuide_s5_title: string;
  userGuide_s5_l1_strong: string;
  userGuide_s5_l1_text: string;
  userGuide_s5_l2_strong: string;
  userGuide_s5_l2_text: string;
  userGuide_s5_l3_strong: string;
  userGuide_s5_l3_text: string;

  // Filters
  searchPlaceholder: string;
  filterByCreator: string;
  allCreators: string;
  filterByPriority: string;
  allPriorities: string;
  filterByDueDate: string;
  allDates: string;
  dueToday: string;
  dueThisWeek: string;
  filterByProject: string;
  allProjects: string;
  
  // Calendar Sorting
  sortBy: string;
  sortDefault: string;
  sortStatus: string;
  sortPriority: string;
  sortCreationDate: string;

  // General App
  dataRefreshed: string;

  // Project Management
  createdAt: string;
  members: string;
  manageMembers: string;
  addMember: string;
  removeMember: string;
  joinedOn: string;
  tasksInProject: string;
  confirmRemoveMember: (name: string, project: string) => string;
  selectUserToAdd: string;
  noMembers: string;
};
