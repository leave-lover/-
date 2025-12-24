import React, { useState, useEffect } from "react";
import "./SystemStatusPanel.css";

// 定义系统状态数据结构
interface GeneratorOutput {
  id: string;
  name: string;
  output: number;
  unit: string;
  type: "electric" | "gas" | "gas_source"; // 扩展类型以支持gas_source
  details?: {
    connected_bus?: any;
    qg?: number;
    pmax?: number;
    pmin?: number;
    status?: string;
    min_w?: number;
    max_w?: number;
  };
}

interface FlowDistribution {
  id: string;
  name: string;
  flow: number;
  unit: string;
  type: "electric" | "gas" | "gas_pipe"; // 扩展类型以支持gas_pipe
  details?: {
    source?: string;
    target?: string;
    resistance?: number;
    reactance?: number;
    capacity?: number;
    status?: string;
  };
}

interface NodeStatus {
  id: string;
  name: string;
  value: number;
  unit: string;
  type: "electric" | "gas" | "gas_node"; // 扩展类型以支持gas_node
  details?: {
    bus_type?: number;
    pd?: number;
    qd?: number;
    va?: number;
    status?: string;
    pressure_max?: number;
    pressure_min?: number;
    load?: number;
  };
}

interface SystemCost {
  generationCost: number;
  transmissionCost: number;
  totalCost: number;
  unit: string;
  gasCost?: number;
  electricCost?: number;
}

interface SystemStatusData {
  generatorOutput: GeneratorOutput[];
  flowDistribution: FlowDistribution[];
  nodeStatus: NodeStatus[];
  systemCost: SystemCost;
  gasSourceOutput?: GeneratorOutput[];
}

interface SystemStatusPanelProps {
  onRefresh: () => void;
  systemStatus?: SystemStatusData | null;
  originalOutput?: string;
  onShowChart?: (data: any, type?: "bar", source?: string) => void;
}

