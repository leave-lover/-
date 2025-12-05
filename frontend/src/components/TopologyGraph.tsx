import React, { useState, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import "./TopologyGraph.css";

// 定义节点和链接类型
interface Node {
  id: string;
  name: string;
  type: string;
  group: string;
  vm?: number;
  va?: number;
  pd?: number;
  qd?: number;
  [key: string]: any;
}

interface Link {
  source: string;
  target: string;
  type: string;
  r?: number;
  x?: number;
  value?: number;
  [key: string]: any;
}

const TopologyGraph: React.FC = () => {
  const [graphData, setGraphData] = useState<{ nodes: Node[]; links: Link[] }>({
    nodes: [],
    links: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从后端API获取数据
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        // 首先尝试从/api/graph获取完整图数据
        const response = await fetch("http://localhost:5000/api/graph");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 根据节点类型确定group属性
        const nodesWithGroups = data.nodes.map((node: Node) => {
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
        console.error("Failed to fetch graph data:", err);
        setError("Failed to load graph data from backend");
        setIsLoading(false);
      }
    };

    fetchGraphData();
  }, []);

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
      default:
        return "#999"; // 默认灰色
    }
  };

  // 获取节点大小
  const getNodeSize = (node: Node) => {
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

  return (
    <div className="topology-graph">
      <h2>能源网络拓扑图</h2>

      {/* 网络统计信息 */}
      <div className="network-stats">
        <div className="stat-card">
          <h3>电力节点</h3>
          <p>{graphData.nodes.filter((n) => n.group === "bus").length}</p>
        </div>
        <div className="stat-card">
          <h3>发电机</h3>
          <p>{graphData.nodes.filter((n) => n.group === "generator").length}</p>
        </div>
        <div className="stat-card">
          <h3>天然气节点</h3>
          <p>
            {
              graphData.nodes.filter(
                (n) => n.group === "gas" || n.group === "source"
              ).length
            }
          </p>
        </div>
        <div className="stat-card">
          <h3>连接数</h3>
          <p>{graphData.links.length}</p>
        </div>
      </div>

      {/* 力导向图 */}
      <div className="graph-container">
        <ForceGraph2D
          graphData={graphData}
          nodeLabel={(node: Node) => `${node.name} (${node.id})`}
          nodeColor={(node: Node) => getNodeColor(node.group)}
          nodeVal={(node: Node) => getNodeSize(node)}
          linkColor={(link: Link) => getLinkColor(link.type)}
          linkWidth={2}
          backgroundColor="#ffffff"
          onNodeClick={(node) => console.log("Node clicked:", node)}
          onLinkClick={(link) => console.log("Link clicked:", link)}
        />
      </div>

      {/* 图例 */}
      <div className="legend">
        <h3>图例</h3>
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
        </div>
        <div className="legend-group">
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
              style={{ backgroundColor: "#ffa500" }}
            ></div>
            <span>天然气管道</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopologyGraph;
