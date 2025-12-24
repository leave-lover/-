import React, { useState } from "react";

interface ParameterSensitivityAnalysisProps {
  onShowChart: (data: any, type: "bar") => void;
}

const ParameterSensitivityAnalysis: React.FC<
  ParameterSensitivityAnalysisProps
> = ({ onShowChart }) => {
  // 参数列表 - 固定范围和步长
  const parameters = [
    {
      id: "attack_amplitude",
      name: "攻击幅度系数",
      min: 0.3, // 固定最小值为0.3
      max: 0.9, // 固定最大值为0.9
      step: 0.2, // 固定步长为0.2
    },
    // 可以添加更多参数
  ];

  // 状态管理 - 固定范围和步长
  const [selectedParameter, setSelectedParameter] =
    useState<string>("attack_amplitude");
  const [minValue, setMinValue] = useState<number>(0.3); // 固定最小值为0.3
  const [maxValue, setMaxValue] = useState<number>(0.9); // 固定最大值为0.9
  const [stepValue, setStepValue] = useState<number>(0.2); // 固定步长为0.2
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [chartType, setChartType] = useState<string>("cost"); // "cost" 或 "attack_objective"
  const [isRunning, setIsRunning] = useState<boolean>(false); // 控制加载动画

  // 当选择参数变化时，更新参数但保持固定范围和步长
  const handleParameterChange = (paramId: string) => {
    setSelectedParameter(paramId);
    // 保持固定的最小值、最大值和步长
    setMinValue(0.3);
    setMaxValue(0.9);
    setStepValue(0.2);
  };

  // 执行参数鲁棒性分析
  const handleCalculate = async () => {
    // 设置运行状态为true
    setIsRunning(true);
    // 在函数顶部声明paramValues，使其在整个函数作用域内可用
    let paramValues: number[] = [];

    try {
      // 生成参数值数组
      for (
        let value: number = minValue;
        value <= maxValue;
        value += stepValue
      ) {
        paramValues.push(parseFloat(value.toFixed(2)));
      }

      // 调用后端API进行参数鲁棒性分析
      const response = await fetch(
        "http://localhost:5000/api/parameter-sensitivity",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parameter: selectedParameter,
            minValue: minValue,
            maxValue: maxValue,
            stepValue: stepValue,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 清空之前的结果，准备接收新结果
      setAnalysisResults([]);

      // 初始图表，显示空数据
      const initialChartData = {
        labels: paramValues.map((v: number) => v.toString()),
        datasets: [
          {
            label: `系统总成本 (${
              parameters.find((p) => p.id === selectedParameter)?.name
            })`,
            data: new Array(paramValues.length).fill(0),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 1)",
            borderWidth: 1,
          },
          {
            label: `攻击目标值 (${
              parameters.find((p) => p.id === selectedParameter)?.name
            })`,
            data: new Array(paramValues.length).fill(0),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      };

      // 调用父组件的显示初始图表
      onShowChart(initialChartData, "bar");

      // 使用定期轮询代替WebSocket，因为后端没有实现WebSocket端点
      const pollInterval = setInterval(async () => {
        try {
          const resultsResponse = await fetch(
            "http://localhost:5000/api/parameter-sensitivity/results"
          );

          if (!resultsResponse.ok) {
            throw new Error(`HTTP error! status: ${resultsResponse.status}`);
          }

          const resultsData = await resultsResponse.json();
          const currentResults = resultsData.data.results;

          if (currentResults && currentResults.length > 0) {
            setAnalysisResults(currentResults);

            // 更新图表数据
            // 构建包含两个数据集的数据结构：系统总成本和攻击目标值
            const updatedChartData = {
              labels: currentResults.map((r: any) => {
                // 确保parameter字段存在且可转换为字符串
                const param = r?.parameter;
                return param !== undefined && param !== null
                  ? param.toString()
                  : "未知";
              }),
              datasets: [
                {
                  label: `系统总成本 (${
                    parameters.find((p) => p.id === selectedParameter)?.name
                  })`,
                  data: currentResults.map((r: any) => {
                    // 确保cost字段存在且为数值
                    const cost = r?.cost;
                    return typeof cost === "number" ? cost : 0;
                  }),
                  backgroundColor: "rgba(75, 192, 192, 0.6)",
                  borderColor: "rgba(75, 192, 192, 1)",
                  borderWidth: 1,
                },
                {
                  label: `攻击目标值 (${
                    parameters.find((p) => p.id === selectedParameter)?.name
                  })`,
                  data: currentResults.map((r: any) => {
                    // 确保attack_objective字段存在且为数值
                    const obj = r?.attack_objective;
                    return typeof obj === "number" ? obj : 0;
                  }),
                  backgroundColor: "rgba(255, 99, 132, 0.6)",
                  borderColor: "rgba(255, 99, 132, 1)",
                  borderWidth: 1,
                },
              ],
            };

            onShowChart(updatedChartData, "bar");
          }

          // 检查是否分析完成，如果完成则停止轮询
          const apiIsRunning = resultsData.data.is_running;
          if (!apiIsRunning) {
            clearInterval(pollInterval);
            console.log("参数敏感性分析完成，停止轮询");
            // 设置运行状态为false
            setIsRunning(false);
          }
        } catch (error) {
          console.error("轮询获取结果出错:", error);
          clearInterval(pollInterval);
          // 设置运行状态为false
          setIsRunning(false);
        }
      }, 2000); // 每2秒轮询一次

      // 组件卸载时停止轮询
      return () => {
        clearInterval(pollInterval);
        // 设置运行状态为false
        setIsRunning(false);
      };
    } catch (error) {
      console.error("参数鲁棒性分析计算出错:", error);
      // 出错时清空分析结果
      setAnalysisResults([]);
      // 设置运行状态为false
      setIsRunning(false);
    }
  };

  return (
    <div className="parameter-sensitivity-analysis">
      <h3>参数鲁棒性分析</h3>

      <div className="analysis-section">
        <h4>参数设置</h4>

        <div className="parameter-selector">
          <label htmlFor="parameter">选择参数：</label>
          <select
            id="parameter"
            value={selectedParameter}
            onChange={(e) => handleParameterChange(e.target.value)}
          >
            {parameters.map((param) => (
              <option key={param.id} value={param.id}>
                {param.name}
              </option>
            ))}
          </select>
        </div>

        <div className="range-settings">
          <div className="range-item">
            <label htmlFor="min-value">最小值：</label>
            <input
              type="number"
              id="min-value"
              value={minValue}
              disabled // 禁用编辑
              step="0.1"
              min="0.3"
              max="0.9"
            />
          </div>

          <div className="range-item">
            <label htmlFor="max-value">最大值：</label>
            <input
              type="number"
              id="max-value"
              value={maxValue}
              disabled // 禁用编辑
              step="0.1"
              min="0.3"
              max="0.9"
            />
          </div>

          <div className="range-item">
            <label htmlFor="step-value">步长：</label>
            <input
              type="number"
              id="step-value"
              value={stepValue}
              disabled // 禁用编辑
              step="0.1"
              min="0.1"
              max="1.0"
            />
          </div>
        </div>

        <div className="chart-type-selector">
          <label htmlFor="chart-type">图表类型：</label>
          <select
            id="chart-type"
            value={chartType}
            onChange={(e) => {
              setChartType(e.target.value);
              // 如果已有结果，重新生成图表
              if (analysisResults) {
                const chartData = {
                  labels: analysisResults.map((r: any) =>
                    r.parameter.toString()
                  ),
                  datasets: [
                    {
                      label:
                        e.target.value === "cost"
                          ? `系统总成本 (${
                              parameters.find((p) => p.id === selectedParameter)
                                ?.name
                            })`
                          : `攻击目标值 (${
                              parameters.find((p) => p.id === selectedParameter)
                                ?.name
                            })`,
                      data: analysisResults.map((r: any) =>
                        e.target.value === "cost" ? r.cost : r.attack_objective
                      ),
                      backgroundColor:
                        e.target.value === "cost"
                          ? "rgba(75, 192, 192, 0.6)"
                          : "rgba(255, 99, 132, 0.6)",
                      borderColor:
                        e.target.value === "cost"
                          ? "rgba(75, 192, 192, 1)"
                          : "rgba(255, 99, 132, 1)",
                      borderWidth: 1,
                    },
                  ],
                };
                onShowChart(chartData, "bar");
              }
            }}
          >
            <option value="cost">系统总成本</option>
            <option value="attack_objective">攻击目标值</option>
          </select>
        </div>

        <div className="calculate-button-container">
          <button
            className="calculate-button"
            onClick={handleCalculate}
            disabled={isRunning}
          >
            {isRunning ? (
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

      {analysisResults && (
        <div className="results-section">
          <h4>分析结果</h4>
          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>
                    {parameters.find((p) => p.id === selectedParameter)?.name}
                  </th>
                  <th>系统总成本</th>
                  <th>攻击目标值</th>
                </tr>
              </thead>
              <tbody>
                {analysisResults.map((result: any, index: number) => (
                  <tr key={index}>
                    <td>
                      {result?.parameter !== undefined &&
                      result?.parameter !== null
                        ? result.parameter
                        : "未知"}
                    </td>
                    <td>
                      {typeof result?.cost === "number" ? result.cost : 0}
                    </td>
                    <td>
                      {typeof result?.attack_objective === "number"
                        ? result.attack_objective
                        : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .parameter-sensitivity-analysis {
          padding: 15px;
          background-color: var(--bg-tertiary);
          border-radius: 8px;
          box-shadow: 0 0 10px var(--shadow-secondary);
        }

        .parameter-sensitivity-analysis h3 {
          margin-top: 0;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-primary);
          padding-bottom: 8px;
          text-shadow: 0 0 3px var(--shadow-primary);
        }

        .parameter-sensitivity-analysis h4 {
          margin: 15px 0 10px 0;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .parameter-sensitivity-analysis .analysis-section {
          margin-bottom: 20px;
        }

        .parameter-sensitivity-analysis .parameter-selector {
          margin-bottom: 15px;
        }

        .parameter-sensitivity-analysis .parameter-selector label {
          display: block;
          margin-bottom: 5px;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .parameter-sensitivity-analysis .parameter-selector select {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .parameter-sensitivity-analysis .parameter-selector select:hover {
          border-color: var(--text-primary);
          box-shadow: 0 0 5px var(--shadow-primary);
        }

        .parameter-sensitivity-analysis .chart-type-selector {
          margin-bottom: 15px;
        }

        .parameter-sensitivity-analysis .chart-type-selector label {
          display: block;
          margin-bottom: 5px;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .parameter-sensitivity-analysis .chart-type-selector select {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .parameter-sensitivity-analysis .chart-type-selector select:hover {
          border-color: var(--text-primary);
          box-shadow: 0 0 5px var(--shadow-primary);
        }

        .parameter-sensitivity-analysis .range-settings {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 15px;
        }

        .parameter-sensitivity-analysis .range-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .parameter-sensitivity-analysis .range-item label {
          color: var(--text-primary);
          font-size: 0.9rem;
          min-width: 80px;
        }

        .parameter-sensitivity-analysis .range-item input {
          width: 120px;
          padding: 6px;
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .parameter-sensitivity-analysis .range-item input:hover {
          border-color: var(--text-primary);
          box-shadow: 0 0 5px var(--shadow-primary);
        }

        .parameter-sensitivity-analysis .calculate-button-container {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }

        .parameter-sensitivity-analysis .calculate-button {
          padding: 10px 20px;
          background-color: var(--highlight);
          color: var(--text-primary);
          border: 1px solid var(--text-primary);
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 0 5px var(--shadow-primary);
        }

        .parameter-sensitivity-analysis .calculate-button:hover {
          background-color: var(--text-primary);
          color: var(--bg-primary);
          box-shadow: 0 0 10px var(--shadow-primary);
        }

        .parameter-sensitivity-analysis .calculate-button:disabled {
          background-color: var(--bg-quaternary);
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* 旋转加载动画样式 */
        .loading-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(var(--text-primary-rgb), 0.3);
          border-top-color: var(--text-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .parameter-sensitivity-analysis .results-section {
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px solid var(--border-primary);
        }

        .parameter-sensitivity-analysis .results-table {
          overflow-x: auto;
        }

        .parameter-sensitivity-analysis table {
          width: 100%;
          border-collapse: collapse;
          background-color: var(--bg-secondary);
          border-radius: 4px;
          overflow: hidden;
        }

        .parameter-sensitivity-analysis th,
        .parameter-sensitivity-analysis td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid var(--border-primary);
        }

        .parameter-sensitivity-analysis th {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
          font-weight: bold;
        }

        .parameter-sensitivity-analysis tr:hover {
          background-color: rgba(var(--highlight-rgb), 0.1);
        }
      `}</style>
    </div>
  );
};

export default ParameterSensitivityAnalysis;
