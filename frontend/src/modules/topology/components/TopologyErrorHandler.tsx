import React from "react";

// 错误类型定义
interface TopologyError {
  id: string;
  message: string;
  type: "data" | "network" | "coupling" | "render" | "unknown";
  timestamp: Date;
  severity: "low" | "medium" | "high";
}

interface TopologyErrorHandlerProps {
  children: React.ReactNode;
  onError?: (error: TopologyError) => void;
}

// 独立的错误处理上下文
const TopologyErrorHandler: React.FC<TopologyErrorHandlerProps> = ({
  children,
}) => {
  // 直接渲染子组件，暂时不处理错误
  return <>{children}</>;
};

export default TopologyErrorHandler;
export type { TopologyError };
