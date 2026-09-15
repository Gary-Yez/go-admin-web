import type {AxiosInstance, InternalAxiosRequestConfig} from "axios"
import axios from "axios"
import type {Pinia} from "pinia"
import {createPinia} from "pinia"
import type {App} from "vue"
import type {Router} from "vue-router"

export interface AdminContext {
    readonly pinia: Pinia
    readonly router: Router
    readonly dev: boolean
}

export interface RequestHooks {
    /** 框架设置令牌后执行，必须返回请求配置。 */
    beforeRequest?: (config: InternalAxiosRequestConfig, context: AdminContext) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
    /** 仅处理成功的业务响应体，必须返回交给调用方的数据。 */
    afterResponse?: (data: any, context: AdminContext) => any | Promise<any>
}

interface AdminRuntime {
    dev: boolean
    requestHooks: RequestHooks
    request: AxiosInstance
    requestInterceptors: { request?: number; response?: number }
    pinia: Pinia
    router?: Router
    routeGuards: Array<() => void>
    menus?: any[]
    defaultMenu: string
    application?: { app: App; router: Router; pinia: Pinia }
}

// 不依赖用户 Store、API 或路由模块；宿主配置和运行实例在热更新期间保持一致。
export const adminRuntime: AdminRuntime = import.meta.hot?.data.runtime ?? {
    dev: false,
    request: axios.create(),
    requestHooks: {},
    requestInterceptors: {},
    pinia: createPinia(),
    routeGuards: [],
    defaultMenu: 'sys_home',
}

if (import.meta.hot) {
    import.meta.hot.data.runtime = adminRuntime
}

// 仅暴露业务扩展需要的能力，不提供内部实例替换或拦截器管理入口。
export const adminContext: AdminContext = Object.freeze({
    get pinia() {
        return adminRuntime.pinia
    },
    get router() {
        if (!adminRuntime.router) throw new Error("路由尚未初始化，请在应用启动后发送请求")
        return adminRuntime.router
    },
    get dev() {
        return adminRuntime.dev
    },
})
