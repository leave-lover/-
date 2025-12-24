import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import "./ChartComponent.css";

// 定义图表数据类型
interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

// 定义完整图表配置类型
interface ChartConfigData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    [key: string]: any;
  }[];
}
// 定义图表组件属性
interface ChartComponentProps {
  data: ChartDataPoint[] | ChartConfigData;
  chartType?: "bar" | "line";
  baselineValue?: number;
}

const ChartComponent: React.FC<ChartComponentProps> = ({
  data,
  chartType = "bar",
  baselineValue,
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data) {
      return;
    }

    // 销毁现有图表
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // 图表配置
    const config: any = {
      type: chartType,
      data: {},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 15,
            left: 10,
            right: 0,
          },
        },
        plugins: {
          legend: {
            position: "top" as const,
            labels: {
              color: window
                .getComputedStyle(document.body)
                .getPropertyValue("--text-primary"),
              font: {
                size: 14,
                weight: "600",
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 8,
              boxHeight: 8,
            },
          },
          tooltip: {
            mode: "index" as const,
            intersect: false,
            backgroundColor: `${window
              .getComputedStyle(document.body)
              .getPropertyValue("--bg-tertiary")}f0`,
            titleColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--text-primary"),
            bodyColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--text-secondary"),
            borderColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--border-primary"),
            borderWidth: 2,
            padding: 18,
            displayColors: true,
            cornerRadius: 12,
            // 添加tooltip阴影效果
            shadowColor: `${window
              .getComputedStyle(document.body)
              .getPropertyValue("--shadow-primary")}90`,
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowOffsetY: 5,
            // 添加tooltip动画效果
            animation: {
              duration: 300,
              easing: "easeOutBack",
            },
            // 优化tooltip位置
            position: "nearest" as const,
            callbacks: {
              title: function (context: any) {
                return context[0].label;
              },
              label: function (context: any) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  // 自适应小数位：根据数据范围自动调整显示精度
                  let decimalPlaces = 2;

                  // 获取当前数据集的所有值
                  const datasetValues = context.dataset.data;
                  const minValue = Math.min(...datasetValues);
                  const maxValue = Math.max(...datasetValues);
                  const range = maxValue - minValue;

                  // 根据数据范围动态调整小数位数
                  if (range < 0.0001) {
                    decimalPlaces = 8;
                  } else if (range < 0.001) {
                    decimalPlaces = 6;
                  } else if (range < 0.01) {
                    decimalPlaces = 4;
                  } else if (range < 0.1) {
                    decimalPlaces = 3;
                  } else if (range < 1) {
                    decimalPlaces = 3;
                  } else if (range < 10) {
                    decimalPlaces = 2;
                  } else if (range < 100) {
                    decimalPlaces = 1;
                  }

                  // 特殊处理上层目标值和下层成本值，确保显示合适的小数位
                  if (
                    context.dataset.label === "数值" ||
                    context.dataset.label === "上层目标值"
                  ) {
                    decimalPlaces = Math.max(decimalPlaces, 6);
                  } else if (context.dataset.label === "下层成本值") {
                    // 对于成本值，确保显示足够的小数位以体现变化
                    decimalPlaces = Math.max(decimalPlaces, 4);
                  }

                  // 添加数值变化指示
                  const currentValue = context.parsed.y;
                  const previousValue =
                    context.dataset.data[Math.max(0, context.dataIndex - 1)];
                  const change =
                    previousValue !== undefined
                      ? currentValue - previousValue
                      : 0;
                  const changeText =
                    change > 0
                      ? ` (↑ +${change.toFixed(decimalPlaces)})`
                      : change < 0
                      ? ` (↓ ${change.toFixed(decimalPlaces)})`
                      : " (→ 0)";

                  label += currentValue.toFixed(decimalPlaces) + changeText;
                }
                return label;
              },
              labelPointStyle: function () {
                return {
                  pointStyle: "circle",
                  rotation: 0,
                };
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false, // 不强制从0开始，让数值变化更明显
            grace: function (context: any) {
              // 动态计算grace值，根据数据范围调整，使变化更明显
              const allValues = context.chart.data.datasets.flatMap(
                (dataset: any) => dataset.data
              );
              const minValue = Math.min(...allValues);
              const maxValue = Math.max(...allValues);
              const range = maxValue - minValue;
              // 数据范围越小，grace值越大，突出变化
              return range < 1 ? "15%" : range < 10 ? "10%" : "5%";
            },
            title: {
              display: true,
              text: function (context: any) {
                // 根据数据集类型动态调整Y轴标题
                if (
                  context.chart.data.datasets.some(
                    (dataset: any) =>
                      dataset.label === "下层成本值" ||
                      dataset.label.includes("成本")
                  )
                ) {
                  return "成本";
                } else if (
                  context.chart.data.datasets.some(
                    (dataset: any) => dataset.label === "上层目标值"
                  )
                ) {
                  return "目标值";
                } else if (
                  context.chart.data.datasets.some((dataset: any) =>
                    dataset.label.includes("流量")
                  )
                ) {
                  return "流量";
                } else if (
                  context.chart.data.datasets.some((dataset: any) =>
                    dataset.label.includes("压力")
                  )
                ) {
                  return "压力";
                } else {
                  return "数值";
                }
              },
              color: window
                .getComputedStyle(document.body)
                .getPropertyValue("--text-primary"),
              font: {
                size: 13,
                weight: "bold",
              },
              padding: 15,
            },
            ticks: {
              // 刻度标签显示合理的小数位
              callback: function (value: any) {
                // 自适应小数位：根据数据范围自动调整显示精度
                let decimalPlaces = 2;

                // 获取所有数据值
                if (config.data.datasets) {
                  const allValues = config.data.datasets.flatMap(
                    (dataset: any) => dataset.data
                  );
                  const minValue = Math.min(...allValues);
                  const maxValue = Math.max(...allValues);
                  const range = maxValue - minValue;

                  // 根据数据范围动态调整小数位数
                  if (range < 0.0001) {
                    decimalPlaces = 8;
                  } else if (range < 0.001) {
                    decimalPlaces = 6;
                  } else if (range < 0.01) {
                    decimalPlaces = 4;
                  } else if (range < 0.1) {
                    decimalPlaces = 3;
                  } else if (range < 1) {
                    decimalPlaces = 3;
                  } else if (range < 10) {
                    decimalPlaces = 2;
                  } else if (range < 100) {
                    decimalPlaces = 1;
                  }

                  // 特殊处理上层目标值和下层成本值，确保显示合适的小数位
                  const hasUpperObjective = config.data.datasets.some(
                    (dataset: any) =>
                      dataset.label === "数值" || dataset.label === "上层目标值"
                  );
                  const hasCostValue = config.data.datasets.some(
                    (dataset: any) =>
                      dataset.label === "下层成本值" || dataset.label === "成本"
                  );
                  if (hasUpperObjective) {
                    decimalPlaces = Math.max(decimalPlaces, 6);
                  } else if (hasCostValue) {
                    // 对于成本值，确保显示足够的小数位以体现变化
                    decimalPlaces = Math.max(decimalPlaces, 4);
                  }
                }

                return value.toFixed(decimalPlaces);
              },
              color: window
                .getComputedStyle(document.body)
                .getPropertyValue("--text-secondary"),
              font: {
                size: 11,
                weight: "500",
              },
              padding: 8,
              // 确保Y轴刻度数量合适，避免过于密集
              maxTicksLimit: 5,
              // 启用刻度交错，提高可读性
              autoSkipPadding: 15,
            },
            grid: {
              // 使用更精致的网格线样式
              color: function (context: any) {
                // 为不同的网格线设置不同的透明度，创建层次感
                return context.tick.value % 2 === 0
                  ? `${window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--border-secondary")}60`
                  : `${window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--border-secondary")}30`;
              },
              drawBorder: false,
              borderColor: window
                .getComputedStyle(document.body)
                .getPropertyValue("--border-primary"),
              tickLength: 15,
              // 轻微淡化网格线，突出折线
              opacity: 0.6,
              // 仅显示主要网格线，减少视觉干扰
              drawOnChartArea: true,
              drawTicks: true,
              // 添加网格线阴影效果
              borderDash: [],
              borderDashOffset: 0,
            },
          },
          x: {
            title: {
              display: true,
              text: "迭代次数",
              color: window
                .getComputedStyle(document.body)
                .getPropertyValue("--text-primary"),
              font: {
                size: 13,
                weight: "bold",
              },
              padding: 20,
            },
            ticks: {
              color: window
                .getComputedStyle(document.body)
                .getPropertyValue("--text-secondary"),
              font: {
                size: 11,
                weight: "500",
              },
              padding: 10,
              maxRotation: 45,
              minRotation: 0,
              // 确保X轴刻度数量合适，避免过于密集
              maxTicksLimit: 8,
            },
            grid: {
              color: window
                .getComputedStyle(document.body)
                .getPropertyValue("--border-secondary"),
              drawBorder: false,
              borderColor: window
                .getComputedStyle(document.body)
                .getPropertyValue("--border-primary"),
              tickLength: 12,
              drawTicks: true,
              // 隐藏X轴网格线，减少视觉干扰
              opacity: 0.3,
              drawOnChartArea: false,
            },
            // 修复右侧留白问题
            bounds: "data",
            min: undefined,
            max: undefined,
            padding: {
              left: 0,
              right: 0,
            },
          },
        },
        interaction: {
          mode: "nearest" as const,
          axis: "x" as const,
          intersect: false,
        },
        backgroundColor: "transparent",
        borderColor: "transparent",
        borderWidth: 0,
        animation: {
          duration: 2000,
          easing: "easeInOutElastic",
          delay: (context: any) => {
            // 添加序列动画效果，数据点按顺序入场
            return context.dataIndex * 50;
          },
          // 为不同元素设置不同的动画持续时间
          numbers: {
            duration: 1000,
            easing: "easeOutQuart",
          },
          // 启用动画填充模式
          fill: true,
        },
        // 添加更多动画配置
        transitions: {
          active: {
            animation: {
              duration: 600,
              easing: "easeInOutQuart",
            },
          },
          show: {
            animation: {
              duration: 1000,
              easing: "easeOutBounce",
            },
          },
          hide: {
            animation: {
              duration: 500,
              easing: "easeInBack",
            },
          },
        },
        hover: {
          mode: "index",
          intersect: false,
          animationDuration: 300,
          animationEasing: "easeOutQuad",
        },
      },
    };

    // 处理两种数据格式
    if (Array.isArray(data)) {
      // 处理ChartDataPoint[]格式
      if (data.length === 0) {
        return;
      }

      // 确定需要显示的实际值字段
      let actualField: string = "value";
      if ("output" in data[0]) {
        actualField = "output";
      } else if ("flow" in data[0]) {
        actualField = "flow";
      } else if ("pressure" in data[0]) {
        actualField = "pressure";
      }

      // 提取数据
      const labels = data.map((item) => item.name);
      const values = data.map((item) => Number(item[actualField]));

      // 过滤掉无效值
      const validValues = values.filter(
        (value) => !isNaN(value) && isFinite(value)
      );
      if (validValues.length === 0) {
        return;
      }

      // 设置数据集
      config.data = {
        labels: labels,
        datasets: [
          {
            label:
              actualField === "output"
                ? "实际值"
                : actualField === "pressure"
                ? "压力"
                : actualField === "flow"
                ? "流量"
                : actualField === "value" &&
                  labels.some((label) => label.includes("成本"))
                ? "下层成本值"
                : "数值",
            data: values,
            backgroundColor: (context: any) => {
              // 为不同图表类型和数据类型设置不同的背景色
              if (context.dataset.label === "上层目标值") {
                return chartType === "line"
                  ? `${
                      window
                        .getComputedStyle(document.body)
                        .getPropertyValue("--info-color") ||
                      window
                        .getComputedStyle(document.body)
                        .getPropertyValue("--accent-color")
                    }20`
                  : `${
                      window
                        .getComputedStyle(document.body)
                        .getPropertyValue("--info-color") ||
                      window
                        .getComputedStyle(document.body)
                        .getPropertyValue("--accent-color")
                    }60`;
              } else {
                return chartType === "line"
                  ? `${window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--accent-color")}20`
                  : `${window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--accent-color")}60`;
              }
            },
            tension: 0.4, // 减少平滑度，使折线变化更明显
            borderWidth: chartType === "line" ? 4 : 2, // 折线图边框更宽，柱状图边框适中
            pointBackgroundColor: (context: any) => {
              return context.dataset.label === "上层目标值"
                ? window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--info-color") ||
                    window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--accent-color")
                : window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--accent-color");
            },
            pointBorderColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--bg-primary"),
            pointBorderWidth: 2,
            pointRadius: chartType === "line" ? 6 : 0, // 折线图显示数据点，柱状图隐藏数据点
            pointHoverRadius: chartType === "line" ? 12 : 0, // 悬停时的点大小
            pointHoverBackgroundColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--bg-primary"),
            pointHoverBorderColor: (context: any) => {
              return context.dataset.label === "上层目标值"
                ? window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--info-color") ||
                    window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--accent-color")
                : window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--accent-color");
            },
            pointHoverBorderWidth: 4,
            pointHitRadius: chartType === "line" ? 20 : 0,
            pointHoverHitRadius: chartType === "line" ? 25 : 0,
            pointStyle: "circle",
            // 增加数据点的可见性，特别是对于小数值变动
            pointBorderAlign: "center",
            pointHoverBorderAlign: "center",
            // 添加数据点阴影效果
            pointShadowColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--text-primary"),
            pointShadowBlur: 10,
            pointShadowOffsetX: 0,
            pointShadowOffsetY: 3,
            // 为悬停状态添加更明显的阴影
            pointHoverShadowColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--accent-color"),
            pointHoverShadowBlur: 15,
            pointHoverShadowOffsetX: 0,
            pointHoverShadowOffsetY: 5,
            // 启用步进线，使数值变化更直观（仅适用于折线图）
            stepped: false, // 根据需要可设置为 'middle', 'after', 'before' 或 false
            // 启用填充，使折线图更具视觉层次感
            fill: chartType === "line" ? true : false,
            // 统一边框颜色
            borderColor: (context: any) => {
              // 为成本值添加颜色渐变，突出变化
              if (context.dataset.label === "下层成本值") {
                const dataIndex = context.dataIndex;
                const currentValue = context.dataset.data[dataIndex];
                const previousValue =
                  context.dataset.data[Math.max(0, dataIndex - 1)];

                // 获取数据集的最小值和最大值，用于计算相对位置
                const datasetValues = context.dataset.data;
                const minValue = Math.min(...datasetValues);
                const maxValue = Math.max(...datasetValues);
                const range = maxValue - minValue;

                // 如果是第一个点或值不变，使用基于数值大小的颜色
                if (dataIndex === 0 || currentValue === previousValue) {
                  // 根据数值在范围内的位置确定颜色，成本越高越红，越低越绿
                  if (range === 0) {
                    return window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--accent-color");
                  }
                  const normalizedValue = (currentValue - minValue) / range;
                  if (normalizedValue > 0.7) {
                    return window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--warning-color");
                  } else if (normalizedValue < 0.3) {
                    return window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--success-color");
                  } else {
                    return window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--accent-color");
                  }
                }

                // 颜色渐变：从绿色（下降）到红色（上升），并根据变化幅度调整透明度
                const change = Math.abs(currentValue - previousValue);
                const normalizedChange = range > 0 ? change / range : 0;
                const opacity = Math.min(1, 0.5 + normalizedChange * 0.5);

                return currentValue > previousValue
                  ? `${window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--warning-color")}${Math.round(
                      opacity * 255
                    )
                      .toString(16)
                      .padStart(2, "0")}`
                  : `${window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--success-color")}${Math.round(
                      opacity * 255
                    )
                      .toString(16)
                      .padStart(2, "0")}`;
              }
              // 攻击目标值使用不同的颜色方案
              else if (context.dataset.label === "上层目标值") {
                return (
                  window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--info-color") ||
                  window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--accent-color")
                );
              }
              // 统一使用accent-color作为边框色
              return window
                .getComputedStyle(document.body)
                .getPropertyValue("--accent-color");
            },
            hoverBackgroundColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--accent-color"),
            hoverBorderColor: window
              .getComputedStyle(document.body)
              .getPropertyValue("--bg-primary"),
            hoverBorderWidth: 2,
          },
        ],
      };

      // 添加基线（仅折线图）
      if (
        chartType === "line" &&
        baselineValue !== undefined &&
        baselineValue !== null
      ) {
        config.data.datasets.push({
          label: "基准线",
          data: Array(data.length).fill(baselineValue),
          borderColor: window
            .getComputedStyle(document.body)
            .getPropertyValue("--warning-color"),
          backgroundColor: "transparent",
          tension: 0,
          fill: false,
          borderDash: [8, 3], // 更密集的虚线，使基线更醒目
          borderWidth: 3, // 增加基线宽度
          borderDashOffset: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          animation: {
            duration: 2000,
            delay: 500, // 延迟基线动画，让主要数据先显示
          },
          // 确保基线始终在最底层
          order: -1,
          // 添加阴影效果，使基线更突出
          borderShadowColor: `${window
            .getComputedStyle(document.body)
            .getPropertyValue("--warning-color")}90`,
          borderShadowBlur: 6,
          borderShadowOffset: { width: 0, height: 3 },
          // 增加基线的z-index，确保在填充上方可见
          borderZ: 1,
        });
      }
    } else {
      // 处理ChartConfigData格式
      if (!data.labels || !data.datasets || data.labels.length === 0) {
        return;
      }

      // 直接使用传入的图表配置
      config.data = data;
    }

    // 创建新图表
    const ctx = chartRef.current.getContext("2d");
    if (ctx) {
      // 创建渐变填充效果
      if (config.data.datasets && config.data.datasets.length > 0) {
        config.data.datasets.forEach((dataset: any) => {
          // 为折线图创建渐变填充
          if (chartType === "line" && dataset.fill) {
            const gradient = ctx.createLinearGradient(
              0,
              0,
              0,
              chartRef.current!.height
            );

            // 根据数据集标签设置不同的渐变颜色
            if (dataset.label === "下层成本值") {
              gradient.addColorStop(
                0,
                `${window
                  .getComputedStyle(document.body)
                  .getPropertyValue("--accent-color")}30`
              );
              gradient.addColorStop(
                1,
                `${window
                  .getComputedStyle(document.body)
                  .getPropertyValue("--accent-color")}00`
              );
            } else if (dataset.label === "上层目标值") {
              const infoColor =
                window
                  .getComputedStyle(document.body)
                  .getPropertyValue("--info-color") ||
                window
                  .getComputedStyle(document.body)
                  .getPropertyValue("--accent-color");
              gradient.addColorStop(0, `${infoColor}30`);
              gradient.addColorStop(1, `${infoColor}00`);
            } else {
              gradient.addColorStop(
                0,
                `${window
                  .getComputedStyle(document.body)
                  .getPropertyValue("--accent-color")}30`
              );
              gradient.addColorStop(
                1,
                `${window
                  .getComputedStyle(document.body)
                  .getPropertyValue("--accent-color")}00`
              );
            }

            // 设置渐变填充
            dataset.backgroundColor = gradient;
          }

          // 为柱状图创建渐变填充和样式优化
          if (chartType === "bar") {
            // 为不同柱子设置不同颜色
            if (
              config.data.labels &&
              config.data.labels.length === 2 &&
              (config.data.labels.includes("基准成本") ||
                config.data.labels.includes("最终成本"))
            ) {
              // 成本对比柱状图特殊处理
              dataset.backgroundColor = (context: any) => {
                const index = context.dataIndex;
                const color =
                  index === 0
                    ? window
                        .getComputedStyle(document.body)
                        .getPropertyValue("--success-color") || "#4ade80" // 基准成本使用绿色
                    : window
                        .getComputedStyle(document.body)
                        .getPropertyValue("--warning-color") || "#fbbf24"; // 最终成本使用黄色

                // 创建渐变
                const gradient = ctx.createLinearGradient(
                  0,
                  0,
                  0,
                  chartRef.current!.height
                );
                gradient.addColorStop(0, `${color}90`);
                gradient.addColorStop(1, `${color}40`);
                return gradient;
              };

              // 为基准成本柱子添加绿色边框
              dataset.borderColor = (context: any) => {
                const index = context.dataIndex;
                return index === 0
                  ? window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--success-color") || "#4ade80"
                  : window
                      .getComputedStyle(document.body)
                      .getPropertyValue("--warning-color") || "#fbbf24";
              };
            } else {
              // 普通柱状图
              const gradient = ctx.createLinearGradient(
                0,
                0,
                0,
                chartRef.current!.height
              );

              // 根据数据集标签设置不同的渐变颜色
              if (dataset.label === "下层成本值") {
                gradient.addColorStop(
                  0,
                  `${window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--accent-color")}80`
                );
                gradient.addColorStop(
                  1,
                  `${window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--accent-color")}40`
                );
              } else if (dataset.label === "上层目标值") {
                const infoColor =
                  window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--info-color") ||
                  window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--accent-color");
                gradient.addColorStop(0, `${infoColor}80`);
                gradient.addColorStop(1, `${infoColor}40`);
              } else {
                gradient.addColorStop(
                  0,
                  `${window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--accent-color")}80`
                );
                gradient.addColorStop(
                  1,
                  `${window
                    .getComputedStyle(document.body)
                    .getPropertyValue("--accent-color")}40`
                );
              }

              // 设置渐变填充
              dataset.backgroundColor = gradient;
              dataset.borderColor =
                window
                  .getComputedStyle(document.body)
                  .getPropertyValue("--accent-color") || "#6366f1";
            }

            // 统一设置柱状图边框宽度
            dataset.borderWidth = 2;
          }
        });
      }

      // 优化柱状图配置
      if (chartType === "bar") {
        config.options.plugins = {
          ...config.options.plugins,
          // 添加数值标签
          datalabels: {
            display: true,
            anchor: "end",
            align: "top",
            color:
              window
                .getComputedStyle(document.body)
                .getPropertyValue("--text-primary") || "#1f2937",
            font: {
              weight: "bold",
              size: 12,
            },
            formatter: (value: any) => {
              return value.toFixed(2);
            },
            offset: 5,
          },
        };

        // 优化柱状图布局
        config.options.scales = {
          ...config.options.scales,
          x: {
            ...config.options.scales.x,
            // 调整柱子宽度和间距
            barPercentage: 0.6,
            categoryPercentage: 0.8,
          },
        };
      }

      chartInstanceRef.current = new Chart(ctx, config);
    }

    // 清理函数
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data, chartType, baselineValue]);

  return (
    <div className="chart-component" style={{ height: "100%" }}>
      <div className="chart-content" style={{ flex: 1 }}>
        {(() => {
          // 检查数据是否有效
          let hasValidData = false;
          if (Array.isArray(data)) {
            hasValidData = data.length > 0;
          } else {
            hasValidData = !!(
              data.labels &&
              data.datasets &&
              data.labels.length > 0
            );
          }
          return hasValidData;
        })() ? (
          <div
            style={{
              height: "100%",
              position: "relative",
              backgroundColor: "transparent",
            }}
          >
            <canvas
              ref={chartRef}
              style={{
                backgroundColor: "transparent",
                height: "100%",
                width: "100%",
              }}
            ></canvas>
          </div>
        ) : (
          <div className="chart-no-data">暂无数据</div>
        )}
      </div>
    </div>
  );
};

export default ChartComponent;
