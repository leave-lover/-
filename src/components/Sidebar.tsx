import React from "react";

interface SidebarProps {
  // 预留props接口，支持未来功能扩展
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  className = "",
  collapsed = false,
  onToggle,
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
        {/* 未来可添加logo、标题或折叠按钮 */}
      </div>

      {/* 侧边栏导航区域 - 预留空间 */}
      <nav className="sidebar__nav">{/* 未来可添加导航菜单 */}</nav>

      {/* 侧边栏底部 - 预留空间 */}
      <div className="sidebar__footer">{/* 未来可添加用户信息、设置等 */}</div>
    </aside>
  );
};

export default Sidebar;
