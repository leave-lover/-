import React, { useState } from "react";
import DataImport from "./DataImport";

interface SidebarProps {
  // 预留props接口，支持未来功能扩展
  className?: string;
  collapsed?: boolean;
  onDataImported: () => void; // 数据导入成功后的回调函数
}

const Sidebar: React.FC<SidebarProps> = ({
  className = "",
  collapsed = false,
  onDataImported,
}) => {
  return (
    <aside
      className={`sidebar ${
        collapsed ? "sidebar--collapsed" : ""
      } ${className}`}
      aria-label="Sidebar Navigation"
    >
      {/* 侧边栏头部 - 预留空间 */}
      <div className="sidebar__header">
        <h2>能源防御与攻击平台</h2>
      </div>

      {/* 侧边栏导航区域 */}
      <nav className="sidebar__nav">
        {!collapsed && (
          <div className="sidebar-section">
            <DataImport onDataImported={onDataImported} />
          </div>
        )}
      </nav>

      {/* 侧边栏底部 - 预留空间 */}
      <div className="sidebar__footer">
        {collapsed && (
          <div className="collapsed-sidebar-footer">
            <span>能源平台</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
