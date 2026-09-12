import {reactive, shallowReactive} from "vue";
import type {Component} from "vue";

export type ComponentLoader = () => Promise<Component | {default: Component}>
export type ComponentModules = Record<string, ComponentLoader>

// 菜单中的系统组件 Key 与业务组件 Key 分开；物理目录不再使用 core 层级。
const systemViews = import.meta.glob<Awaited<ReturnType<ComponentLoader>>>('../views/**/*.vue')
export const coreModules = shallowReactive<ComponentModules>(Object.fromEntries(
    Object.entries(systemViews).map(([path, loader]) => [path.replace('../views/', '../core/views/'), loader]),
))
export const layoutsModules = shallowReactive<ComponentModules>(import.meta.glob('../layouts/**/*.vue'))
export const viewModules = shallowReactive<ComponentModules>({})
export const SyncComponents = reactive<string[]>([])

// 业务页面由宿主项目收集；保留后端菜单和代码生成器使用的 ../views/ 路径格式。
export const registerAdminPages = (pages:ComponentModules) => {
    const views:ComponentModules = {}
    for (const [path, loader] of Object.entries(pages)) {
        const prefix = path.startsWith('./views/') ? './views/' : '../views/'
        if (!path.startsWith(prefix)) throw new Error(`业务页面路径必须以 ./views/ 或 ../views/ 开头：${path}`)
        views[`../views/${path.slice(prefix.length)}`] = loader
    }
    Object.keys(viewModules).forEach(key => { if (!views[key]) delete viewModules[key] })
    Object.assign(viewModules, views)
    SyncComponents.splice(0, SyncComponents.length, ...Object.keys(views).sort())
}
