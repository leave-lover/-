import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import ForceGraph2D from "react-force-graph-2d";
import TopologyErrorHandler from "./TopologyErrorHandler";
import { DEFAULT_FLOW_CONFIG, getParticleColorByLinkType } from "./FlowConfig";
import "./TopologyGraph.css";
import "./TopologyErrorHandler.css";
import {
  GraphNode as Node,
  GraphLink as Link,
} from "../../../types/graphTypes";

// 扩展节点类型，添加group属性
interface ExtendedNode extends Node {
  group?: string;
}

// 扩展连线类型
interface ExtendedLink extends Link {
  source: string | ExtendedNode;
  target: string | ExtendedNode;
}

// 为了保持与react-force-graph-2d库的兼容性，我们需要重新定义Node类型
// interface ForceGraphNode {
//   id: string;
//   [key: string]: any;
// }

// 自定义ForceGraph2D组件的属性接口
interface CustomForceGraph2DProps {
  graphData: { nodes: ExtendedNode[]; links: ExtendedLink[] };
  nodeLabel?: (node: ExtendedNode) => string;
  nodeColor?: (node: ExtendedNode) => string;
  nodeVal?: (node: ExtendedNode) => number;
  nodeVisibility?: (node: ExtendedNode) => boolean;
  linkColor?: (link: ExtendedLink) => string;
  linkWidth?: number | ((link: ExtendedLink) => number);
  linkVisibility?: (link: ExtendedLink) => boolean;
  highlightNodes?: Set<string>;
  highlightLinks?: Set<string>;
  // 粒子流动效果相关属性
  linkDirectionalParticles?: number | ((link: ExtendedLink) => number);
  linkDirectionalParticleSpeed?: number | ((link: ExtendedLink) => number);
  linkDirectionalParticleWidth?: number | ((link: ExtendedLink) => number);
  linkDirectionalParticleColor?: string | ((link: ExtendedLink) => string);
  backgroundColor?: string;
  onNodeClick?: (node: ExtendedNode) => void;
  onLinkClick?: (link: ExtendedLink) => void;
  onNodeDrag?: (
    node: ExtendedNode,
    translate: { x: number; y: number }
  ) => void;
  onNodeDragEnd?: (
    node: ExtendedNode,
    translate: { x: number; y: number }
  ) => void;
  enableNodeDrag?: boolean;
}

// 自定义ForceGraph2D组件的引用接口
interface CustomForceGraph2DRef {
  resetView: () => void;
}

// 创建自定义的ForceGraph2D组件，包装react-force-graph-2d库的组件
const CustomForceGraph2D = forwardRef<
  CustomForceGraph2DRef,
  CustomForceGraph2DProps
>((props, ref) => {
  const {
    graphData,
    nodeLabel,
    nodeColor,
    nodeVal,
    nodeVisibility,
    linkColor,
    linkWidth,
    linkVisibility,
    highlightNodes,
    highlightLinks,
    linkDirectionalParticles,
    linkDirectionalParticleSpeed,
    linkDirectionalParticleWidth,
    linkDirectionalParticleColor,
    backgroundColor,
    onNodeClick,
    onLinkClick,
    onNodeDrag,
    onNodeDragEnd,
    enableNodeDrag,
    ...restProps
  } = props;

  const fgRef = useRef<any>(null);

  // 实现resetView方法
  useImperativeHandle(ref, () => ({
    resetView: () => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400);
      }
    },
  }));

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      nodeLabel={nodeLabel}
      nodeColor={nodeColor}
      nodeVal={nodeVal}
      nodeVisibility={nodeVisibility}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkVisibility={linkVisibility}
      linkDirectionalParticles={linkDirectionalParticles}
      linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
      linkDirectionalParticleWidth={linkDirectionalParticleWidth}
      linkDirectionalParticleColor={linkDirectionalParticleColor}
      backgroundColor={backgroundColor}
      onNodeClick={onNodeClick}
      onLinkClick={onLinkClick}
      onNodeDrag={onNodeDrag}
      onNodeDragEnd={onNodeDragEnd}
      enableNodeDrag={enableNodeDrag}
      {...restProps}
    />
  );
});

