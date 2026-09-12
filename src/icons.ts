import './assets/iconify-icon.js'
import icons from '@iconify-json/iconoir/icons.json'

// 系统内置图标随包加载，页面不依赖外部图标服务。
const element = customElements.get('iconify-icon') as (CustomElementConstructor & {
    addCollection: (data: typeof icons) => boolean
}) | undefined
element?.addCollection(icons)
