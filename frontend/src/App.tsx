import React, { useState, useEffect } from "react";
import Sidebar from "./modules/shared/components/Sidebar";
import TopologyGraph from "./modules/topology/components/TopologyGraph";
import EnhancedToolPanel from "./modules/shared/components/EnhancedToolPanel";
import AttackSimulationResults from "./modules/attack-simulation/components/AttackSimulationResults";
import DefenseSimulationResults from "./modules/defense-simulation/components/DefenseSimulationResults";
import ChartComponent from "./modules/shared/components/ChartComponent";
import TabBar from "./modules/shared/components/TabBar";
import "./styles/variables.css";
import "./modules/topology/components/TopologyGraph.css";
import "./App.css";

// 定义迭代数据结构
interface IterationData {
  iteration: number;
  cost: number;
  efficiency: number;
  timestamp: string;
  details: {
    networkRouting: number;
    resourceAllocation: number;
    dataCompression: number;
    cacheStrategy: number;
    loadBalancing: number;
  };
}

// 定义系统状态数据结构
interface GeneratorOutput {
  id: string;
  name: string;
  output: number;
  unit: string;
  type: "electric" | "gas";
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
  type: "electric" | "gas";
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
  type: "electric" | "gas";
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
}

interface SystemStatusData {
  generatorOutput: GeneratorOutput[];
  flowDistribution: FlowDistribution[];
  nodeStatus: NodeStatus[];
  systemCost: SystemCost;
}

