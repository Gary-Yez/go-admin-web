import "./icons"
import type {App} from 'vue'
import {createApp} from 'vue'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import AdminApp from './App.vue'
import router from './routes'
import {request} from './utils/request'
import {readRememberedUsername} from './utils/rememberAccount'
import type {RequestHooks} from './runtime'
import {adminRuntime} from './runtime'
import type {ComponentModules} from './routes/componentModules'
import {registerAdminPages} from './routes/componentModules'

import type {ConfigLayout} from './configLayouts'
import {configureConfigLayouts} from './configLayouts'

export interface AdminOptions {
    configLayouts?: ConfigLayout[]
    apiBaseURL: string
    pages?: ComponentModules
    dev?: boolean
    mount?: string | Element
    setup?: (app: App) => void
    requestHooks?: RequestHooks
}

// 每个页面创建一个管理端应用，系统与业务共用同一套路由、状态和请求实例。
export function createAdminApp(options: AdminOptions) {
    configureConfigLayouts(options.configLayouts ?? [])
    adminRuntime.dev = options.dev ?? false
    adminRuntime.requestHooks = {...options.requestHooks}
    request.defaults.baseURL = options.apiBaseURL
    registerAdminPages(options.pages ?? {})
    if (adminRuntime.application) return adminRuntime.application
    readRememberedUsername()
    const app = createApp(AdminApp)
    const pinia = adminRuntime.pinia
    for (const [name, component] of Object.entries(ElementPlusIconsVue)) app.component(name, component)
    app.use(ElementPlus).use(pinia)
    options.setup?.(app)
    app.use(router)
    app.mount(options.mount ?? '#app')
    adminRuntime.application = {app, router, pinia}
    app.onUnmount(() => {
        if (adminRuntime.application?.app === app) adminRuntime.application = undefined
    })
    return adminRuntime.application
}

export {registerAdminPages} from './routes/componentModules'
export type {ComponentModules, ComponentLoader} from './routes/componentModules'
export {request} from './utils/request'
export type {RequestHooks, AdminContext} from './runtime'
export {useUserStore} from './stores/user'
export {useCommonStore} from './stores/common'
export {useSiteStore} from './stores/site'
export {confirmDelete} from './utils/confirmDelete'
export {defaultSortFields} from './utils/sort'
export {formatTime} from './utils/formatTime'
export {copyText} from './utils/utils'
export {default as ColumnTable} from './components/ColumnTable.vue'
export {default as FormDialog} from './components/FormDialog.vue'
export {default as FormNote} from './components/FormNote.vue'
export {default as PageHeader} from './components/PageHeader.vue'
export {default as TableTime} from './components/TableTime.vue'
export {default as IconSelect} from './components/IconSelect.vue'

export {default as ConfigField} from './components/ConfigField.vue'
export type {ConfigForm, ConfigLayout, ConfigLayoutProps} from './configLayouts'
export type {ConfigValue} from './apis/sys_config'

export {default as FileUpload} from './components/FileUpload.vue'
export {SysFileApi} from './apis/sys_file'
export type {ManagedFile, UploadPolicy, UploadSession} from './apis/sys_file'
export type {StorageOption} from './apis/sys_storage'
