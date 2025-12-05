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

  // 模拟数据 - 实际项目中应该从API获取
  useEffect(() => {
    // 模拟API调用延迟
    const timer = setTimeout(() => {
      try {
        // 模拟电力网络数据
        const mockNodes: Node[] = [
          // 电力母线节点
          {
            id: "E1",
            name: "Bus 1",
            type: "electric_bus",
            group: "bus",
            pd: 97.6,
            qd: 44.2,
            vm: 1.039,
            va: -13.5,
          },
          {
            id: "E2",
            name: "Bus 2",
            type: "electric_bus",
            group: "bus",
            pd: 0,
            qd: 0,
            vm: 1.048,
            va: -9.8,
          },
          {
            id: "E3",
            name: "Bus 3",
            type: "electric_bus",
            group: "bus",
            pd: 322,
            qd: 2.4,
            vm: 1.031,
            va: -12.3,
          },
          {
            id: "E4",
            name: "Bus 4",
            type: "electric_bus",
            group: "bus",
            pd: 500,
            qd: 184,
            vm: 1.004,
            va: -12.6,
          },
          {
            id: "E5",
            name: "Bus 5",
            type: "electric_bus",
            group: "bus",
            pd: 0,
            qd: 0,
            vm: 1.006,
            va: -11.2,
          },

          // 发电机节点
          {
            id: "G1",
            name: "Gen 1",
            type: "generator",
            group: "generator",
            connected_bus: "E30",
          },
          {
            id: "G2",
            name: "Gen 2",
            type: "generator",
            group: "generator",
            connected_bus: "E31",
          },
          {
            id: "G3",
            name: "Gen 3",
            type: "generator",
            group: "generator",
            connected_bus: "E32",
          },

          // 天然气节点
          {
            id: "GAS1",
            name: "Gas Node 1",
            type: "gas_node",
            group: "gas",
            pressure: 77.0,
          },
          {
            id: "GAS2",
            name: "Gas Node 2",
            type: "gas_node",
            group: "gas",
            pressure: 75.5,
          },
          {
            id: "GAS3",
            name: "Gas Node 3",
            type: "gas_node",
            group: "gas",
            pressure: 73.2,
          },

          // 天然气源
          {
            id: "GS1",
            name: "Gas Source 1",
            type: "gas_source",
            group: "source",
            pressure: 80.0,
          },
        ];

        const mockLinks: Link[] = [
          // 电力线路
          {
            source: "E1",
            target: "E2",
            type: "electric_branch",
            r: 0.0035,
            x: 0.0411,
          },
          {
            source: "E1",
            target: "E3",
            type: "electric_branch",
            r: 0.001,
            x: 0.025,
          },
          {
            source: "E2",
            target: "E3",
            type: "electric_branch",
            r: 0.0013,
            x: 0.0151,
          },
          {
            source: "E2",
            target: "E4",
            type: "electric_branch",
            r: 0.007,
            x: 0.0086,
          },
          {
            source: "E3",
            target: "E4",
            type: "electric_branch",
            r: 0.0013,
            x: 0.0213,
          },
          {
            source: "E3",
            target: "E5",
            type: "electric_branch",
            r: 0.0011,
            x: 0.0133,
          },

          // 发电机连接
          {
            source: "G1",
            target: "E3",
            type: "generator_connection",
            value: 78.0,
          },
          {
            source: "G2",
            target: "E4",
            type: "generator_connection",
            value: 0.0,
          },
          {
            source: "G3",
            target: "E5",
            type: "generator_connection",
            value: 38.0,
          },

          // 天然气管道
          { source: "GS1", target: "GAS1", type: "gas_pipe", value: 0.07 },
          { source: "GAS1", target: "GAS2", type: "gas_pipe", value: 0.05 },
          { source: "GAS2", target: "GAS3", type: "gas_pipe", value: 0.03 },
        ];

        setGraphData({ nodes: mockNodes, links: mockLinks });
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load graph data");
        setIsLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
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
