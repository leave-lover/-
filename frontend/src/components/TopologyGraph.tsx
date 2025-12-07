import React, { useState, useEffect, useCallback, useRef } from "react";
import CustomForceGraph2D, {
  CustomForceGraph2DRef,
} from "./CustomForceGraph2D";
import TopologyErrorHandler from "./TopologyErrorHandler";
import "./TopologyGraph.css";
import "./TopologyErrorHandler.css";
import { GraphNode as Node, GraphLink as Link } from "../types/graphTypes";

// 扩展节点和链接类型以满足特定需求
interface ExtendedNode extends Node {
  name: string;
  type: string;
  group: string;
  vm?: number;
  va?: number;
  pd?: number;
  qd?: number;
}

interface ExtendedLink extends Link {
  r?: number;
  x?: number;
  value?: number;
}

interface TopologyGraphProps {
  refreshTrigger?: number; // 用于触发数据刷新的属性
}

const TopologyGraph: React.FC<TopologyGraphProps> = ({
  refreshTrigger = 0,
}) => {
  const [graphData, setGraphData] = useState<{
    nodes: ExtendedNode[];
    links: ExtendedLink[];
  }>({
    nodes: [],
    links: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 用于触发数据刷新的状态（暂时注释掉未使用的状态）
  // const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

  // 添加对CustomForceGraph2D的引用
  const graphRef = useRef<CustomForceGraph2DRef>(null);

  // 系统显示模式状态: 'both', 'electric', 'gas'
  const [displayMode, setDisplayMode] = useState<"both" | "electric" | "gas">(
    "both"
  );

  // 封装获取数据的函数，便于重用
  const fetchGraphData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 首先尝试从/api/graph获取完整图数据
      const response = await fetch("http://localhost:5000/api/graph");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // 根据节点类型确定group属性
      const nodesWithGroups = data.nodes.map((node: ExtendedNode) => {
        let group = "other";
        if (node.type === "electric_bus") {
          group = "bus";
        } else if (node.type === "generator") {
          group = "generator";
        } else if (node.type === "gas_node" || node.type === "gas_source") {
          group = node.type === "gas_source" ? "source" : "gas";
        }
        return { ...node, group };
      });

      setGraphData({
        nodes: nodesWithGroups,
        links: data.links,
      });
      setIsLoading(false);
    } catch (err) {
      setError("获取图数据失败，请稍后重试。");
      setIsLoading(false);
    }
  }, []);

  // 从后端API获取数据
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData, refreshTrigger]);

  // 获取节点颜色
  const getNodeColor = (group: string) => {
    switch (group) {
      case "bus":
        return "#4682b4"; // 电力母线 - 蓝色
      case "generator":
        return "#32cd32"; // 发电机 - 绿色
      case "gas":
        return "#ffa500"; // 天然气节点 - 橙色
      case "source":
        return "#ff6347"; // 天然气源 - 红色
      default:
        return "#999"; // 默认灰色
    }
  };

  // 获取连线颜色
  const getLinkColor = (type: string) => {
    switch (type) {
      case "electric_branch":
        return "#4682b4"; // 电力线路 - 蓝色
      case "generator_connection":
        return "#32cd32"; // 发电机连接 - 绿色
      case "gas_pipe":
        return "#ffa500"; // 天然气管道 - 橙色
      case "gas_source_connection":
        return "#ff6347"; // 气源连接 - 红色
      case "coupling":
        return "#800080"; // 耦合连接 - 紫色
      default:
        return "#999"; // 默认灰色
    }
  };

  // 判断节点是否应该显示
  const isNodeVisible = (node: ExtendedNode) => {
    if (displayMode === "both") return true;
    if (displayMode === "electric")
      return ["bus", "generator"].includes(node.group || "");
    if (displayMode === "gas")
      return ["gas", "source"].includes(node.group || "");
    return true;
  };

  // 判断连线是否应该显示
  const isLinkVisible = (link: ExtendedLink) => {
    // 查找连线两端的节点
    const sourceNode = graphData.nodes.find(
      (n) =>
        n.id ===
        (typeof link.source === "string" ? link.source : link.source.id)
    );
    const targetNode = graphData.nodes.find(
      (n) =>
        n.id ===
        (typeof link.target === "string" ? link.target : link.target.id)
    );

    // 如果找不到节点，则隐藏连线
    if (!sourceNode || !targetNode) return false;

    // 在单一系统显示模式下，仍显示耦合连接线
    if (link.type === "coupling") return true;

    // 根据显示模式判断是否显示连线
    if (displayMode === "both") return true;

    if (displayMode === "electric") {
      return (
        ["bus", "generator"].includes(sourceNode.group) &&
        ["bus", "generator"].includes(targetNode.group)
      );
    }

    if (displayMode === "gas") {
      return (
        ["gas", "source"].includes(sourceNode.group) &&
        ["gas", "source"].includes(targetNode.group)
      );
    }

    return true;
  };

  // 获取连线宽度（增强耦合连接的视觉效果）
  const getLinkWidth = (link: ExtendedLink) => {
    // 耦合连接使用更宽的线条以增强可见性
    if (link.type === "coupling") {
      return 4; // 耦合连接使用4像素宽度
    }
    return 2; // 其他连接使用默认宽度
  };

  // 获取节点大小（增强耦合节点的视觉效果）
  const getNodeSize = (node: ExtendedNode) => {
    // 检查该节点是否参与耦合连接
    const isCouplingNode = graphData.links.some(
      (link) =>
        link.type === "coupling" &&
        (link.source === node.id ||
          (typeof link.source !== "string" && link.source.id === node.id) ||
          link.target === node.id ||
          (typeof link.target !== "string" && link.target.id === node.id))
    );

    // 耦合节点使用更大的尺寸
    if (isCouplingNode) {
      switch (node.group) {
        case "bus":
          return 16; // 电力母线（耦合节点）
        case "generator":
          return 20; // 发电机（耦合节点）
        case "gas":
          return 18; // 天然气节点（耦合节点）
        case "source":
          return 22; // 天然气源（耦合节点）
        default:
          return 14; // 默认大小（耦合节点）
      }
    }

    // 非耦合节点使用原有尺寸
    switch (node.group) {
      case "bus":
        return 12; // 电力母线
      case "generator":
        return 16; // 发电机
      case "gas":
        return 14; // 天然气节点
      case "source":
        return 18; // 天然气源
      default:
        return 10; // 默认大小
    }
  };

  if (isLoading) {
    return (
      <div className="topology-graph-loading">
        Loading energy network topology...
      </div>
    );
  }

  if (error) {
    return <div className="topology-graph-error">Error: {error}</div>;
  }

  // 计算电力节点和天然气节点的数量（不包括发电机和气源）
  const countNodes = () => {
    const electricNodes = graphData.nodes.filter((node) =>
      ["bus"].includes(node.group || "")
    ).length;

    const gasNodes = graphData.nodes.filter((node) =>
      ["gas"].includes(node.group || "")
    ).length;

    return { electricNodes, gasNodes };
  };

  // 渲染图表视图
  const renderGraphView = () => {
    const { electricNodes, gasNodes } = countNodes();

    return (
      <div className="graph-container">
        <div className="node-count-info">
          <span className="node-count-item">
            电力节点: <strong>{electricNodes}</strong>
          </span>
          <span className="node-count-item">
            天然气节点: <strong>{gasNodes}</strong>
          </span>
        </div>
        <CustomForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel={(node) => `${node.name} (${node.id})`}
          nodeColor={(node) => getNodeColor(node.group || "")}
          nodeVal={(node) => getNodeSize(node as ExtendedNode)}
          nodeVisibility={(node) => isNodeVisible(node as ExtendedNode)}
          linkColor={(link) => getLinkColor(link.type)}
          linkWidth={(link) => getLinkWidth(link as ExtendedLink)}
          linkVisibility={(link) => isLinkVisible(link as ExtendedLink)}
          backgroundColor="#ffffff"
          onNodeClick={(node) => {}}
          onLinkClick={(link) => {}}
        />
      </div>
    );
  };

  return (
    <TopologyErrorHandler>
      <div className="topology-graph">
        <h2>能源网络拓扑图</h2>

        {/* 系统切换按钮 */}
        <div className="system-toggle-buttons">
          <button
            className={`toggle-button ${
              displayMode === "electric" ? "active" : ""
            }`}
            onClick={() => setDisplayMode("electric")}
          >
            仅电力系统
          </button>
          <button
            className={`toggle-button ${displayMode === "gas" ? "active" : ""}`}
            onClick={() => setDisplayMode("gas")}
          >
            仅天然气系统
          </button>
          <button
            className={`toggle-button ${
              displayMode === "both" ? "active" : ""
            }`}
            onClick={() => setDisplayMode("both")}
          >
            全部显示
          </button>
          <button
            className="toggle-button reset-view-button"
            onClick={() => graphRef.current?.resetView()}
          >
            复位视图
          </button>
        </div>

        {/* 主容器 - 包含图表和图例 */}
        <div className="topology-main-container">
          {/* 图表视图 */}
          {renderGraphView()}

          {/* 图例 */}
          <div className="legend-container">
            <div className="legend">
              <h3>图例</h3>
              <div className="legend-section">
                <h4>节点类型</h4>
                <div className="legend-group">
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#4682b4" }}
                    ></div>
                    <span>电力母线</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#32cd32" }}
                    ></div>
                    <span>发电机</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#ffa500" }}
                    ></div>
                    <span>天然气节点</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#ff6347" }}
                    ></div>
                    <span>天然气源</span>
                  </div>
                </div>
              </div>

              <div className="legend-section">
                <h4>连接类型</h4>
                <div className="legend-group">
                  <div className="legend-item">
                    <div
                      className="legend-line"
                      style={{ backgroundColor: "#4682b4" }}
                    ></div>
                    <span>电力线路</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-line"
                      style={{ backgroundColor: "#32cd32" }}
                    ></div>
                    <span>发电机连接</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-line"
                      style={{ backgroundColor: "#ffa500" }}
                    ></div>
                    <span>天然气管道</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-line"
                      style={{ backgroundColor: "#ff6347" }}
                    ></div>
                    <span>气源连接</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-line coupling-legend"
                      style={{ backgroundColor: "#800080", height: "4px" }}
                    ></div>
                    <span>耦合连接（跨系统关键连接）</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TopologyErrorHandler>
  );
};

export default TopologyGraph;
