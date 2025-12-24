import React from "react";
import "./DefenseSimulationPanel.css";

interface DefenseSimulationPanelProps {
  onDefenseSimulationResults?: (results: any) => void;
  originalAttackResults?: any;
}

const DefenseSimulationPanel: React.FC<DefenseSimulationPanelProps> = ({
  onDefenseSimulationResults,
  originalAttackResults,
}) => {
  // 模拟防御结果数据 - 与终端输出匹配
  const mockDefenseResults = {
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

  // 处理全体防御按钮点击事件
  const handleAllDefense = () => {
    // 模拟防御模拟过程
    console.log("执行全体防御模拟...");

    // 根据原始攻击结果生成防御效果
    const generateDefenseResults = () => {
      if (originalAttackResults) {
        // 计算防御后的结果
        return {
          // 基准成本使用原始攻击结果中的基准成本
          baseline_cost: originalAttackResults.baseline_cost || 98615.61,
          // 攻击成本等于基准成本（因为攻击被防御）
          attack_cost: originalAttackResults.baseline_cost || 98615.61,
          // 攻击目标值为0（因为攻击被防御）
          attack_objective: 0.0,
          // 成本增加为0
          cost_increase: 0.0,
          cost_increase_percent: 0.0,
          secure_device_stats: {
            // 保护所有电力节点
            protected_electric_nodes: 39,
            total_electric_nodes: 39,
            // 保护所有天然气节点
            protected_gas_nodes: 20,
            total_gas_nodes: 20,
            // 阻止的攻击次数等于原始攻击中的攻击节点数量
            blocked_attacks: originalAttackResults.attacked_nodes?.length || 0,
          },
          protection_mode: "全节点保护",
        };
      } else {
        // 如果没有原始攻击结果，使用默认模拟数据
        return mockDefenseResults;
      }
    };

    // 生成防御结果
    const defenseResults = generateDefenseResults();

    // 触发被保护节点事件，通知拓扑图和攻击数据更新
    const protectedNodesEvent = new CustomEvent("protectedNodes", {
      detail: {
        isAllProtected: true,
      },
    });
    window.dispatchEvent(protectedNodesEvent);

    // 调用回调函数，传递防御模拟结果
    if (onDefenseSimulationResults) {
      onDefenseSimulationResults(defenseResults);
    }
  };

  return (
    <div className="defense-simulation-panel">
      <div className="panel-header">
        <h2>🛡️ 防御模拟</h2>
      </div>
      <div className="panel-content">
        <div className="defense-controls">
          <h3>防御策略选择</h3>
          <div className="strategy-options">
            <div className="strategy-option">
              <h4>全体防御</h4>
              <p>对所有节点实施防御措施，提升系统整体安全性</p>
              <button
                className="defense-button primary"
                onClick={handleAllDefense}
              >
                执行全体防御
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefenseSimulationPanel;
