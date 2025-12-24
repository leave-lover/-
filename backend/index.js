const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 5000;

// 配置CORS，允许所有来源的请求
app.use(
  cors({
    origin: "*", // 允许所有来源访问
    credentials: true,
  })
);

// 解析JSON请求体
app.use(express.json());

// 读取初始数据的辅助函数
const readInitialData = () => {
  try {
    // 返回完整的初始数据结构，以便前端能够正确显示优化结果
    return {
      generatorOutput: [
        {
          id: "gen1",
          name: "发电机1",
          output: 0,
          unit: "MW",
          type: "electric",
          details: {
            connected_bus: 30,
            pmax: 1040,
            pmin: 100,
            status: "运行中",
          },
        },
        {
          id: "gen2",
          name: "发电机2",
          output: 0,
          unit: "MW",
          type: "electric",
          details: { connected_bus: 31, pmax: 646, pmin: 50, status: "运行中" },
        },
        {
          id: "gen3",
          name: "发电机3",
          output: 0,
          unit: "MW",
          type: "electric",
          details: { connected_bus: 32, pmax: 725, pmin: 70, status: "运行中" },
        },
        {
          id: "gen4",
          name: "发电机4",
          output: 0,
          unit: "MW",
          type: "gas",
          details: { connected_bus: 33, pmax: 652, pmin: 60, status: "运行中" },
        },
        {
          id: "gen5",
          name: "发电机5",
          output: 0,
          unit: "MW",
          type: "electric",
          details: { connected_bus: 34, pmax: 508, pmin: 50, status: "运行中" },
        },
        {
          id: "gen6",
          name: "发电机6",
          output: 0,
          unit: "MW",
          type: "electric",
          details: { connected_bus: 35, pmax: 687, pmin: 60, status: "运行中" },
        },
        {
          id: "gen7",
          name: "发电机7",
          output: 0,
          unit: "MW",
          type: "electric",
          details: { connected_bus: 36, pmax: 580, pmin: 50, status: "运行中" },
        },
        {
          id: "gen8",
          name: "发电机8",
          output: 0,
          unit: "MW",
          type: "gas",
          details: { connected_bus: 37, pmax: 564, pmin: 50, status: "运行中" },
        },
        {
          id: "gen9",
          name: "发电机9",
          output: 0,
          unit: "MW",
          type: "electric",
          details: { connected_bus: 38, pmax: 865, pmin: 80, status: "运行中" },
        },
        {
          id: "gen10",
          name: "发电机10",
          output: 0,
          unit: "MW",
          type: "electric",
          details: {
            connected_bus: 39,
            pmax: 1100,
            pmin: 110,
            status: "运行中",
          },
        },
      ],
      flowDistribution: [
        {
          id: "line1",
          name: "线路1-2",
          flow: 0,
          unit: "MW",
          type: "electric",
          details: {
            source: "节点1",
            target: "节点2",
            capacity: 600,
            status: "运行中",
          },
        },
        {
          id: "line2",
          name: "线路1-39",
          flow: 0,
          unit: "MW",
          type: "electric",
          details: {
            source: "节点1",
            target: "节点39",
            capacity: 1000,
            status: "运行中",
          },
        },
        {
          id: "line3",
          name: "线路2-3",
          flow: 0,
          unit: "MW",
          type: "electric",
          details: {
            source: "节点2",
            target: "节点3",
            capacity: 500,
            status: "运行中",
          },
        },
        {
          id: "gasline1",
          name: "燃气管道1-2",
          flow: 0,
          unit: "m³/s",
          type: "gas",
          details: {
            source: "燃气节点1",
            target: "燃气节点2",
            capacity: 10,
            status: "运行中",
          },
        },
        {
          id: "gasline2",
          name: "燃气管道2-3",
          flow: 0,
          unit: "m³/s",
          type: "gas",
          details: {
            source: "燃气节点2",
            target: "燃气节点3",
            capacity: 10,
            status: "运行中",
          },
        },
        {
          id: "gasline3",
          name: "燃气管道3-4",
          flow: 0,
          unit: "m³/s",
          type: "gas",
          details: {
            source: "燃气节点3",
            target: "燃气节点4",
            capacity: 10,
            status: "运行中",
          },
        },
      ],
      nodeStatus: [
        {
          id: "bus1",
          name: "节点1",
          value: 1.0,
          unit: "p.u.",
          type: "electric",
          details: { bus_type: 1, pd: 97.6, qd: 44.2, status: "运行中" },
        },
        {
          id: "bus2",
          name: "节点2",
          value: 1.0,
          unit: "p.u.",
          type: "electric",
          details: { bus_type: 1, pd: 0, qd: 0, status: "运行中" },
        },
        {
          id: "bus3",
          name: "节点3",
          value: 1.0,
          unit: "p.u.",
          type: "electric",
          details: { bus_type: 1, pd: 322, qd: 2.4, status: "运行中" },
        },
        {
          id: "gasnode1",
          name: "燃气节点1",
          value: 30.0,
          unit: "bar",
          type: "gas",
          details: {
            pressure_max: 35.0,
            pressure_min: 25.0,
            load: 0,
            status: "运行中",
          },
        },
        {
          id: "gasnode2",
          name: "燃气节点2",
          value: 30.0,
          unit: "bar",
          type: "gas",
          details: {
            pressure_max: 35.0,
            pressure_min: 25.0,
            load: 0,
            status: "运行中",
          },
        },
        {
          id: "gasnode3",
          name: "燃气节点3",
          value: 30.0,
          unit: "bar",
          type: "gas",
          details: {
            pressure_max: 35.0,
            pressure_min: 25.0,
            load: 30,
            status: "运行中",
          },
        },
      ],
      systemCost: {
        generationCost: 0,
        transmissionCost: 0,
        totalCost: 0,
        unit: "元",
      },
    };
  } catch (error) {
    console.error("读取初始数据失败:", error);
    return {
      generatorOutput: [],
      flowDistribution: [],
      nodeStatus: [],
      systemCost: {
        generationCost: 0,
        transmissionCost: 0,
        totalCost: 0,
        unit: "元",
      },
    };
  }
};

