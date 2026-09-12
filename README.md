# @gary-yez/go-admin-web

go-admin 的公共前端包，包含系统页面、后台布局、菜单路由、登录状态、网络请求和业务通用组件。业务项目保留自己的页面，通过公开入口接入，不需要复制系统页面。

- Vue 3 + TypeScript + Element Plus，内置深浅主题、标签页和可折叠菜单。
- 登录、角色切换、权限菜单、API 密钥、系统运维与开发工具页面。
- 统一表格列设置、侧边表单、页面标题、删除确认和错误提示。
- 业务页面由宿主注册，后端菜单决定访问入口。

后端接口来自 [go-admin](https://github.com/Gary-Yez/go-admin)。完整宿主项目见 [go-admin-template](https://github.com/Gary-Yez/go-admin-template)。

## 安装与运行环境

本包发布 **Vue / TypeScript / Less 源码**，不是可直接放进 script 标签的独立脚本。宿主负责 Vite 编译、样式处理和产物输出。最快的接入方式是使用模板已有的构建配置和锁文件。

在现有 Vue 3 + Vite 项目中安装：

```sh
yarn add @gary-yez/go-admin-web
```

当前 peerDependencies：

| 依赖 | 支持范围 |
| --- | --- |
| Vue | ^3.5.12 |
| Vue Router | ^4.4.5 |
| Pinia | ^2.2.5 |
| Element Plus | ^2.11.3 |
| Axios | ^1.18.0 |
| Vite | ^8.0.0 |

宿主需要安装满足范围的这些依赖，并准备 `@vitejs/plugin-vue`、TypeScript、vue-tsc、Less、Tailwind CSS 3、PostCSS 和 Autoprefixer。可使用 Node.js 24 和 Yarn 1.22.22，配合模板锁文件构建。

Vue、Pinia、Router、Element Plus、Axios 应由宿主与本包共用同一份运行依赖，不要创建另一套状态或请求实例。升级时同时检查 peer 范围和对应的 go-admin 后端版本。

## 创建应用

宿主 `src/pages.ts`：

```ts
import type {Component} from 'vue'

export const pages = import.meta.glob<{default: Component}>('./views/**/*.vue')
```

宿主 `src/main.ts`：

```ts
import './style.css'
import '@gary-yez/go-admin-web/style'
import {createAdminApp, registerAdminPages} from '@gary-yez/go-admin-web'
import {pages} from './pages'

const {app, router, pinia} = createAdminApp({
  apiBaseURL: import.meta.env.VITE_API_BASE_URL,
  dev: import.meta.env.DEV,
  pages,
  mount: '#app',
  setup(app) {
    // 在此注册业务插件、全局组件或 provide。
    app.provide('applicationName', '业务后台')
  },
})

if (import.meta.hot) {
  import.meta.hot.accept('./pages', module => {
    if (module) registerAdminPages(module.pages)
  })
}
```

`index.html` 需要有 `<div id="app"></div>`。一般无需额外创建 App.vue 或自行挂载 Router、Pinia、Element Plus。

| AdminOptions 字段 | 含义 |
| --- | --- |
| `apiBaseURL: string` | 必填，包含后端 API 前缀，例如 http://localhost:8080/api |
| `pages?: ComponentModules` | 业务页面加载器映射，默认空 |
| `dev?: boolean` | 显示开发工具入口，默认 false；不是后端安全限制 |
| `mount?: string \| Element` | 挂载目标，默认 #app |
| `setup?: (app: App) => void` | 同步执行的 Vue 扩展回调 |

创建方法返回 `{app, router, pinia}`，不表示登录资料已经加载。一个页面只创建一个管理端应用；包内部请求实例和路由是共享的。

### 生命周期

1. 设置运行模式、请求 baseURL，注册业务页面。
2. 处理记住账号信息，创建 Vue 应用和 Pinia。
3. 注册 Element Plus 图标，安装 Element Plus、Pinia。
4. 执行 setup；此时可安装业务插件，路由尚未安装，不适合访问已登录用户资料。
5. 安装路由并挂载应用。
6. 路由守卫恢复登录：已有令牌时请求当前身份，根据菜单注册动态路由；无有效身份转登录页。
7. 根组件加载公开站点信息，更新网页标题、图标等展示。

setup 不是异步启动钩子；需要等待的宿主准备工作应在 createAdminApp 之前完成。角色切换会加载新身份、重建菜单并重置页面会话，业务页面应做好卸载清理和取消请求处理。

## 宿主构建配置

Vite 至少要处理自定义图标标签、源码包预构建和重复依赖。以下配置与模板的接入方式一致，保留宿主自身其他配置即可：

```ts
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {isCustomElement: tag => tag === 'iconify-icon'},
    },
  })],
  optimizeDeps: {
    exclude: ['@gary-yez/go-admin-web'],
    include: [
      'vue', 'pinia', 'vue-router', 'element-plus',
      'element-plus/es/locale/lang/zh-cn', '@element-plus/icons-vue',
      'axios', 'nprogress', 'echarts', 'highlight.js', 'dayjs',
    ],
  },
  resolve: {dedupe: ['vue', 'pinia', 'vue-router', 'element-plus', 'axios']},
  base: './',
})
```

Tailwind 3 的 `content` 必须扫描公共包，否则页面中的工具类不会生成：

```js
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/@gary-yez/go-admin-web/src/**/*.{vue,js,ts}',
  ],
  theme: {extend: {}},
  plugins: [],
}
```

宿主 `style.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

宿主 `postcss.config.js`：

```js
export default {
  plugins: {tailwindcss: {}, autoprefixer: {}},
}
```

先引入宿主 Tailwind 样式，再引入 `@gary-yez/go-admin-web/style`。style 入口包括 Element Plus、深色主题、全局公共样式和 NProgress。

本包使用浏览器 localStorage、DOM 等能力，接入示例面向浏览器 SPA。不要在服务端直接执行 createAdminApp。

## 业务页面与菜单

`ComponentModules` 是 `Record<string, ComponentLoader>`，加载器返回组件或 `{default: Component}`。业务页面路径必须以 `./views/` 或 `../views/` 开头。

例如 `src/views/product/index.vue` 经 pages 注册后，后端菜单应填写：

```text
名称：商品管理
路径：product
组件：../views/product/index.vue
图标：iconoir:box
```

系统菜单组件仍使用 `../core/views/...` 作为标识，这不是 npm 包的物理路径，不要改成业务页面 Key。`registerAdminPages(pages)` 会替换整份业务映射，不是追加单页；主要用于开发时更新页面集合。

路由采用 Hash 模式。页面文件存在、菜单已建立、角色有菜单权限，才能通过框架菜单访问；接口权限仍由后端单独验证。默认菜单来自当前角色配置，业务不要在页面中再次写死登录落点。

## 请求接口

`request` 是已配置拦截器的 Axios 实例。必须在应用安装 Pinia 后使用，通常在组件或业务函数执行时调用，避免模块导入时直接发请求。

```ts
import {request} from '@gary-yez/go-admin-web'

interface Product { id: number; name: string }
interface Result<T> { code: number; message: string; data: T }

export function listProducts() {
  return request.get<unknown, Result<{list: Product[]; total: number}>>(
    '/product/list',
    {params: {page: 1, limit: 10}},
  )
}
```

拦截器已将 AxiosResponse 解包为后端业务响应；上述结果使用 `result.data.list`，不是 `result.data.data.list`。示例用 Axios 第二个泛型标明实际返回类型。

框架请求层会：

- 为当前登录会话附加 Bearer 令牌。
- 检查 JSON `code`，统一提示业务错误和中文网络错误。
- 当前会话失效时退出登录；角色切换后取消旧请求结果，避免覆盖新角色页面。
- Promise 拒绝值可能是字符串、Error 或 Axios 取消错误；页面处理 listError 时应兼容这些情况。

框架仅为自身公开入口配置匿名请求例外。新增匿名业务接口如果复用 request，不能假设无登录时一定放行；需要单独设计匿名请求入口。普通后台业务接口继续复用 request。

### 列表筛选与排序

GET 参数中的 filters/sorts 按现有接口使用重复参数传递 JSON 字符串：

```ts
return request.get('/product/list', {
  params: {
    page: 1,
    limit: 10,
    filters: [{field: 'name', operator: 'like', value: '手机'}]
      .map(item => JSON.stringify(item)),
    sorts: [{field: 'id', order: 'desc'}]
      .map(item => JSON.stringify(item)),
  },
  paramsSerializer: {indexes: null},
})
```

`defaultSortFields(extra?)` 返回 `{id:'id', created_at:'created_at', updated_at:'updated_at', ...extra}`，可用于表格属性到数据库字段的映射。它不会自动发请求，后端也仍需独立配置排序白名单。

筛选输入框失焦查询，选择器变化查询，重置后回到第一页；时间筛选使用起止范围。不要把 Element Plus 的 ascending/descending 原样发给后端，应转换成 asc/desc。

## 公共组件

以下组件均从包根导入，不要引用包内未公开的文件路径。

| 组件 | 主要接口与行为 |
| --- | --- |
| `PageHeader` | title 必填、description 可选，默认插槽放附加内容；图标取当前菜单，缺失时用 Grid |
| `ColumnTable` | storageKey 必填且按页面唯一；透传 el-table 属性、事件和插槽；toolbar 插槽放刷新、新增、批量操作 |
| `FormDialog` | 侧边抽屉表单；v-model 控制显示，v-model:form 绑定表单，onConfirm 返回 Promise |
| `FormNote` | title、description 必填，icon 默认 InfoFilled |
| `TableTime` | value 接收 string / number / Date / null，emptyText 默认 —，suffix 可选；按浏览器时区显示 |
| `IconSelect` | v-model 绑定选中的图标字符串，复用菜单图标选择器 |

ColumnTable 默认开启列显示设置，保存在浏览器本地；`:column-settings="false"` 关闭该功能。选择列和标题为“操作”的列始终显示，不参与控制。列应直接声明为 el-table-column，并使用稳定的 prop 或 column-key。

```vue
<template>
  <PageHeader title="商品管理" description="管理商品资料与业务数据" />
  <ColumnTable storage-key="product-list" :data="rows" size="large">
    <template #toolbar>
      <el-button @click="load">刷新</el-button>
    </template>
    <el-table-column prop="id" label="编号" />
    <el-table-column prop="name" label="商品名称" />
    <template #empty><el-empty description="暂无商品" /></template>
  </ColumnTable>
</template>
```

示例中的 rows 和 load 由业务页面提供。列表异常使用外层容器控制间距：

```vue
<div v-if="listError" class="mb-[12px]">
  <el-alert :title="listError" type="error" :closable="false" show-icon />
</div>
```

FormDialog 默认宽度上限 500、表单 size 为 large、Esc 可关闭、点击遮罩不关闭，默认不销毁内容。可通过 maxWidth、size、closeOnPressEscape、closeOnClickModal、destroyOnClose 调整；确认按钮支持 confirmBtnText、confirmBtnType，取消按钮支持 cancelBtnText。

确认时组件先验证表单、等待 onConfirm，成功后关闭，失败保留表单。关闭会清空 form 并重置字段；业务不要依赖关闭后的 form 数据。description / noteIcon 可显示表单说明。

## 删除确认与工具函数

```ts
import {confirmDelete, request} from '@gary-yez/go-admin-web'

await confirmDelete({
  subject: '商品',
  count: ids.length,
  description: '删除后将无法恢复。',
  onConfirm: async () => {
    await request.post('/product/delete', {ids})
    await load()
  },
})
```

subject、count、onConfirm 必填，description、target 可选。组件管理提交状态，删除失败保留弹窗；取消会正常结束 Promise，因此把依赖删除成功的刷新放进 onConfirm。内部 DeleteNotice 不是公开组件。

`formatTime(time: number)` 将毫秒时间戳格式化为本地年月日时分秒。`copyText(text: string)` 复制内容并统一提示结果。

## 状态接口

| Store | 常用状态和操作 |
| --- | --- |
| `useUserStore()` | UserData、UserMenu、IsLogin、SwitchingRole；getUserData()、switchRole(roleId)、logout(showMessage?) |
| `useSiteStore()` | info 包含 name/title/logo/favicon/copyright；load() 重新读取公开站点信息 |
| `useCommonStore()` | theme、isDev、currentTime；setTheme('light' / 'dark')、setTime() |

UserStore 还暴露 AccessToken、setAccessToken、setUserData；普通页面优先使用既有登录流程和 switchRole/logout，避免只修改令牌而遗漏菜单与会话重建。使用响应式解构时通过 Pinia 的 storeToRefs，不要直接解构状态导致丢失响应性。

不要在每个业务页面挂载时重复请求当前用户；登录恢复由路由守卫处理。需要导航可用 Vue Router 的 useRouter，或 createAdminApp 返回的 router。

## 构建与升级

本包由宿主执行类型检查和构建，例如模板中的 `yarn build`。仅安装 npm 包不会产生可部署管理端。

升级公共前端后，重新编译宿主并部署新产物；已生成的业务 Vue 文件仍属于业务项目，不会被 npm 升级自动重写。升级后端接口时同步检查前端版本、菜单组件 Key 和 peerDependencies，提交更新后的锁文件。
