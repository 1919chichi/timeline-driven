/**
 * useLocalStorage —— 像 useState 一样，但状态自动写回 localStorage。
 *
 * - 初始化：从 `localStorage[key]` 读取并 JSON.parse；为空或解析失败时回退到 initialValue。
 * - 每次 value 变化：JSON.stringify 后写回；写入异常仅打印 console.error，不影响 UI。
 * - 不监听跨 tab 的 storage 事件（本应用是单实例桌面/单窗口使用，无需同步）。
 */
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