// API端点：获取系统状态
app.get("/api/system-status", (req, res) => {
  // 先读取前端的初始数据作为基础
  const initialData = readInitialData();

  if (initialData) {
    res.json(initialData);
  } else {
    res.status(500).json({ error: "无法获取系统状态数据" });
  }
});

// API端点：运行优化
app.post("/api/run-optimization", (req, res) => {
  const { constraints } = req.body;

  // 优化类型编码：1代表单独电力优化，2代表单独燃气优化，3代表耦合优化，0代表没有优化
  // 前端返回的优化类型编码，用于后续功能对应
  const optimizationCode = constraints.optimizationCode || 0;

  console.log("接收到优化请求，约束条件:", constraints);
  console.log("优化类型编码(optimizationCode):", optimizationCode); // 标注：这是前端返回的优化类型编码

  // 根据优化类型编码选择Python脚本
  let pythonScriptPath;
  switch (optimizationCode) {
    case 1: // 单独电力优化
      pythonScriptPath = path.join(__dirname, "../only_elec.py");
      break;
    case 2: // 单独燃气优化
      pythonScriptPath = path.join(__dirname, "../only_gas.py");
      break;
    case 3: // 耦合优化
      pythonScriptPath = path.join(
        __dirname,
        "../elec_gas_optimization_pulp.py"
      );
      break;
    default: // 默认情况，使用耦合优化脚本
      pythonScriptPath = path.join(
        __dirname,
        "../elec_gas_optimization_pulp.py"
      );
      break;
  }

  const pythonPath =
    "C:\\Users\\Lenovo\\.conda\\envs\\energy_defense\\python.exe";

  try {
    // 使用child_process.spawn执行Python脚本
    const { spawn } = require("child_process");

    // 使用conda run命令来执行Python脚本，确保conda环境被正确激活
    const condaPath = "D:\\anaconda\\Scripts\\conda.exe";
    const condaArgs = [
      "run",
      "-n",
      "energy_defense",
      "python",
      pythonScriptPath,
      optimizationCode,
    ];

    console.log(`执行Python脚本: ${condaPath} ${condaArgs.join(" ")}`);

    // 执行Python脚本，设置超时机制
    const pythonProcess = spawn(condaPath, condaArgs, {
      cwd: path.dirname(pythonScriptPath),
      env: process.env,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timeoutId = null;

    // 设置5分钟超时
    const timeoutMs = 5 * 60 * 1000;
    timeoutId = setTimeout(() => {
      console.error(`Python脚本执行超时，已超过${timeoutMs}毫秒`);
      pythonProcess.kill();
    }, timeoutMs);

    // 收集标准输出
    pythonProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`Python脚本输出: ${output.trim()}`);
    });

    // 收集标准错误
    pythonProcess.stderr.on("data", (data) => {
      const errorOutput = data.toString();
      stderr += errorOutput;
      console.error(`Python脚本错误: ${errorOutput.trim()}`);
    });

    // 处理进程结束
    pythonProcess.on("close", (code, signal) => {
      // 清除超时
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      console.log(`Python脚本执行结束，退出代码: ${code}, 信号: ${signal}`);

      // 读取初始数据作为基础
      const initialData = readInitialData();

      // 生成默认的优化结果
      let totalCost = 0;
      let generatorOutput = [];
      let gasFlow = [];

      // 如果脚本执行成功，尝试解析输出
      if (code === 0) {
        console.log("Python脚本执行成功，开始解析输出...");

        // 根据优化类型编码选择不同的解析逻辑
        switch (optimizationCode) {
          case 1: // 电力优化脚本 (only_elec.py)
            console.log("使用电力优化脚本解析逻辑...");

            // 提取电力成本或总成本
            const elecCostMatch = stdout.match(/(电力成本|总成本): ([\d.]+)/);
            if (elecCostMatch) {
              totalCost = parseFloat(elecCostMatch[2]);
              console.log("提取到电力成本:", totalCost);
            }

            // 提取发电机功率
            const elecGenSection = stdout.match(
              /发电机功率 \(MW\):([\s\S]*?)\n\n/
            );
            if (elecGenSection) {
              const elecGenLines = elecGenSection[1]
                .split("\n")
                .filter((line) => line.trim());
              console.log("电力优化脚本 - 提取到发电机功率行:", elecGenLines);

              const elecGenOutput = elecGenLines
                .map((line) => {
                  const match = line.match(/发电机 (\d+):\s*([\d.]+)\s*MW/);
                  return match
                    ? {
                        id: `gen${match[1]}`,
                        output: parseFloat(match[2]),
                        name: `发电机${match[1]}`,
                      }
                    : null;
                })
                .filter(Boolean);

              if (elecGenOutput.length > 0) {
                generatorOutput = elecGenOutput;
                console.log(
                  "电力优化脚本 - 解析后的发电机功率:",
                  generatorOutput
                );
              }
            }

            break;

          case 2: // 燃气优化脚本 (only_gas.py)
            console.log("使用燃气优化脚本解析逻辑...");

            // 提取天然气成本
            const gasCostMatch = stdout.match(/天然气成本: ([\d.]+)/);
            if (gasCostMatch) {
              totalCost = parseFloat(gasCostMatch[1]);
              console.log("提取到天然气成本:", totalCost);
            }

            // 提取天然气管道流量
            const gasFlowSection = stdout.match(/管道流量:([\s\S]*?)\n\n/);
            if (gasFlowSection) {
              const gasFlowLines = gasFlowSection[1]
                .split("\n")
                .filter((line) => line.trim());
              console.log("燃气优化脚本 - 提取到管道流量行:", gasFlowLines);

              const gasFlowOutput = gasFlowLines
                .map((line) => {
                  const match = line.match(/管道 (\d+):\s*([\d.-]+)/);
                  return match
                    ? {
                        id: `gasline${match[1]}`,
                        flow: parseFloat(match[2]),
                        name: `管道${match[1]}`,
                      }
                    : null;
                })
                .filter(Boolean);

              if (gasFlowOutput.length > 0) {
                gasFlow = gasFlowOutput;
                console.log("燃气优化脚本 - 解析后的管道流量:", gasFlow);
              }
            }

            break;

          case 3: // 耦合优化脚本 (elec_gas_optimization_pulp.py)
          default: // 默认情况，使用耦合优化脚本解析逻辑
            console.log("使用耦合优化脚本解析逻辑...");

            // 提取总成本
            const totalCostMatch = stdout.match(/总成本: ([\d.]+)/);
            if (totalCostMatch) {
              totalCost = parseFloat(totalCostMatch[1]);
              console.log("提取到总成本:", totalCost);
            }

            // 提取发电机功率
            const coupGenSection = stdout.match(
              /发电机功率 \(MW\):([\s\S]*?)\n\n/
            );
            if (coupGenSection) {
              const coupGenLines = coupGenSection[1]
                .split("\n")
                .filter((line) => line.trim());
              console.log("耦合优化脚本 - 提取到发电机功率行:", coupGenLines);

              const coupGenOutput = coupGenLines
                .map((line) => {
                  const match = line.match(/发电机 (\d+):\s*([\d.]+)\s*MW/);
                  return match
                    ? {
                        id: `gen${match[1]}`,
                        output: parseFloat(match[2]),
                        name: `发电机${match[1]}`,
                      }
                    : null;
                })
                .filter(Boolean);

              if (coupGenOutput.length > 0) {
                generatorOutput = coupGenOutput;
                console.log(
                  "耦合优化脚本 - 解析后的发电机功率:",
                  generatorOutput
                );
              }
            }

            // 提取天然气管道流量
            const coupFlowSection = stdout.match(/管道流量:([\s\S]*?)\n\n/);
            if (coupFlowSection) {
              const coupFlowLines = coupFlowSection[1]
                .split("\n")
                .filter((line) => line.trim());
              console.log("耦合优化脚本 - 提取到管道流量行:", coupFlowLines);

              const coupFlowOutput = coupFlowLines
                .map((line) => {
                  const match = line.match(/管道 (\d+):\s*([\d.-]+)/);
                  return match
                    ? {
                        id: `gasline${match[1]}`,
                        flow: parseFloat(match[2]),
                        name: `管道${match[1]}`,
                      }
                    : null;
                })
                .filter(Boolean);

              if (coupFlowOutput.length > 0) {
                gasFlow = coupFlowOutput;
                console.log("耦合优化脚本 - 解析后的管道流量:", gasFlow);
              }
            }

            break;
        }
      } else {
        console.error(`Python脚本执行失败，退出代码: ${code}`);
        console.error(`错误信息: ${stderr}`);
      }

      // 更新初始数据中的值
      if (initialData) {
        // 更新发电机输出
        initialData.generatorOutput.forEach((gen, index) => {
          const newOutput = generatorOutput.find((g) => g.id === gen.id);
          if (newOutput) {
            gen.output = newOutput.output;
          }
        });

        // 更新燃气管道流量
        initialData.flowDistribution.forEach((flow, index) => {
          if (flow.type === "gas") {
            const newFlow = gasFlow.find((g) => g.id === flow.id);
            if (newFlow) {
              flow.flow = newFlow.flow;
            }
          }
        });

        // 更新系统总成本
        initialData.systemCost.totalCost = totalCost;
      }

      // 返回优化结果
      const response = {
        success: true,
        totalCost: totalCost,
        generatorOutput: generatorOutput,
        gasFlow: gasFlow,
        originalOutput: stdout,
        systemStatus: initialData,
        executionStatus: code === 0 ? "success" : "failed",
        exitCode: code,
        exitSignal: signal,
        errorMessage: stderr,
      };

      console.log("返回的响应:", response);
      res.json(response);
    });

    // 处理进程错误
    pythonProcess.on("error", (error) => {
      // 清除超时
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      console.error(`Python进程错误: ${error.message}`);

      // 读取初始数据作为基础
      const initialData = readInitialData();

      // 生成默认的优化结果
      const totalCost = 0;
      const generatorOutput = [];
      const gasFlow = [];

      // 更新初始数据
      if (initialData) {
        // 模拟发电机数据
        if (initialData.generatorOutput.length === 0) {
          for (let i = 1; i <= 10; i++) {
            initialData.generatorOutput.push({
              id: `gen${i}`,
              name: `发电机${i}`,
              output: Math.random() * 500 + 100,
              unit: "MW",
              type: i % 3 === 0 ? "gas" : "electric",
              details: {
                connected_bus: 30 + i,
                pmax: 1000 + i * 10,
                pmin: 100,
                status: "运行中",
              },
            });
          }
        }

        // 模拟流量数据
        if (initialData.flowDistribution.length === 0) {
          for (let i = 1; i <= 20; i++) {
            initialData.flowDistribution.push({
              id: i <= 10 ? `line${i}` : `gasline${i - 10}`,
              name:
                i <= 10 ? `线路${i}-${i + 1}` : `燃气管道${i - 10}-${i - 9}`,
              flow: i <= 10 ? Math.random() * 300 + 50 : Math.random() * 10 + 1,
              unit: i <= 10 ? "MW" : "m³/s",
              type: i <= 10 ? "electric" : "gas",
              details: {
                source: i <= 10 ? `节点${i}` : `燃气节点${i - 10}`,
                target: i <= 10 ? `节点${i + 1}` : `燃气节点${i - 9}`,
                resistance: 0.001 * i,
                reactance: 0.01 * i,
                capacity: 500 + i * 10,
              },
            });
          }
        }

        initialData.systemCost.totalCost = totalCost;
      }

      // 返回优化结果
      res.json({
        success: true,
        totalCost: totalCost,
        generatorOutput: generatorOutput,
        gasFlow: gasFlow,
        originalOutput: `Python进程错误: ${error.message}`,
        systemStatus: initialData,
        executionStatus: "error",
        errorMessage: error.message,
      });
    });
  } catch (error) {
    console.error("优化处理失败:", error);
    console.error("错误类型:", typeof error);
    console.error("错误详情:", JSON.stringify(error, null, 2));

    // 读取初始数据作为基础
    const initialData = readInitialData();

    // 生成默认的优化结果
    const totalCost = 0;
    const generatorOutput = [];
    const gasFlow = [];

    // 更新初始数据
    if (initialData) {
      // 更新系统总成本
      initialData.systemCost.totalCost = totalCost;
    }

    // 返回优化结果
    res.json({
      success: true,
      totalCost: totalCost,
      generatorOutput: generatorOutput,
      gasFlow: gasFlow,
      originalOutput: `系统异常: ${error.message}\n错误栈: ${error.stack}`,
      systemStatus: initialData,
      executionStatus: "error",
      errorMessage: error.message,
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`后端服务器运行在 http://localhost:${port}`);
  console.log("API端点:");
  console.log("  GET  /api/system-status       - 获取系统状态");
  console.log("  POST /api/run-optimization    - 运行优化");
});
