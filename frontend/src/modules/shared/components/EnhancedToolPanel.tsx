import React, { useState } from "react";
import DataImport from "../../data/components/DataImport";
import ExtensionInterface from "./ExtensionInterface";
import SystemOptimizationPanel from "./SystemOptimizationPanel";
import AttackSimulationPanel from "../../attack-simulation/components/AttackSimulationPanel";
import DefenseSimulationPanel from "../../defense-simulation/components/DefenseSimulationPanel";
import ConfirmModal from "./ConfirmModal";
import "./EnhancedToolPanel.css";

interface ToolPanelProps {
  onDataImported: () => void;
  onOptimizationData?: (
    iterations: any[],
    current: number,
    systemStatus?: any,
    originalOutput?: string
  ) => void;
  onAttackSimulationResults?: (results: any) => void;
  onDefenseSimulationResults?: (results: any) => void;
  onShowChart?: (data: any, type: "bar", source?: string) => void;
  originalAttackResults?: any;
}

interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface ToolState {
  [key: string]: any;
}

const EnhancedToolPanel: React.FC<ToolPanelProps> = ({
  onDataImported,
  onOptimizationData,
  onAttackSimulationResults,
  onDefenseSimulationResults,
  onShowChart,
  originalAttackResults,
}) => {
  // 当前视图："selector" 表示工具选择页面，工具ID表示具体工具页面
  const [currentView, setCurrentView] = useState<"selector" | string>(
    "selector"
  );

  // 存储各工具的状态
  const [toolStates, setToolStates] = useState<ToolState>({});

  // 计算状态管理
  const [isCalculating, setIsCalculating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBackAction, setPendingBackAction] = useState<
    (() => void) | null
  >(null);

  // 处理计算状态变化
  const handleCalculationStatusChange = (calculating: boolean) => {
    setIsCalculating(calculating);
  };

  // 处理确认返回
  const handleConfirmBack = () => {
    setShowConfirmModal(false);
    if (pendingBackAction) {
      pendingBackAction();
      setPendingBackAction(null);
    }
  };

  // 处理取消返回
  const handleCancelBack = () => {
    setShowConfirmModal(false);
    setPendingBackAction(null);
  };

  // 工具列表
  const tools: Tool[] = [
    {
      id: "data-import",
      name: "数据导入",
      icon: "📥",
      description: "导入和处理网络数据文件",
    },
    {
      id: "optimization",
      name: "系统优化",
      icon: "⚡",
      description: "优化能源系统的运行状态",
    },
    {
      id: "attack-simulation",
      name: "攻击模拟",
      icon: "⚔️",
      description: "模拟不同类型的网络攻击场景",
    },
    {
      id: "defense-simulation",
      name: "防御模拟",
      icon: "🛡️",
      description: "模拟不同类型的网络防御策略",
    },
  ];

  // 处理工具选择
  const handleSelectTool = (toolId: string) => {
    setCurrentView(toolId);
  };

  // 返回工具选择页面
  const handleBackToSelector = () => {
    // 如果当前正在计算，显示确认弹窗
    if (isCalculating) {
      setPendingBackAction(() => () => setCurrentView("selector"));
      setShowConfirmModal(true);
    } else {
      setCurrentView("selector");
    }
  };

  // 更新工具状态
  const updateToolState = (toolId: string, state: any) => {
    setToolStates((prev) => ({
      ...prev,
      [toolId]: { ...prev[toolId], ...state },
    }));
  };

  // 渲染工具选择页面
  const renderToolSelector = () => (
    <div className="tool-selector">
      <div className="selector-header">
        <h2>工具选择</h2>
        <p>请选择您要使用的工具</p>
      </div>
      <div className="tool-grid">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="tool-card"
            onClick={() => handleSelectTool(tool.id)}
          >
            <div className="tool-icon">{tool.icon}</div>
            <h3 className="tool-name">{tool.name}</h3>
            <p className="tool-description">{tool.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染数据导入工具
  const renderDataImportTool = () => (
    <div className="tool-view">
      <div className="tool-header">
        <button className="back-button" onClick={handleBackToSelector}>
          ← 返回
        </button>
        <h2>数据导入</h2>
      </div>
      <div className="tool-content">
        <DataImport
          onDataImported={onDataImported}
          initialState={toolStates["data-import"]}
          onStateChange={(state) => updateToolState("data-import", state)}
        />
      </div>
    </div>
  );

  // 渲染数据分析工具
  // const renderAnalysisTool = () => (
  //   <div className="tool-view">
  //     <div className="tool-header">
  //       <button className="back-button" onClick={handleBackToSelector}>
  //         ← 返回
  //       </button>
  //       <h2>数据分析</h2>
  //     </div>
  //     <div className="tool-content">
  //       <div className="analysis-dashboard">
  //         <div className="dashboard-section">
  //           <h3>网络性能概览</h3>
  //           <div className="chart-placeholder">
  //             <p>网络拓扑图将在此处显示</p>
  //           </div>
  //         </div>
  //         <div className="dashboard-section">
  //           <h3>关键指标</h3>
  //           <div className="metrics-grid">
  //             <div className="metric-card">
  //               <h4>节点数量</h4>
  //               <p className="metric-value">24</p>
  //             </div>
  //             <div className="metric-card">
  //               <h4>连接数</h4>
  //               <p className="metric-value">42</p>
  //             </div>
  //             <div className="metric-card">
  //               <h4>负载率</h4>
  //               <p className="metric-value">68%</p>
  //             </div>
  //             <div className="metric-card">
  //               <h4>风险指数</h4>
  //               <p className="metric-value warning">7.2</p>
  //             </div>
  //           </div>
  //         </div>
  //         <div className="dashboard-section">
  //           <h3>分析工具</h3>
  //           <div className="analysis-controls">
  //             <button className="analysis-btn primary">运行诊断</button>
  //             <button className="analysis-btn">脆弱性评估</button>
  //             <button className="analysis-btn">优化建议</button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );

  // 渲染工具设置
  const renderSettingsTool = () => (
    <div className="tool-view">
      <div className="tool-header">
        <button className="back-button" onClick={handleBackToSelector}>
          ← 返回
        </button>
        <h2>工具设置</h2>
      </div>
      <div className="tool-content">
        <div className="settings-panel">
          <div className="settings-section">
            <h3>通用设置</h3>
            <div className="setting-item">
              <label htmlFor="language">语言</label>
              <select id="language" defaultValue="zh">
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>数据导入设置</h3>
            <div className="setting-item">
              <label htmlFor="auto-refresh">自动刷新数据</label>
              <input type="checkbox" id="auto-refresh" defaultChecked />
            </div>
            <div className="setting-item">
              <label htmlFor="backup-data">自动备份原始数据</label>
              <input type="checkbox" id="backup-data" defaultChecked />
            </div>
          </div>

          <div className="settings-section">
            <h3>通知设置</h3>
            <div className="setting-item">
              <label htmlFor="email-notifications">邮件通知</label>
              <input type="checkbox" id="email-notifications" />
            </div>
            <div className="setting-item">
              <label htmlFor="desktop-alerts">桌面提醒</label>
              <input type="checkbox" id="desktop-alerts" defaultChecked />
            </div>
          </div>

          <div className="settings-actions">
            <button className="settings-btn primary">保存设置</button>
            <button className="settings-btn">恢复默认</button>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染报告生成工具
  const renderReportsTool = () => (
    <div className="tool-view">
      <div className="tool-header">
        <button className="back-button" onClick={handleBackToSelector}>
          ← 返回
        </button>
        <h2>报告生成</h2>
      </div>
      <div className="tool-content">
        <div className="reports-dashboard">
          <div className="report-section">
            <h3>生成新报告</h3>
            <div className="report-form">
              <div className="form-group">
                <label>报告类型</label>
                <select defaultValue="network-analysis">
                  <option value="network-analysis">网络分析报告</option>
                  <option value="security-assessment">安全评估报告</option>
                  <option value="performance-review">性能评审报告</option>
                </select>
              </div>
              <div className="form-group">
                <label>时间范围</label>
                <div className="date-range">
                  <input type="date" />
                  <span>至</span>
                  <input type="date" />
                </div>
              </div>
              <div className="form-group">
                <label>包含内容</label>
                <div className="checkbox-group">
                  <label>
                    <input type="checkbox" defaultChecked /> 图表数据
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked /> 分析结论
                  </label>
                  <label>
                    <input type="checkbox" /> 详细日志
                  </label>
                </div>
              </div>
              <button className="generate-btn primary">生成报告</button>
            </div>
          </div>

          <div className="report-section">
            <h3>历史报告</h3>
            <div className="report-list">
              <div className="report-item">
                <div className="report-info">
                  <h4>网络分析报告 - 2025-12-01</h4>
                  <p>包含完整的网络性能分析和风险评估</p>
                </div>
                <div className="report-actions">
                  <button className="action-btn">查看</button>
                  <button className="action-btn">下载</button>
                </div>
              </div>
              <div className="report-item">
                <div className="report-info">
                  <h4>安全评估报告 - 2025-11-25</h4>
                  <p>针对最近安全事件的专项评估</p>
                </div>
                <div className="report-actions">
                  <button className="action-btn">查看</button>
                  <button className="action-btn">下载</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染攻击模拟工具
  const renderAttackSimulationTool = () => (
    <div className="tool-view">
      <div className="tool-header">
        <button className="back-button" onClick={handleBackToSelector}>
          ← 返回
        </button>
        <h2>攻击模拟</h2>
      </div>
      <div className="tool-content">
        <AttackSimulationPanel
          onAttackSimulationResults={onAttackSimulationResults}
          onShowChart={onShowChart}
          onCalculationStatusChange={handleCalculationStatusChange}
        />
      </div>
    </div>
  );

  // 渲染防御模拟工具
  const renderDefenseSimulationTool = () => (
    <div className="tool-view">
      <div className="tool-header">
        <button className="back-button" onClick={handleBackToSelector}>
          ← 返回
        </button>
        <h2>防御模拟</h2>
      </div>
      <div className="tool-content">
        <DefenseSimulationPanel
          onDefenseSimulationResults={onDefenseSimulationResults}
          originalAttackResults={originalAttackResults}
        />
      </div>
    </div>
  );

  // 渲染系统优化面板
  const renderSystemOptimizationPanel = () => (
    <div className="tool-view">
      <div className="tool-header">
        <button className="back-button" onClick={handleBackToSelector}>
          ← 返回
        </button>
        <h2>系统优化</h2>
      </div>
      <div className="tool-content optimized-content">
        <SystemOptimizationPanel onOptimizationData={onOptimizationData} />
      </div>
    </div>
  );

  // 渲染扩展接口
  const renderExtensionInterface = () => (
    <div className="tool-view">
      <div className="tool-header">
        <button className="back-button" onClick={handleBackToSelector}>
          ← 返回
        </button>
        <h2>功能扩展</h2>
      </div>
      <div className="tool-content">
        <ExtensionInterface />
      </div>
    </div>
  );

  // 渲染占位符工具
  // const renderPlaceholderTool = (toolName: string) => (
  //   <div className="tool-view">
  //     <div className="tool-header">
  //       <button className="back-button" onClick={handleBackToSelector}>
  //         ← 返回
  //       </button>
  //       <h2>{toolName}</h2>
  //     </div>
  //     <div className="tool-content">
  //       <div className="placeholder-content">
  //         <div className="construction-icon">🚧</div>
  //         <h3>功能开发中</h3>
  //         <p>此功能正在紧张开发中，敬请期待！</p>
  //       </div>
  //     </div>
  //   </div>
  // );

  return (
    <div className="enhanced-tool-panel">
      {currentView === "selector" ? renderToolSelector() : null}
      {currentView === "data-import" ? renderDataImportTool() : null}
      {currentView === "optimization" ? renderSystemOptimizationPanel() : null}
      {currentView === "extension" ? renderExtensionInterface() : null}
      {currentView === "settings" ? renderSettingsTool() : null}
      {currentView === "reports" ? renderReportsTool() : null}
      {currentView === "attack-simulation"
        ? renderAttackSimulationTool()
        : null}
      {currentView === "defense-simulation"
        ? renderDefenseSimulationTool()
        : null}

      {/* 确认弹窗组件 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancelBack}
        onConfirm={handleConfirmBack}
        title="确认返回"
        content="当前计算正在进行中，返回将终止计算，是否继续？"
        confirmText="确认返回"
        cancelText="取消"
      />
    </div>
  );
};

export default EnhancedToolPanel;
