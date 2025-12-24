import React, { useState } from "react";
import DataImport from "../../data/components/DataImport";
import "./ToolPanel.css";

interface ToolPanelProps {
  onDataImported: () => void;
}

const ToolPanel: React.FC<ToolPanelProps> = ({ onDataImported }) => {
  const [activeTool, setActiveTool] = useState<string>("data-import");

  // 工具列表
  const tools = [
    { id: "data-import", name: "数据导入", icon: "📥" },
    { id: "analysis", name: "数据分析", icon: "📊" },
    { id: "settings", name: "工具设置", icon: "⚙️" },
  ];

  return (
    <div className="tool-panel">
      {/* 工具导航栏 */}
      <div className="tool-navigation">
        <h3>工具面板</h3>
        <ul className="tool-list">
          {tools.map((tool) => (
            <li
              key={tool.id}
              className={`tool-item ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => setActiveTool(tool.id)}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-name">{tool.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 工具内容区域 */}
      <div className="tool-content">
        {activeTool === "data-import" && (
          <div className="tool-wrapper">
            <DataImport onDataImported={onDataImported} />
          </div>
        )}

        {activeTool === "analysis" && (
          <div className="tool-wrapper">
            <h2>数据分析工具</h2>
            <p>这里将放置数据分析相关的功能。</p>
            <div className="placeholder-content">
              <p>功能开发中...</p>
            </div>
          </div>
        )}

        {activeTool === "settings" && (
          <div className="tool-wrapper">
            <h2>工具设置</h2>
            <p>这里将放置工具相关的设置选项。</p>
            <div className="placeholder-content">
              <p>功能开发中...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolPanel;
