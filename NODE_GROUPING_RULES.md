# 节点分组规则文档

## 概述

本文档描述了能源防御与攻击平台中拓扑图节点的分组规则。这些规则决定了节点在不同显示模式（电力、气体、两者）下的可见性。

## 节点类型与分组映射

### 电力系统节点

1. **electric_bus** -> 分组为 "bus"

   - 电力系统的母线节点
   - 在电力模式和混合模式下可见

2. **generator** -> 分组为 "generator"
   - 发电机节点
   - 在电力模式和混合模式下可见

### 天然气系统节点

1. **gas_node** -> 分组为 "gas"

   - 天然气管道节点
   - 在气体模式和混合模式下可见

2. **gas_source** -> 分组为 "source"
   - 天然气源头节点（气源）
   - 在气体模式和混合模式下可见

### 其他节点

- 所有其他未明确指定的节点类型 -> 分组为 "other"
  - 默认分组，通常在所有模式下都可见

## 显示模式下的可见性规则

### 电力模式 (electric)

- 可见节点分组: "bus", "generator"
- 可见连线: 连接 bus 和 generator 节点的连线
- 特殊规则: 耦合连线始终可见

### 气体模式 (gas)

- 可见节点分组: "gas", "source"
- 可见连线: 连接 gas 和 source 节点的连线
- 特殊规则: 耦合连线始终可见

### 混合模式 (both)

- 可见节点分组: 所有分组 ("bus", "generator", "gas", "source", "other")
- 可见连线: 所有连线
- 特殊规则: 耦合连线始终可见

## 实现细节

### 前端实现

节点分组在 `TopologyGraph.tsx` 文件中的 `fetchGraphData` 函数中完成：

```typescript
const processedNodes = data.nodes.map((node: any) => {
  let group = "other";
  if (node.type === "electric_bus") group = "bus";
  else if (node.type === "generator") group = "generator";
  else if (node.type === "gas_source") group = "source";
  else if (node.type.startsWith("gas_")) group = "gas";

  return {
    ...node,
    group,
  };
});
```

### 可见性判断逻辑

在 `TopologyGraph.tsx` 文件中实现了两个函数来判断节点和连线的可见性：

1. `isNodeVisible` 函数:

```typescript
const isNodeVisible = (node: ExtendedNode) => {
  const nodeGroup = node.group || "other";

  switch (displayMode) {
    case "both":
      return true;
    case "electric":
      return ["bus", "generator"].includes(nodeGroup);
    case "gas":
      return ["gas", "source"].includes(nodeGroup);
    default:
      return true;
  }
};
```

2. `isLinkVisible` 函数:

```typescript
const isLinkVisible = (link: ExtendedLink) => {
  // 查找连线两端的节点
  const sourceNode = graphData.nodes.find(/* ... */);
  const targetNode = graphData.nodes.find(/* ... */);

  // 如果找不到节点，则隐藏连线
  if (!sourceNode || !targetNode) return false;

  // 确保节点有group属性
  const sourceGroup = sourceNode.group || "other";
  const targetGroup = targetNode.group || "other";

  // 在单一系统显示模式下，仍显示耦合连接线
  if (link.type === "coupling") return true;

  // 根据显示模式判断是否显示连线
  switch (displayMode) {
    case "both":
      return true;
    case "electric":
      return (
        ["bus", "generator"].includes(sourceGroup) &&
        ["bus", "generator"].includes(targetGroup)
      );
    case "gas":
      return (
        ["gas", "source"].includes(sourceGroup) &&
        ["gas", "source"].includes(targetGroup)
      );
    default:
      return true;
  }
};
```

## 注意事项

1. 所有节点都应该有一个 `group` 属性，如果没有会默认为 "other"
2. 当添加新的节点类型时，需要相应地更新分组逻辑
3. 耦合连线（coupling links）在所有显示模式下都是可见的，用于表示电力和天然气系统之间的连接
