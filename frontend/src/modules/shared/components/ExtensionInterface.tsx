import React from "react";
import "./ExtensionInterface.css";

interface ExtensionInterfaceProps {
  title?: string;
  description?: string;
  features?: string[];
  onFeatureRequest?: (feature: string) => void;
}

const ExtensionInterface: React.FC<ExtensionInterfaceProps> = ({
  title = "功能扩展接口",
  description = "此模块为未来功能扩展预留接口",
  features = [
    "攻击路径分析",
    "防御策略推荐",
    "异常行为检测",
    "风险评估模型",
    "自动化响应机制",
  ],
  onFeatureRequest,
}) => {
  return (
    <div className="extension-interface">
      <div className="extension-header">
        <h2>{title}</h2>
        <p className="extension-description">{description}</p>
      </div>

      <div className="extension-content">
        <div className="features-section">
          <h3>计划中的功能特性</h3>
          <ul className="features-list">
            {features.map((feature, index) => (
              <li key={index} className="feature-item">
                <span className="feature-icon">🔧</span>
                <span className="feature-name">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="request-section">
          <h3>功能需求反馈</h3>
          <p>如果您有其他功能需求，请告诉我们：</p>
          <textarea
            className="feature-request-input"
            placeholder="请输入您的功能需求..."
            rows={3}
          />
          <button
            className="submit-request-btn"
            onClick={() => {
              const input = document.querySelector(
                ".feature-request-input"
              ) as HTMLTextAreaElement;
              if (input && input.value.trim() && onFeatureRequest) {
                onFeatureRequest(input.value.trim());
                input.value = "";
                alert("感谢您的反馈！我们会认真考虑您的建议。");
              }
            }}
          >
            提交需求
          </button>
        </div>
      </div>

      <div className="extension-footer">
        <p>更多功能正在开发中，敬请期待...</p>
      </div>
    </div>
  );
};

export default ExtensionInterface;
