import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // 启用/禁用 gzip 压缩大小报告
    reportCompressedSize: true,
    // 启用 rollup 预打包
    rollupOptions: {
      // 确保第三方库只打包一次
      external: [],
      output: {
        // 分割包
        manualChunks: {
          // 将大型第三方库单独打包
          "react-vendor": ["react", "react-dom"],
          "force-graph-vendor": ["react-force-graph-2d"],
          "chart-vendor": ["recharts"],
        },
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 构建后是否生成 source map 文件
    sourcemap: false,
  },
});
