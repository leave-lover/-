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
  particleColor: getComputedStyle(document.documentElement)
    .getPropertyValue("--link-electric-branch")
    .trim(),
};

// 根据链接类型获取粒子颜色
export const getParticleColorByLinkType = (linkType: string): string => {
  const colorMap: Record<string, string> = {
    electric_branch: getComputedStyle(document.documentElement)
      .getPropertyValue("--link-electric-branch")
      .trim(),
    gas_pipe: getComputedStyle(document.documentElement)
      .getPropertyValue("--link-gas-pipe")
      .trim(),
    coupling: getComputedStyle(document.documentElement)
      .getPropertyValue("--link-coupling")
      .trim(),
    default: getComputedStyle(document.documentElement)
      .getPropertyValue("--link-default")
      .trim(),
  };

  return colorMap[linkType] || colorMap.default;
};
