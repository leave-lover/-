import React from "react";
import "./InfoModal.css";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any>;
}

// 定义应该显示的字段白名单
const ALLOWED_FIELDS = new Set([
  "id",
  "name",
  "type",
  "bus_type",
  "pd",
  "qd",
  "vm",
  "va",
  "pg",
  "qg",
  "pmax",
  "pmin",
  "pressure_max",
  "pressure_min",
  "load",
  "capacity",
  "r",
  "x",
  "connected_bus",
  "min_w",
  "max_w",
  "source",
  "target",
  "value",
  "group"
]);

const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
}) => {
  if (!isOpen) return null;

  // 格式化数值显示
  const formatValue = (key: string, value: any): string => {
    if (typeof value === "number") {
      // 对于电压、功率等数值，保留适当的小数位
      if (
        key.includes("vm") ||
        key.includes("va") ||
        key.includes("pd") ||
        key.includes("qd") ||
        key.includes("pg") ||
        key.includes("qg")
      ) {
        return value.toFixed(4);
      }
      // 对于容量、负载等数值，保留两位小数
      if (
        key.includes("capacity") ||
        key.includes("load") ||
        key.includes("value")
      ) {
        return value.toFixed(2);
      }
      // 对于电阻、电抗等数值，保留适当的科学计数法
      if (key.includes("r") || key.includes("x")) {
        return value.toExponential(2);
      }
      return value.toString();
    }
    return String(value);
  };

  // 获取字段的友好名称
  const getFieldDisplayName = (key: string): string => {
    const displayNameMap: Record<string, string> = {
      id: "标识符",
      name: "名称",
      type: "类型",
      group: "组别",
      vm: "电压幅值(pu)",
      va: "电压相角(deg)",
      pd: "有功负荷(MW)",
      qd: "无功负荷(Mvar)",
      pg: "有功发电(MW)",
      qg: "无功发电(Mvar)",
      pmax: "最大有功功率(MW)",
      pmin: "最小有功功率(MW)",
      bus_type: "母线类型",
      pressure_max: "最大压力(psi)",
      pressure_min: "最小压力(psi)",
      load: "负载(kg/s)",
      capacity: "管道容量(kg/s)",
      r: "电阻(pu)",
      x: "电抗(pu)",
      connected_bus: "连接母线",
      min_w: "最小供气量(kg/s)",
      max_w: "最大供气量(kg/s)",
      source: "源节点",
      target: "目标节点",
      value: "数值",
    };

    return displayNameMap[key] || key;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="info-grid">
            {Object.entries(data)
              .filter(([key]) => ALLOWED_FIELDS.has(key)) // 只显示允许的字段
              .map(([key, value]) => (
                <div key={key} className="info-item">
                  <span className="info-label">{getFieldDisplayName(key)}:</span>
                  <span className="info-value">{formatValue(key, value)}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-confirm" onClick={onClose}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;