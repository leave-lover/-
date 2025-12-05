import React from 'react';
import Sidebar from './components/Sidebar';
import TopologyGraph from './components/TopologyGraph';
import './components/TopologyGraph.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      {/* 侧边栏组件 */}
      <Sidebar />
      
      {/* 主内容区域 */}
      <main className="main-content">
        <div className="content-wrapper">
          <h1>能源网络拓扑可视化</h1>
          <p>欢迎来到能源防御与攻击平台！</p>
          <TopologyGraph />
        </div>
      </main>
    </div>
  );
};

export default App;