// 粒子流动效果配置
export interface FlowConfig {
  // 是否启用粒子流动效果
  enableFlow: boolean;
  // 每条连线上的粒子数量
  particleCount: number;
  // 粒子移动速度
  particleSpeed: number;
  // 粒子宽度
  particleWidth: number;
  // 粒子颜色
  particleColor: string;
}

// 默认配置
export const DEFAULT_FLOW_CONFIG: FlowConfig = {
  enableFlow: true,
  particleCount: 8,
  particleSpeed: 0.001,
  particleWidth: 3,
  particleColor: "#ff5722",
};

// 根据链接类型获取粒子颜色
export const getParticleColorByLinkType = (linkType: string): string => {
  const colorMap: Record<string, string> = {
    electric_branch: "#ff5722", // 电力支路 - 橙色
    gas_pipe: "#4caf50", // 天然气管道 - 绿色
    coupling: "#2196f3", // 耦合连接 - 蓝色
    default: "#9e9e9e", // 默认 - 灰色
  };

  return colorMap[linkType] || colorMap.default;
};
