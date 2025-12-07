import React, { useState, useEffect } from "react";

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
  onError 
}) => {
  const [errors, setErrors] = useState<TopologyError[]>([]);
  const [isolatedMode, setIsolatedMode] = useState(false);

  // 添加错误
  const addError = (error: Omit<TopologyError, "id" | "timestamp">) => {
    const newError: TopologyError = {
      ...error,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    
    setErrors(prev => [...prev, newError]);
    
    // 调用外部错误处理回调
    if (onError) {
      onError(newError);
    }
    
    // 对于严重错误，启用隔离模式
    if (error.severity === "high") {
      setIsolatedMode(true);
    }
  };

  // 清除错误
  const clearErrors = () => {
    setErrors([]);
  };

  // 重置隔离模式
  const resetIsolatedMode = () => {
    setIsolatedMode(false);
    clearErrors();
  };

  // 检测耦合相关错误
  const detectCouplingIssues = (graphData: any) => {
    try {
      if (!graphData || !graphData.links) return;
      
      // 检查耦合连接是否可能导致布局问题
      const couplingLinks = graphData.links.filter((link: any) => 
        link.type === "coupling"
      );
      
      if (couplingLinks.length > 0) {
        // 检查耦合连接是否形成循环或其他复杂结构
        const nodesInCoupling = new Set();
        couplingLinks.forEach((link: any) => {
          nodesInCoupling.add(link.source);
          nodesInCoupling.add(link.target);
        });
        
        // 如果超过50%的节点参与耦合，可能存在性能问题
        if (graphData.nodes && nodesInCoupling.size > graphData.nodes.length * 0.5) {
          addError({
            message: "检测到大量节点参与耦合连接，可能影响拓扑图展开性能",
            type: "coupling",
            severity: "medium"
          });
        }
      }
    } catch (err) {
      addError({
        message: "检测耦合连接时发生错误",
        type: "coupling",
        severity: "low"
      });
    }
  };

  // 隔离模式下的渲染
  if (isolatedMode) {
    return (
      <div className="topology-error-isolated">
        <div className="error-content">
          <h3>拓扑图已进入隔离模式</h3>
          <p>检测到可能影响拓扑图正常显示的问题，已启用保护机制。</p>
          <div className="error-list">
            {errors.map(error => (
              <div key={error.id} className={`error-item severity-${error.severity}`}>
                <strong>{error.message}</strong>
                <small>{error.timestamp.toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
          <button onClick={resetIsolatedMode}>恢复正常模式</button>
        </div>
      </div>
    );
  }

  // 正常渲染子组件
  return (
    <>
      {children}
      {errors.length > 0 && (
        <div className="topology-errors">
          {errors.map(error => (
            <div key={error.id} className={`error-item severity-${error.severity}`}>
              {error.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default TopologyErrorHandler;
export type { TopologyError };