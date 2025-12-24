import React, { useState } from "react";
import "./SystemOptimizationPanel.css";

// 完整的迭代数据结构，与App.tsx保持一致
export interface IterationData {
  iteration: number;
  cost: number;
  efficiency: number;
  timestamp: string;
  details: {
    networkRouting: number;
    resourceAllocation: number;
    dataCompression: number;
    cacheStrategy: number;
    loadBalancing: number;
  };
}

// 优化约束接口
interface OptimizationConstraint {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: "electric" | "gas";
}

// 系统状态数据结构，与App.tsx保持一致
interface GeneratorOutput {
  id: string;
  name: string;
  output: number;
  unit: string;
  type: "electric" | "gas";
  details?: any;
}

interface FlowDistribution {
  id: string;
  name: string;
  flow: number;
  unit: string;
  type: "electric" | "gas";
  details?: any;
}

interface NodeStatus {
  id: string;
  name: string;
  value: number;
  unit: string;
  type: "electric" | "gas";
  details?: any;
}

interface SystemCost {
  generationCost: number;
  transmissionCost: number;
  totalCost: number;
  unit: string;
}

export interface SystemStatusData {
  generatorOutput: GeneratorOutput[];
  flowDistribution: FlowDistribution[];
  nodeStatus: NodeStatus[];
  systemCost: SystemCost;
}

interface SystemOptimizationPanelProps {
  onOptimizationData?: (
    iterations: IterationData[],
    current: number,
    systemStatus?: SystemStatusData,
    originalOutput?: string
  ) => void;
}

