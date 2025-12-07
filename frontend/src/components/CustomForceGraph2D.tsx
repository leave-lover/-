import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import ForceGraph2D from "react-force-graph-2d";
import { GraphLink as Link } from "../types/graphTypes";
import InfoModal from "./InfoModal";

// 为了保持与react-force-graph-2d库的兼容性，我们需要重新定义Node类型
interface Node {
  id: string;
  [key: string]: any;
}

interface CustomForceGraph2DProps {
  graphData: { nodes: Node[]; links: Link[] };
  nodeLabel?: (node: Node) => string;
  nodeColor?: (node: Node) => string;
  nodeVal?: (node: Node) => number;
  nodeVisibility?: (node: Node) => boolean;
  linkColor?: (link: Link) => string;
  linkWidth?: number | ((link: Link) => number);
  linkVisibility?: (link: Link) => boolean;
  backgroundColor?: string;
  onNodeClick?: (node: Node) => void;
  onLinkClick?: (link: Link) => void;
  onNodeDrag?: (node: Node, translate: { x: number; y: number }) => void;
  onNodeDragEnd?: (node: Node, translate: { x: number; y: number }) => void;
  enableNodeDrag?: boolean;
}

export interface CustomForceGraph2DRef {
  resetView: () => void;
}

const CustomForceGraph2D = forwardRef<
  CustomForceGraph2DRef,
  CustomForceGraph2DProps
