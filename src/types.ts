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
  logs: Record<string, any>;
  groupId?: string;
  color?: string;
  accountId?: string;
  accountInfo?: string;
  coopInfo?: string;
  note?: string;
}