const SystemOptimizationPanel: React.FC<SystemOptimizationPanelProps> = ({
  onOptimizationData,
}) => {
  // 优化系统选择状态
  const [electricSystemEnabled, setElectricSystemEnabled] = useState(false);
  const [gasSystemEnabled, setGasSystemEnabled] = useState(false);

  // 细化优化约束说明（仅用于展示，不用于选择）
  const electricConstraints: OptimizationConstraint[] = [
    {
      id: "power-balance",
      name: "节点功率平衡约束",
      description: "确保电力系统各节点的注入功率等于流出功率",
      enabled: true,
      type: "electric",
    },
    {
      id: "generator-output",
      name: "发电机出力约束",
      description: "限制发电机的出力在安全范围内",
      enabled: true,
      type: "electric",
    },
    {
      id: "line-flow",
      name: "线路潮流约束",
      description: "确保线路潮流不超过安全限值",
      enabled: true,
      type: "electric",
    },
  ];

  const gasConstraints: OptimizationConstraint[] = [
    {
      id: "weymouth",
      name: "Weymouth方程约束",
      description: "描述天然气管道流量与压力之间的关系",
      enabled: true,
      type: "gas",
    },
    {
      id: "gas-balance",
      name: "节点气体平衡约束",
      description: "确保天然气系统各节点的注入气量等于流出气量",
      enabled: true,
      type: "gas",
    },
    {
      id: "gas-pressure",
      name: "节点气压约束",
      description: "限制天然气节点压力在安全范围内",
      enabled: true,
      type: "gas",
    },
    {
      id: "gas-source-output",
      name: "气源出力约束",
      description: "限制天然气气源的出力在安全范围内",
      enabled: true,
      type: "gas",
    },
  ];

  // 优化状态
  const [isRunning, setIsRunning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // 运行优化
  const runOptimization = async () => {
    setIsRunning(true);
    setAnalysisResult(null);

    // 检测是否同时选择了两种系统的优化
    const isElectricOnly = electricSystemEnabled && !gasSystemEnabled;
    const isGasOnly = gasSystemEnabled && !electricSystemEnabled;
    const isCoupledOptimization = electricSystemEnabled && gasSystemEnabled;

    // 准备优化类型和约束条件
    const optimizationType = isElectricOnly
      ? "electric"
      : isGasOnly
      ? "gas"
      : isCoupledOptimization
      ? "coupled"
      : "none";

    // 如果没有选择任何系统，不执行优化
    if (optimizationType === "none") {
      setAnalysisResult("请至少选择一个系统进行优化！");
      setIsRunning(false);
      return;
    }

    // 优化类型编码：1代表单独电力优化，2代表单独燃气优化，3代表耦合优化，0代表没有优化
    let optimizationCode = 0;
    if (isElectricOnly) {
      optimizationCode = 1;
    } else if (isGasOnly) {
      optimizationCode = 2;
    } else if (isCoupledOptimization) {
      optimizationCode = 3;
    } else {
      optimizationCode = 0;
    }

    // 准备优化约束数据
    const enabledConstraints = {
      electric: electricSystemEnabled
        ? electricConstraints.map((c) => c.id)
        : [],
      gas: gasSystemEnabled ? gasConstraints.map((c) => c.id) : [],
      optimizationType: optimizationType,
      optimizationCode: optimizationCode,
    };

    try {
      // 调用后端API运行优化
      const response = await fetch(
        "http://localhost:5000/api/run-optimization",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ constraints: enabledConstraints }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const optimizationResult = await response.json();
      console.log("优化结果:", optimizationResult);

      // 生成单次迭代结果
      const iterationData: IterationData = {
        iteration: 1,
        cost: optimizationResult.totalCost || 0,
        efficiency: 0,
        timestamp: new Date().toLocaleTimeString(),
        details: {
          networkRouting: 0,
          resourceAllocation: 0,
          dataCompression: 0,
          cacheStrategy: 0,
          loadBalancing: 0,
        },
      };

      // 调用回调函数传递迭代数据、系统状态和原始输出
      if (onOptimizationData) {
        onOptimizationData(
          [iterationData],
          1,
          optimizationResult.systemStatus,
          optimizationResult.originalOutput
        );
      }

      // 根据优化结果显示不同的消息
      if (optimizationResult.success) {
        // 显示优化成功结果
        setAnalysisResult(
          `系统优化完成！最终成本为${optimizationResult.totalCost.toFixed(2)}。`
        );
      } else {
        // 显示优化失败信息
        setAnalysisResult(`优化执行失败！请检查系统日志获取详细信息。`);
      }
    } catch (error) {
      console.error("优化过程中发生错误:", error);
      // 显示错误信息
      setAnalysisResult(`优化过程中发生错误！请检查网络连接或后端服务。`);
      // 调用回调函数，即使发生错误也传递系统状态
      if (onOptimizationData) {
        const fallbackCost = 1200;
        const iterationData: IterationData = {
          iteration: 1,
          cost: fallbackCost,
          efficiency: 0,
          timestamp: new Date().toLocaleTimeString(),
          details: {
            networkRouting: 0,
            resourceAllocation: 0,
            dataCompression: 0,
            cacheStrategy: 0,
            loadBalancing: 0,
          },
        };
        onOptimizationData([iterationData], 1, undefined);
      }
    } finally {
      setIsRunning(false);
    }
  };

  // 计算当前选择的优化类型
  const isElectricOnly = electricSystemEnabled && !gasSystemEnabled;
  const isGasOnly = gasSystemEnabled && !electricSystemEnabled;
  const isCoupledOptimization = electricSystemEnabled && gasSystemEnabled;
  const optimizationType = isElectricOnly
    ? "电力独立优化"
    : isGasOnly
    ? "燃气独立优化"
    : isCoupledOptimization
    ? "电力-燃气耦合优化"
    : "未选择优化";
  const optimizationTypeColor = isElectricOnly
    ? "#4CAF50"
    : isGasOnly
    ? "#2196F3"
    : isCoupledOptimization
    ? "#FF9800"
    : "#9E9E9E";

  return (
    <div className="system-optimization-panel simplified">
      {/* 优化类型提示 */}
      <div className="optimization-section compact">
        <div className="optimization-type-info simplified">
          <div
            className="optimization-type-indicator"
            style={{ backgroundColor: optimizationTypeColor }}
          ></div>
          <p className="optimization-type-text">
            <strong>优化类型：</strong>
            {optimizationType}
          </p>
        </div>
      </div>

      {/* 系统选择 */}
      <div className="optimization-section">
        <h3>系统选择</h3>

        <div className="system-selection-list simplified">
          {/* 电力系统选择 */}
          <div className="system-selection-item simplified">
            <div className="system-selection-header simplified">
              <h4>⚡ 电力系统</h4>
              <div className="system-control">
                <label className="system-checkbox-container">
                  <input
                    type="checkbox"
                    checked={electricSystemEnabled}
                    onChange={() =>
                      setElectricSystemEnabled(!electricSystemEnabled)
                    }
                  />
                  <span className="checkmark"></span>
                </label>
              </div>
            </div>
          </div>

          {/* 燃气系统选择 */}
          <div className="system-selection-item simplified">
            <div className="system-selection-header simplified">
              <h4>🔥 燃气系统</h4>
              <div className="system-control">
                <label className="system-checkbox-container">
                  <input
                    type="checkbox"
                    checked={gasSystemEnabled}
                    onChange={() => setGasSystemEnabled(!gasSystemEnabled)}
                  />
                  <span className="checkmark"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 简化的约束说明 */}
        <div className="constraints-summary">
          <details className="constraints-details-toggle">
            <summary>查看优化约束</summary>
            <div className="constraints-summary-content">
              <h5>电力系统约束</h5>
              <ul>
                {electricConstraints.map((constraint) => (
                  <li key={constraint.id}>{constraint.name}</li>
                ))}
              </ul>
              <h5>燃气系统约束</h5>
              <ul>
                {gasConstraints.map((constraint) => (
                  <li key={constraint.id}>{constraint.name}</li>
                ))}
              </ul>
              <h5>耦合优化约束</h5>
              <ul>
                <li>天然气发电机耗气约束</li>
              </ul>
            </div>
          </details>
        </div>
      </div>

      {/* 优化控制和结果 */}
      <div className="optimization-section compact">
        <button
          className={`analyze-button ${isRunning ? "analyzing" : ""}`}
          onClick={runOptimization}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <span className="spinner"></span>
              优化中...
            </>
          ) : (
            "开始优化"
          )}
        </button>

        {analysisResult && (
          <div className="analysis-result compact">
            <div className="result-icon">✅</div>
            <p className="optimization-result-text">{analysisResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemOptimizationPanel;
