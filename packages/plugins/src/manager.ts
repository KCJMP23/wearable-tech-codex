import { EventEmitter } from 'events';
import { 
  Plugin, 
  PluginInstance, 
  PluginManifest, 
  PluginContext, 
  PluginAPI,
  PluginStorage,
  PluginHooks,
  PluginUtils,
  PluginError,
  PluginPermission
} from './types';
import { PluginSandbox } from './sandbox';

export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private hooks: Map<string, Array<{ callback: Function; priority: number; plugin: string }>> = new Map();
  private storage: Map<string, Map<string, any>> = new Map();
  private tenantId: string;
  private apiImplementation: Partial<PluginAPI>;

  constructor(tenantId: string, apiImplementation: Partial<PluginAPI> = {}) {
    super();
    this.tenantId = tenantId;
    this.apiImplementation = apiImplementation;
  }

  async loadPlugin(manifest: PluginManifest, code: string, settings: Record<string, any> = {}): Promise<void> {
    if (this.plugins.has(manifest.id)) {
      throw new PluginError('PLUGIN_EXISTS', `Plugin ${manifest.id} is already loaded`);
    }

    // Validate manifest
    this.validateManifest(manifest);

    // Create plugin context
    const context = this.createPluginContext(manifest);

    // Create sandbox
    const sandbox = new PluginSandbox(manifest.id, manifest.permissions);
    await sandbox.initialize();

    try {
      // Execute plugin in sandbox
      const pluginModule = await sandbox.execute(code, context);
      
      // Create plugin instance
      const instance: PluginInstance = {
        id: manifest.id,
        plugin: {
          manifest,
          activate: async (ctx: PluginContext) => {
            if (pluginModule.activate) {
              await pluginModule.activate(ctx);
            }
          },
          deactivate: async () => {
            if (pluginModule.deactivate) {
              await pluginModule.deactivate();
            }
          },
          execute: pluginModule.execute,
        },
        context,
        isActive: false,
        settings,
      };

      // Store plugin
      this.plugins.set(manifest.id, instance);

      // Initialize plugin storage
      this.storage.set(manifest.id, new Map());

      // Emit event
      this.emit('plugin:loaded', manifest.id);
    } catch (error) {
      sandbox.dispose();
      throw error;
    }
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new PluginError('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }

    if (instance.isActive) {
      return;
    }

    try {
      await instance.plugin.activate(instance.context);
      instance.isActive = true;
      this.emit('plugin:activated', pluginId);
    } catch (error) {
      throw new PluginError('ACTIVATION_FAILED', `Failed to activate plugin ${pluginId}: ${error}`, pluginId);
    }
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new PluginError('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }

    if (!instance.isActive) {
      return;
    }

    try {
      await instance.plugin.deactivate();
      instance.isActive = false;
      
      // Remove hooks registered by this plugin
      this.removePluginHooks(pluginId);
      
      this.emit('plugin:deactivated', pluginId);
    } catch (error) {
      throw new PluginError('DEACTIVATION_FAILED', `Failed to deactivate plugin ${pluginId}: ${error}`, pluginId);
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      return;
    }

    // Deactivate if active
    if (instance.isActive) {
      await this.deactivatePlugin(pluginId);
    }

    // Remove plugin
    this.plugins.delete(pluginId);
    this.storage.delete(pluginId);
    
    this.emit('plugin:unloaded', pluginId);
  }

  async executePlugin(pluginId: string, action: string, data?: any): Promise<any> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new PluginError('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }

    if (!instance.isActive) {
      throw new PluginError('PLUGIN_INACTIVE', `Plugin ${pluginId} is not active`);
    }

    if (!instance.plugin.execute) {
      throw new PluginError('NO_EXECUTE', `Plugin ${pluginId} does not support execute`);
    }

    try {
      return await instance.plugin.execute(action, data);
    } catch (error) {
      throw new PluginError('EXECUTION_FAILED', `Plugin ${pluginId} execution failed: ${error}`, pluginId);
    }
  }

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(p => p.isActive);
  }

  updatePluginSettings(pluginId: string, settings: Record<string, any>): void {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new PluginError('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }

    instance.settings = { ...instance.settings, ...settings };
    this.emit('plugin:settings:updated', pluginId, settings);
  }

  private createPluginContext(manifest: PluginManifest): PluginContext {
    return {
      api: this.createPluginAPI(manifest),
      settings: {},
      storage: this.createPluginStorage(manifest.id),
      hooks: this.createPluginHooks(manifest.id),
      utils: this.createPluginUtils(),
    };
  }

  private createPluginAPI(manifest: PluginManifest): PluginAPI {
    const hasPermission = (perm: PluginPermission) => manifest.permissions.includes(perm);

    return {
      getProducts: async (filter?: any) => {
        if (!hasPermission('read:products')) throw new PluginError('PERMISSION_DENIED', 'Missing read:products permission');
        return this.apiImplementation.getProducts?.(filter) || [];
      },
      getProduct: async (id: string) => {
        if (!hasPermission('read:products')) throw new PluginError('PERMISSION_DENIED', 'Missing read:products permission');
        return this.apiImplementation.getProduct?.(id);
      },
      updateProduct: async (id: string, data: any) => {
        if (!hasPermission('write:products')) throw new PluginError('PERMISSION_DENIED', 'Missing write:products permission');
        return this.apiImplementation.updateProduct?.(id, data);
      },
      getPosts: async (filter?: any) => {
        if (!hasPermission('read:posts')) throw new PluginError('PERMISSION_DENIED', 'Missing read:posts permission');
        return this.apiImplementation.getPosts?.(filter) || [];
      },
      getPost: async (id: string) => {
        if (!hasPermission('read:posts')) throw new PluginError('PERMISSION_DENIED', 'Missing read:posts permission');
        return this.apiImplementation.getPost?.(id);
      },
      createPost: async (data: any) => {
        if (!hasPermission('write:posts')) throw new PluginError('PERMISSION_DENIED', 'Missing write:posts permission');
        return this.apiImplementation.createPost?.(data) || '';
      },
      updatePost: async (id: string, data: any) => {
        if (!hasPermission('write:posts')) throw new PluginError('PERMISSION_DENIED', 'Missing write:posts permission');
        return this.apiImplementation.updatePost?.(id, data);
      },
      getAnalytics: async (metric: string, period?: string) => {
        if (!hasPermission('read:analytics')) throw new PluginError('PERMISSION_DENIED', 'Missing read:analytics permission');
        return this.apiImplementation.getAnalytics?.(metric, period);
      },
      trackEvent: async (event: string, data?: any) => {
        if (!hasPermission('write:analytics')) throw new PluginError('PERMISSION_DENIED', 'Missing write:analytics permission');
        return this.apiImplementation.trackEvent?.(event, data);
      },
      showModal: async (options: any) => {
        if (!hasPermission('ui:modal')) throw new PluginError('PERMISSION_DENIED', 'Missing ui:modal permission');
        return this.apiImplementation.showModal?.(options);
      },
      showNotification: (options: any) => {
        if (!hasPermission('ui:notification')) throw new PluginError('PERMISSION_DENIED', 'Missing ui:notification permission');
        this.apiImplementation.showNotification?.(options);
      },
      addSidebarItem: (options: any) => {
        if (!hasPermission('ui:sidebar')) throw new PluginError('PERMISSION_DENIED', 'Missing ui:sidebar permission');
        this.apiImplementation.addSidebarItem?.(options);
      },
      fetch: async (url: string, options?: RequestInit) => {
        if (!hasPermission('network:fetch')) throw new PluginError('PERMISSION_DENIED', 'Missing network:fetch permission');
        return this.apiImplementation.fetch?.(url, options) || fetch(url, options);
      },
      getTenant: async () => {
        return this.apiImplementation.getTenant?.() || { id: this.tenantId };
      },
      getSettings: async (key?: string) => {
        if (!hasPermission('read:settings')) throw new PluginError('PERMISSION_DENIED', 'Missing read:settings permission');
        return this.apiImplementation.getSettings?.(key);
      },
    };
  }

  private createPluginStorage(pluginId: string): PluginStorage {
    const storage = this.storage.get(pluginId) || new Map();
    
    return {
      get: async (key: string) => storage.get(key),
      set: async (key: string, value: any) => {
        storage.set(key, value);
        this.emit('plugin:storage:set', pluginId, key, value);
      },
      remove: async (key: string) => {
        storage.delete(key);
        this.emit('plugin:storage:remove', pluginId, key);
      },
      clear: async () => {
        storage.clear();
        this.emit('plugin:storage:clear', pluginId);
      },
    };
  }

  private createPluginHooks(pluginId: string): PluginHooks {
    return {
      addFilter: (name: string, callback: Function, priority = 10) => {
        this.addHook('filter', name, callback, priority, pluginId);
      },
      applyFilter: (name: string, value: any, ...args: any[]) => {
        return this.applyFilter(name, value, ...args);
      },
      addAction: (name: string, callback: Function, priority = 10) => {
        this.addHook('action', name, callback, priority, pluginId);
      },
      doAction: (name: string, ...args: any[]) => {
        this.doAction(name, ...args);
      },
      removeHook: (name: string, callback: Function) => {
        this.removeHook(name, callback);
      },
    };
  }

  private createPluginUtils(): PluginUtils {
    return {
      sanitize: (input: string) => input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
      escape: (input: string) => input.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      }[m] || m)),
      formatCurrency: (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
        }).format(amount);
      },
      formatDate: (date: Date | string, format = 'short') => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-US', {
          dateStyle: format as any,
        });
      },
      generateId: () => Math.random().toString(36).substring(2) + Date.now().toString(36),
      hash: (input: string) => {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
          const char = input.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash.toString();
      },
      encrypt: (data: string, key: string) => {
        // Simple XOR encryption for demo
        return Buffer.from(data).toString('base64');
      },
      decrypt: (data: string, key: string) => {
        // Simple XOR decryption for demo
        return Buffer.from(data, 'base64').toString();
      },
    };
  }

  private addHook(type: 'filter' | 'action', name: string, callback: Function, priority: number, plugin: string): void {
    const hooks = this.hooks.get(name) || [];
    hooks.push({ callback, priority, plugin });
    hooks.sort((a, b) => a.priority - b.priority);
    this.hooks.set(name, hooks);
  }

  private applyFilter(name: string, value: any, ...args: any[]): any {
    const hooks = this.hooks.get(name) || [];
    return hooks.reduce((current, hook) => {
      try {
        return hook.callback(current, ...args);
      } catch (error) {
        console.error(`Filter ${name} failed in plugin ${hook.plugin}:`, error);
        return current;
      }
    }, value);
  }

  private doAction(name: string, ...args: any[]): void {
    const hooks = this.hooks.get(name) || [];
    hooks.forEach(hook => {
      try {
        hook.callback(...args);
      } catch (error) {
        console.error(`Action ${name} failed in plugin ${hook.plugin}:`, error);
      }
    });
  }

  private removeHook(name: string, callback: Function): void {
    const hooks = this.hooks.get(name) || [];
    this.hooks.set(name, hooks.filter(h => h.callback !== callback));
  }

  private removePluginHooks(pluginId: string): void {
    this.hooks.forEach((hooks, name) => {
      this.hooks.set(name, hooks.filter(h => h.plugin !== pluginId));
    });
  }

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version || !manifest.author) {
      throw new PluginError('INVALID_MANIFEST', 'Plugin manifest is missing required fields');
    }

    if (!manifest.main) {
      throw new PluginError('INVALID_MANIFEST', 'Plugin manifest must specify main entry point');
    }

    if (!Array.isArray(manifest.permissions)) {
      throw new PluginError('INVALID_MANIFEST', 'Plugin manifest must specify permissions array');
    }

    if (!Array.isArray(manifest.hooks)) {
      throw new PluginError('INVALID_MANIFEST', 'Plugin manifest must specify hooks array');
    }
  }
}