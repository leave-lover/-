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

// Specific link types with their unique properties
export interface ElectricBranchLink extends GraphLink {
  type: "electric_branch";
  r?: number; // 电阻
  x?: number; // 电抗
}

export interface GeneratorConnectionLink extends GraphLink {
  type: "generator_connection";
  value?: number; // 有功出力
}

export interface GasPipeLink extends GraphLink {
  type: "gas_pipe";
  capacity?: number; // 管道容量
}

export interface GasSourceConnectionLink extends GraphLink {
  type: "gas_source_connection";
  value?: number; // 气源供气量
}

export interface CouplingLink extends GraphLink {
  type: "coupling";
  value?: string; // 耦合类型标识
}
