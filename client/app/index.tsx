// 根路由重定向到 404 或根据登录状态跳转
// 因为使用路由分组，根路径 / 没有对应的页面
// 由 AuthGuard 处理重定向逻辑
export { default } from "./+not-found";
