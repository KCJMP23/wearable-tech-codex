import { getQuickJS, QuickJSContext, QuickJSRuntime } from 'quickjs-emscripten';
import { PluginContext, PluginPermission, PluginError } from './types';

export class PluginSandbox {
  private runtime: QuickJSRuntime | null = null;
  private context: QuickJSContext | null = null;
  private permissions: Set<PluginPermission>;
  private pluginId: string;

  constructor(pluginId: string, permissions: PluginPermission[]) {
    this.pluginId = pluginId;
    this.permissions = new Set(permissions);
  }

  async initialize(): Promise<void> {
    const QuickJS = await getQuickJS();
    this.runtime = QuickJS.newRuntime();
    
    // Set memory limit (10MB)
    this.runtime.setMemoryLimit(10 * 1024 * 1024);
    
    // Set max stack size
    this.runtime.setMaxStackSize(1024 * 512);
    
    // Set interrupt handler for infinite loops
    this.runtime.setInterruptHandler(() => {
      // Check if execution time exceeded
      return true; // Return true to interrupt
    });

    this.context = this.runtime.newContext();
  }

  async execute(code: string, context: PluginContext): Promise<any> {
    if (!this.context) {
      throw new PluginError('SANDBOX_NOT_INITIALIZED', 'Sandbox not initialized', this.pluginId);
    }

    try {
      // Inject safe API into sandbox
      const safeAPI = this.createSafeAPI(context);
      const apiHandle = this.context.newObject();
      
      // Add API methods
      for (const [key, value] of Object.entries(safeAPI)) {
        const fnHandle = this.context.newFunction(key, (...args) => {
          // Convert QuickJS values to JS values
          const jsArgs = args.map(arg => this.context!.dump(arg));
          return this.context!.newString(JSON.stringify(value(...jsArgs)));
        });
        this.context.setProp(apiHandle, key, fnHandle);
        fnHandle.dispose();
      }
      
      // Set global API object
      this.context.setProp(this.context.global, 'api', apiHandle);
      apiHandle.dispose();

      // Execute plugin code
      const result = this.context.evalCode(code, 'plugin.js', {
        strict: true,
        strip: true,
        compileOnly: false,
      });

      if (result.error) {
        const error = this.context.dump(result.error);
        result.error.dispose();
        throw new PluginError('EXECUTION_ERROR', error.message || 'Plugin execution failed', this.pluginId);
      }

      const value = this.context.dump(result.value);
      result.value.dispose();
      return value;
    } catch (error) {
      if (error instanceof PluginError) {
        throw error;
      }
      throw new PluginError('EXECUTION_ERROR', String(error), this.pluginId);
    }
  }

  private createSafeAPI(context: PluginContext): Record<string, Function> {
    const api: Record<string, Function> = {};

    // Products API
    if (this.hasPermission('read:products')) {
      api.getProducts = async (filter?: any) => {
        return await context.api.getProducts(filter);
      };
      api.getProduct = async (id: string) => {
        return await context.api.getProduct(id);
      };
    }

    if (this.hasPermission('write:products')) {
      api.updateProduct = async (id: string, data: any) => {
        return await context.api.updateProduct(id, data);
      };
    }

    // Posts API
    if (this.hasPermission('read:posts')) {
      api.getPosts = async (filter?: any) => {
        return await context.api.getPosts(filter);
      };
      api.getPost = async (id: string) => {
        return await context.api.getPost(id);
      };
    }

    if (this.hasPermission('write:posts')) {
      api.createPost = async (data: any) => {
        return await context.api.createPost(data);
      };
      api.updatePost = async (id: string, data: any) => {
        return await context.api.updatePost(id, data);
      };
    }

    // Analytics API
    if (this.hasPermission('read:analytics')) {
      api.getAnalytics = async (metric: string, period?: string) => {
        return await context.api.getAnalytics(metric, period);
      };
    }

    if (this.hasPermission('write:analytics')) {
      api.trackEvent = async (event: string, data?: any) => {
        return await context.api.trackEvent(event, data);
      };
    }

    // Network API
    if (this.hasPermission('network:fetch')) {
      api.fetch = async (url: string, options?: RequestInit) => {
        // Validate URL is allowed
        const allowedHosts = ['api.github.com', 'api.stripe.com'];
        const urlObj = new URL(url);
        if (!allowedHosts.includes(urlObj.host)) {
          throw new PluginError('PERMISSION_DENIED', `Fetch to ${urlObj.host} not allowed`, this.pluginId);
        }
        return await context.api.fetch(url, options);
      };
    }

    // Storage API
    if (this.hasPermission('storage:local')) {
      api.storage = {
        get: async (key: string) => context.storage.get(key),
        set: async (key: string, value: any) => context.storage.set(key, value),
        remove: async (key: string) => context.storage.remove(key),
        clear: async () => context.storage.clear(),
      };
    }

    // UI API
    if (this.hasPermission('ui:notification')) {
      api.showNotification = (options: any) => {
        context.api.showNotification(options);
      };
    }

    if (this.hasPermission('ui:modal')) {
      api.showModal = async (options: any) => {
        return await context.api.showModal(options);
      };
    }

    // Utils
    api.utils = {
      sanitize: (input: string) => context.utils.sanitize(input),
      escape: (input: string) => context.utils.escape(input),
      formatCurrency: (amount: number, currency?: string) => context.utils.formatCurrency(amount, currency),
      formatDate: (date: Date | string, format?: string) => context.utils.formatDate(date, format),
      generateId: () => context.utils.generateId(),
    };

    return api;
  }

  private hasPermission(permission: PluginPermission): boolean {
    return this.permissions.has(permission);
  }

  dispose(): void {
    if (this.context) {
      this.context.dispose();
      this.context = null;
    }
    if (this.runtime) {
      this.runtime.dispose();
      this.runtime = null;
    }
  }
}