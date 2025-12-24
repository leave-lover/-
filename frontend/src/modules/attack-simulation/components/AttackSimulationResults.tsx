import React, { useState } from "react";
import ChartComponent from "../../shared/components/ChartComponent";
import "./AttackSimulationResults.css";

interface AttackSimulationResultsProps {
  results?: any;
  mode?: "attack-results" | "node-comparison";
  onShowChart?: (data: any, type: "bar") => void;
}

const AttackSimulationResults: React.FC<AttackSimulationResultsProps> = ({
  results,
  // onShowChart, // 暂时注释，因为当前未使用
}) => {
  // 转换数据格式，适配ChartComponent
  const formatChartData = (data: number[]) => {
    return data.map((value, index) => ({
      name: `迭代${index + 1}`,
      value,
    }));
  };

  // 当前视图状态
  const [currentView, setCurrentView] = useState<
    "attack-results" | "node-comparison"
  >("attack-results");

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);

  // 计算结果状态
  const [calculationResults, setCalculationResults] = useState<{
    gasTotal: number | null;
    electricTotal: number | null;
  }>({
    gasTotal: null,
    electricTotal: null,
  });

  // 定义节点数据类型
  interface NodeData {
    node_id: string;
    original_id: number;
    type: "electric" | "gas";
    original_load: number;
    attack_injection: number;
    attacked_load: number;
    load_shedding: number;
  }

  // 计算气节点攻击注入量总和
  const calculateGasTotal = () => {
    const nodes = getSortedNodeData();
    const gasNodes = nodes.filter((node) => node.type === "gas");
    const total = gasNodes.reduce(
      (sum, node) => sum + node.attack_injection,
      0
    );
    setCalculationResults((prev) => ({
      ...prev,
      gasTotal: total,
    }));
  };

  // 计算电节点攻击注入量总和
  const calculateElectricTotal = () => {
    const nodes = getSortedNodeData();
    const electricNodes = nodes.filter((node) => node.type === "electric");
    const total = electricNodes.reduce(
      (sum, node) => sum + node.attack_injection,
      0
    );
    setCalculationResults((prev) => ({
      ...prev,
      electricTotal: total,
    }));
  };

  // 重置计算结果
  const resetCalculations = () => {
    setCalculationResults({
      gasTotal: null,
      electricTotal: null,
    });
  };

  // 当results变化时，发送攻击节点数据事件
  React.useEffect(() => {
    if (results) {
      // 发送攻击节点数据事件
      const event = new CustomEvent("attackedNodes", {
        detail: results,
      });
      window.dispatchEvent(event);
    }
  }, [results]);

  // 确保results是有效的对象
  if (!results) {
    return (
      <div className="attack-simulation-results-content">暂无攻击模拟结果</div>
    );
  }

  // 处理节点数据排序
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // 对节点数据进行排序
  const getSortedNodeData = (): NodeData[] => {
    // 检查数据结构，看看节点数据实际存储在哪里
    let nodesData: NodeData[] = [];

    if (results) {
      // 情况1：直接在results中查找节点相关数据
      if (results.attacked_nodes && Array.isArray(results.attacked_nodes)) {
        nodesData = results.attacked_nodes as NodeData[];
      }
      // 情况2：检查是否有nodes或node_data字段
      else if (results.nodes && Array.isArray(results.nodes)) {
        nodesData = results.nodes as NodeData[];
      } else if (results.node_data && Array.isArray(results.node_data)) {
        nodesData = results.node_data as NodeData[];
      }
      // 情况3：检查是否有电力或天然气节点数据
      else if (results.best_strategy) {
        // 检查电力节点数据
        if (
          results.best_strategy.electric_attack_nodes &&
          Array.isArray(results.best_strategy.electric_attack_nodes)
        ) {
          const electric_nodes = results.best_strategy.electric_attack_nodes;
          const electric_intensities =
            results.best_strategy.electric_attack_intensity || {};

          nodesData = [
            ...nodesData,
            ...electric_nodes.map((nodeId: number) => ({
              node_id: `elec-${nodeId}`,
              original_id: nodeId,
              type: "electric",
              original_load: 0,
              attack_injection: electric_intensities[nodeId.toString()] || 0,
              attacked_load: 0,
              load_shedding: 0,
            })),
          ];
        }

        // 检查天然气节点数据
        if (
          results.best_strategy.gas_attack_nodes &&
          Array.isArray(results.best_strategy.gas_attack_nodes)
        ) {
          const gas_nodes = results.best_strategy.gas_attack_nodes;
          const gas_intensities =
            results.best_strategy.gas_attack_intensity || {};

          nodesData = [
            ...nodesData,
            ...gas_nodes.map((nodeId: number) => ({
              node_id: `gas-${nodeId}`,
              original_id: nodeId,
              type: "gas",
              original_load: 0,
              attack_injection: gas_intensities[nodeId.toString()] || 0,
              attacked_load: 0,
              load_shedding: 0,
            })),
          ];
        }
      }
    }

    // 对节点数据进行排序
    let sortableItems = [...nodesData];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof NodeData];
        const bValue = b[sortConfig.key as keyof NodeData];

        if (aValue < bValue) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  };

  return (
    <div className="attack-simulation-results-content">
      {/* 返回按钮和标题 */}
      {currentView === "node-comparison" && (
        <div className="node-data-controls">
          <button
            className="node-data-btn"
            onClick={() => setCurrentView("attack-results")}
          >
            返回攻击结果
          </button>
          <h3 className="section-title">节点数据对比</h3>
        </div>
      )}

      {/* 攻击模拟结果视图 */}
      {currentView === "attack-results" && (
        <>
          {/* 控制按钮区域 */}
          <div className="node-data-controls">
            <button
              className="node-data-btn"
              onClick={() => setCurrentView("node-comparison")}
            >
              跳转至节点数据对比
            </button>
          </div>

          {/* 上层目标值折线图 */}
          <div className="chart-section">
            <h3>上层目标值变化</h3>
            <ChartComponent
              data={
                results.upper_objective &&
                Array.isArray(results.upper_objective)
                  ? results.upper_objective.map(
                      (value: number, index: number) => ({
                        name: `迭代${index + 1}`,
                        value: value || 0,
                      })
                    )
                  : formatChartData([])
              }
              chartType="line"
            />
          </div>

          {/* 下层成本值折线图 */}
          <div className="chart-section">
            <h3>下层成本值变化</h3>
            <ChartComponent
              data={
                results.lower_cost && Array.isArray(results.lower_cost)
                  ? results.lower_cost.map((value: number, index: number) => ({
                      name: `迭代${index + 1}`,
                      value: value || 0,
                    }))
                  : formatChartData(
                      Array.isArray(results.lower_cost)
                        ? results.lower_cost
                        : []
                    )
              }
              chartType="line"
              baselineValue={results.baseline_cost}
            />
          </div>

          {/* 成本对比柱状图 */}
          {results && (
            <div className="chart-section">
              <h3>成本对比</h3>
              <ChartComponent
                data={{
                  labels: ["基准成本", "最终成本"],
                  datasets: [
                    {
                      label: "成本值",
                      data: [
                        results.baseline_cost || 0,
                        results.lower_cost &&
                        Array.isArray(results.lower_cost) &&
                        results.lower_cost.length > 0
                          ? results.lower_cost[results.lower_cost.length - 1]
                          : 0,
                      ],
                    },
                  ],
                }}
                chartType="bar"
              />
            </div>
          )}

          {/* 最佳策略信息 */}
          {results.best_strategy && (
            <div className="strategy-section">
              <h3>最佳攻击策略</h3>
              <div className="strategy-details">
                <div className="strategy-item">
                  <span className="strategy-label">电力攻击节点:</span>
                  <div className="nodes-list">
                    {results.best_strategy.electric_attack_nodes &&
                    Array.isArray(
                      results.best_strategy.electric_attack_nodes
                    ) &&
                    results.best_strategy.electric_attack_nodes.length > 0 ? (
                      results.best_strategy.electric_attack_nodes.map(
                        (node: number) => (
                          <span key={`elec-${node}`} className="node-item">
                            节点{node}
                          </span>
                        )
                      )
                    ) : (
                      <span className="no-data">暂无数据</span>
                    )}
                  </div>
                </div>
                <div className="strategy-item">
                  <span className="strategy-label">天然气攻击节点:</span>
                  <div className="nodes-list">
                    {results.best_strategy.gas_attack_nodes &&
                    Array.isArray(results.best_strategy.gas_attack_nodes) &&
                    results.best_strategy.gas_attack_nodes.length > 0 ? (
                      results.best_strategy.gas_attack_nodes.map(
                        (node: number) => (
                          <span key={`gas-${node}`} className="node-item">
                            节点{node}
                          </span>
                        )
                      )
                    ) : (
                      <span className="no-data">暂无数据</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 基准情况对比 */}
          {results.cost !== undefined && (
            <div className="baseline-section">
              <h3>攻击结果对比</h3>
              <div className="baseline-info">
                <div className="baseline-item">
                  <span className="baseline-label">攻击总成本:</span>
                  <span className="baseline-value">
                    {results.cost.toFixed(2)}
                  </span>
                </div>
                {results.damage !== undefined && (
                  <div className="baseline-item">
                    <span className="baseline-label">系统损伤:</span>
                    <span className="baseline-value">
                      {results.damage.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 节点数据对比视图 */}
      {currentView === "node-comparison" && (
        <div className="node-data-section">
          {/* 按节点类型分组展示 */}
          <div className="nodes-by-type">
            {/* 天然气节点区域 */}
            <div className="node-type-section gas-section">
              <h3 className="node-type-title">天然气节点攻击注入量</h3>

              {/* 天然气节点柱状图 */}
              <div className="chart-section node-type-chart">
                <ChartComponent
                  data={getSortedNodeData()
                    .filter((node) => node.type === "gas")
                    .map((node) => ({
                      name: `gas-${node.original_id}`,
                      value: node.attack_injection,
                    }))}
                  chartType="bar"
                />
              </div>

              {/* 天然气节点表格 */}
              <div className="node-data-table-container">
                <table className="node-data-table">
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("node_id")}>
                        节点编号
                        {sortConfig?.key === "node_id" && (
                          <span className="sort-indicator">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </th>
                      <th onClick={() => requestSort("attack_injection")}>
                        攻击注入量
                        {sortConfig?.key === "attack_injection" && (
                          <span className="sort-indicator">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const gasNodes = getSortedNodeData().filter(
                        (node) => node.type === "gas"
                      );
                      return gasNodes.length > 0 ? (
                        gasNodes.map((node: any, index: number) => (
                          <tr key={`gas-node-${index}`}>
                            <td>{node.node_id || "N/A"}</td>
                            <td>
                              {node.attack_injection !== undefined
                                ? node.attack_injection.toFixed(4)
                                : "N/A"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="no-data">
                            暂无天然气节点数据
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* 天然气节点求和检验 */}
              <div className="type-calculation-section">
                <div className="type-calculation-buttons">
                  <button
                    className="node-data-btn calculation-btn"
                    onClick={calculateGasTotal}
                  >
                    计算气节点攻击注入量总和
                  </button>
                </div>
                {calculationResults.gasTotal !== null && (
                  <div className="result-item gas-result">
                    <span className="result-label">气节点攻击注入量总和:</span>
                    <span className="result-value">
                      {calculationResults.gasTotal.toFixed(4)}
                    </span>
                    {calculationResults.gasTotal === 0 && (
                      <span className="concealment-indicator">
                        对于气节点的攻击具有隐蔽性
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 电力节点区域 */}
            <div className="node-type-section electric-section">
              <h3 className="node-type-title">电力节点攻击注入量</h3>

              {/* 电力节点柱状图 */}
              <div className="chart-section node-type-chart">
                <ChartComponent
                  data={getSortedNodeData()
                    .filter((node) => node.type === "electric")
                    .map((node) => ({
                      name: `elec-${node.original_id}`,
                      value: node.attack_injection,
                    }))}
                  chartType="bar"
                />
              </div>

              {/* 电力节点表格 */}
              <div className="node-data-table-container">
                <table className="node-data-table">
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("node_id")}>
                        节点编号
                        {sortConfig?.key === "node_id" && (
                          <span className="sort-indicator">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </th>
                      <th onClick={() => requestSort("attack_injection")}>
                        攻击注入量
                        {sortConfig?.key === "attack_injection" && (
                          <span className="sort-indicator">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const electricNodes = getSortedNodeData().filter(
                        (node) => node.type === "electric"
                      );
                      return electricNodes.length > 0 ? (
                        electricNodes.map((node: any, index: number) => (
                          <tr key={`electric-node-${index}`}>
                            <td>{node.node_id || "N/A"}</td>
                            <td>
                              {node.attack_injection !== undefined
                                ? node.attack_injection.toFixed(4)
                                : "N/A"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="no-data">
                            暂无电力节点数据
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* 电力节点求和检验 */}
              <div className="type-calculation-section">
                <div className="type-calculation-buttons">
                  <button
                    className="node-data-btn calculation-btn"
                    onClick={calculateElectricTotal}
                  >
                    计算电节点攻击注入量总和
                  </button>
                </div>
                {calculationResults.electricTotal !== null && (
                  <div className="result-item electric-result">
                    <span className="result-label">电节点攻击注入量总和:</span>
                    <span className="result-value">
                      {calculationResults.electricTotal.toFixed(4)}
                    </span>
                    {calculationResults.electricTotal === 0 && (
                      <span className="concealment-indicator">
                        对于电节点的攻击具有隐蔽性
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 全局计算控制 */}
          <div className="node-data-controls">
            <div className="calculation-buttons">
              <button
                className="node-data-btn reset-btn"
                onClick={resetCalculations}
              >
                重置所有计算
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttackSimulationResults;
