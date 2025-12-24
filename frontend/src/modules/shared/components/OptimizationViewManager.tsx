import React from "react";
import SystemStatusPanel from "./SystemStatusPanel";
import "./OptimizationViewManager.css";

// 定义发电机输出数据结构
interface GeneratorOutput {
  id: string;
  name: string;
  output: number;
  unit: string;
  type: "electric" | "gas";
  details?: {
    connected_bus?: any;
    qg?: number;
    pmax?: number;
    pmin?: number;
    status?: string;
    min_w?: number;
    max_w?: number;
  };
}

// 定义潮流分布数据结构
interface FlowDistribution {
  id: string;
  name: string;
  flow: number;
  unit: string;
  type: "electric" | "gas";
  details?: {
    source?: string;
    target?: string;
    resistance?: number;
    reactance?: number;
    capacity?: number;
    status?: string;
  };
}

// 定义节点状态数据结构
interface NodeStatus {
  id: string;
  name: string;
  value: number;
  unit: string;
  type: "electric" | "gas";
  details?: {
    bus_type?: number;
    pd?: number;
    qd?: number;
    va?: number;
    status?: string;
    pressure_max?: number;
    pressure_min?: number;
    load?: number;
  };
}

// 定义系统成本数据结构
interface SystemCost {
  generationCost: number;
  transmissionCost: number;
  totalCost: number;
  unit: string;
}

// 定义系统状态数据结构
interface SystemStatusData {
  generatorOutput: GeneratorOutput[];
  flowDistribution: FlowDistribution[];
  nodeStatus: NodeStatus[];
  systemCost: SystemCost;
}

// 定义组件属性
interface OptimizationViewManagerProps {
  onRefresh: () => void;
  onViewModeChange?: (mode: string) => void;
  systemStatus?: SystemStatusData; // 添加系统状态数据属性
  originalOutput?: string; // 添加原始输出数据属性
  onShowChart?: (data: any, type?: "bar") => void; // 添加显示图表的回调函数
}

const OptimizationViewManager: React.FC<OptimizationViewManagerProps> = ({
  onRefresh,
  systemStatus,
  originalOutput,
  onShowChart,
}) => {
  // 始终显示系统状态监控页面，不显示优化结果视图
  return (
    <div className="optimization-view-manager">
      {/* 显示系统状态监控页面 */}
      <SystemStatusPanel
        onRefresh={onRefresh}
        systemStatus={systemStatus}
        originalOutput={originalOutput}
        onShowChart={onShowChart}
      />
    </div>
  );
};

export default OptimizationViewManager;
