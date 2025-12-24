import React, { useState, useRef, useEffect } from "react";
import "./AttackSimulationPanel.css";

interface AttackSimulationPanelProps {
  onAttackSimulationResults?: (results: any) => void;
  onShowChart?: (data: any, type: "bar", source?: string) => void;
  onCalculationStatusChange?: (isCalculating: boolean) => void;
}

// 默认参数值 - 仅tauD可配置
const defaultTauD = 0.5;

// 参数列表 - 固定范围和步长
const parameters = [
  {
    id: "attack_amplitude",
    name: "攻击幅度系数",
    min: 0.3, // 固定最小值为0.3
    max: 0.9, // 固定最大值为0.9
    step: 0.2, // 固定步长为0.2
  },
];

// 敏感性分析配置
interface SensitivityConfig {
  parameter: string;
  minValue: number;
  maxValue: number;
  stepValue: number;
}

const AttackSimulationPanel: React.FC<AttackSimulationPanelProps> = ({
  onAttackSimulationResults,
  onShowChart,
  onCalculationStatusChange,
}) => {
  const [tauD, setTauD] = useState<number>(defaultTauD);
  const [isRunning, setIsRunning] = useState(false);

  // 固定参数鲁棒性分析配置，不再需要展开/折叠状态
  const [sensitivityConfig, setSensitivityConfig] = useState<SensitivityConfig>(
    {
      parameter: "attack_amplitude",
      minValue: 0.3, // 固定最小值为0.3
      maxValue: 0.9, // 固定最大值为0.9
      stepValue: 0.2, // 固定步长为0.2
    }
  );
  const [isSensitivityRunning, setIsSensitivityRunning] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  // 分离的提示状态管理
  const [attackNotification, setAttackNotification] = useState<string | null>(
    null
  );
  const [robustnessNotification, setRobustnessNotification] = useState<
    string | null
  >(null);
  const [attackError, setAttackError] = useState<string | null>(null);
  const [robustnessError, setRobustnessError] = useState<string | null>(null);
  const [attackNotificationExpanded, setAttackNotificationExpanded] =
    useState(false);
  const [robustnessNotificationExpanded, setRobustnessNotificationExpanded] =
    useState(false);

  const lastTimestampRef = useRef<number>(0);

  // 监听计算状态变化，通知父组件
  useEffect(() => {
    const isCalculating = isRunning || isSensitivityRunning;
    if (onCalculationStatusChange) {
      onCalculationStatusChange(isCalculating);
    }

    // 组件卸载时，通知父组件计算已停止
    return () => {
      if (onCalculationStatusChange) {
        onCalculationStatusChange(false);
      }
    };
  }, [isRunning, isSensitivityRunning, onCalculationStatusChange]);

  // 处理tauD参数变化
  const handleTauDChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setTauD(numValue);
    }
  };

  // 重置参数到默认值
  const handleReset = () => {
    setTauD(defaultTauD);
    setAttackError(null);
    setRobustnessError(null);
    setAttackNotification(null);
    setRobustnessNotification(null);
  };

  // 处理敏感性分析参数选择变化 - 固定范围和步长
  const handleSensitivityParameterSelect = (paramId: string) => {
    setSensitivityConfig((prev) => ({
      ...prev,
      parameter: paramId,
      // 保持固定的最小值、最大值和步长
      minValue: 0.3,
      maxValue: 0.9,
      stepValue: 0.2,
    }));
  };

  // 执行攻击模拟
  const handleRunSimulation = async () => {
    setIsRunning(true);
    setAttackError(null);
    setAttackNotification("攻击模拟正在运行中...");

    try {
      const params = {
        tauD: tauD,
      };

      const response = await fetch(
        "http://localhost:5000/api/attack-simulation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );

      if (response.ok) {
        const simulationResults = await response.json();
        console.log("Attack simulation results:", simulationResults);

        if (simulationResults.success) {
          setAttackNotification("攻击模拟运行成功！");
          if (onAttackSimulationResults) {
            onAttackSimulationResults(simulationResults.data);
          }
        } else {
          console.error("Attack simulation failed:", simulationResults.message);
          throw new Error(simulationResults.message || "攻击模拟执行失败");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Attack simulation API error:", errorData);
        throw new Error(errorData.message || "攻击模拟执行失败");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      console.error("Attack simulation error:", err);
      setAttackError(errorMessage);
      setAttackNotification(`攻击模拟失败: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 开始长轮询获取参数鲁棒性分析结果
  const startSensitivityPolling = () => {
    // 清除之前的定时器
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // 初始化时间戳
    lastTimestampRef.current = 0;

    // 在新分析开始时清空图表数据，确保只显示当前分析结果
    if (onShowChart) {
      const emptyChartData = {
        labels: [],
        datasets: [
          {
            label: `系统成本 (${
              parameters.find((p) => p.id === sensitivityConfig.parameter)?.name
            })`,
            data: [],
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
          {
            label: `攻击目标值 (${
              parameters.find((p) => p.id === sensitivityConfig.parameter)?.name
            })`,
            data: [],
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      };
      onShowChart(emptyChartData, "bar", "robustness");
    }

    // 设置新的定时器，每秒查询一次
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/parameter-sensitivity/results"
        );
        if (response.ok) {
          const data = await response.json();
          const sensitivityData = data.data;

          // 检查数据是否更新
          if (sensitivityData.timestamp > lastTimestampRef.current) {
            // 更新ref
            lastTimestampRef.current = sensitivityData.timestamp;

            // 如果有结果数据，更新柱状图
            if (sensitivityData.results.length > 0 && onShowChart) {
              // 准备图表数据 - 显示参数值和对应的成本、攻击目标值
              const chartData = {
                labels: sensitivityData.results.map((result: any) => {
                  // 确保parameter字段存在且可转换为字符串
                  const param = result?.parameter;
                  return param !== undefined && param !== null ? param.toString() : '未知';
                }),
                datasets: [
                  {
                    label: `系统成本 (${
                      parameters.find(
                        (p) => p.id === sensitivityConfig.parameter
                      )?.name
                    })`,
                    data: sensitivityData.results.map(
                      (result: any) => {
                        // 确保cost字段存在且为数值
                        const cost = result?.cost;
                        return typeof cost === 'number' ? cost : 0;
                      }
                    ),
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                  },
                  {
                    label: `攻击目标值 (${
                      parameters.find(
                        (p) => p.id === sensitivityConfig.parameter
                      )?.name
                    })`,
                    data: sensitivityData.results.map(
                      (result: any) => {
                        // 确保attack_objective字段存在且为数值
                        const obj = result?.attack_objective;
                        return typeof obj === 'number' ? obj : 0;
                      }
                    ),
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1,
                  },
                ],
              };

              // 更新柱状图 - 这会触发拓展栏弹出
              onShowChart(chartData, "bar", "robustness");
            }

            // 检查是否计算完成
            if (!sensitivityData.is_running) {
              // 计算完成，停止轮询
              clearInterval(intervalId);
              setPollingInterval(null);
              setIsSensitivityRunning(false);
              setRobustnessNotification("参数鲁棒性分析已完成！");
            }
          }
        }
      } catch (error) {
        console.error("获取参数鲁棒性分析结果失败:", error);
        // 如果出现错误，停止轮询
        clearInterval(intervalId);
        setPollingInterval(null);
        setIsSensitivityRunning(false);
      }
    }, 1000);

    setPollingInterval(intervalId);
  };

  // 执行参数鲁棒性分析
  const handleSensitivityCalculate = async () => {
    setIsSensitivityRunning(true);
    setRobustnessError(null);
    setRobustnessNotification("参数鲁棒性分析正在运行中...");

    try {
      // 重置迭代数据
      await fetch(
        "http://localhost:5000/api/attack-simulation/reset-iterations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // 调用后端API执行参数鲁棒性分析
      const response = await fetch(
        "http://localhost:5000/api/parameter-sensitivity",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parameter: sensitivityConfig.parameter,
            minValue: sensitivityConfig.minValue,
            maxValue: sensitivityConfig.maxValue,
            stepValue: sensitivityConfig.stepValue,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("参数鲁棒性分析API调用失败");
      }

      // 开始长轮询，实时获取迭代数据
      startSensitivityPolling();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      setRobustnessError(errorMessage);
      setRobustnessNotification(`参数鲁棒性分析失败: ${errorMessage}`);
      setIsSensitivityRunning(false);
    }
  };

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return (
    <div className="attack-simulation-panel">
      <div className="panel-header">
        <h2>⚔️ 攻击模拟参数配置</h2>
      </div>

      <div className="params-section">
        <h3>优化参数</h3>
        <div className="param-group">
          <div className="param-item">
            <label>τ_d 参数:</label>
            <input
              type="number"
              step="0.1"
              value={tauD}
              onChange={(e) => handleTauDChange(e.target.value)}
              min="0.1"
              max="1.0"
            />
          </div>
        </div>
      </div>

      <div className="actions-section">
        <button
          className="run-button"
          onClick={handleRunSimulation}
          disabled={isRunning}
        >
          {isRunning ? (
            <span className="loading-button">
              <span className="spinner"></span>
              运行中...
            </span>
          ) : (
            "运行攻击模拟"
          )}
        </button>

        <button className="reset-button" onClick={handleReset}>
          重置参数
        </button>
      </div>

      {/* 攻击模拟提示区 - 移至攻击模拟操作下方 */}
      {(attackNotification || attackError) && (
        <div className="notification-section attack-notification">
          <div
            className="notification-header"
            onClick={() =>
              setAttackNotificationExpanded(!attackNotificationExpanded)
            }
          >
            <div className="notification-title">
              <span className="notification-icon">⚔️</span>
              <strong>攻击模拟提示</strong>
            </div>
            <div className="notification-toggle">
              {attackNotificationExpanded ? "▼" : "▶"}
            </div>
          </div>
          {attackNotificationExpanded && (
            <div className="notification-content">
              {attackNotification && (
                <div className="notification-text">{attackNotification}</div>
              )}
              {attackError && (
                <div className="error-message">
                  <strong>错误:</strong> {attackError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 参数鲁棒性分析部分 - 固定参数，一直显示 */}
      <div className="sensitivity-analysis-section">
        <div className="sensitivity-header">
          <h3>参数鲁棒性分析</h3>
        </div>

        <div className="sensitivity-content">
          <div className="sensitivity-param-selector">
            <label htmlFor="sensitivity-parameter">选择参数：</label>
            <select
              id="sensitivity-parameter"
              value={sensitivityConfig.parameter}
              onChange={(e) => handleSensitivityParameterSelect(e.target.value)}
            >
              {parameters.map((param) => (
                <option key={param.id} value={param.id}>
                  {param.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sensitivity-range-settings">
            <div className="sensitivity-range-item">
              <label htmlFor="sensitivity-min">最小值：</label>
              <input
                type="number"
                id="sensitivity-min"
                value={0.3}
                disabled
                step="0.1"
                min="0.1"
                max="1.0"
              />
            </div>

            <div className="sensitivity-range-item">
              <label htmlFor="sensitivity-max">最大值：</label>
              <input
                type="number"
                id="sensitivity-max"
                value={0.9}
                disabled
                step="0.1"
                min="0.1"
                max="1.0"
              />
            </div>

            <div className="sensitivity-range-item">
              <label htmlFor="sensitivity-step">步长：</label>
              <input
                type="number"
                id="sensitivity-step"
                value={0.2}
                disabled
                step="0.1"
                min="0.1"
                max="1.0"
              />
            </div>
          </div>

          <div className="sensitivity-actions">
            <button
              className="calculate-sensitivity-button"
              onClick={handleSensitivityCalculate}
              disabled={isSensitivityRunning}
            >
              {isSensitivityRunning ? (
                <span className="loading-button">
                  <span className="spinner"></span>
                  计算中...
                </span>
              ) : (
                "计算"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 参数鲁棒性分析提醒区 - 移至鲁棒性分析下方 */}
      {(robustnessNotification || robustnessError) && (
        <div className="notification-section robustness-notification">
          <div
            className="notification-header"
            onClick={() =>
              setRobustnessNotificationExpanded(!robustnessNotificationExpanded)
            }
          >
            <div className="notification-title">
              <span className="notification-icon">📊</span>
              <strong>参数鲁棒性分析提醒</strong>
            </div>
            <div className="notification-toggle">
              {robustnessNotificationExpanded ? "▼" : "▶"}
            </div>
          </div>
          {robustnessNotificationExpanded && (
            <div className="notification-content">
              {robustnessNotification && (
                <div className="notification-text">
                  {robustnessNotification}
                </div>
              )}
              {robustnessError && (
                <div className="error-message">
                  <strong>错误:</strong> {robustnessError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttackSimulationPanel;
