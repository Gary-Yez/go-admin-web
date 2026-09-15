import type {ConfigField} from '../apis/sys_config'

const formatValue = (value:unknown):string => typeof value === 'boolean'
    ? value ? '开启' : '关闭'
    : typeof value === 'string' ? value || '（空字符串）'
    : Array.isArray(value) ? value.join('、') || '（空列表）'
    : String(value)

// 展示使用选项标签；未匹配的值保留原值，便于识别失效选项。
export function formatConfigDefault(field:Pick<ConfigField, 'control' | 'options' | 'default'>):string {
    const value = field.default
    if (field.control === 'password') return value ? '已设置（不显示）' : '（空字符串）'
    const optionLabel = (value:unknown) => field.options.find(option => option.value === value)?.label ?? formatValue(value)
    if (field.control === 'select' || field.control === 'radio') return optionLabel(value)
    if (field.control === 'multi-select' && Array.isArray(value)) return value.map(optionLabel).join('、') || '（空列表）'
    return formatValue(value)
}
