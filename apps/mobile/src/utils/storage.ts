import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV for high-performance synchronous storage
const storage = new MMKV();

/**
 * AsyncStorage utilities for large data that doesn't need to be accessed synchronously
 */
export class AsyncStorageService {
  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  }

  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  }

  static async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const keyValuePairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, any> = {};
      
      keyValuePairs.forEach(([key, value]) => {
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error in multiGet:', error);
      return {};
    }
  }

  static async multiSet(keyValuePairs: [string, any][]): Promise<void> {
    try {
      const stringifiedPairs: [string, string][] = keyValuePairs.map(([key, value]) => [
        key,
        JSON.stringify(value)
      ]);
      await AsyncStorage.multiSet(stringifiedPairs);
    } catch (error) {
      console.error('Error in multiSet:', error);
      throw error;
    }
  }

  static async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error in multiRemove:', error);
      throw error;
    }
  }

  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw error;
    }
  }
}

/**
 * MMKV utilities for high-performance synchronous storage
 * Use for frequently accessed data, settings, and small values
 */
export class SecureStorage {
  static set<T>(key: string, value: T): void {
    try {
      if (typeof value === 'string') {
        storage.set(key, value);
      } else if (typeof value === 'number') {
        storage.set(key, value);
      } else if (typeof value === 'boolean') {
        storage.set(key, value);
      } else {
        storage.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error storing ${key} in MMKV:`, error);
    }
  }

  static get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const value = storage.getString(key);
      if (value === undefined) return defaultValue;
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`Error retrieving ${key} from MMKV:`, error);
      return defaultValue;
    }
  }

  static getString(key: string, defaultValue?: string): string | undefined {
    try {
      return storage.getString(key) ?? defaultValue;
    } catch (error) {
      console.error(`Error retrieving string ${key}:`, error);
      return defaultValue;
    }
  }

  static getNumber(key: string, defaultValue?: number): number | undefined {
    try {
      return storage.getNumber(key) ?? defaultValue;
    } catch (error) {
      console.error(`Error retrieving number ${key}:`, error);
      return defaultValue;
    }
  }

  static getBoolean(key: string, defaultValue?: boolean): boolean | undefined {
    try {
      return storage.getBoolean(key) ?? defaultValue;
    } catch (error) {
      console.error(`Error retrieving boolean ${key}:`, error);
      return defaultValue;
    }
  }

  static remove(key: string): void {
    try {
      storage.delete(key);
    } catch (error) {
      console.error(`Error removing ${key} from MMKV:`, error);
    }
  }

  static contains(key: string): boolean {
    try {
      return storage.contains(key);
    } catch (error) {
      console.error(`Error checking ${key} in MMKV:`, error);
      return false;
    }
  }

  static getAllKeys(): string[] {
    try {
      return storage.getAllKeys();
    } catch (error) {
      console.error('Error getting all MMKV keys:', error);
      return [];
    }
  }

  static clear(): void {
    try {
      storage.clearAll();
    } catch (error) {
      console.error('Error clearing MMKV:', error);
    }
  }

  static getSize(): number {
    try {
      return storage.size;
    } catch (error) {
      console.error('Error getting MMKV size:', error);
      return 0;
    }
  }
}

/**
 * Specialized storage services for different data types
 */
export class UserPreferences {
  private static PREFIX = 'pref_';

  static setTheme(theme: 'light' | 'dark' | 'auto'): void {
    SecureStorage.set(`${this.PREFIX}theme`, theme);
  }

  static getTheme(): 'light' | 'dark' | 'auto' {
    return SecureStorage.get(`${this.PREFIX}theme`, 'auto');
  }

  static setNotificationsEnabled(enabled: boolean): void {
    SecureStorage.set(`${this.PREFIX}notifications`, enabled);
  }

  static getNotificationsEnabled(): boolean {
    return SecureStorage.getBoolean(`${this.PREFIX}notifications`, true) ?? true;
  }

  static setBiometricsEnabled(enabled: boolean): void {
    SecureStorage.set(`${this.PREFIX}biometrics`, enabled);
  }

  static getBiometricsEnabled(): boolean {
    return SecureStorage.getBoolean(`${this.PREFIX}biometrics`, false) ?? false;
  }

  static setAnalyticsEnabled(enabled: boolean): void {
    SecureStorage.set(`${this.PREFIX}analytics`, enabled);
  }

  static getAnalyticsEnabled(): boolean {
    return SecureStorage.getBoolean(`${this.PREFIX}analytics`, true) ?? true;
  }

  static setLanguage(language: string): void {
    SecureStorage.set(`${this.PREFIX}language`, language);
  }

  static getLanguage(): string {
    return SecureStorage.getString(`${this.PREFIX}language`, 'en') ?? 'en';
  }

  static clearAll(): void {
    const keys = SecureStorage.getAllKeys().filter(key => key.startsWith(this.PREFIX));
    keys.forEach(key => SecureStorage.remove(key));
  }
}

export class CacheManager {
  private static PREFIX = 'cache_';

  static setCache<T>(key: string, data: T, ttl?: number): void {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 24 * 60 * 60 * 1000, // Default 24 hours
    };
    SecureStorage.set(`${this.PREFIX}${key}`, cacheData);
  }

  static getCache<T>(key: string): T | null {
    const cacheData = SecureStorage.get<{
      data: T;
      timestamp: number;
      ttl: number;
    }>(`${this.PREFIX}${key}`);

    if (!cacheData) return null;

    const now = Date.now();
    if (now - cacheData.timestamp > cacheData.ttl) {
      // Cache expired
      this.removeCache(key);
      return null;
    }

    return cacheData.data;
  }

  static removeCache(key: string): void {
    SecureStorage.remove(`${this.PREFIX}${key}`);
  }

  static clearExpiredCache(): void {
    const keys = SecureStorage.getAllKeys().filter(key => key.startsWith(this.PREFIX));
    const now = Date.now();

    keys.forEach(key => {
      const cacheData = SecureStorage.get<{
        timestamp: number;
        ttl: number;
      }>(key);

      if (cacheData && now - cacheData.timestamp > cacheData.ttl) {
        SecureStorage.remove(key);
      }
    });
  }

  static clearAllCache(): void {
    const keys = SecureStorage.getAllKeys().filter(key => key.startsWith(this.PREFIX));
    keys.forEach(key => SecureStorage.remove(key));
  }

  static getCacheSize(): number {
    const keys = SecureStorage.getAllKeys().filter(key => key.startsWith(this.PREFIX));
    return keys.length;
  }
}

/**
 * Migration utilities for handling storage schema changes
 */
export class StorageMigration {
  private static MIGRATION_VERSION_KEY = 'storage_migration_version';
  private static CURRENT_VERSION = 1;

  static async runMigrations(): Promise<void> {
    const currentVersion = SecureStorage.getNumber(this.MIGRATION_VERSION_KEY, 0) ?? 0;

    if (currentVersion < this.CURRENT_VERSION) {
      await this.migrate(currentVersion, this.CURRENT_VERSION);
      SecureStorage.set(this.MIGRATION_VERSION_KEY, this.CURRENT_VERSION);
    }
  }

  private static async migrate(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`Migrating storage from version ${fromVersion} to ${toVersion}`);

    for (let version = fromVersion; version < toVersion; version++) {
      switch (version) {
        case 0:
          await this.migrateToV1();
          break;
        // Add more migration cases as needed
      }
    }
  }

  private static async migrateToV1(): Promise<void> {
    // Example migration: move data from AsyncStorage to MMKV
    try {
      const oldTheme = await AsyncStorageService.getItem<string>('theme');
      if (oldTheme) {
        UserPreferences.setTheme(oldTheme as 'light' | 'dark' | 'auto');
        await AsyncStorageService.removeItem('theme');
      }
    } catch (error) {
      console.error('Migration to v1 failed:', error);
    }
  }
}