// test_updater.js - 测试优化更新模块
// 这个脚本用于在Node.js环境中测试优化API调用功能

const fetch = require("node-fetch");

// 模拟浏览器环境中的DOM操作
class MockDOM {
  constructor() {
    this.elements = new Map();
  }

  querySelector(selector) {
    return this.elements.get(selector) || null;
  }

  addEventListener(event, callback) {
    // 模拟事件监听
  }

  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      innerHTML: "",
      style: {},
      className: "",
      textContent: "",
      appendChild: () => {},
      remove: () => {},
    };
  }

  appendChild(element) {
    // 模拟添加子元素
  }
}

// 设置全局变量
global.document = new MockDOM();
global.window = { OptimizationUpdater: null };
global.fetch = fetch;

// 测试API调用函数
async function testAPICall() {
  console.log("测试优化API调用...");

  try {
    const response = await fetch("http://localhost:5000/api/run-optimization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        constraints: {
          electric: [],
          gas: [],
          optimizationCode: 3,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP错误! 状态码: ${response.status}`);
    }

    const data = await response.json();

    console.log("API调用成功!");
    console.log("响应状态:", data.executionStatus);
    console.log("总成本:", data.totalCost);
    console.log("电力成本:", data.electricCost);
    console.log("天然气成本:", data.gasCost);

    if (data.systemStatus) {
      console.log("\n系统状态数据:");
      console.log("- 发电机数量:", data.systemStatus.generatorOutput.length);
      console.log("- 流量分布数量:", data.systemStatus.flowDistribution.length);
      console.log("- 节点状态数量:", data.systemStatus.nodeStatus.length);
    }

    return data;
  } catch (error) {
    console.error("API调用失败:", error.message);
    return null;
  }
}

// 运行测试
testAPICall()
  .then((data) => {
    if (data) {
      console.log("\n✅ 测试通过! 优化API调用正常工作。");
    } else {
      console.log("\n❌ 测试失败! 优化API调用出现问题。");
    }
  })
  .catch((error) => {
    console.error("测试过程中出现错误:", error);
  });
