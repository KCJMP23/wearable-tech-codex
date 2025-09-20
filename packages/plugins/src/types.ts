export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: string;
  category: 'analytics' | 'marketing' | 'seo' | 'social' | 'content' | 'commerce' | 'utility' | 'integration';
  tags?: string[];
  icon?: string;
  screenshots?: string[];
  
  // Technical specs
  main: string; // Entry point file
  permissions: PluginPermission[];
  hooks: PluginHook[];
  settings?: PluginSettingsSchema;
  dependencies?: Record<string, string>;
  
  // Compatibility
  minVersion: string;
  maxVersion?: string;
  platforms?: ('web' | 'mobile' | 'desktop')[];
}

export type PluginPermission = 
  | 'read:products'
  | 'write:products'
  | 'read:posts'
  | 'write:posts'
  | 'read:analytics'
  | 'write:analytics'
  | 'read:users'
  | 'write:users'
  | 'read:settings'
  | 'write:settings'
  | 'network:fetch'
  | 'storage:local'
  | 'storage:session'
  | 'ui:modal'
  | 'ui:notification'
  | 'ui:sidebar'
  | 'api:external';

export interface PluginHook {
  name: string;
  type: 'filter' | 'action' | 'lifecycle';
  priority?: number;
}

export interface PluginSettingsSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'color' | 'date' | 'json';
    label: string;
    description?: string;
    required?: boolean;
    default?: any;
    options?: { value: string; label: string }[];
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      message?: string;
    };
  };
}

export interface PluginContext {
  api: PluginAPI;
  settings: Record<string, any>;
  storage: PluginStorage;
  hooks: PluginHooks;
  utils: PluginUtils;
}

export interface PluginAPI {
  // Data access
  getProducts(filter?: any): Promise<any[]>;
  getProduct(id: string): Promise<any>;
  updateProduct(id: string, data: any): Promise<void>;
  
  getPosts(filter?: any): Promise<any[]>;
  getPost(id: string): Promise<any>;
  createPost(data: any): Promise<string>;
  updatePost(id: string, data: any): Promise<void>;
  
  getAnalytics(metric: string, period?: string): Promise<any>;
  trackEvent(event: string, data?: any): Promise<void>;
  
  // UI interactions
  showModal(options: ModalOptions): Promise<any>;
  showNotification(options: NotificationOptions): void;
  addSidebarItem(options: SidebarItemOptions): void;
  
  // Network
  fetch(url: string, options?: RequestInit): Promise<Response>;
  
  // Tenant info
  getTenant(): Promise<any>;
  getSettings(key?: string): Promise<any>;
}

export interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface PluginHooks {
  addFilter(name: string, callback: Function, priority?: number): void;
  applyFilter(name: string, value: any, ...args: any[]): any;
  addAction(name: string, callback: Function, priority?: number): void;
  doAction(name: string, ...args: any[]): void;
  removeHook(name: string, callback: Function): void;
}

export interface PluginUtils {
  sanitize(input: string): string;
  escape(input: string): string;
  formatCurrency(amount: number, currency?: string): string;
  formatDate(date: Date | string, format?: string): string;
  generateId(): string;
  hash(input: string): string;
  encrypt(data: string, key: string): string;
  decrypt(data: string, key: string): string;
}

export interface ModalOptions {
  title: string;
  content: string | React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  buttons?: {
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }[];
}

export interface NotificationOptions {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

export interface SidebarItemOptions {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  position?: 'top' | 'bottom';
  badge?: string | number;
}

export interface Plugin {
  manifest: PluginManifest;
  activate(context: PluginContext): Promise<void>;
  deactivate(): Promise<void>;
  execute?(action: string, data?: any): Promise<any>;
}

export interface PluginInstance {
  id: string;
  plugin: Plugin;
  context: PluginContext;
  isActive: boolean;
  settings: Record<string, any>;
}

export class PluginError extends Error {
  constructor(
    public code: string,
    message: string,
    public plugin?: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}