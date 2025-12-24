import React from "react";
import "./DefenseSimulationResults.css";

interface DefenseSimulationResultsProps {
  results?: any;
  onShowChart?: (data: any, type: "bar") => void;
}

const DefenseSimulationResults: React.FC<DefenseSimulationResultsProps> = ({
  results,
}) => {
  // 使用默认值处理未定义的结果
  const defaultResults = {
    baseline_cost: 98615.61,
    attack_cost: 98615.61,
    attack_objective: 0.0,
    cost_increase: 0.0,
    cost_increase_percent: 0.0,
    secure_device_stats: {
      protected_electric_nodes: 39,
      total_electric_nodes: 39,
      protected_gas_nodes: 20,
      total_gas_nodes: 20,
      blocked_attacks: 0,
    },
    protection_mode: "全节点保护",
  };

  const displayResults = results || defaultResults;

  return (
    <div className="defense-simulation-results-content">
      <div className="defense-results-header">
        <h3>防御模拟结果</h3>
        <button
          className="close-defense-button prominent"
          onClick={() => {
            // 触发取消防御事件
            const cancelDefenseEvent = new CustomEvent("cancelDefense", {
              detail: {
                action: "close_defense",
              },
            });
            window.dispatchEvent(cancelDefenseEvent);
          }}
        >
          ✕ 关闭防御
        </button>
      </div>

      <div className="defense-results-section">
        <h4>防御效果分析</h4>
        <div className="results-grid">
          <div className="result-item">
            <div className="result-label">攻击目标值</div>
            <div className="result-value">
              {displayResults.attack_objective.toFixed(6)}
            </div>
          </div>
          <div className="result-item">
            <div className="result-label">成本增加</div>
            <div className="result-value">
              {displayResults.cost_increase.toFixed(2)} (
              {displayResults.cost_increase_percent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      <div className="defense-results-section">
        <h4>保密设备统计</h4>
        <div className="results-grid">
          <div className="result-item">
            <div className="result-label">保护电力节点</div>
            <div className="result-value">
              {displayResults.secure_device_stats.protected_electric_nodes}/
              {displayResults.secure_device_stats.total_electric_nodes}
            </div>
          </div>
          <div className="result-item">
            <div className="result-label">保护天然气节点</div>
            <div className="result-value">
              {displayResults.secure_device_stats.protected_gas_nodes}/
              {displayResults.secure_device_stats.total_gas_nodes}
            </div>
          </div>
        </div>

        {displayResults.protection_mode === "全节点保护" && (
          <div className="protection-highlight">
            ★ 全节点保护模式：系统完全免疫虚假数据注入攻击！
          </div>
        )}
      </div>
    </div>
  );
};

export default DefenseSimulationResults;
