// 统一的图数据类型定义
export interface GraphNode {
  id: string;
  name?: string;
  type?: string;
  group?: string;
  vm?: number;
  va?: number;
  pd?: number;
  qd?: number;
  [key: string]: any;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  [key: string]: any;
}