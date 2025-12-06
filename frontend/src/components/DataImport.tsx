import React, { useState } from "react";
import "./DataImport.css";

interface DataImportProps {
  onDataImported: () => void; // 数据导入成功后的回调函数
}

const DataImport: React.FC<DataImportProps> = ({ onDataImported }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // 检查文件类型
      if (!file.name.endsWith(".txt")) {
        setUploadStatus({
          type: "error",
          message: "请选择.txt格式的文件"
        });
        setSelectedFile(null);
        return;
      }
      
      // 检查文件大小（限制为16MB）
      if (file.size > 16 * 1024 * 1024) {
        setUploadStatus({
          type: "error",
          message: "文件大小不能超过16MB"
        });
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setUploadStatus({
        type: "info",
        message: `已选择文件: ${file.name}`
      });
    }
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({
        type: "error",
        message: "请先选择一个文件"
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("http://localhost:5000/api/import-data", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus({
          type: "success",
          message: `数据导入成功！节点数: ${result.nodes_count}, 连接数: ${result.links_count}`
        });
        // 清除已选择的文件
        setSelectedFile(null);
        // 触发父组件的回调函数，通知数据已更新
        onDataImported();
      } else {
        setUploadStatus({
          type: "error",
          message: result.error || "数据导入失败"
        });
      }
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: `导入过程中发生错误: ${(error as Error).message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 处理拖拽事件
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // 检查文件类型
      if (!file.name.endsWith(".txt")) {
        setUploadStatus({
          type: "error",
          message: "请选择.txt格式的文件"
        });
        return;
      }
      
      // 检查文件大小
      if (file.size > 16 * 1024 * 1024) {
        setUploadStatus({
          type: "error",
          message: "文件大小不能超过16MB"
        });
        return;
      }
      
      setSelectedFile(file);
      setUploadStatus({
        type: "info",
        message: `已选择文件: ${file.name}`
      });
    }
  };

  return (
    <div className="data-import">
      <h2>数据导入</h2>
      
      {/* 文件选择区域 */}
      <div 
        className="upload-area"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <div className="upload-icon">📁</div>
          <p>拖拽文件到这里或点击选择文件</p>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            disabled={isUploading}
            id="file-input"
          />
          <label htmlFor="file-input" className="file-select-button">
            选择文件
          </label>
          {selectedFile && (
            <p className="selected-file">已选择: {selectedFile.name}</p>
          )}
        </div>
      </div>
      
      {/* 上传按钮 */}
      <button
        onClick={handleUpload}
        disabled={isUploading || !selectedFile}
        className="upload-button"
      >
        {isUploading ? "导入中..." : "导入数据"}
      </button>
      
      {/* 状态消息 */}
      {uploadStatus && (
        <div className={`status-message status-${uploadStatus.type}`}>
          {uploadStatus.message}
        </div>
      )}
      
      {/* 使用说明 */}
      <div className="import-instructions">
        <h3>使用说明</h3>
        <ul>
          <li>支持导入MATPOWER格式的.txt文件</li>
          <li>文件大小限制为16MB</li>
          <li>导入新数据将覆盖现有数据</li>
          <li>导入完成后，拓扑图将自动更新</li>
        </ul>
      </div>
    </div>
  );
};

export default DataImport;