const TopologyGraph: React.FC = () => {
  const [graphData, setGraphData] = useState<{
    nodes: ExtendedNode[];
    links: ExtendedLink[];
  }>({
    nodes: [],
    links: [],
  });
  const [highlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks] = useState<Set<string>>(new Set());
  const [breathingNodes, setBreathingNodes] = useState<Set<string>>(new Set());
  const [breathingLinks, setBreathingLinks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger] = useState<number>(0);
  const [nodeOpacity, setNodeOpacity] = useState<Record<string, number>>({});
  const [linkOpacity, setLinkOpacity] = useState<Record<string, number>>({});
  const [selectedNode, setSelectedNode] = useState<ExtendedNode | null>(null);
  const [isNodeDetailVisible, setIsNodeDetailVisible] =
    useState<boolean>(false);
  const [selectedLink, setSelectedLink] = useState<ExtendedLink | null>(null);
  const [isLinkDetailVisible, setIsLinkDetailVisible] =
    useState<boolean>(false);

  // 攻击节点状态管理
  const [attackedNodes, setAttackedNodes] = useState<Set<string>>(new Set());

  // 被保护节点状态管理
  const [protectedNodes, setProtectedNodes] = useState<Set<string>>(new Set());

  // 添加防御状态事件监听器
  useEffect(() => {
    // 监听防御节点数据，更新拓扑图中的被保护节点
    const handleProtectedNodes = (event: Event) => {
      const customEvent = event as CustomEvent;
      const defenseData = customEvent.detail as {
        defended_nodes?: string[];
        isAllProtected?: boolean;
      };
      console.log("TopologyGraph: 收到防御节点数据:", defenseData);

      const newProtectedNodes = new Set<string>();

      if (defenseData.isAllProtected) {
        // 保护所有节点
        graphData.nodes.forEach((node) => {
          newProtectedNodes.add(node.id);
        });
      } else if (
        defenseData.defended_nodes &&
        Array.isArray(defenseData.defended_nodes)
      ) {
        // 保护指定节点
        defenseData.defended_nodes.forEach((nodeId) => {
          newProtectedNodes.add(nodeId);
        });
      }

      // 更新被保护节点状态
      setProtectedNodes(newProtectedNodes);
      // 清空攻击节点，确保所有节点可以变绿
      setAttackedNodes(new Set<string>());
      console.log(
        "TopologyGraph: 更新被保护节点:",
        newProtectedNodes,
        "清空攻击节点"
      );
    };

    // 监听取消防御事件，清空被保护节点
    const handleCancelDefense = () => {
      console.log("TopologyGraph: 收到取消防御事件");
      setProtectedNodes(new Set<string>());
    };

    // 监听清空攻击节点事件
    const handleClearAttackedNodes = () => {
      console.log("TopologyGraph: 收到清空攻击节点事件");
      setAttackedNodes(new Set<string>());
    };

    // 添加事件监听器
    window.addEventListener(
      "protectedNodes",
      handleProtectedNodes as EventListener
    );

    window.addEventListener(
      "cancelDefense",
      handleCancelDefense as EventListener
    );

    window.addEventListener(
      "clearAttackedNodes",
      handleClearAttackedNodes as EventListener
    );

    // 清理函数
    return () => {
      window.removeEventListener(
        "protectedNodes",
        handleProtectedNodes as EventListener
      );

      window.removeEventListener(
        "cancelDefense",
        handleCancelDefense as EventListener
      );

      window.removeEventListener(
        "clearAttackedNodes",
        handleClearAttackedNodes as EventListener
      );
    };
  }, [graphData.nodes]);

  // 获取当前CSS变量值作为背景色
  const getCurrentBackgroundColor = () => {
    return (
      getComputedStyle(document.body).getPropertyValue("--bg-primary").trim() ||
      "#0a0e27"
    );
  };

  // 使用状态存储当前背景色
  const [bgColor, setBgColor] = useState(getCurrentBackgroundColor());

  // 监听主题变化，更新背景色
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setBgColor(getCurrentBackgroundColor());
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // 使用useRef持久化计时器状态，避免重新创建
  const nodeTimersRef = useRef<Record<string, number>>({});
  const linkTimersRef = useRef<Record<string, number>>({});

  // 添加对CustomForceGraph2D的引用
  const graphRef = useRef<CustomForceGraph2DRef>(null);

  // 添加高亮定时器引用
  // 使用number类型替代NodeJS.Timeout，因为NodeJS命名空间在浏览器环境中可能不可用
  const highlightTimeoutRef = useRef<number | null>(null);

  // 系统显示模式状态: 'both', 'electric', 'gas'
  const [displayMode, setDisplayMode] = useState<"both" | "electric" | "gas">(
    "both"
  );

  // 粒子流动效果开关状态
  const [flowEnabled, setFlowEnabled] = useState<boolean>(
    DEFAULT_FLOW_CONFIG.enableFlow
  );

  // 图例可见性状态
  const [isLegendVisible, setIsLegendVisible] = useState<boolean>(true);

  // 从Python文件数据生成图数据
  const generateGraphDataFromPython = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      // 定义合并节点映射关系 - 燃气节点与电力节点的对应关系
      // 格式: {燃气节点ID: 电力节点ID}
      const mergedNodesMap: Record<number, number> = {
        3: 30, // 燃气节点3 ↔ 电力节点30
        6: 33, // 燃气节点6 ↔ 电力节点33
        19: 37, // 燃气节点19 ↔ 电力节点37
      };

      // 存储需要合并的节点ID映射
      const nodeMergeMapping: Record<string, string> = {};

      // 从Python文件数据生成图数据
      const nodes: ExtendedNode[] = [];
      const links: ExtendedLink[] = [];

      // 3. 添加天然气节点数据 - 先定义，供后面的合并节点使用
      const gasBusData = [
        [1, 77.0, 0, 0, 57.51],
        [2, 77.0, 0, 0, 57.17],
        [3, 80.0, 30, 2.72, 56.77],
        [4, 80.0, 0, 0, 55.02],
        [5, 77.0, 0, 0, 56.54],
        [6, 80.0, 30, 2.8, 55.37],
        [7, 80.0, 30, 3.65, 55.17],
        [8, 66.2, 0, 0, 57.73],
        [9, 66.2, 0, 0, 57.23],
        [10, 66.2, 30, 4.42, 55.97],
        [11, 66.2, 0, 0, 54.97],
        [12, 66.2, 0, 1.47, 53.83],
        [13, 66.2, 0, 0, 53.1],
        [14, 66.2, 0, 0, 52.99],
        [15, 66.2, 0, 4.76, 51.66],
        [16, 66.2, 0, 10.84, 50.0],
        [17, 66.2, 0, 0, 54.06],
        [18, 80.0, 0, 0, 52.0],
        [19, 66.2, 0, 0.154, 33.96],
        [20, 66.2, 25, 1.0, 31.62],
      ];

      // 1. 添加电力母线节点 - 包含所有Python数据
      const busData = [
        [1, 1, 97.6, 44.2, 0, 0, 2, 1.0393836, -13.536602, 345, 1, 1.06, 0.94],
        [2, 1, 0, 0, 0, 0, 2, 1.0484941, -9.7852666, 345, 1, 1.06, 0.94],
        [3, 1, 322, 2.4, 0, 0, 2, 1.0307077, -12.276384, 345, 1, 1.06, 0.94],
        [4, 1, 500, 184, 0, 0, 1, 1.00446, -12.626734, 345, 1, 1.06, 0.94],
        [5, 1, 0, 0, 0, 0, 1, 1.0060063, -11.192339, 345, 1, 1.06, 0.94],
        [6, 1, 0, 0, 0, 0, 1, 1.0082256, -10.40833, 345, 1, 1.06, 0.94],
        [7, 1, 233.8, 84, 0, 0, 1, 0.99839728, -12.755626, 345, 1, 1.06, 0.94],
        [8, 1, 522, 176.6, 0, 0, 1, 0.99787232, -13.335844, 345, 1, 1.06, 0.94],
        [9, 1, 6.5, -66.6, 0, 0, 1, 1.038332, -14.178442, 345, 1, 1.06, 0.94],
        [10, 1, 0, 0, 0, 0, 1, 1.0178431, -8.170875, 345, 1, 1.06, 0.94],
        [11, 1, 0, 0, 0, 0, 1, 1.0133858, -8.9369663, 345, 1, 1.06, 0.94],
        [12, 1, 8.53, 88, 0, 0, 1, 1.000815, -8.9988236, 345, 1, 1.06, 0.94],
        [13, 1, 0, 0, 0, 0, 1, 1.014923, -8.9299272, 345, 1, 1.06, 0.94],
        [14, 1, 0, 0, 0, 0, 1, 1.012319, -10.715295, 345, 1, 1.06, 0.94],
        [15, 1, 320, 153, 0, 0, 3, 1.0161854, -11.345399, 345, 1, 1.06, 0.94],
        [16, 1, 329, 32.3, 0, 0, 3, 1.0325203, -10.033348, 345, 1, 1.06, 0.94],
        [17, 1, 0, 0, 0, 0, 2, 1.0342365, -11.116436, 345, 1, 1.06, 0.94],
        [18, 1, 158, 30, 0, 0, 2, 1.0315726, -11.986168, 345, 1, 1.06, 0.94],
        [19, 1, 0, 0, 0, 0, 3, 1.0501068, -5.4100729, 345, 1, 1.06, 0.94],
        [20, 1, 680, 103, 0, 0, 3, 0.99101054, -6.8211783, 345, 1, 1.06, 0.94],
        [21, 1, 274, 115, 0, 0, 3, 1.0323192, -7.6287461, 345, 1, 1.06, 0.94],
        [22, 1, 0, 0, 0, 0, 3, 1.0501427, -3.1831199, 345, 1, 1.06, 0.94],
        [
          23, 1, 247.5, 84.6, 0, 0, 3, 1.0451451, -3.3812763, 345, 1, 1.06,
          0.94,
        ],
        [
          24, 1, 308.6, -92.2, 0, 0, 3, 1.038001, -9.9137585, 345, 1, 1.06,
          0.94,
        ],
        [25, 1, 224, 47.2, 0, 0, 2, 1.0576827, -8.3692354, 345, 1, 1.06, 0.94],
        [26, 1, 139, 17, 0, 0, 2, 1.0525613, -9.4387696, 345, 1, 1.06, 0.94],
        [27, 1, 281, 75.5, 0, 0, 2, 1.0383449, -11.362152, 345, 1, 1.06, 0.94],
        [28, 1, 206, 27.6, 0, 0, 3, 1.0503737, -5.9283592, 345, 1, 1.06, 0.94],
        [
          29, 1, 283.5, 26.9, 0, 0, 3, 1.0501149, -3.1698741, 345, 1, 1.06,
          0.94,
        ],
        [30, 2, 0, 0, 0, 0, 2, 1.0499, -7.3704746, 345, 1, 1.06, 0.94],
        [31, 3, 9.2, 4.6, 0, 0, 1, 0.982, 0, 345, 1, 1.06, 0.94],
        [32, 2, 0, 0, 0, 0, 1, 0.9841, -0.1884374, 345, 1, 1.06, 0.94],
        [33, 2, 0, 0, 0, 0, 3, 0.9972, -0.19317445, 345, 1, 1.06, 0.94],
        [34, 2, 0, 0, 0, 0, 3, 1.0123, -1.631119, 345, 1, 1.06, 0.94],
        [35, 2, 0, 0, 0, 0, 3, 1.0494, 1.7765069, 345, 1, 1.06, 0.94],
        [36, 2, 0, 0, 0, 0, 3, 1.0636, 4.4684374, 345, 1, 1.06, 0.94],
        [37, 2, 0, 0, 0, 0, 2, 1.0275, -1.5828988, 345, 1, 1.06, 0.94],
        [38, 2, 0, 0, 0, 0, 3, 1.0265, 3.8928177, 345, 1, 1.06, 0.94],
        [39, 2, 1104, 250, 0, 0, 1, 1.03, -14.535256, 345, 1, 1.06, 0.94],
      ];

      // 生成电力母线节点
      for (let i = 0; i < busData.length; i++) {
        const bus = busData[i];
        const busId = i + 1;
        let nodeId = `bus_${busId}`;

        // 检查当前电力节点是否是合并目标
        let isMerged = false;
        let mergedWith: string[] = [];
        let gasNodeData: any = null;

        // 查找是否有燃气节点需要合并到这个电力节点
        Object.entries(mergedNodesMap).forEach(
          ([gasNodeIdStr, targetBusId]) => {
            if (targetBusId === busId) {
              isMerged = true;
              const gasNodeId = parseInt(gasNodeIdStr);
              mergedWith.push(`gas_node_${gasNodeId}`);
              // 建立映射关系
              nodeMergeMapping[`gas_node_${gasNodeId}`] = nodeId;

              // 获取对应的燃气节点数据
              const gasNodeIndex = gasNodeId - 1;
              if (gasNodeIndex >= 0 && gasNodeIndex < gasBusData.length) {
                gasNodeData = gasBusData[gasNodeIndex];
              }
            }
          }
        );

        const nodeData: ExtendedNode = {
          id: nodeId,
          name: `母线 ${busId}`,
          type: "electric_bus",
          group: "bus",
          // 合并节点标记
          isMerged: isMerged,
          mergedWith: mergedWith,
          // 完整的母线数据
          bus_type: bus[1],
          pd: bus[2],
          qd: bus[3],
          gs: bus[4],
          bs: bus[5],
          area: bus[6],
          vm: bus[7],
          va: bus[8],
          basekv: bus[9],
          zone: bus[10],
          vmax: bus[11],
          vmin: bus[12],
        };

        // 如果是合并节点，添加对应的燃气节点数据
        if (isMerged && gasNodeData) {
          nodeData.gas_node_data = {
            pressure_max: gasNodeData[1],
            pressure_min: gasNodeData[2],
            load: gasNodeData[3],
            base_pressure: gasNodeData[4],
          };
        }

        nodes.push(nodeData);
      }

      // 2. 添加发电机节点 - 包含所有Python数据
      const genData = [
        [
          30, 78, 0, 300, -300, 0.998, 100, 1, 1040, 100, 5, 3, 5, 0, 500, 500,
          2,
        ],
        [31, 0, 0, 50, -13, 0.99, 100, 1, 646, 50, 4, 2, 0, 2, 300, 300, 1],
        [32, 38, 0, 300, -300, 1.015, 100, 1, 725, 70, 3, 2, 3, 0, 350, 350, 1],
        [33, 38, 0, 200, -147, 1.05, 100, 1, 652, 60, 3, 2, 0, 2, 300, 300, 2],
        [34, 0, 0, 120, -35, 0.99, 100, 1, 508, 50, 4, 2, 4, 0, 250, 250, 1],
        [35, 25, 0, 30, -10, 0.97, 100, 1, 687, 60, 3, 2, 0, 2, 300, 300, 1],
        [36, 0, 0, 50, -16, 0.973, 100, 1, 580, 50, 1, 1, 1, 0, 300, 300, 1],
        [37, 0, 0, 24, -8, 0.96522, 100, 1, 564, 50, 1, 2, 1, 0, 250, 250, 2],
        [38, 0, 0, 24, -8, 0.96522, 100, 1, 865, 80, 1, 2, 1, 0, 400, 400, 1],
        [39, 0, 0, 24, -8, 0.96522, 100, 1, 1100, 110, 1, 2, 1, 0, 550, 550, 1],
      ];

      for (let i = 0; i < genData.length; i++) {
        const gen = genData[i];
        nodes.push({
          id: `gen_${i + 1}`,
          name: `发电机 ${i + 1}`,
          type: "generator",
          group: "generator",
          // 完整的发电机数据
          connected_bus: gen[0],
          pg: gen[1],
          qg: gen[2],
          qmax: gen[3],
          qmin: gen[4],
          vg: gen[5],
          mBase: gen[6],
          status: gen[7],
          pmax: gen[8],
          pmin: gen[9],
          minup: gen[10],
          mindown: gen[11],
          initup: gen[12],
          initdown: gen[13],
          rampup: gen[14],
          rampdown: gen[15],
          genType: gen[16],
        });
      }

      // 3. 添加天然气节点 - 包含所有Python数据（gasBusData已在前面定义）

      // 生成燃气节点 - 跳过需要合并的节点
      for (let i = 0; i < gasBusData.length; i++) {
        const gasNodeId = i + 1;

        // 检查当前燃气节点是否需要合并到电力节点，需要则跳过生成
        if (!(gasNodeId in mergedNodesMap)) {
          const gasBus = gasBusData[i];
          nodes.push({
            id: `gas_node_${gasNodeId}`,
            name: `燃气节点 ${gasNodeId}`,
            type: "gas_node",
            group: "gas",
            // 完整的天然气节点数据
            pressure_max: gasBus[1],
            pressure_min: gasBus[2],
            load: gasBus[3],
            base_pressure: gasBus[4],
          });
        }
      }

      // 4. 添加天然气源节点 - 包含所有Python数据
      const gasSourceData = [
        [1, 1, 0.9, 1.7391, 0.085 * 100000],
        [2, 2, 0, 1.26, 0.085 * 100000],
        [3, 5, 0, 0.72, 0.085 * 100000],
        [4, 8, 1.0, 2.3018, 0.062 * 100000],
        [5, 13, 0, 0.27, 0.062 * 100000],
        [6, 14, 0, 1.44, 0.062 * 100000],
      ];

      for (let i = 0; i < gasSourceData.length; i++) {
        const gasSource = gasSourceData[i];
        nodes.push({
          id: `gas_source_${i + 1}`,
          name: `气源 ${i + 1}`,
          type: "gas_source",
          group: "source",
          // 完整的天然气源数据
          connected_bus: gasSource[1],
          min_w: gasSource[2],
          max_w: gasSource[3],
          cost: gasSource[4],
        });
      }

      // 5. 添加电力线路连接 - 包含所有Python数据
      const branchData = [
        [1, 2, 0.0035, 0.0411, 0.6987, 600, 600, 600, 0, 0, 1, -360, 360],
        [1, 39, 0.001, 0.025, 0.75, 1000, 1000, 1000, 0, 0, 1, -360, 360],
        [2, 3, 0.0013, 0.0151, 0.2572, 500, 500, 500, 0, 0, 1, -360, 360],
        [2, 25, 0.007, 0.0086, 0.146, 500, 500, 500, 0, 0, 1, -360, 360],
        [2, 30, 0, 0.0181, 0, 900, 900, 2500, 1.025, 0, 1, -360, 360],
        [3, 4, 0.0013, 0.0213, 0.2214, 500, 500, 500, 0, 0, 1, -360, 360],
        [3, 18, 0.0011, 0.0133, 0.2138, 500, 500, 500, 0, 0, 1, -360, 360],
        [4, 5, 0.0008, 0.0128, 0.1342, 600, 600, 600, 0, 0, 1, -360, 360],
        [4, 14, 0.0008, 0.0129, 0.1382, 500, 500, 500, 0, 0, 1, -360, 360],
        [5, 6, 0.0002, 0.0026, 0.0434, 1200, 1200, 1200, 0, 0, 1, -360, 360],
        [5, 8, 0.0008, 0.0112, 0.1476, 900, 900, 900, 0, 0, 1, -360, 360],
        [6, 7, 0.0006, 0.0092, 0.113, 900, 900, 900, 0, 0, 1, -360, 360],
        [6, 11, 0.0007, 0.0082, 0.1389, 480, 480, 480, 0, 0, 1, -360, 360],
        [6, 31, 0, 0.025, 0, 1800, 1800, 1800, 1.07, 0, 1, -360, 360],
        [7, 8, 0.0004, 0.0046, 0.078, 900, 900, 900, 0, 0, 1, -360, 360],
        [8, 9, 0.0023, 0.0363, 0.3804, 900, 900, 900, 0, 0, 1, -360, 360],
        [9, 39, 0.001, 0.025, 1.2, 900, 900, 900, 0, 0, 1, -360, 360],
        [10, 11, 0.0004, 0.0043, 0.0729, 600, 600, 600, 0, 0, 1, -360, 360],
        [10, 13, 0.0004, 0.0043, 0.0729, 600, 600, 600, 0, 0, 1, -360, 360],
        [10, 32, 0, 0.02, 0, 900, 900, 2500, 1.07, 0, 1, -360, 360],
        [12, 11, 0.0016, 0.0435, 0, 500, 500, 500, 1.006, 0, 1, -360, 360],
        [12, 13, 0.0016, 0.0435, 0, 500, 500, 500, 1.006, 0, 1, -360, 360],
        [13, 14, 0.0009, 0.0101, 0.1723, 600, 600, 600, 0, 0, 1, -360, 360],
        [14, 15, 0.0018, 0.0217, 0.366, 600, 600, 600, 0, 0, 1, -360, 360],
        [15, 16, 0.0009, 0.0094, 0.171, 600, 600, 600, 0, 0, 1, -360, 360],
        [16, 17, 0.0007, 0.0089, 0.1342, 600, 600, 600, 0, 0, 1, -360, 360],
        [16, 19, 0.0016, 0.0195, 0.304, 600, 600, 2500, 0, 0, 1, -360, 360],
        [16, 21, 0.0008, 0.0135, 0.2548, 600, 600, 600, 0, 0, 1, -360, 360],
        [16, 24, 0.0003, 0.0059, 0.068, 600, 600, 600, 0, 0, 1, -360, 360],
        [17, 18, 0.0007, 0.0082, 0.1319, 600, 600, 600, 0, 0, 1, -360, 360],
        [17, 27, 0.0013, 0.0173, 0.3216, 600, 600, 600, 0, 0, 1, -360, 360],
        [19, 20, 0.0007, 0.0138, 0, 900, 900, 2500, 1.06, 0, 1, -360, 360],
        [19, 33, 0.0007, 0.0142, 0, 900, 900, 2500, 1.07, 0, 1, -360, 360],
        [20, 34, 0.0009, 0.018, 0, 900, 900, 2500, 1.009, 0, 1, -360, 360],
        [21, 22, 0.0008, 0.014, 0.2565, 900, 900, 900, 0, 0, 1, -360, 360],
        [22, 23, 0.0006, 0.0096, 0.1846, 600, 600, 600, 0, 0, 1, -360, 360],
        [22, 35, 0, 0.0143, 0, 900, 900, 2500, 1.025, 0, 1, -360, 360],
        [23, 24, 0.0022, 0.035, 0.361, 600, 600, 600, 0, 0, 1, -360, 360],
        [23, 36, 0.0005, 0.0272, 0, 900, 900, 2500, 1, 0, 1, -360, 360],
        [25, 26, 0.0032, 0.0323, 0.531, 600, 600, 600, 0, 0, 1, -360, 360],
        [25, 37, 0.0006, 0.0232, 0, 900, 900, 2500, 1.025, 0, 1, -360, 360],
        [26, 27, 0.0014, 0.0147, 0.2396, 600, 600, 600, 0, 0, 1, -360, 360],
        [26, 28, 0.0043, 0.0474, 0.7802, 600, 600, 600, 0, 0, 1, -360, 360],
        [26, 29, 0.0057, 0.0625, 1.029, 600, 600, 600, 0, 0, 1, -360, 360],
        [28, 29, 0.0014, 0.0151, 0.249, 600, 600, 600, 0, 0, 1, -360, 360],
        [29, 38, 0.0008, 0.0156, 0, 1200, 1200, 2500, 1.025, 0, 1, -360, 360],
      ];

      branchData.forEach((branch, index) => {
        links.push({
          id: `electric_branch_${index + 1}`,
          source: `bus_${branch[0]}`,
          target: `bus_${branch[1]}`,
          type: "electric_branch",
          // 完整的电力线路数据
          r: branch[2],
          x: branch[3],
          b: branch[4],
          rateA: branch[5],
          rateB: branch[6],
          rateC: branch[7],
          ratio: branch[8],
          angle: branch[9],
          status: branch[10],
          angmin: branch[11],
          angmax: branch[12],
        });
      });

      // 6. 添加发电机连接 - 包含所有Python数据
      const generatorConnections = [
        [30, 1],
        [31, 2],
        [32, 3],
        [33, 4],
        [34, 5],
        [35, 6],
        [36, 7],
        [37, 8],
        [38, 9],
        [39, 10],
      ];

      generatorConnections.forEach((conn, index) => {
        links.push({
          id: `generator_connection_${index + 1}`,
          source: `bus_${conn[0]}`,
          target: `gen_${conn[1]}`,
          type: "generator_connection",
          // 发电机连接数据
          value: conn[0],
        });
      });

      // 7. 添加天然气管线连接 - 包含所有Python数据
      const gasBranchData = [
        [1, 1, 2, 0.07],
        [2, 2, 3, 0.404],
        [3, 3, 4, 0.39],
        [4, 5, 6, 0.1],
        [5, 6, 7, 0.15],
        [6, 7, 4, 0.22],
        [7, 4, 14, 0.66],
        [8, 8, 9, 0.26],
        [9, 9, 10, 0.81],
        [10, 10, 11, 0.45],
        [11, 11, 12, 0.86],
        [12, 12, 13, 0.91],
        [13, 13, 14, 0.26],
        [14, 14, 15, 0.63],
        [15, 15, 16, 0.45],
        [16, 11, 17, 0.05],
        [17, 17, 18, 0.006],
        [18, 18, 19, 0.002],
        [19, 19, 20, 0.03],
      ];

      // 生成天然气管线连接 - 更新合并节点的边关系
      gasBranchData.forEach((branch, index) => {
        let sourceId = `gas_node_${branch[1]}`;
        let targetId = `gas_node_${branch[2]}`;

        // 检查源节点是否需要合并
        if (sourceId in nodeMergeMapping) {
          sourceId = nodeMergeMapping[sourceId];
        }

        // 检查目标节点是否需要合并
        if (targetId in nodeMergeMapping) {
          targetId = nodeMergeMapping[targetId];
        }

        links.push({
          id: `gas_pipe_${index + 1}`,
          source: sourceId,
          target: targetId,
          type: "gas_pipe",
          // 完整的天然气管线数据
          capacity: branch[3],
          value: branch[3],
        });
      });

      // 8. 添加天然气源连接 - 包含所有Python数据
      const gasSourceConnections = [
        [1, 1],
        [2, 2],
        [5, 3],
        [8, 4],
        [13, 5],
        [14, 6],
      ];

      // 生成天然气源连接 - 更新合并节点的边关系
      gasSourceConnections.forEach((conn, index) => {
        let sourceId = `gas_node_${conn[0]}`;

        // 检查源节点是否需要合并
        if (sourceId in nodeMergeMapping) {
          sourceId = nodeMergeMapping[sourceId];
        }

        links.push({
          id: `gas_source_connection_${index + 1}`,
          source: sourceId,
          target: `gas_source_${conn[1]}`,
          type: "gas_source_connection",
          // 气源连接数据
          value: conn[0],
        });
      });

      // 9. 添加耦合连接（燃气轮机） - 包含所有Python数据
      const gasGenConnections = [
        [3, 1],
        [6, 4],
        [19, 8],
      ];

      // 生成耦合连接 - 更新合并节点的边关系
      gasGenConnections.forEach((conn, index) => {
        let sourceId = `gas_node_${conn[0]}`;

        // 检查源节点是否需要合并
        if (sourceId in nodeMergeMapping) {
          sourceId = nodeMergeMapping[sourceId];
        }

        links.push({
          id: `coupling_${index + 1}`,
          source: sourceId,
          target: `gen_${conn[1]}`,
          type: "coupling",
          // 耦合连接数据
          value: conn[0],
        });
      });

      setGraphData({
        nodes,
        links,
      });
      setIsLoading(false);
    } catch (err) {
      setError("生成图数据失败，请稍后重试。");
      setIsLoading(false);
    }
  }, []);

  // 添加自定义事件监听器，用于响应来自SystemStatusPanel的高亮请求
  useEffect(() => {
    console.log("TopologyGraph: 设置事件监听器");

    // 处理高亮事件的函数（已废弃）
    const handleHighlightEvent = (event: Event) => {
      // 不做任何变化
      console.log(event); // 防止TS6133错误
    };

    // 处理节点点击事件的函数（已废弃）
    const handleNodeClick = (event: Event) => {
      // 不做任何变化
      console.log(event); // 防止TS6133错误
    };

    // 处理连线点击事件的函数（已废弃）
    const handleLinkClick = (event: Event) => {
      // 不做任何变化
      console.log(event); // 防止TS6133错误
    };

    // 监听来自SystemStatusPanel的呼吸动画请求
    const handleBreathAnimation = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail as { nodeId?: string; linkId?: string };
      console.log("TopologyGraph: 收到呼吸动画事件:", detail);

      if (detail.nodeId) {
        // 设置节点进入呼吸状态
        setBreathingNodes((prev) => {
          const newSet = new Set(prev);
          newSet.add(detail.nodeId!);
          console.log(
            "TopologyGraph: 设置呼吸节点:",
            detail.nodeId,
            "当前呼吸节点数量:",
            newSet.size
          );
          return newSet;
        });
      } else if (detail.linkId) {
        // 设置连线进入呼吸状态
        setBreathingLinks((prev) => {
          const newSet = new Set(prev);
          newSet.add(detail.linkId!);
          console.log(
            "TopologyGraph: 设置呼吸连线:",
            detail.linkId,
            "当前呼吸连线数量:",
            newSet.size
          );
          return newSet;
        });
      }
    };

    // 监听攻击节点数据，更新拓扑图中的攻击节点
    const handleAttackedNodes = (event: Event) => {
      const customEvent = event as CustomEvent;
      const attackData = customEvent.detail as {
        attacked_nodes?: Array<{
          node_id: string;
          original_id: number;
          type: "electric" | "gas";
        }>;
        best_strategy?: {
          electric_nodes?: number[];
          gas_nodes?: number[];
        };
      };
      console.log("TopologyGraph: 收到攻击节点数据:", attackData);

      // 定义合并节点映射关系 - 燃气节点与电力节点的对应关系
      const mergedNodesMap: Record<number, number> = {
        3: 30, // 燃气节点3 ↔ 电力节点30
        6: 33, // 燃气节点6 ↔ 电力节点33
        19: 37, // 燃气节点19 ↔ 电力节点37
      };

      // 清空之前的攻击节点
      const newAttackedNodes = new Set<string>();

      // 处理攻击节点数据
      if (
        attackData.attacked_nodes &&
        Array.isArray(attackData.attacked_nodes)
      ) {
        attackData.attacked_nodes.forEach((node) => {
          let topologyNodeId: string;
          if (node.type === "electric") {
            topologyNodeId = `bus_${node.original_id}`;
          } else {
            topologyNodeId = `gas_node_${node.original_id}`;
          }
          newAttackedNodes.add(topologyNodeId);

          // 检查是否是合并的燃气节点，如果是则同时标记对应的电力节点
          if (node.type === "gas") {
            // 查找是否有电力节点合并了这个燃气节点
            Object.entries(mergedNodesMap).forEach(
              ([gasNodeId, targetBusId]) => {
                if (parseInt(gasNodeId) === node.original_id) {
                  // 找到了对应的电力节点，也标记为攻击状态
                  const mergedElectricNodeId = `bus_${targetBusId}`;
                  newAttackedNodes.add(mergedElectricNodeId);
                }
              }
            );
          }
        });
      }
      // 处理最佳策略数据
      else if (attackData.best_strategy) {
        // 处理电力攻击节点
        if (
          attackData.best_strategy.electric_nodes &&
          Array.isArray(attackData.best_strategy.electric_nodes)
        ) {
          attackData.best_strategy.electric_nodes.forEach((nodeId) => {
            const topologyNodeId = `bus_${nodeId}`;
            newAttackedNodes.add(topologyNodeId);
          });
        }
        // 处理天然气攻击节点
        if (
          attackData.best_strategy.gas_nodes &&
          Array.isArray(attackData.best_strategy.gas_nodes)
        ) {
          attackData.best_strategy.gas_nodes.forEach((nodeId) => {
            const topologyNodeId = `gas_node_${nodeId}`;
            newAttackedNodes.add(topologyNodeId);

            // 检查是否是合并的燃气节点，如果是则同时标记对应的电力节点
            Object.entries(mergedNodesMap).forEach(
              ([gasNodeId, targetBusId]) => {
                if (parseInt(gasNodeId) === nodeId) {
                  // 找到了对应的电力节点，也标记为攻击状态
                  const mergedElectricNodeId = `bus_${targetBusId}`;
                  newAttackedNodes.add(mergedElectricNodeId);
                }
              }
            );
          });
        }
      }

      // 更新攻击节点状态
      setAttackedNodes(newAttackedNodes);
      console.log("TopologyGraph: 更新攻击节点:", newAttackedNodes);
    };

    // 添加事件监听器
    window.addEventListener(
      "highlightElement",
      handleHighlightEvent as EventListener
    );
    window.addEventListener("nodeClick", handleNodeClick as EventListener);
    window.addEventListener("linkClick", handleLinkClick as EventListener);
    window.addEventListener(
      "breathAnimation",
      handleBreathAnimation as EventListener
    );
    window.addEventListener(
      "attackedNodes",
      handleAttackedNodes as EventListener
    );

    // 清理函数
    return () => {
      console.log("TopologyGraph: 清理事件监听器");
      // 清除定时器
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      // 移除事件监听器
      window.removeEventListener(
        "highlightElement",
        handleHighlightEvent as EventListener
      );
      window.removeEventListener("nodeClick", handleNodeClick as EventListener);
      window.removeEventListener("linkClick", handleLinkClick as EventListener);
      window.removeEventListener(
        "breathAnimation",
        handleBreathAnimation as EventListener
      );
      window.removeEventListener(
        "attackedNodes",
        handleAttackedNodes as EventListener
      );
    };
  }, []);

  // 从Python文件数据生成图数据
  useEffect(() => {
    generateGraphDataFromPython();
  }, [generateGraphDataFromPython, refreshTrigger]);

  // 处理呼吸动画效果 - 使用useRef持久化计时器
  useEffect(() => {
    // 处理新添加的节点
    breathingNodes.forEach((nodeId) => {
      if (!nodeTimersRef.current[nodeId]) {
        console.log("开始节点独立呼吸动画:", nodeId);

        const totalCycles = 3; // 总共闪烁3次
        const stepsPerCycle = 15; // 每个周期的步数
        const animationDuration = 2000; // 总动画时长2秒
        const stepInterval = animationDuration / (totalCycles * stepsPerCycle);

        // 为每个节点设置独立的相位偏移
        const phaseOffset = (nodeId.charCodeAt(0) % 10) * 0.1;

        let step = 0;

        // 启动独立计时器并保存到ref
        nodeTimersRef.current[nodeId] = window.setInterval(() => {
          step++;
          const progress = Math.min(step / (totalCycles * stepsPerCycle), 1);

          // 计算呼吸效果的透明度值
          const breathValue =
            0.3 +
            0.7 *
              Math.abs(
                Math.sin(progress * Math.PI * 2 * totalCycles + phaseOffset)
              );

          // 更新单个节点的透明度
          setNodeOpacity((prev) => ({
            ...prev,
            [nodeId]: breathValue,
          }));

          // 当动画完成时，清理单个节点的状态
          if (step >= totalCycles * stepsPerCycle) {
            clearInterval(nodeTimersRef.current[nodeId]);
            delete nodeTimersRef.current[nodeId];

            setBreathingNodes((prev) => {
              const newSet = new Set(prev);
              newSet.delete(nodeId);
              return newSet;
            });

            setNodeOpacity((prev) => {
              const newOpacity = { ...prev };
              delete newOpacity[nodeId];
              return newOpacity;
            });

            console.log("节点独立呼吸动画完成:", nodeId);
          }
        }, stepInterval);
      }
    });

    // 处理新添加的连线
    breathingLinks.forEach((linkId) => {
      if (!linkTimersRef.current[linkId]) {
        console.log("开始连线独立呼吸动画:", linkId);

        const totalCycles = 3;
        const stepsPerCycle = 15;
        const animationDuration = 2000;
        const stepInterval = animationDuration / (totalCycles * stepsPerCycle);

        const phaseOffset = (linkId.charCodeAt(0) % 10) * 0.1;

        let step = 0;

        linkTimersRef.current[linkId] = window.setInterval(() => {
          step++;
          const progress = Math.min(step / (totalCycles * stepsPerCycle), 1);

          const breathValue =
            0.3 +
            0.7 *
              Math.abs(
                Math.sin(progress * Math.PI * 2 * totalCycles + phaseOffset)
              );

          setLinkOpacity((prev) => ({
            ...prev,
            [linkId]: breathValue,
          }));

          if (step >= totalCycles * stepsPerCycle) {
            clearInterval(linkTimersRef.current[linkId]);
            delete linkTimersRef.current[linkId];

            setBreathingLinks((prev) => {
              const newSet = new Set(prev);
              newSet.delete(linkId);
              return newSet;
            });

            setLinkOpacity((prev) => {
              const newOpacity = { ...prev };
              delete newOpacity[linkId];
              return newOpacity;
            });

            console.log("连线独立呼吸动画完成:", linkId);
          }
        }, stepInterval);
      }
    });

    // 清理函数：移除不再需要动画的节点和连线
    return () => {
      // 清理不再在breathingNodes中的节点计时器
      Object.keys(nodeTimersRef.current).forEach((nodeId) => {
        if (!breathingNodes.has(nodeId)) {
          clearInterval(nodeTimersRef.current[nodeId]);
          delete nodeTimersRef.current[nodeId];
        }
      });

      // 清理不再在breathingLinks中的连线计时器
      Object.keys(linkTimersRef.current).forEach((linkId) => {
        if (!breathingLinks.has(linkId)) {
          clearInterval(linkTimersRef.current[linkId]);
          delete linkTimersRef.current[linkId];
        }
      });
    };
  }, [breathingNodes, breathingLinks]); // 依赖breathingNodes和breathingLinks的变化

  // 获取CSS变量值（提取到顶层作用域，供所有函数使用）
  const getCSSColor = (varName: string) => {
    return getComputedStyle(document.body).getPropertyValue(varName).trim();
  };

  // 获取节点颜色
  const getNodeColor = (node: ExtendedNode) => {
    // 检查节点是否是攻击节点 - 最高优先级
    if (attackedNodes.has(node.id)) {
      // 所有攻击节点统一使用非常显眼的亮红色
      return "#ff0000"; // 亮红色表示攻击节点，非常显眼
    }

    // 检查节点是否处于呼吸状态
    if (breathingNodes.has(node.id)) {
      // 使用新的透明度状态
      const opacity =
        nodeOpacity[node.id] !== undefined ? nodeOpacity[node.id] : 1.0;

      // 检查节点是否是被保护节点
      if (protectedNodes.has(node.id)) {
        // 被保护节点的呼吸效果，使用绿色
        return `rgba(76, 175, 80, ${opacity})`;
      }

      // 检查节点是否是合并节点
      if (node.isMerged) {
        // 合并节点的呼吸效果，使用紫色
        return `rgba(156, 39, 176, ${opacity})`;
      }

      const group = node.group || "other";

      // 解析颜色的RGB值
      const parseRGB = (colorString: string) => {
        const match = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return match
          ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
          : [153, 153, 153];
      };

      switch (group) {
        case "bus": {
          const [r, g, b] = parseRGB(getCSSColor("--node-electric-bus"));
          return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        case "generator": {
          const [r, g, b] = parseRGB(getCSSColor("--node-generator"));
          return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        case "gas": {
          const [r, g, b] = parseRGB(getCSSColor("--node-gas"));
          return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        case "source": {
          const [r, g, b] = parseRGB(getCSSColor("--node-source"));
          return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        default:
          return `rgba(153, 153, 153, ${opacity})`;
      }
    }

    // 检查节点是否是被保护节点（非呼吸状态）
    if (protectedNodes.has(node.id)) {
      // 所有被保护节点统一使用绿色，表示安全和保护
      return "#4caf50"; // 绿色表示被保护节点
    }

    // 检查节点是否是合并节点 - 为合并节点使用特殊颜色
    if (node.isMerged) {
      // 合并节点使用紫色标记
      return "#9c27b0"; // 紫色表示合并节点，易于识别
    }

    // 非呼吸状态使用原始颜色
    const group = node.group || "other";
    switch (group) {
      case "bus":
        return getCSSColor("--node-electric-bus");
      case "generator":
        return getCSSColor("--node-generator");
      case "gas":
        return getCSSColor("--node-gas");
      case "source":
        return getCSSColor("--node-source");
      default:
        return getCSSColor("--node-default");
    }
  };

  // 获取连线颜色
  const getLinkColor = (link: ExtendedLink) => {
    // 构造连线ID
    const sourceId =
      typeof link.source === "string" ? link.source : link.source.id;
    const targetId =
      typeof link.target === "string" ? link.target : link.target.id;
    const linkId = `${sourceId}-${targetId}`;

    // 检查连线是否处于呼吸状态
    if (breathingLinks.has(linkId)) {
      // 使用新的透明度状态
      const opacity =
        linkOpacity[linkId] !== undefined ? linkOpacity[linkId] : 1.0;

      // 统一连接线颜色
      let baseColor: string;

      // 根据连线类型设置统一颜色
      if (
        link.type === "electric_branch" ||
        link.type === "generator_connection"
      ) {
        // 电力系统连接线 - 统一使用蓝色
        baseColor = getCSSColor("--link-electric-branch");
      } else if (
        link.type === "gas_pipe" ||
        link.type === "gas_source_connection"
      ) {
        // 燃气系统连接线 - 统一使用橙色
        baseColor = getCSSColor("--link-gas-pipe");
      } else if (link.type === "coupling") {
        // 耦合连接 - 统一使用紫色
        baseColor = "#9c27b0";
      } else {
        // 默认颜色
        baseColor = getCSSColor("--node-default");
      }

      // 解析颜色的RGB值
      const parseRGB = (colorString: string) => {
        const match = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        }
        // 处理十六进制颜色
        if (colorString.startsWith("#")) {
          const hex = colorString.slice(1);
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return [r, g, b];
        }
        return [153, 153, 153];
      };

      const [r, g, b] = parseRGB(baseColor);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // 非呼吸状态使用统一颜色
    switch (link.type) {
      case "electric_branch":
      case "generator_connection":
        // 电力系统连接线 - 统一使用蓝色
        return getCSSColor("--link-electric-branch");
      case "gas_pipe":
      case "gas_source_connection":
        // 燃气系统连接线 - 统一使用橙色
        return getCSSColor("--link-gas-pipe");
      case "coupling":
        // 耦合连接 - 统一使用紫色
        return "#9c27b0";
      default:
        return getCSSColor("--node-default");
    }
  };

  // 判断节点是否应该显示
  const isNodeVisible = (node: ExtendedNode) => {
    // 确保耦合节点在任何显示模式下都显示
    if (node.isMerged) {
      return true;
    }

    // 确保节点有group属性，如果没有则使用默认值
    const nodeGroup = node.group || "other";

    // 确保displayMode是有效的值
    switch (displayMode) {
      case "both":
        return true;
      case "electric":
        return ["bus", "generator"].includes(nodeGroup);
      case "gas":
        // 在气体模式下显示气体节点和气源节点
        return ["gas", "source"].includes(nodeGroup);
      default:
        // 对于任何未预期的显示模式，显示所有节点
        return true;
    }
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

    // 确保节点有group属性
    const sourceGroup = sourceNode.group || "other";
    const targetGroup = targetNode.group || "other";

    // 检查节点是否是耦合节点
    const isSourceMerged = sourceNode.isMerged || false;
    const isTargetMerged = targetNode.isMerged || false;

    // 仅在电力系统或全部显示模式下显示耦合连接线
    if (link.type === "coupling") {
      // 仅显示燃气系统时不显示耦合连接线
      if (displayMode === "gas") return false;
      // 电力系统或全部显示模式下显示耦合连接线
      return true;
    }

    // 根据显示模式判断是否显示连线
    switch (displayMode) {
      case "both":
        return true;
      case "electric":
        // 在电力模式下，显示电力相关连接和与耦合节点相关的连接
        return (
          (["bus", "generator"].includes(sourceGroup) &&
            ["bus", "generator"].includes(targetGroup)) ||
          (["electric_branch", "generator_connection"].includes(link.type) &&
            (isSourceMerged || isTargetMerged))
        );
      case "gas":
        // 在气体模式下，显示气体相关连接和与耦合节点相关的连接
        return (
          (["gas", "source"].includes(sourceGroup) &&
            ["gas", "source"].includes(targetGroup)) ||
          (["gas_pipe", "gas_source_connection"].includes(link.type) &&
            (isSourceMerged || isTargetMerged))
        );
      default:
        // 对于任何未预期的显示模式，显示所有连线
        return true;
    }
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
      ["bus"].includes(node.group || "other")
    ).length;

    const gasNodes = graphData.nodes.filter((node) =>
      ["gas"].includes(node.group || "other")
    ).length;

    return { electricNodes, gasNodes };
  };

  // 渲染图表视图
  const renderGraphView = () => {
    const { electricNodes, gasNodes } = countNodes();

    return (
      <div className="graph-container">
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
            className={`toggle-button ${flowEnabled ? "active" : ""}`}
            onClick={() => setFlowEnabled(!flowEnabled)}
          >
            {flowEnabled ? "关闭潮流" : "开启潮流"}
          </button>
          <button
            className="toggle-button reset-view-button"
            onClick={() => graphRef.current?.resetView()}
          >
            复位视图
          </button>
        </div>

        <div className="node-count-info">
          <span className="node-count-item">
            电力节点: <strong>{electricNodes}</strong>
          </span>
          <span className="node-count-item">
            天然气节点: <strong>{gasNodes}</strong>
          </span>
        </div>

        {/* 节点详情面板 */}
        {isNodeDetailVisible && selectedNode && (
          <div className="node-detail-panel">
            <div className="node-detail-header">
              <h3>节点详情</h3>
              <button
                className="close-button"
                onClick={() => setIsNodeDetailVisible(false)}
              >
                ×
              </button>
            </div>
            <div className="node-detail-content">
              {/* 基本信息 */}
              <div className="data-group">
                <div className="data-group-title">基本信息</div>
                <p>
                  <strong>ID:</strong>{" "}
                  <span className="value-highlight">{selectedNode.id}</span>
                </p>
                <p>
                  <strong>名称:</strong> {selectedNode.name}
                </p>
                <p>
                  <strong>类型:</strong> {selectedNode.type}
                </p>
                {selectedNode.description && (
                  <p>
                    <strong>描述:</strong> {selectedNode.description}
                  </p>
                )}
                {selectedNode.status && (
                  <p>
                    <strong>状态:</strong> {selectedNode.status}
                  </p>
                )}
                {selectedNode.capacity && (
                  <p>
                    <strong>容量:</strong> {selectedNode.capacity}
                  </p>
                )}
              </div>

              {/* 电力母线业务数据 */}
              {selectedNode.type === "electric_bus" && (
                <div className="data-group">
                  <div className="data-group-title">电力系统参数</div>
                  {selectedNode.bus_type !== undefined && (
                    <p>
                      <strong>母线类型:</strong>{" "}
                      {selectedNode.bus_type === 1
                        ? "PQ节点"
                        : selectedNode.bus_type === 2
                        ? "PV节点"
                        : selectedNode.bus_type === 3
                        ? "平衡节点"
                        : selectedNode.bus_type}
                    </p>
                  )}
                  {selectedNode.pd !== undefined && (
                    <p>
                      <strong>有功负荷:</strong>{" "}
                      <span className="value-highlight">{selectedNode.pd}</span>{" "}
                      <span className="unit">MW</span>
                    </p>
                  )}
                  {selectedNode.qd !== undefined && (
                    <p>
                      <strong>无功负荷:</strong>{" "}
                      <span className="value-highlight">{selectedNode.qd}</span>{" "}
                      <span className="unit">MVar</span>
                    </p>
                  )}
                  {selectedNode.vm !== undefined && (
                    <p>
                      <strong>电压幅值:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.vm.toFixed(4)}
                      </span>{" "}
                      <span className="unit">p.u.</span>
                    </p>
                  )}
                  {selectedNode.va !== undefined && (
                    <p>
                      <strong>电压相角:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.va.toFixed(4)}
                      </span>{" "}
                      <span className="unit">°</span>
                    </p>
                  )}
                  {selectedNode.basekv !== undefined && (
                    <p>
                      <strong>基准电压:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.basekv}
                      </span>{" "}
                      <span className="unit">kV</span>
                    </p>
                  )}
                  {selectedNode.zone !== undefined && (
                    <p>
                      <strong>区域:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.zone}
                      </span>
                    </p>
                  )}
                  {selectedNode.vmax !== undefined && (
                    <p>
                      <strong>最大电压:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.vmax}
                      </span>{" "}
                      <span className="unit">p.u.</span>
                    </p>
                  )}
                  {selectedNode.vmin !== undefined && (
                    <p>
                      <strong>最小电压:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.vmin}
                      </span>{" "}
                      <span className="unit">p.u.</span>
                    </p>
                  )}
                  {selectedNode.gs !== undefined && (
                    <p>
                      <strong>电导:</strong>{" "}
                      <span className="value-highlight">{selectedNode.gs}</span>{" "}
                      <span className="unit">pu</span>
                    </p>
                  )}
                  {selectedNode.bs !== undefined && (
                    <p>
                      <strong>电纳:</strong>{" "}
                      <span className="value-highlight">{selectedNode.bs}</span>{" "}
                      <span className="unit">pu</span>
                    </p>
                  )}
                  {selectedNode.area !== undefined && (
                    <p>
                      <strong>区域:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.area}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* 发电机业务数据 */}
              {selectedNode.type === "generator" && (
                <div className="data-group">
                  <div className="data-group-title">发电机参数</div>
                  {selectedNode.connected_bus !== undefined && (
                    <p>
                      <strong>连接母线:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.connected_bus}
                      </span>
                    </p>
                  )}
                  {selectedNode.pg !== undefined && (
                    <p>
                      <strong>有功出力:</strong>{" "}
                      <span className="value-highlight">{selectedNode.pg}</span>{" "}
                      <span className="unit">MW</span>
                    </p>
                  )}
                  {selectedNode.qg !== undefined && (
                    <p>
                      <strong>无功出力:</strong>{" "}
                      <span className="value-highlight">{selectedNode.qg}</span>{" "}
                      <span className="unit">MVar</span>
                    </p>
                  )}
                  {selectedNode.pmax !== undefined && (
                    <p>
                      <strong>最大出力:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.pmax}
                      </span>{" "}
                      <span className="unit">MW</span>
                    </p>
                  )}
                  {selectedNode.pmin !== undefined && (
                    <p>
                      <strong>最小出力:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.pmin}
                      </span>{" "}
                      <span className="unit">MW</span>
                    </p>
                  )}
                  {selectedNode.qmax !== undefined && (
                    <p>
                      <strong>最大无功:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.qmax}
                      </span>{" "}
                      <span className="unit">MVar</span>
                    </p>
                  )}
                  {selectedNode.qmin !== undefined && (
                    <p>
                      <strong>最小无功:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.qmin}
                      </span>{" "}
                      <span className="unit">MVar</span>
                    </p>
                  )}
                  {selectedNode.vg !== undefined && (
                    <p>
                      <strong>发电机电压:</strong>{" "}
                      <span className="value-highlight">{selectedNode.vg}</span>{" "}
                      <span className="unit">p.u.</span>
                    </p>
                  )}
                  {selectedNode.mBase !== undefined && (
                    <p>
                      <strong>基准容量:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.mBase}
                      </span>{" "}
                      <span className="unit">MVA</span>
                    </p>
                  )}
                  {selectedNode.status !== undefined && (
                    <p>
                      <strong>状态:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.status === 1 ? "运行" : "停运"}
                      </span>
                    </p>
                  )}
                  {selectedNode.minup !== undefined && (
                    <p>
                      <strong>最小开机时间:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.minup}
                      </span>{" "}
                      <span className="unit">小时</span>
                    </p>
                  )}
                  {selectedNode.mindown !== undefined && (
                    <p>
                      <strong>最小停机时间:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.mindown}
                      </span>{" "}
                      <span className="unit">小时</span>
                    </p>
                  )}
                  {selectedNode.rampup !== undefined && (
                    <p>
                      <strong>向上爬坡率:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.rampup}
                      </span>{" "}
                      <span className="unit">MW/小时</span>
                    </p>
                  )}
                  {selectedNode.rampdown !== undefined && (
                    <p>
                      <strong>向下爬坡率:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.rampdown}
                      </span>{" "}
                      <span className="unit">MW/小时</span>
                    </p>
                  )}
                  {selectedNode.initup !== undefined && (
                    <p>
                      <strong>初始开机时间:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.initup}
                      </span>{" "}
                      <span className="unit">小时</span>
                    </p>
                  )}
                  {selectedNode.initdown !== undefined && (
                    <p>
                      <strong>初始停机时间:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.initdown}
                      </span>{" "}
                      <span className="unit">小时</span>
                    </p>
                  )}
                </div>
              )}

              {/* 天然气节点业务数据 - 包括耦合节点的燃气数据 */}
              {(selectedNode.type === "gas_node" ||
                (selectedNode.isMerged && selectedNode.gas_node_data)) && (
                <div className="data-group">
                  <div className="data-group-title">天然气系统参数</div>
                  {/* 优先使用耦合节点中的燃气数据，否则使用节点本身的数据 */}
                  {(selectedNode.gas_node_data?.pressure_max !== undefined ||
                    selectedNode.pressure_max !== undefined) && (
                    <p>
                      <strong>最大压力:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.gas_node_data?.pressure_max ||
                          selectedNode.pressure_max}
                      </span>{" "}
                      <span className="unit">bar</span>
                    </p>
                  )}
                  {(selectedNode.gas_node_data?.pressure_min !== undefined ||
                    selectedNode.pressure_min !== undefined) && (
                    <p>
                      <strong>最小压力:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.gas_node_data?.pressure_min ||
                          selectedNode.pressure_min}
                      </span>{" "}
                      <span className="unit">bar</span>
                    </p>
                  )}
                  {(selectedNode.gas_node_data?.load !== undefined ||
                    selectedNode.load !== undefined) && (
                    <p>
                      <strong>负荷:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.gas_node_data?.load || selectedNode.load}
                      </span>{" "}
                      <span className="unit">m³/h</span>
                    </p>
                  )}
                  {(selectedNode.gas_node_data?.base_pressure !== undefined ||
                    selectedNode.base_pressure !== undefined) && (
                    <p>
                      <strong>基准压力:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.gas_node_data?.base_pressure ||
                          selectedNode.base_pressure}
                      </span>{" "}
                      <span className="unit">bar</span>
                    </p>
                  )}
                </div>
              )}

              {/* 天然气源业务数据 */}
              {selectedNode.type === "gas_source" && (
                <div className="data-group">
                  <div className="data-group-title">气源参数</div>
                  {selectedNode.connected_bus !== undefined && (
                    <p>
                      <strong>连接节点:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.connected_bus}
                      </span>
                    </p>
                  )}
                  {selectedNode.min_w !== undefined && (
                    <p>
                      <strong>最小供气量:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.min_w}
                      </span>{" "}
                      <span className="unit">m³/s</span>
                    </p>
                  )}
                  {selectedNode.max_w !== undefined && (
                    <p>
                      <strong>最大供气量:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.max_w}
                      </span>{" "}
                      <span className="unit">m³/s</span>
                    </p>
                  )}
                  {selectedNode.cost !== undefined && (
                    <p>
                      <strong>供气成本:</strong>{" "}
                      <span className="value-highlight">
                        {selectedNode.cost}
                      </span>{" "}
                      <span className="unit">元/m³</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 链接详情面板 */}
        {isLinkDetailVisible && selectedLink && (
          <div className="node-detail-panel">
            <div className="node-detail-header">
              <h3>连接详情</h3>
              <button
                className="close-button"
                onClick={() => setIsLinkDetailVisible(false)}
              >
                ×
              </button>
            </div>
            <div className="node-detail-content">
              {/* 基本信息 */}
              <div className="data-group">
                <div className="data-group-title">基本信息</div>
                <p>
                  <strong>源节点:</strong>{" "}
                  <span className="value-highlight">
                    {typeof selectedLink.source === "string"
                      ? selectedLink.source
                      : selectedLink.source.id}
                  </span>
                </p>
                <p>
                  <strong>目标节点:</strong>{" "}
                  <span className="value-highlight">
                    {typeof selectedLink.target === "string"
                      ? selectedLink.target
                      : selectedLink.target.id}
                  </span>
                </p>
                <p>
                  <strong>连接类型:</strong> {selectedLink.type}
                </p>
              </div>

              {/* 电力线路详情 */}
              {selectedLink.type === "electric_branch" && (
                <div className="data-group">
                  <div className="data-group-title">电力线路参数</div>
                  {selectedLink.r !== undefined && (
                    <p>
                      <strong>电阻:</strong>{" "}
                      <span className="value-highlight">{selectedLink.r}</span>{" "}
                      <span className="unit">pu</span>
                    </p>
                  )}
                  {selectedLink.x !== undefined && (
                    <p>
                      <strong>电抗:</strong>{" "}
                      <span className="value-highlight">{selectedLink.x}</span>{" "}
                      <span className="unit">pu</span>
                    </p>
                  )}
                  {selectedLink.b !== undefined && (
                    <p>
                      <strong>电纳:</strong>{" "}
                      <span className="value-highlight">{selectedLink.b}</span>{" "}
                      <span className="unit">pu</span>
                    </p>
                  )}
                  {selectedLink.rateA !== undefined && (
                    <p>
                      <strong>额定容量A:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.rateA}
                      </span>{" "}
                      <span className="unit">MVA</span>
                    </p>
                  )}
                  {selectedLink.rateB !== undefined && (
                    <p>
                      <strong>额定容量B:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.rateB}
                      </span>{" "}
                      <span className="unit">MVA</span>
                    </p>
                  )}
                  {selectedLink.rateC !== undefined && (
                    <p>
                      <strong>额定容量C:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.rateC}
                      </span>{" "}
                      <span className="unit">MVA</span>
                    </p>
                  )}
                  {selectedLink.ratio !== undefined && (
                    <p>
                      <strong>变比:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.ratio}
                      </span>
                    </p>
                  )}
                  {selectedLink.angle !== undefined && (
                    <p>
                      <strong>角度:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.angle}
                      </span>{" "}
                      <span className="unit">°</span>
                    </p>
                  )}
                  {selectedLink.status !== undefined && (
                    <p>
                      <strong>状态:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.status === 1 ? "运行" : "停运"}
                      </span>
                    </p>
                  )}
                  {selectedLink.angmin !== undefined && (
                    <p>
                      <strong>最小角度:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.angmin}
                      </span>{" "}
                      <span className="unit">°</span>
                    </p>
                  )}
                  {selectedLink.angmax !== undefined && (
                    <p>
                      <strong>最大角度:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.angmax}
                      </span>{" "}
                      <span className="unit">°</span>
                    </p>
                  )}
                </div>
              )}

              {/* 发电机连接详情 */}
              {selectedLink.type === "generator_connection" && (
                <div className="data-group">
                  <div className="data-group-title">发电机连接参数</div>
                  {selectedLink.value !== undefined && (
                    <p>
                      <strong>有功出力:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.value}
                      </span>{" "}
                      <span className="unit">MW</span>
                    </p>
                  )}
                </div>
              )}

              {/* 天然气管线详情 */}
              {selectedLink.type === "gas_pipe" && (
                <div className="data-group">
                  <div className="data-group-title">天然气管线参数</div>
                  {selectedLink.capacity !== undefined && (
                    <p>
                      <strong>管道容量:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.capacity}
                      </span>{" "}
                      <span className="unit">m³/h</span>
                    </p>
                  )}
                </div>
              )}

              {/* 气源连接详情 */}
              {selectedLink.type === "gas_source_connection" && (
                <div className="data-group">
                  <div className="data-group-title">气源连接参数</div>
                  {selectedLink.value !== undefined && (
                    <p>
                      <strong>供气量:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.value}
                      </span>{" "}
                      <span className="unit">m³/s</span>
                    </p>
                  )}
                </div>
              )}

              {/* 耦合连接详情 */}
              {selectedLink.type === "coupling" && (
                <div className="data-group">
                  <div className="data-group-title">耦合连接参数</div>
                  {selectedLink.value !== undefined && (
                    <p>
                      <strong>耦合类型:</strong>{" "}
                      <span className="value-highlight">
                        {selectedLink.value}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <CustomForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel={(node) => `${node.name} (${node.id})`}
          nodeColor={(node) => getNodeColor(node as ExtendedNode)}
          nodeVal={(node) => getNodeSize(node as ExtendedNode)}
          nodeVisibility={(node) => isNodeVisible(node as ExtendedNode)}
          linkColor={(link) => getLinkColor(link as ExtendedLink)}
          linkWidth={(link) => getLinkWidth(link as ExtendedLink)}
          linkVisibility={(link) => isLinkVisible(link as ExtendedLink)}
          highlightNodes={highlightNodes}
          highlightLinks={highlightLinks}
          // 粒子流动效果配置
          linkDirectionalParticles={
            flowEnabled ? DEFAULT_FLOW_CONFIG.particleCount : 0
          }
          linkDirectionalParticleSpeed={DEFAULT_FLOW_CONFIG.particleSpeed}
          linkDirectionalParticleWidth={DEFAULT_FLOW_CONFIG.particleWidth}
          linkDirectionalParticleColor={(link) =>
            getParticleColorByLinkType(link.type)
          }
          backgroundColor={bgColor}
          onNodeClick={(node) => {
            setSelectedNode(node as ExtendedNode);
            setIsNodeDetailVisible(true);
          }}
          onLinkClick={(link) => {
            console.log("Link clicked:", link);
            setSelectedLink(link as ExtendedLink);
            setIsLinkDetailVisible(true);
          }}
        />
        {/* 图例切换按钮 */}
        <button
          className={`legend-toggle-button ${
            !isLegendVisible ? "visible" : ""
          }`}
          onClick={() => setIsLegendVisible(!isLegendVisible)}
        >
          {isLegendVisible ? "隐藏图例" : "显示图例"}
        </button>

        {/* 图例 */}
        <div className={`legend-container ${!isLegendVisible ? "hidden" : ""}`}>
          <div className="legend">
            <div className="legend-header"></div>
            <div className="legend-section">
              <h4>节点类型</h4>
              <div className="legend-group">
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{
                      backgroundColor: getCSSColor("--node-electric-bus"),
                    }}
                  ></div>
                  <span>电力节点</span>
                </div>
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{ backgroundColor: getCSSColor("--node-gas") }}
                  ></div>
                  <span>天然气节点</span>
                </div>
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{ backgroundColor: "#9c27b0" }}
                  ></div>
                  <span>耦合节点</span>
                </div>
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{ backgroundColor: "#ff0000" }}
                  ></div>
                  <span>被攻击节点</span>
                </div>
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{ backgroundColor: "#4caf50" }}
                  ></div>
                  <span>被保护节点</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <TopologyErrorHandler>
      <div className="topology-graph">
        <h2>能源网络拓扑图</h2>

        {/* 主容器 - 包含图表和图例 */}
        <div className="topology-main-container">
          {/* 图表视图 */}
          {renderGraphView()}
        </div>
      </div>
    </TopologyErrorHandler>
  );
};

export default TopologyGraph;
