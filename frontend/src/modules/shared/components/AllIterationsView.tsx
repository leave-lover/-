import React, { useState } from "react";
import "./AllIterationsView.css";

// 定义迭代数据结构
interface IterationData {
  iteration: number;
  cost: number;
  efficiency: number;
  timestamp: string;
  details: {
    networkRouting: number;
    resourceAllocation: number;
    dataCompression: number;
    cacheStrategy: number;
    loadBalancing: number;
  };
}

interface AllIterationsViewProps {
  iterations: IterationData[];
  onIterationSelect?: (iteration: number) => void;
}

const AllIterationsView: React.FC<AllIterationsViewProps> = ({
  iterations,
  onIterationSelect,
}) => {
  // 折叠状态管理
  const [collapsed, setCollapsed] = useState(false);

  // 切换折叠状态
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  if (!iterations || iterations.length === 0) {
    return <div className="all-iterations-view">暂无迭代数据</div>;
  }

  return (
    <div className="all-iterations-view">
      <div className="section-header collapsible-header">
        <h3>所有优化迭代步骤</h3>
        <button
          className={`collapse-toggle ${collapsed ? "collapsed" : ""}`}
          onClick={toggleCollapse}
          aria-label={collapsed ? "展开" : "折叠"}
        >
          {collapsed ? "▶" : "▼"}
        </button>
      </div>

      {/* 迭代步骤表格 */}
      <div
        className={`iterations-table-container ${collapsed ? "collapsed" : ""}`}
      >
        {!collapsed && (
          <table className="iterations-table">
            <thead>
              <tr>
                <th>迭代次数</th>
                <th>时间戳</th>
                <th>成本</th>
                <th>效率</th>
                <th>网络路由优化</th>
                <th>资源分配优化</th>
                <th>数据压缩</th>
                <th>缓存策略优化</th>
                <th>负载均衡</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {iterations.map((iteration) => (
                <tr key={iteration.iteration}>
                  <td>{iteration.iteration}</td>
                  <td>{iteration.timestamp}</td>
                  <td>{iteration.cost.toFixed(2)}</td>
                  <td>{iteration.efficiency.toFixed(2)}%</td>
                  <td>{iteration.details.networkRouting.toFixed(2)}%</td>
                  <td>{iteration.details.resourceAllocation.toFixed(2)}%</td>
                  <td>{iteration.details.dataCompression.toFixed(2)}%</td>
                  <td>{iteration.details.cacheStrategy.toFixed(2)}%</td>
                  <td>{iteration.details.loadBalancing.toFixed(2)}%</td>
                  <td>
                    <button
                      className="view-detail-btn"
                      onClick={() =>
                        onIterationSelect &&
                        onIterationSelect(iteration.iteration)
                      }
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 汇总信息 */}
      <div className={`iterations-summary ${collapsed ? "collapsed" : ""}`}>
        {!collapsed && (
          <>
            <h4>迭代汇总</h4>
            <div className="summary-cards">
              <div className="summary-card">
                <span className="summary-label">总迭代次数</span>
                <span className="summary-value">{iterations.length}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">初始成本</span>
                <span className="summary-value">
                  {iterations[0]?.cost.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">最终成本</span>
                <span className="summary-value">
                  {iterations[iterations.length - 1]?.cost.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">成本降低</span>
                <span className="summary-value">
                  {iterations[0] && iterations[iterations.length - 1]
                    ? (
                        ((iterations[0].cost -
                          iterations[iterations.length - 1].cost) /
                          iterations[0].cost) *
                        100
                      ).toFixed(2) + "%"
                    : "N/A"}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">最终效率</span>
                <span className="summary-value">
                  {iterations[iterations.length - 1]?.efficiency.toFixed(2) +
                    "%" || "N/A"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AllIterationsView;