const App: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(
    null
  );
  const [originalOutput, setOriginalOutput] = useState<string | undefined>(
    undefined
  );
  const [rightPanelMode, setRightPanelMode] = useState<
    "system-status" | "attack-results" | "defense-results"
  >("system-status");

  const [attackSimulationResults, setAttackSimulationResults] =
    useState<any>(null);
  // 保存原始攻击模拟结果，用于防御关闭时恢复
  const [originalAttackResults, setOriginalAttackResults] = useState<any>(null);

  const [defenseSimulationResults, setDefenseSimulationResults] =
    useState<any>(null);
  // 防御状态管理
  const [isDefenseActive, setIsDefenseActive] = useState<boolean>(false);

  // 在组件挂载时自动获取系统状态数据
  useEffect(() => {
    fetchSystemStatus();
  }, []);

  // 柱状图拓展栏状态管理
  const [isChartPanelVisible, setIsChartPanelVisible] =
    useState<boolean>(false);
  const [chartDataMap, setChartDataMap] = useState<Record<string, any>>({}); // 支持多种图表数据，使用Map存储
  const [chartType, setChartType] = useState<"bar">("bar");
  const [activeChartTab, setActiveChartTab] = useState<string>(""); // 当前激活的图表标签
  const [chartTabs, setChartTabs] = useState<
    Array<{ id: string; label: string; isClosable: boolean }>
  >([]); // 动态标签列表

  // 处理显示柱状图
  const handleShowChart = (data: any, type: "bar" = "bar", source?: string) => {
    setChartType(type);
    setIsChartPanelVisible(true);

    // 根据调用来源添加不同类型的标签
    if (source === "optimization" || source === "system-status") {
      // 检查是否已经存在系统优化标签
      const existingOptimizationTab = chartTabs.find(
        (tab) => tab.label === "系统优化"
      );

      // 准备图表数据 - 保持原来的数据结构不变
      let chartData: any;

      if (source === "optimization") {
        // 系统优化结果数据 - 保持原来的数据结构
        chartData = {
          labels: ["优化结果"],
          datasets: [
            {
              label: "系统总成本",
              data: [data.cost || 0],
              backgroundColor: "rgba(75, 192, 192, 0.6)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        };
      } else {
        // 系统状态监控数据 - 直接使用原始数据结构
        // ChartComponent组件已经支持处理这种数据格式
        chartData = data;
      }

      if (existingOptimizationTab) {
        // 如果已经存在系统优化标签，直接更新该标签的图表数据
        setChartDataMap((prev) => ({
          ...prev,
          [existingOptimizationTab.id]: chartData,
        }));
        setActiveChartTab(existingOptimizationTab.id);
      } else {
        // 如果不存在，创建一个新的系统优化标签
        const optimizationTabId = `optimization-${Date.now()}`;

        // 更新图表数据映射
        setChartDataMap((prev) => ({
          ...prev,
          [optimizationTabId]: chartData,
        }));

        // 添加标签到标签列表
        setChartTabs((prev) => [
          ...prev,
          {
            id: optimizationTabId,
            label: "系统优化",
            isClosable: true,
          },
        ]);

        // 设置当前激活的标签
        setActiveChartTab(optimizationTabId);
      }
    } else {
      // 鲁棒性分析标签：系统总成本和攻击目标值

      // 检查是否已经存在系统总成本和攻击目标值标签
      const existingTotalCostTab = chartTabs.find(
        (tab) => tab.label === "系统总成本"
      );
      const existingAttackTargetTab = chartTabs.find(
        (tab) => tab.label === "攻击目标值"
      );

      // 确保数据集中至少有两个数据集
      const hasTwoDatasets = data.datasets && data.datasets.length >= 2;

      // 系统总成本数据 - 使用第一个数据集
      const totalCostData = {
        labels: data.labels,
        datasets: [
          {
            label: "系统总成本",
            data: data.datasets[0].data,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      };

      // 攻击目标值数据 - 使用第二个数据集（真实数据）
      const attackTargetData = {
        labels: data.labels,
        datasets: [
          {
            label: "攻击目标值",
            data: hasTwoDatasets ? data.datasets[1].data : [], // 使用真实的攻击目标值数据
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      };

      // 更新或创建标签页数据
      const newChartDataMap = { ...chartDataMap };
      const newChartTabs = [...chartTabs];
      let hasNewTabs = false;

      // 处理系统总成本标签
      let totalCostTabId =
        existingTotalCostTab?.id || `total-cost-${Date.now()}`;
      newChartDataMap[totalCostTabId] = totalCostData;
      if (!existingTotalCostTab) {
        newChartTabs.push({
          id: totalCostTabId,
          label: "系统总成本",
          isClosable: true,
        });
        hasNewTabs = true;
      }

      // 处理攻击目标值标签
      let attackTargetTabId =
        existingAttackTargetTab?.id || `attack-target-${Date.now()}`;
      newChartDataMap[attackTargetTabId] = attackTargetData;
      if (!existingAttackTargetTab) {
        newChartTabs.push({
          id: attackTargetTabId,
          label: "攻击目标值",
          isClosable: true,
        });
        hasNewTabs = true;
      }

      // 更新图表数据映射
      setChartDataMap(newChartDataMap);

      // 更新标签页列表如果有新标签添加
      if (hasNewTabs) {
        setChartTabs(newChartTabs);
      }

      // 设置当前激活的标签
      setActiveChartTab(
        existingTotalCostTab ? existingTotalCostTab.id : totalCostTabId
      );
      setIsChartPanelVisible(true);
    }
  };

  // 动态调整拓展栏位置，确保与右侧栏左边界完全贴合
  useEffect(() => {
    const updateChartPanelPosition = () => {
      const sidebarWrapper = document.querySelector(
        ".sidebar-wrapper"
      ) as HTMLElement;
      const chartPanel = document.querySelector(
        ".chart-extension-panel"
      ) as HTMLElement;
      const extensionToggle = document.querySelector(
        ".extension-panel-toggle"
      ) as HTMLElement;

      if (sidebarWrapper) {
        const sidebarRect = sidebarWrapper.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const sidebarLeft = sidebarRect.left;

        // 设置拓展栏的位置，使其右边界与右侧栏左边界完全贴合
        if (chartPanel) {
          chartPanel.style.right = `${windowWidth - sidebarLeft}px`;
        }

        // 设置拓展栏缩放按键的位置，使其右侧与右侧栏左边界精确相切
        if (extensionToggle) {
          extensionToggle.style.right = `${windowWidth - sidebarLeft}px`;
        }
      }
    };

    // 初始加载时更新位置
    updateChartPanelPosition();

    // 窗口大小改变时更新位置
    window.addEventListener("resize", updateChartPanelPosition);

    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener("resize", updateChartPanelPosition);
    };
  }, [isChartPanelVisible]);

  // 获取系统状态数据
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/system-status");
      if (response.ok) {
        const statusData = await response.json();
        setSystemStatus(statusData);
      }
    } catch (error) {
      console.error("获取系统状态数据时出错:", error);
    }
  };

  // 当数据导入成功时的回调函数
  const handleDataImported = async () => {
    // 增加refreshTrigger的值来触发拓扑图组件重新获取数据
    setRefreshTrigger((prev) => prev + 1);

    // 移除了迭代数据的获取，因为不再需要

    // 获取系统状态数据
    fetchSystemStatus();
  };

  // 重置整个网站状态的函数
  const resetWebsiteState = () => {
    // 增加refreshTrigger的值来触发拓扑图组件重新获取数据
    setRefreshTrigger((prev) => prev + 1);
    setSystemStatus(null);
    setOriginalOutput(undefined);
    setAttackSimulationResults(null);
    setDefenseSimulationResults(null);
    setRightPanelMode("system-status");
    setChartDataMap({});
    setChartTabs([]);
    setActiveChartTab("");
    setIsChartPanelVisible(false);

    // 重新获取系统状态数据
    fetchSystemStatus();
  };

  // 接收优化迭代数据的函数
  const handleOptimizationData = (
    iterations: IterationData[],
    current: number,
    systemStatusFromPanel?: SystemStatusData,
    originalOutputFromPanel?: string
  ) => {
    console.log("Received optimization data:", {
      iterations,
      current,
      systemStatusFromPanel,
      originalOutputFromPanel,
    });

    // 先更新所有数据，再跳转页面
    // 始终更新系统状态，确保成本和状态正确显示
    if (systemStatusFromPanel) {
      setSystemStatus(systemStatusFromPanel);
    }

    // 保存原始输出，用于解析额外数据
    if (originalOutputFromPanel) {
      setOriginalOutput(originalOutputFromPanel);
    }

    // 调用handleShowChart函数，添加系统优化标签
    if (iterations && iterations.length > 0) {
      handleShowChart(iterations[iterations.length - 1], "bar", "optimization");
    }

    // 最后跳转到系统状态监控页面
    setRightPanelMode("system-status");
  };

  // 处理攻击模拟结果
  const handleAttackSimulationResults = (results: any) => {
    // 总是保存最新的攻击结果到原始攻击结果中
    setOriginalAttackResults(results);

    // 检查是否在防御模式下
    if (isDefenseActive) {
      // 在防御模式下，生成防御状态下的攻击数据
      const defenseAttackData = {
        ...results,
        // 总成本等于基准成本（攻击被防御）
        cost: results.baseline_cost || 98615.61,
        attack_cost: results.baseline_cost || 98615.61,
        // 攻击目标值为0
        attack_objective: 0.0,
        upper_objective: results.upper_objective?.map(() => 0) || [],
        lower_cost:
          results.lower_cost?.map(() => results.baseline_cost || 98615.61) ||
          [],
        // 攻击节点数为0
        attacked_nodes: [],
        // 最佳策略中的攻击节点为空
        best_strategy: {
          ...results.best_strategy,
          electric_attack_nodes: [],
          gas_attack_nodes: [],
          electric_attack_intensity: {},
          gas_attack_intensity: {},
        },
        // 系统损伤为0
        damage: 0.0,
        // 成本增加为0
        cost_increase: 0.0,
        cost_increase_percent: 0.0,
      };

      // 更新攻击模拟结果状态，触发标签栏生成
      setAttackSimulationResults(defenseAttackData);
      // 如果当前不在攻击结果页面，切换到攻击结果页面
      if (rightPanelMode !== "attack-results") {
        setRightPanelMode("attack-results");
      }

      console.log("防御模式下运行攻击模拟，生成防御状态下的攻击数据并显示");
    } else {
      // 非防御模式下，直接显示攻击结果
      setAttackSimulationResults(results);
      setRightPanelMode("attack-results");
    }
  };

  // 关闭攻击模拟结果
  const handleCloseAttackResults = () => {
    setAttackSimulationResults(null);
    setOriginalAttackResults(null);
    setRightPanelMode("system-status");

    // 触发清空攻击节点事件，通知TopologyGraph组件清空被攻击节点
    const clearAttackedNodesEvent = new CustomEvent("clearAttackedNodes", {
      detail: {
        action: "clear_attacked_nodes",
      },
    });
    window.dispatchEvent(clearAttackedNodesEvent);
  };

  // 处理防御模拟结果
  const handleDefenseSimulationResults = (results: any) => {
    setDefenseSimulationResults(results);
    setRightPanelMode("defense-results");
  };

  // 关闭防御模拟结果
  const handleCloseDefenseResults = () => {
    console.log("关闭防御模拟标签，触发防御关闭");
    // 触发取消防御事件，关闭防御
    const cancelDefenseEvent = new CustomEvent("cancelDefense", {
      detail: {
        action: "close_defense",
      },
    });
    window.dispatchEvent(cancelDefenseEvent);
  };

  // 切换左侧隐藏栏的显示状态
  const toggleLeftPanel = () => {
    setIsLeftPanelVisible(!isLeftPanelVisible);
  };

  // 切换拓展栏管理面板的显示状态
  const toggleExtensionPanel = () => {
    setIsChartPanelVisible(!isChartPanelVisible);
  };

  // 防御状态下的攻击数据生成函数
  const generateDefenseAttackData = () => {
    if (!originalAttackResults) return null;

    // 从原始攻击结果中获取基准成本
    const baselineCost = originalAttackResults.baseline_cost || 98615.61;

    // 生成防御状态下的攻击数据
    return {
      ...originalAttackResults,
      // 总成本等于基准成本（攻击被防御）
      cost: baselineCost,
      attack_cost: baselineCost,
      // 攻击目标值为0
      attack_objective: 0.0,
      upper_objective:
        originalAttackResults.upper_objective?.map(() => 0) || [],
      lower_cost:
        originalAttackResults.lower_cost?.map(() => baselineCost) || [],
      // 攻击节点数为0
      attacked_nodes: [],
      // 最佳策略中的攻击节点为空
      best_strategy: {
        ...originalAttackResults.best_strategy,
        electric_attack_nodes: [],
        gas_attack_nodes: [],
        electric_attack_intensity: {},
        gas_attack_intensity: {},
      },
      // 系统损伤为0
      damage: 0.0,
      // 成本增加为0
      cost_increase: 0.0,
      cost_increase_percent: 0.0,
    };
  };

  // 防御状态变化处理
  useEffect(() => {
    // 监听防御开启事件
    const handleDefenseStarted = () => {
      console.log("防御开启，生成防御状态下的攻击数据");
      // 设置防御状态为活动
      setIsDefenseActive(true);
      // 生成防御状态下的攻击数据
      const defenseAttackData = generateDefenseAttackData();
      if (defenseAttackData) {
        setAttackSimulationResults(defenseAttackData);
        // 保持在当前页面，不切换
      }
    };

    // 监听防御关闭事件
    const handleDefenseCanceled = () => {
      console.log("防御关闭，恢复原始攻击结果");
      // 设置防御状态为非活动
      setIsDefenseActive(false);
      // 清除防御模拟结果状态，移除防御结果标签页
      setDefenseSimulationResults(null);
      // 恢复原始攻击结果
      if (originalAttackResults) {
        setAttackSimulationResults(originalAttackResults);
        setRightPanelMode("attack-results");
      } else {
        setRightPanelMode("system-status");
      }
    };

    // 添加事件监听器
    window.addEventListener("protectedNodes", handleDefenseStarted);
    window.addEventListener("cancelDefense", handleDefenseCanceled);

    // 清理函数
    return () => {
      window.removeEventListener("protectedNodes", handleDefenseStarted);
      window.removeEventListener("cancelDefense", handleDefenseCanceled);
    };
  }, [originalAttackResults]);

  return (
    <div className="app-container">
      {/* 顶部栏 */}
      <header className="top-header">
        <div className="header-content">
          <h1 className="header-title">能源防御与攻击平台</h1>
          <div className="header-actions">
            <button className="header-btn">系统设置</button>
            <button className="header-btn">用户中心</button>
          </div>
        </div>
      </header>

      {/* 主体内容区域 */}
      <div className="main-body">
        {/* 拓展栏管理按钮 - 位于左侧栏左侧空白处 */}
        <button
          className={`extension-panel-toggle ${
            isChartPanelVisible ? "active" : ""
          }`}
          onClick={toggleExtensionPanel}
          aria-label={isChartPanelVisible ? "隐藏拓展栏" : "显示拓展栏"}
        >
          📊
        </button>

        {/* 左侧切换按钮 */}
        <button
          className={`left-panel-toggle ${isLeftPanelVisible ? "active" : ""}`}
          onClick={toggleLeftPanel}
          aria-label={isLeftPanelVisible ? "隐藏左侧面板" : "显示左侧面板"}
        >
          {isLeftPanelVisible ? "◀" : "▶"}
        </button>

        {/* 左侧隐藏栏 */}
        <div
          className={`left-hidden-panel ${isLeftPanelVisible ? "open" : ""}`}
        >
          <EnhancedToolPanel
            onDataImported={handleDataImported}
            onOptimizationData={handleOptimizationData}
            onAttackSimulationResults={handleAttackSimulationResults}
            onDefenseSimulationResults={handleDefenseSimulationResults}
            onShowChart={handleShowChart}
            originalAttackResults={originalAttackResults}
          />
        </div>

        {/* 主内容区域 */}
        <main className="main-content">
          <div className="content-wrapper">
            {/*<h2>能源网络拓扑可视化</h2>*/}
            {/* 拓扑图组件 */}
            <TopologyGraph key={refreshTrigger} />
          </div>
        </main>

        {/* 柱状图拓展栏 */}
        <div
          className={`chart-extension-panel ${
            isChartPanelVisible ? "open" : ""
          }`}
        >
          <div className="chart-panel-header">
            <h3>数据可视化</h3>
          </div>
          <div className="chart-panel-content">
            {chartTabs.length > 0 && activeChartTab !== "" && (
              <div className="chart-container">
                {/* 添加标签栏 */}
                <TabBar
                  tabs={chartTabs.map((tab) => ({
                    id: tab.id,
                    label: tab.label,
                    isActive: activeChartTab === tab.id,
                    isClosable: tab.isClosable,
                  }))}
                  onTabChange={(tabId) => setActiveChartTab(tabId)}
                  onTabClose={(tabId) => {
                    // 删除标签
                    setChartTabs((prev) =>
                      prev.filter((tab) => tab.id !== tabId)
                    );
                    // 删除对应的图表数据
                    setChartDataMap((prev) => {
                      const newDataMap = { ...prev };
                      delete newDataMap[tabId];
                      return newDataMap;
                    });
                    // 如果删除的是当前激活的标签，切换到其他标签或关闭拓展栏
                    if (activeChartTab === tabId) {
                      const remainingTabs = chartTabs.filter(
                        (tab) => tab.id !== tabId
                      );
                      if (remainingTabs.length > 0) {
                        setActiveChartTab(remainingTabs[0].id);
                      } else {
                        setIsChartPanelVisible(false);
                        setActiveChartTab("");
                      }
                    }
                  }}
                />
                {/* 根据当前激活的标签显示对应的图表 */}
                <ChartComponent
                  data={
                    chartDataMap[activeChartTab] || {
                      labels: [],
                      datasets: [],
                    }
                  }
                  chartType={chartType}
                />
              </div>
            )}
          </div>
        </div>

        {/* 右侧栏组件 */}
        <div
          className={`sidebar-wrapper ${
            isChartPanelVisible ? "with-chart-panel" : ""
          }`}
        >
          {/* 右侧栏顶部切换按钮 - 使用新的TabBar组件 */}
          <TabBar
            tabs={[
              {
                id: "system-status",
                label: "系统状态监控",
                isActive: rightPanelMode === "system-status",
                isClosable: false,
              },
              ...(attackSimulationResults
                ? [
                    {
                      id: "attack-results",
                      label: "攻击模拟结果",
                      isActive: rightPanelMode === "attack-results",
                      isClosable: true,
                    },
                  ]
                : []),
              ...(defenseSimulationResults
                ? [
                    {
                      id: "defense-results",
                      label: "防御模拟结果",
                      isActive: rightPanelMode === "defense-results",
                      isClosable: true,
                    },
                  ]
                : []),
            ]}
            onTabChange={(tabId) => {
              if (
                tabId === "system-status" ||
                tabId === "attack-results" ||
                tabId === "defense-results"
              ) {
                setRightPanelMode(
                  tabId as
                    | "system-status"
                    | "attack-results"
                    | "defense-results"
                );
              }
            }}
            onTabClose={(tabId) => {
              if (tabId === "attack-results") {
                handleCloseAttackResults();
              } else if (tabId === "defense-results") {
                handleCloseDefenseResults();
              }
            }}
          />

          {/* 根据模式显示不同面板 */}
          {rightPanelMode === "system-status" && (
            <Sidebar
              onDataImported={resetWebsiteState}
              systemStatus={systemStatus}
              originalOutput={originalOutput}
              onShowChart={handleShowChart}
            />
          )}
          {rightPanelMode === "attack-results" && (
            <AttackSimulationResults
              results={attackSimulationResults}
              onShowChart={handleShowChart}
            />
          )}
          {rightPanelMode === "defense-results" && (
            <DefenseSimulationResults
              results={defenseSimulationResults}
              onShowChart={handleShowChart}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
