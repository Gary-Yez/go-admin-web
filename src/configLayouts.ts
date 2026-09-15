import type {Component, ShallowRef} from 'vue'
import {shallowRef} from 'vue'
import type {ConfigValue} from './apis/sys_config'

export interface ConfigForm {
    getValue(key: string): any

    setValue(key: string, value: any): void

    getError(key: string): string

    isDisabled(key: string): boolean

    isChanged(key: string): boolean

    isSaving(key: string): boolean

    save(key: string): Promise<void>

    /** 将默认值填入草稿，保存后才生效。 */
    reset(key: string): void
}

export interface ConfigLayoutProps {
    fields: ConfigValue[]
    allFields: ConfigValue[]
    form: ConfigForm
    filtering: boolean
}

export interface ConfigLayout {
    title: string
    groups: string[]
    component: Component
}

// 与应用实例一样跨热更新保留；组件只做浅层保存。
export const configLayouts: ShallowRef<ConfigLayout[]> = import.meta.hot?.data.configLayouts ?? shallowRef<ConfigLayout[]>([])

export function configureConfigLayouts(layouts: ConfigLayout[]) {
    const names = new Set<string>()
    const groups = new Set<string>()
    for (const layout of layouts) {
        if (!layout.title.trim() || !layout.component || !layout.groups.length) throw new Error('配置布局必须设置标题、组件及分组')
        if (names.has(layout.title)) throw new Error('配置布局标题重复：' + layout.title)
        names.add(layout.title)
        for (const group of layout.groups) {
            if (groups.has(group)) throw new Error('配置分组被多个布局使用：' + group)
            groups.add(group)
        }
    }
    configLayouts.value = layouts.map(layout => ({...layout, groups: [...layout.groups]}))
}

if (import.meta.hot) import.meta.hot.data.configLayouts = configLayouts
