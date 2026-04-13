/** 任务类型标签：max 表示该标签每天需点击完成的次数。 */
export interface Tag {
  name: string;
  max: number;
}

export interface Task {
  id: string | number;
  name: string;
  start?: string;
  end?: string;
  tags?: (Tag | string)[];
  /**
   * 按「日期字符串 YYYY-MM-DD」记录当日完成情况。
   * - `true`：无多标签时整任务标记完成；或多标签下表示当日需展开为各标签满额（由写入逻辑决定）。
   * - `Record<tagName, number>`：各标签当日已完成次数。
   */
  logs: Record<string, any>;
  groupId?: string;
  color?: string;
  accountId?: string;
  accountInfo?: string;
  coopInfo?: string;
  note?: string;
}