>(
  (
    {
      graphData,
      nodeLabel,
      nodeColor,
      nodeVal,
      nodeVisibility,
      linkColor,
      linkWidth,
      linkVisibility,
      backgroundColor,
      onNodeClick,
      onLinkClick,
      onNodeDrag,
      onNodeDragEnd,
      enableNodeDrag = true,
      ...restProps
    },
    ref
  ) => {
    const fgRef = useRef<any>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalData, setModalData] = useState<Record<string, any>>({});
    const [highlightNodes, setHighlightNodes] = useState<Set<string>>(
      new Set()
    );
    const [highlightLinks, setHighlightLinks] = useState<Set<string>>(
      new Set()
    );

    // 获取节点类型的友好名称
    const getNodeTypeName = (type: string): string => {
      const typeMap: Record<string, string> = {
        electric_bus: "电力母线",
        generator: "发电机",
        gas_node: "天然气节点",
        gas_source: "天然气源",
        electric_branch: "电力支路",
        generator_connection: "发电机连接",
        gas_pipe: "天然气管道",
        gas_source_connection: "天然气源连接",
        coupling: "耦合连接",
      };
      return typeMap[type] || type;
    };

    // 处理节点点击事件，高亮显示相关的耦合连接
    const handleNodeClick = (node: Node) => {
      // 显示节点信息模态框
      const nodeType = getNodeTypeName(node.type || "未知");
      setModalTitle(`${nodeType} 详情`);
      setModalData(node);
      setIsModalOpen(true);

      // 清除之前的高亮
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());

      // 查找与该节点相连的所有耦合连接
      const connectedCouplingLinks = graphData.links.filter(
        (link) =>
          (link.source === node.id || link.target === node.id) &&
          link.type === "coupling"
      );

      // 如果有耦合连接，则高亮显示这些连接和相关节点
      if (connectedCouplingLinks.length > 0) {
        const nodeIds = new Set<string>();
        nodeIds.add(node.id);

        const linkIds = new Set<string>();
        connectedCouplingLinks.forEach((link) => {
          linkIds.add(`${link.source}-${link.target}`);
          nodeIds.add(
            typeof link.source === "string" ? link.source : link.source.id
          );
          nodeIds.add(
            typeof link.target === "string" ? link.target : link.target.id
          );
        });

        setHighlightNodes(nodeIds);
        setHighlightLinks(linkIds);
      }

      // 调用原始的点击事件处理函数
      if (onNodeClick) {
        onNodeClick(node);
      }
    };

    // 处理连线点击事件，高亮显示耦合连接
    const handleLinkClick = (link: Link) => {
      // 显示连线信息模态框
      const linkType = getNodeTypeName(link.type || "未知");
      setModalTitle(`${linkType} 详情`);
      setModalData(link);
      setIsModalOpen(true);

      // 清除之前的高亮
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());

      // 如果是耦合连接，则高亮显示
      if (link.type === "coupling") {
        const nodeIds = new Set<string>();
        nodeIds.add(
          typeof link.source === "string" ? link.source : link.source.id
        );
        nodeIds.add(
          typeof link.target === "string" ? link.target : link.target.id
        );

        setHighlightNodes(nodeIds);
        setHighlightLinks(new Set([`${link.source}-${link.target}`]));
      }

      // 调用原始的点击事件处理函数
      if (onLinkClick) {
        onLinkClick(link);
      }
    };

    // 修改节点颜色以反映高亮状态
    const getNodeColor = (node: Node) => {
      // 如果节点被高亮，返回高亮颜色
      if (highlightNodes.has(node.id)) {
        return "#ff5722"; // 高亮颜色（橙色）
      }

      // 否则使用原始的颜色函数
      if (nodeColor) {
        return nodeColor(node);
      }

      // 默认颜色
      return "#999";
    };

    // 修改连线颜色以反映高亮状态
    const getLinkColor = (link: Link) => {
      // 如果连线被高亮，返回高亮颜色
      const linkId = `${
        typeof link.source === "string" ? link.source : link.source.id
      }-${typeof link.target === "string" ? link.target : link.target.id}`;

      if (highlightLinks.has(linkId)) {
        return "#ff5722"; // 高亮颜色（橙色）
      }

      // 否则使用原始的颜色函数
      if (linkColor) {
        return linkColor(link);
      }

      // 默认颜色
      return "#ccc";
    };

    // 修改连线宽度以反映高亮状态
    const getLinkWidth = (link: Link) => {
      // 如果连线被高亮，增加宽度
      const linkId = `${
        typeof link.source === "string" ? link.source : link.source.id
      }-${typeof link.target === "string" ? link.target : link.target.id}`;

      if (highlightLinks.has(linkId)) {
        return (
          (typeof linkWidth === "function" ? linkWidth(link) : linkWidth || 2) *
          2
        );
      }

      // 否则使用原始的宽度
      return typeof linkWidth === "function" ? linkWidth(link) : linkWidth || 2;
    };

    useEffect(() => {
      if (fgRef.current && enableNodeDrag) {
        // 获取force-graph实例
        const fg = fgRef.current;

        // 重写拖拽的subject函数，添加节点可见性检查
        const setupDragBehavior = () => {
          try {
            // 获取原始的拖拽行为
            const originalDrag = (fg as any)._d3.drag();

            // 创建新的拖拽行为
            const newDrag = originalDrag.subject(function () {
              // 如果禁用了节点拖拽，返回null
              if (!enableNodeDrag) {
                return null;
              }

              // 获取指针下的对象
              const obj = fg.getNodeAtCursor();

              // 只有节点可以被拖拽
              if (obj && obj.type === "Node") {
                // 检查节点可见性
                if (nodeVisibility) {
                  // 如果节点不可见，不允许拖拽
                  if (!nodeVisibility(obj.d)) {
                    return null;
                  }
                }
                return obj.d;
              }

              return null;
            });

            // 应用新的拖拽行为到canvas
            // 注意：这里我们不再直接调用canvas()方法，而是通过其他方式获取canvas元素
            const canvasElement = (
              fgRef.current as any
            )?._container?.querySelector("canvas");
            if (canvasElement) {
              newDrag(canvasElement);
            }
          } catch (error) {
            // 无法设置自定义拖拽行为，使用默认行为
          }
        };

        // 设置拖拽行为
        setupDragBehavior();
      }
    }, [fgRef, enableNodeDrag, nodeVisibility]);

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
      resetView: () => {
        if (fgRef.current) {
          // 先居中所有可见节点
          // 第一个参数是动画持续时间(ms)，第二个参数是padding(像素)
          fgRef.current.zoomToFit(1000, 20);

          // 等待居中动画完成后，再进行放大
          setTimeout(() => {
            // 获取当前缩放级别
            const currentZoom = fgRef.current.zoom();
            // 放大1.5倍
            fgRef.current.zoom(currentZoom * 1.5, 1000);
          }, 1000); // 等待1秒，确保居中动画完成
        }
      },
    }));

    return (
      <>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel={nodeLabel}
          nodeColor={getNodeColor}
          nodeVal={nodeVal}
          nodeVisibility={nodeVisibility}
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkVisibility={linkVisibility}
          backgroundColor={backgroundColor}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onNodeDrag={onNodeDrag}
          onNodeDragEnd={onNodeDragEnd}
          enableNodeDrag={enableNodeDrag}
          {...restProps}
        />
        <InfoModal
          isOpen={isModalOpen}
          title={modalTitle}
          data={modalData}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }
);

export default CustomForceGraph2D;
