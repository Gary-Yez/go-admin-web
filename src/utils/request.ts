import axios from "axios"
import {useUserStore} from "../stores/user";
import {ElMessage} from "element-plus";
import {adminRuntime, adminContext} from "../runtime";

declare module "axios" {
    interface InternalAxiosRequestConfig {
        sessionToken?: string
    }
}

const {request, requestInterceptors} = adminRuntime

// 这些入口不依赖登录，开发工具的环境限制由后端负责。
const anonymousPaths = new Set([
    "/sys_auth/login", "/sys_config/site", "/sys_config/list",
    "/sys_config/preview", "/sys_config/apply",
])


// 网络及 HTTP 错误统一中文提示，页面读取 error.message 时也使用同一文案。
const networkErrorMessage = (error: unknown): string => {
    if (!axios.isAxiosError(error)) return "请求处理失败，请稍后重试"
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "请求超时，请稍后重试"
    if (!error.response) {
        if (!navigator.onLine) return "网络连接已断开，请检查网络连接"
        return "无法连接服务器，请检查网络或稍后重试"
    }
    const message = error.response.data?.message
    if (typeof message === "string" && /[\u3400-\u9fff]/.test(message)) return message
    switch (error.response.status) {
        case 400:
            return "请求参数有误，请检查后重试"
        case 401:
            return "登录已失效，请重新登录"
        case 403:
            return "没有权限执行此操作"
        case 404:
            return "请求的接口不存在，请联系管理员"
        case 405:
            return "请求方式不支持，请联系管理员"
        case 408:
            return "请求超时，请稍后重试"
        case 409:
            return "数据状态已发生变化，请刷新后重试"
        case 413:
            return "提交的数据或文件过大，请缩小后重试"
        case 422:
            return "提交的数据不符合要求，请检查后重试"
        case 429:
            return "操作过于频繁，请稍后重试"
        case 500:
            return "服务器处理异常，请稍后重试"
        case 502:
        case 503:
            return "服务暂时不可用，请稍后重试"
        case 504:
            return "服务器响应超时，请稍后重试"
        default:
            return "请求失败，请稍后重试"
    }
}

// 仅当前登录令牌的失效响应触发退出，切换角色时试用的新令牌不影响原会话。
const expireSession = async (config: import("axios").InternalAxiosRequestConfig | undefined, message: string) => {
    const userStore = useUserStore()
    if (!userStore.AccessToken || config?.sessionToken !== userStore.AccessToken || config.headers.Authorization !== `Bearer ${userStore.AccessToken}`) return false
    ElMessage.error(message || "登录已失效，请重新登录")
    await userStore.logout(false)
    return true
}

// 每次执行都替换框架自己的拦截器，不依赖热更新 dispose 的触发顺序。
if (requestInterceptors.request !== undefined) request.interceptors.request.eject(requestInterceptors.request)
requestInterceptors.request = request.interceptors.request.use(async config => {
    const userStore = useUserStore()
    const sessionToken = userStore.AccessToken
    const path = config.url?.split("?")[0] || ""
    if (!config.headers.Authorization && !userStore.AccessToken && !anonymousPaths.has(path) && !path.startsWith("/sys_devtools/")) {
        throw new axios.CanceledError("当前未登录，取消认证请求")
    }
    if (!config.headers.Authorization && userStore.AccessToken) config.headers.Authorization = `Bearer ${userStore.AccessToken}`
    const beforeRequest = adminRuntime.requestHooks.beforeRequest
    const nextConfig = beforeRequest ? await beforeRequest(config, adminContext) : config
    if (sessionToken !== userStore.AccessToken) {
        throw new axios.CanceledError("登录角色已变化，取消旧请求")
    }
    // 回调即使返回新配置，也由框架保留本次请求所属的登录会话。
    nextConfig.sessionToken = sessionToken
    return nextConfig
})


if (requestInterceptors.response !== undefined) request.interceptors.response.eject(requestInterceptors.response)
requestInterceptors.response = request.interceptors.response.use(async response => {
    if (response.config.sessionToken !== useUserStore().AccessToken) {
        return Promise.reject(new axios.CanceledError("登录角色已变化，忽略旧请求结果"))
    }
    if (response.data.code !== 200) {
        if (response.data.code === 401 && await expireSession(response.config, response.data.message)) {
            return Promise.reject(new axios.CanceledError("登录已失效"))
        }
        ElMessage.error(response.data.message)
        return Promise.reject(response.data.message)
    }
    const afterResponse = adminRuntime.requestHooks.afterResponse
    const data = afterResponse ? await afterResponse(response.data, adminContext) : response.data
    if (response.config.sessionToken !== useUserStore().AccessToken) {
        throw new axios.CanceledError("登录角色已变化，忽略旧请求结果")
    }
    return data
}, async (error) => {
    if (axios.isCancel(error) || (error.config && error.config.sessionToken !== useUserStore().AccessToken)) return Promise.reject(new axios.CanceledError("登录角色已变化"))
    const message = networkErrorMessage(error)
    if (error.response?.status === 401 && await expireSession(error.config, message)) {
        return Promise.reject(new axios.CanceledError("登录已失效"))
    }
    ElMessage.error({message, grouping: true})
    if (error instanceof Error) error.message = message
    return Promise.reject(error instanceof Error ? error : new Error(message))
})

export {
    request
}
