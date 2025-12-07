import React from "react";

const ResetTest: React.FC = () => {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>复位功能测试说明</h2>
      <p>请按照以下步骤测试复位功能：</p>
      <ol>
        <li>在拓扑图上进行一些拖拽操作，将视图移动到任意位置</li>
        <li>使用鼠标滚轮进行缩放，改变视图的缩放级别</li>
        <li>点击"复位视图"按钮，观察视图是否回到中心位置并适应屏幕</li>
      </ol>
      <p>如果复位功能正常工作，视图应该：</p>
      <ul>
        <li>居中显示所有节点（视图中心应该在所有节点的中心位置）</li>
        <li>自动调整缩放级别，使所有节点都能完整显示在视图中</li>
        <li>有平滑的动画过渡效果</li>
      </ul>
    </div>
  );
};

export default ResetTest;