const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({
  onRefresh,
  systemStatus: propSystemStatus,
  onShowChart,
}) => {
  // 初始化系统状态为propSystemStatus，确保组件渲染时立即使用最新数据
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(
    propSystemStatus || null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // 折叠状态管理
  const [collapsedSections, setCollapsedSections] = useState<{
    [key: string]: boolean;
  }>({
    generators: false,
    gasNodes: false,
    gasSources: false,
    gasPipes: false,
    systemCost: false,
  });

  // 切换折叠状态
  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 当propSystemStatus更新时，直接使用数据
  useEffect(() => {
    if (propSystemStatus) {
      setSystemStatus(propSystemStatus);
    }
  }, [propSystemStatus]);

  // 移除了组件挂载时自动获取数据的逻辑，只使用从props传递过来的数据
  // 这样切换到系统状态监控页面时不会更新状态，保持原有数据

  const fetchSystemStatusData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/system-status");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSystemStatus(data);
    } catch (err) {
      console.error("获取系统状态失败:", err);
      setError("获取系统状态失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSystemStatusData();
    onRefresh();
  };

  if (loading) {
    return (
      <div className="system-status-panel">
        <div className="panel-header">
          <h3>系统状态监控</h3>
          <button className="refresh-button" onClick={handleRefresh}>
            ↻
          </button>
        </div>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="system-status-panel">
        <div className="panel-header">
          <h3>系统状态监控</h3>
          <button className="refresh-button" onClick={handleRefresh}>
            ↻
          </button>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!systemStatus) {
    return (
      <div className="system-status-panel">
        <div className="panel-header">
          <h3>系统状态监控</h3>
          <button className="refresh-button" onClick={handleRefresh}>
            ↻
          </button>
        </div>
        <div className="error-message">无法获取系统状态数据</div>
      </div>
    );
  }

  return (
    <div className="system-status-panel">
      <div className="panel-header">
        <h3>系统状态监控</h3>
        <button className="refresh-button" onClick={handleRefresh}>
          ↻
        </button>
      </div>

      {/* 发电机数据范围与实际运行状态 */}
      {systemStatus && systemStatus.generatorOutput.length > 0 && (
        <div className="status-section">
          <div className="section-header collapsible-header">
            <h4>发电机数据范围与实际运行状态</h4>
            <div className="section-header-actions">
              {/* 只有当有发电机显示实际功率时，才显示查看柱状图按钮 */}
              {systemStatus.generatorOutput.some(
                (gen) =>
                  gen.type === "electric" &&
                  gen.details?.status &&
                  gen.details.status !== "online"
              ) && (
                <button
                  className="chart-button"
                  onClick={() => {
                    const generatorData = systemStatus.generatorOutput
                      .filter((gen) => gen.type === "electric")
                      .map((gen) => ({
                        name: gen.name,
                        output: gen.output,
                        min: gen.details?.pmin || 0,
                        max: gen.details?.pmax || 0,
                      }));
                    onShowChart?.(generatorData, "bar", "system-status");
                  }}
                  aria-label="查看发电机柱状图"
                >
                  📊 查看柱状图
                </button>
              )}
              <button
                className={`collapse-toggle ${
                  collapsedSections.generators ? "collapsed" : ""
                }`}
                onClick={() => toggleSection("generators")}
                aria-label={collapsedSections.generators ? "展开" : "折叠"}
              >
                {collapsedSections.generators ? "▶" : "▼"}
              </button>
            </div>
          </div>
          <div
            className={`section-content ${
              collapsedSections.generators ? "collapsed" : ""
            }`}
          >
            {!collapsedSections.generators && (
              <>
                {systemStatus.generatorOutput
                  .filter((gen) => gen.type === "electric")
                  .sort((a, b) => {
                    const aId = parseInt(a.id.replace(/[^0-9]/g, "")) || 0;
                    const bId = parseInt(b.id.replace(/[^0-9]/g, "")) || 0;
                    return aId - bId;
                  })
                  .map((generator) => {
                    const statusText = generator.details?.status || "运行";

                    return (
                      <div key={generator.id} className="node-container">
                        <div className="node-header">
                          <h5>{generator.name} (电力)</h5>
                        </div>
                        <div className="data-grid">
                          {generator.details?.status &&
                          generator.details.status !== "online" ? (
                            <div className="data-item">
                              <div className="data-info">
                                <div className="data-name">实际功率</div>
                                <div className="data-unit">
                                  {generator.unit}
                                </div>
                              </div>
                              <div className="data-value">
                                {generator.output.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            generator.details?.pmax !== undefined &&
                            generator.details?.pmin !== undefined && (
                              <div className="data-item">
                                <div className="data-info">
                                  <div className="data-name">功率范围</div>
                                  <div className="data-unit">
                                    {generator.unit}
                                  </div>
                                </div>
                                <div className="data-value">
                                  {generator.details.pmin.toFixed(2)} ~{" "}
                                  {generator.details.pmax.toFixed(2)}
                                </div>
                              </div>
                            )
                          )}

                          {statusText && statusText !== "online" && (
                            <div className="data-item">
                              <div className="data-info">
                                <div className="data-name">运行状态</div>
                                <div className="data-unit"></div>
                              </div>
                              <div className="data-value">
                                <span
                                  className={`status-${
                                    statusText === "运行中" ||
                                    statusText === "运行"
                                      ? "running"
                                      : "stopped"
                                  }`}
                                >
                                  {statusText === "运行中"
                                    ? "运行"
                                    : statusText === "停止"
                                    ? "停止"
                                    : statusText}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      )}

      {/* 天然气节点压力 */}
      {systemStatus && systemStatus.nodeStatus.length > 0 && (
        <div className="status-section">
          <div className="section-header collapsible-header">
            <h4>天然气节点压力</h4>
            <div className="section-header-actions">
              {/* 只有当有天然气节点显示实际压力时，才显示查看柱状图按钮 */}
              {systemStatus.nodeStatus.some(
                (node) =>
                  (node.type === "gas" || node.type === "gas_node") &&
                  ((node.details?.status && node.details.status !== "normal") ||
                    (node.details?.pressure_max !== undefined &&
                      node.details?.pressure_min !== undefined &&
                      node.value !== node.details.pressure_min &&
                      node.value !== node.details.pressure_max))
              ) && (
                <button
                  className="chart-button"
                  onClick={() => {
                    const gasNodeData = systemStatus.nodeStatus
                      .filter(
                        (node) =>
                          node.type === "gas" || node.type === "gas_node"
                      )
                      .map((node) => ({
                        name: node.name,
                        pressure: node.value,
                        min: node.details?.pressure_min || 0,
                        max: node.details?.pressure_max || 0,
                      }));
                    onShowChart?.(gasNodeData, "bar", "system-status");
                  }}
                  aria-label="查看天然气节点压力柱状图"
                >
                  📊 查看柱状图
                </button>
              )}
              <button
                className={`collapse-toggle ${
                  collapsedSections.gasNodes ? "collapsed" : ""
                }`}
                onClick={() => toggleSection("gasNodes")}
                aria-label={collapsedSections.gasNodes ? "展开" : "折叠"}
              >
                {collapsedSections.gasNodes ? "▶" : "▼"}
              </button>
            </div>
          </div>
          <div
            className={`section-content ${
              collapsedSections.gasNodes ? "collapsed" : ""
            }`}
          >
            {!collapsedSections.gasNodes && (
              <>
                {systemStatus.nodeStatus
                  .filter(
                    (node) => node.type === "gas" || node.type === "gas_node"
                  )
                  .sort((a, b) => {
                    const aId = parseInt(a.id.replace(/[^0-9]/g, "")) || 0;
                    const bId = parseInt(b.id.replace(/[^0-9]/g, "")) || 0;
                    return aId - bId;
                  })
                  .map((gasNode) => (
                    <div key={gasNode.id} className="node-container">
                      <div className="node-header">
                        <h5>{gasNode.name}</h5>
                      </div>
                      <div className="data-grid">
                        {(gasNode.details?.status &&
                          gasNode.details.status !== "normal") ||
                        (gasNode.details?.pressure_max !== undefined &&
                          gasNode.details?.pressure_min !== undefined &&
                          gasNode.value !== gasNode.details.pressure_min &&
                          gasNode.value !== gasNode.details.pressure_max) ? (
                          <div className="data-item">
                            <div className="data-info">
                              <div className="data-name">实际压力</div>
                              <div className="data-unit">{gasNode.unit}</div>
                            </div>
                            <div className="data-value">
                              {gasNode.value.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          gasNode.details?.pressure_max !== undefined &&
                          gasNode.details?.pressure_min !== undefined && (
                            <div className="data-item">
                              <div className="data-info">
                                <div className="data-name">压力范围</div>
                                <div className="data-unit">{gasNode.unit}</div>
                              </div>
                              <div className="data-value">
                                {gasNode.details.pressure_min.toFixed(2)} ~{" "}
                                {gasNode.details.pressure_max.toFixed(2)}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* 气源实际输出 */}
      {systemStatus && systemStatus.generatorOutput.length > 0 && (
        <div className="status-section">
          <div className="section-header collapsible-header">
            <h4>气源实际输出</h4>
            <div className="section-header-actions">
              {/* 只有当有气源显示实际出力时，才显示查看柱状图按钮 */}
              {systemStatus.generatorOutput.some(
                (source) =>
                  (source.type === "gas" || source.type === "gas_source") &&
                  source.details?.status &&
                  source.details.status !== "online"
              ) && (
                <button
                  className="chart-button"
                  onClick={() => {
                    const gasSourceData = systemStatus.generatorOutput
                      .filter(
                        (gen) => gen.type === "gas" || gen.type === "gas_source"
                      )
                      .map((source) => ({
                        name: source.name,
                        output: source.output,
                        min: source.details?.min_w || 0,
                        max: source.details?.max_w || 0,
                      }));
                    onShowChart?.(gasSourceData, "bar", "system-status");
                  }}
                  aria-label="查看气源实际输出柱状图"
                >
                  📊 查看柱状图
                </button>
              )}
              <button
                className={`collapse-toggle ${
                  collapsedSections.gasSources ? "collapsed" : ""
                }`}
                onClick={() => toggleSection("gasSources")}
                aria-label={collapsedSections.gasSources ? "展开" : "折叠"}
              >
                {collapsedSections.gasSources ? "▶" : "▼"}
              </button>
            </div>
          </div>
          <div
            className={`section-content ${
              collapsedSections.gasSources ? "collapsed" : ""
            }`}
          >
            {!collapsedSections.gasSources && (
              <>
                {systemStatus.generatorOutput
                  .filter(
                    (gen) => gen.type === "gas" || gen.type === "gas_source"
                  )
                  .sort((a, b) => {
                    const aId = parseInt(a.id.replace(/[^0-9]/g, "")) || 0;
                    const bId = parseInt(b.id.replace(/[^0-9]/g, "")) || 0;
                    return aId - bId;
                  })
                  .map((source) => (
                    <div key={source.id} className="node-container">
                      <div className="node-header">
                        <h5>{source.name}</h5>
                      </div>
                      <div className="data-grid">
                        {source.details?.status &&
                        source.details.status !== "online" ? (
                          <div className="data-item">
                            <div className="data-info">
                              <div className="data-name">实际出力</div>
                              <div className="data-unit">{source.unit}</div>
                            </div>
                            <div className="data-value">
                              {source.output.toFixed(6)}
                            </div>
                          </div>
                        ) : (
                          source.details?.min_w !== undefined &&
                          source.details?.max_w !== undefined && (
                            <div className="data-item">
                              <div className="data-info">
                                <div className="data-name">出力范围</div>
                                <div className="data-unit">{source.unit}</div>
                              </div>
                              <div className="data-value">
                                {source.details.min_w.toFixed(2)} ~{" "}
                                {source.details.max_w.toFixed(2)}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* 燃气管道数据 */}
      {systemStatus && systemStatus.flowDistribution.length > 0 && (
        <div className="status-section">
          <div className="section-header collapsible-header">
            <h4>燃气管道数据</h4>
            <div className="section-header-actions">
              {/* 只有当有燃气管道显示实际流量时，才显示查看柱状图按钮 */}
              {systemStatus.flowDistribution.some(
                (pipe) =>
                  (pipe.type === "gas" || pipe.type === "gas_pipe") &&
                  pipe.details?.status &&
                  pipe.details.status !== "operational"
              ) && (
                <button
                  className="chart-button"
                  onClick={() => {
                    const gasPipeData = systemStatus.flowDistribution
                      .filter(
                        (flow) =>
                          flow.type === "gas" || flow.type === "gas_pipe"
                      )
                      .map((pipe) => {
                        const hasOptimizationResult =
                          pipe.details?.status &&
                          pipe.details.status !== "operational";
                        return {
                          name: pipe.name,
                          flow: hasOptimizationResult ? pipe.flow : 0,
                          capacity: 2,
                        };
                      });
                    onShowChart?.(gasPipeData, "bar", "system-status");
                  }}
                  aria-label="查看燃气管道数据柱状图"
                >
                  📊 查看柱状图
                </button>
              )}
              <button
                className={`collapse-toggle ${
                  collapsedSections.gasPipes ? "collapsed" : ""
                }`}
                onClick={() => toggleSection("gasPipes")}
                aria-label={collapsedSections.gasPipes ? "展开" : "折叠"}
              >
                {collapsedSections.gasPipes ? "▶" : "▼"}
              </button>
            </div>
          </div>
          <div
            className={`section-content ${
              collapsedSections.gasPipes ? "collapsed" : ""
            }`}
          >
            {!collapsedSections.gasPipes && (
              <>
                {systemStatus.flowDistribution
                  .filter(
                    (flow) => flow.type === "gas" || flow.type === "gas_pipe"
                  )
                  .sort((a, b) => {
                    const aId = parseInt(a.id.replace(/[^0-9]/g, "")) || 0;
                    const bId = parseInt(b.id.replace(/[^0-9]/g, "")) || 0;
                    return aId - bId;
                  })
                  .map((pipe) => {
                    const hasOptimizationResult =
                      pipe.details?.status &&
                      pipe.details.status !== "operational";

                    return (
                      <div key={pipe.id} className="node-container">
                        <div className="node-header">
                          <h5>{pipe.name}</h5>
                        </div>
                        <div className="data-grid">
                          <div className="data-item">
                            <div className="data-info">
                              <div className="data-name">实际流量</div>
                              <div className="data-unit">{pipe.unit}</div>
                            </div>
                            <div className="data-value">
                              {(hasOptimizationResult ? pipe.flow : 0).toFixed(
                                6
                              )}
                            </div>
                          </div>

                          <div className="data-item">
                            <div className="data-info">
                              <div className="data-name">容量</div>
                              <div className="data-unit">{pipe.unit}</div>
                            </div>
                            <div className="data-value">±2</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      )}

      {/* 系统成本 */}
      <div className="status-section">
        <div className="section-header collapsible-header">
          <h4>系统成本</h4>
          <div className="section-header-actions">
            <button
              className={`collapse-toggle ${
                collapsedSections.systemCost ? "collapsed" : ""
              }`}
              onClick={() => toggleSection("systemCost")}
              aria-label={collapsedSections.systemCost ? "展开" : "折叠"}
            >
              {collapsedSections.systemCost ? "▶" : "▼"}
            </button>
          </div>
        </div>
        <div
          className={`section-content ${
            collapsedSections.systemCost ? "collapsed" : ""
          }`}
        >
          {!collapsedSections.systemCost && (
            <>
              <div className="data-grid">
                <div className="data-item">
                  <div className="data-info">
                    <div className="data-name">总成本</div>
                    <div className="data-unit">
                      {systemStatus.systemCost.unit}
                    </div>
                  </div>
                  <div className="data-value">
                    {systemStatus.systemCost.totalCost.toFixed(2)}
                  </div>
                </div>

                <div className="data-item">
                  <div className="data-info">
                    <div className="data-name">电力成本</div>
                    <div className="data-unit">
                      {systemStatus.systemCost.unit}
                    </div>
                  </div>
                  <div className="data-value">
                    {systemStatus.systemCost.electricCost?.toFixed(2) || "0.00"}
                  </div>
                </div>

                <div className="data-item">
                  <div className="data-info">
                    <div className="data-name">天然气成本</div>
                    <div className="data-unit">
                      {systemStatus.systemCost.unit}
                    </div>
                  </div>
                  <div className="data-value">
                    {systemStatus.systemCost.gasCost?.toFixed(2) || "0.00"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// 添加一些额外的CSS样式
const style = document.createElement("style");
style.textContent = `
  .section-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .chart-button {
    background-color: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .chart-button:hover {
    background-color: #005a9e;
    transform: translateY(-1px);
  }
  
  .chart-button:active {
    transform: translateY(0);
  }
`;
document.head.appendChild(style);

export default SystemStatusPanel;
