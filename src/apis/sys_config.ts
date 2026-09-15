import {request} from "../utils/request";

export type ConfigType = 'string' | 'bool' | 'int' | 'float64' | '[]string'
export type ConfigControl = '' | 'textarea' | 'password' | 'select' | 'radio' | 'multi-select'

export interface ConfigOption {
    label: string
    value: string | boolean | number
}

export interface ConfigField {
    group: string
    key: string
    name: string
    type: ConfigType
    control: ConfigControl
    rows: number
    options: ConfigOption[]
    label: string
    description: string
    default: string | boolean | number | string[]
}

export interface ConfigDefinition {
    builtin_groups: string[]
    groups: string[]
    fields: ConfigField[]
    hash: string
}

export interface ConfigBody {
    fields: ConfigField[]
    hash: string
}

export interface ConfigPreview {
    path: string
    before: string
    after: string
    action: 'create' | 'modify' | 'unchanged'
}

export interface ConfigValue {
    registered: boolean
    group: string
    key: string
    label: string
    description: string
    type: ConfigType
    control: ConfigControl
    rows: number
    options: ConfigOption[]
    default: ConfigField['default']
    value: ConfigField['default']
    updated_at: string
}

export interface SiteInfo {
    name: string
    logo: string
    favicon: string
    title: string
    copyright: string
}

export const SysConfigApi = {
    Site() {
        return request.get<unknown, { data: SiteInfo }>('/sys_config/site')
    },
    SyncCache() {
        return request.post('/sys_config/sync_cache')
    },
    CleanupInvalid(body: { items: { key: string }[] }) {
        return request.post('/sys_config/cleanup_invalid', body)
    },
    Values() {
        return request.get('/sys_config/values')
    },
    UpdateValue(body: { key: string; value: ConfigField['default'] }) {
        return request.post('/sys_config/update_value', body)
    },
    ResetValue(body: { key: string }) {
        return request.post('/sys_config/reset_value', body)
    },
    List() {
        return request.get('/sys_config/list')
    },
    Preview(body: ConfigBody) {
        return request.post('/sys_config/preview', body)
    },
    Apply(body: ConfigBody) {
        return request.post('/sys_config/apply', body)
    },
}
