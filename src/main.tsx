/**
 * 应用入口：将 <App /> 挂载到 #root 节点。
 * - 使用 React.StrictMode 协助发现潜在副作用问题。
 * - 全局样式入口为 `index.css`（Tailwind 4 在此引入）。
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
