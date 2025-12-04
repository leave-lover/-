import React from 'react';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  return (
    <div className="app-container">
      {/* 侧边栏组件 */}
      <Sidebar />
      
      {/* 主内容区域 */}
      <main className="main-content">
        <div className="content-wrapper">
          <h1>Hello World</h1>
          <p>欢迎来到能源防御与攻击平台！</p>
        </div>
      </main>
    </div>
  );
};

export default App;