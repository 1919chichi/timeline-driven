/**
 * 根组件：当前应用只有「今日」一页，直接渲染 TodayPage。
 * 后续若新增路由/页面，应在此处接入路由器。
 */
import TodayPage from "./TodayPage.jsx";

export default function App() {
  return <TodayPage />;
}
