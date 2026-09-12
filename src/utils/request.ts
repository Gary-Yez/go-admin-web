import axios from "axios"
import {useUserStore} from "../stores/user.ts";
import {ElMessage} from "element-plus";

declare module "axios" {
    interface InternalAxiosRequestConfig { sessionToken?:string }
}

// 热更新会重建请求模块；保留宿主启动时设置的 API 地址等默认配置。
const request = axios.create(import.meta.hot?.data.requestDefaults)
if (import.meta.hot) {
    import.meta.hot.dispose(data => {
        data.requestDefaults = request.defaults
    })
}

// 这些入口不依赖登录，开发工具的环境限制由后端负责。
const anonymousPaths = new Set([
    "/sys_auth/login", "/sys_config/site", "/sys_config/list",
    "/sys_config/preview", "/sys_config/apply",
])

request.interceptors.request.use(config=>{
    const userStore = useUserStore()
    config.sessionToken = userStore.AccessToken
    const path = config.url?.split("?")[0] || ""
    if (!config.headers.Authorization && !userStore.AccessToken && !anonymousPaths.has(path) && !path.startsWith("/sys_devtools/")) {
        throw new axios.CanceledError("当前未登录，取消认证请求")
    }
    if (!config.headers.Authorization && userStore.AccessToken) config.headers.Authorization = `Bearer ${userStore.AccessToken}`
    return config
})


// 网络及 HTTP 错误统一中文提示，页面读取 error.message 时也使用同一文案。
const networkErrorMessage = (error:unknown):string => {
    if (!axios.isAxiosError(error)) return "请求处理失败，请稍后重试"
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "请求超时，请稍后重试"
    if (!error.response) {
        if (!navigator.onLine) return "网络连接已断开，请检查网络连接"
        return "无法连接服务器，请检查网络或稍后重试"
    }
    const message = error.response.data?.message
    if (typeof message === "string" && /[\u3400-\u9fff]/.test(message)) return message
    switch (error.response.status) {
        case 400: return "请求参数有误，请检查后重试"
        case 401: return "登录已失效，请重新登录"
        case 403: return "没有权限执行此操作"
        case 404: return "请求的接口不存在，请联系管理员"
        case 405: return "请求方式不支持，请联系管理员"
        case 408: return "请求超时，请稍后重试"
        case 409: return "数据状态已发生变化，请刷新后重试"
        case 413: return "提交的数据或文件过大，请缩小后重试"
        case 422: return "提交的数据不符合要求，请检查后重试"
        case 429: return "操作过于频繁，请稍后重试"
        case 500: return "服务器处理异常，请稍后重试"
        case 502:
        case 503: return "服务暂时不可用，请稍后重试"
        case 504: return "服务器响应超时，请稍后重试"
        default: return "请求失败，请稍后重试"
    }
}

// 仅当前登录令牌的失效响应触发退出，切换角色时试用的新令牌不影响原会话。
const expireSession = async (config:import("axios").InternalAxiosRequestConfig | undefined, message:string) => {
    const userStore = useUserStore()
    if (!userStore.AccessToken || config?.sessionToken !== userStore.AccessToken || config.headers.Authorization !== `Bearer ${userStore.AccessToken}`) return false
    ElMessage.error(message || "登录已失效，请重新登录")
    await userStore.logout(false)
    return true
}

request.interceptors.response.use(async response=>{
    if (response.config.sessionToken !== useUserStore().AccessToken) {
        return Promise.reject(new axios.CanceledError("登录角色已变化，忽略旧请求结果"))
    }
    if (response.data.code !== 200){
        if (response.data.code === 401 && await expireSession(response.config, response.data.message)) {
            return Promise.reject(new axios.CanceledError("登录已失效"))
        }
        ElMessage.error(response.data.message)
        return Promise.reject(response.data.message)
    }
    return response.data
},async (error)=>{
    if (axios.isCancel(error) || (error.config && error.config.sessionToken !== useUserStore().AccessToken)) return Promise.reject(new axios.CanceledError("登录角色已变化"))
    const message = networkErrorMessage(error)
    if (error.response?.status === 401 && await expireSession(error.config, message)) {
        return Promise.reject(new axios.CanceledError("登录已失效"))
    }
    ElMessage.error({message, grouping:true})
    if (error instanceof Error) error.message = message
    return Promise.reject(error instanceof Error ? error : new Error(message))
})

export {
    request
}
