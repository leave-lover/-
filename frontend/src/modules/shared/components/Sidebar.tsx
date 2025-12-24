import React from "react";
import OptimizationViewManager from "./OptimizationViewManager";

// 定义系统状态数据结构
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

interface SystemCost {
  generationCost: number;
  transmissionCost: number;
  totalCost: number;
  unit: string;
}

interface SystemStatusData {
  generatorOutput: GeneratorOutput[];
  flowDistribution: FlowDistribution[];
  nodeStatus: NodeStatus[];
  systemCost: SystemCost;
}

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onDataImported: () => void;
  systemStatus?: SystemStatusData | null;
  originalOutput?: string;
  onShowChart?: (data: any, type?: "bar", source?: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  className = "",
  collapsed = false,
  onDataImported,
  systemStatus = null,
  originalOutput,
  onShowChart,
}) => {
  return (
    <aside
      className={`sidebar ${className} ${
        collapsed ? "sidebar--collapsed" : ""
      }`}
    >
      <div className="sidebar__header"></div>

      <nav className="sidebar__nav">
        {!collapsed && (
          <>
            <OptimizationViewManager
              onRefresh={onDataImported}
              systemStatus={systemStatus || undefined}
              originalOutput={originalOutput}
              onShowChart={onShowChart}
            />
          </>
        )}
      </nav>

      {collapsed && (
        <div className="collapsed-sidebar-footer">
          <span>系统状态监控</span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
