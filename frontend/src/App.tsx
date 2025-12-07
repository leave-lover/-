import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import TopologyGraph from "./components/TopologyGraph";
import "./components/TopologyGraph.css";

const App: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 当数据导入成功时的回调函数
  const handleDataImported = () => {
    // 增加refreshTrigger的值来触发拓扑图组件重新获取数据
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="app-container">
      {/* 侧边栏组件 */}
      <Sidebar onDataImported={handleDataImported} />

      {/* 主内容区域 */}
      <main className="main-content">
        <div className="content-wrapper">
          <h1>能源网络拓扑可视化</h1>
          <p>欢迎来到能源防御与攻击平台！</p>

          {/* 拓扑图组件 */}
          <TopologyGraph refreshTrigger={refreshTrigger} />
        </div>
      </main>
    </div>
  );
};

export default App;
