# @gary-yez/go-admin-web

导航：[项目介绍](#1-项目介绍) · [系统功能](#2-系统功能) · [安装与引用](#3-安装与引用) · [公开导出与用法](#4-全部公开导出与实际用法) · [注意事项](#5-使用注意事项与升级) · [文档维护](#6-文档维护约定)

## 1. 项目介绍

go-admin 的公共前端包，包含系统页面、后台布局、菜单路由、登录状态、网络请求和业务通用组件。业务项目保留自己的页面，通过公开入口接入，不需要复制系统页面。

- Vue 3 + TypeScript + Element Plus，内置深浅主题、标签页和可折叠菜单。
- 登录、角色切换、权限菜单、API 密钥、系统运维与开发工具页面。
- 统一表格列设置、侧边表单、页面标题、删除确认和错误提示。
- 业务页面由宿主注册，后端菜单决定访问入口。

后端接口来自 [go-admin](https://github.com/Gary-Yez/go-admin)。完整宿主项目见 [go-admin-template](https://github.com/Gary-Yez/go-admin-template)。

本文面向模板使用者与辅助开发的 AI，按系统功能、引用方式、公开导出及注意事项查阅。公开范围由 package.json 的 exports 和 src/index.ts 决定；源码文件中的 export 不等于包根可引用。本说明对应所在分支/Tag，旧版本应切换到对应 Tag 核对。

## 2. 系统功能

| 功能 | 已提供页面与交互 | 接入条件 |
| --- | --- | --- |
| 登录与个人资料 | 登录、当前用户、头像上传、资料与密码修改、退出 | 配套身份接口，头像需要存储账号与上传权限 |
| 多角色与工作台 | 角色切换、角色默认首页、菜单与标签页、折叠导航 | 菜单由后端角色返回，切换后重建会话页面 |
| 管理员 | 管理员列表、编辑、状态及角色管理 | 对应菜单与 API 权限 |
| 角色 | 角色维护、菜单授权、接口授权、默认首页 | 对应菜单与 API 权限 |
| 菜单 | 菜单层级、图标、组件与路径维护 | 系统页面和业务页面使用不同组件 Key |
| API 管理 | 接口列表、筛选和无效接口清理 | 受保护路由由后端同步 |
| API 密钥 | 个人密钥及密钥管理页面 | 后端密钥接口与权限 |
| 登录日志 | 登录记录查询与清理 | 对应菜单与 API 权限 |
| 配置管理 | 按组编辑配置、校验、保存、恢复默认、缓存同步和无效项清理 | 类型与默认值由后端定义，可扩展配置布局 |
| 计划任务 | 任务配置、参数、执行和日志页面 | 后端已注册处理函数 |
| 节点监控 | 节点状态和资源指标展示 | 后端节点监控接口 |
| 文件列表 | 普通/分片上传、进度、暂停续传、预览、下载和删除 | 后端文件模块、上传策略及启用的存储账号 |
| 存储管理 | 本地、COS、OSS、S3 账号维护、启停与默认账号 | 存储管理权限；凭据仅由后端处理 |
| 开发工具 | CRUD 生成、预览、生成历史、配置定义 | 前端 dev 显示入口，后端 server.dev 决定接口是否开放 |
| 公共界面 | 深浅主题、统一请求与错误提示、表格列设置、表单和删除确认 | 使用包入口与 style，沿用宿主构建配置 |

这些页面通过框架菜单与路由使用，不需要复制进业务项目，也不作为独立 Vue 页面从包根导出。前端可见性不代替后端鉴权。

## 3. 安装与引用

### 安装与运行环境

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

### 公开引用入口

```ts
import '@gary-yez/go-admin-web/style'
import {createAdminApp, request, ColumnTable, FormDialog} from '@gary-yez/go-admin-web'
import type {AdminOptions, ManagedFile} from '@gary-yez/go-admin-web'
```

按需选择导入；组件需要在 `<script setup>` 中导入或由宿主注册。仅有包根与 `/style` 两个公开入口；不要深层导入 `src/views`、内部 API、运行容器或路由。系统功能通过公开组件、Store、请求实例与扩展回调使用。

### 创建应用

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
| `requestHooks?: RequestHooks` | 请求发送前、成功业务响应后的同步或异步扩展 |
| `configLayouts?: ConfigLayout[]` | 配置分组的自定义布局，默认空数组 |

创建方法返回 `{app, router, pinia}`，不表示登录资料已经加载。一个页面只创建一个管理端应用；包内部请求实例和路由是共享的。

#### 生命周期

1. 设置运行模式、请求 baseURL，注册业务页面。
2. 处理记住账号信息，创建 Vue 应用和 Pinia。
3. 注册 Element Plus 图标，安装 Element Plus、Pinia。
4. 执行 setup；此时可安装业务插件，路由尚未安装，不适合访问已登录用户资料。
5. 安装路由并挂载应用。
6. 路由守卫恢复登录：已有令牌时请求当前身份，根据菜单注册动态路由；无有效身份转登录页。
7. 根组件加载公开站点信息，更新网页标题、图标等展示。

setup 不是异步启动钩子；需要等待的宿主准备工作应在 createAdminApp 之前完成。角色切换会加载新身份、重建菜单并重置页面会话，业务页面应做好卸载清理和取消请求处理。

### 宿主构建配置

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

### 业务页面与菜单

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

## 4. 全部公开导出与实际用法

### 导出索引

| 类别 | 包根全部导出 | 查阅方式 |
| --- | --- | --- |
| 应用与页面 | `createAdminApp`、`AdminOptions`、`registerAdminPages`、`ComponentModules`、`ComponentLoader` | 上文创建应用、页面注册及下方类型表 |
| 请求 | `request`、`RequestHooks`、`AdminContext` | 请求接口、追加请求处理 |
| Store | `useUserStore`、`useCommonStore`、`useSiteStore` | 状态接口 |
| 工具函数 | `confirmDelete`、`defaultSortFields`、`formatTime`、`copyText` | 删除确认、排序和工具示例 |
| 通用组件 | `ColumnTable`、`FormDialog`、`FormNote`、`PageHeader`、`TableTime`、`IconSelect` | 公共组件 |
| 配置扩展 | `ConfigField`（组件）、`ConfigForm`、`ConfigLayout`、`ConfigLayoutProps`、`ConfigValue` | 自定义配置分组布局 |
| 文件管理 | `FileUpload`、`SysFileApi`、`ManagedFile`、`UploadPolicy`、`UploadSession`、`StorageOption` | 文件上传、文件 API 与类型 |
| 样式子路径 | `@gary-yez/go-admin-web/style` | 副作用导入公共样式，不是函数或组件 |

没有列入包根导出的 `SysAuthApi`、`SysStorageApi`、`FileQuery`、`formatFileSize`、`DeleteNotice`、`adminRuntime` 等属于内部实现。需要业务接口时在宿主 `src/apis/<module>.ts` 中调用公开 request，不复制内部模块或凭名称猜测导出。

`ComponentLoader = () => Promise<Component | {default: Component}>`，`ComponentModules = Record<string, ComponentLoader>`。使用方式：

```ts
import {registerAdminPages} from '@gary-yez/go-admin-web'
import type {ComponentModules} from '@gary-yez/go-admin-web'

const pages: ComponentModules = {
  './views/product/index.vue': () => import('./views/product/index.vue'),
}
registerAdminPages(pages) // 替换全部业务页面映射，不能只传本次新增页面
```

### 请求接口

`request` 是已配置拦截器的 Axios 实例。必须在应用安装 Pinia 后使用，通常在组件或业务函数执行时调用，避免模块导入时直接发请求。

```ts
import {request} from '@gary-yez/go-admin-web'

interface Product { id: number; name: string }
interface Result<T> { code: number; message: string; data: T }

export function listProducts() {
  return request.post<unknown, Result<{list: Product[]; total: number}>>(
    '/product/list',
    {page: 1, limit: 10, filters: [], sorts: []},
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

#### 列表筛选与排序

生成器创建的列表接口使用 POST，直接发送 `{page, limit, filters, sorts}` JSON。若业务另外注册了 GET 列表接口，filters/sorts 才按查询参数方式传递 JSON 字符串，例如：

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

### 公共组件

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

#### 组件参数、事件与插槽

| 组件 | 全部自有参数 / 默认值 | 事件、插槽与方法 |
| --- | --- | --- |
| PageHeader | `title: string` 必填；`description?: string` | default 插槽，图标来自当前路由 meta |
| ColumnTable | `storageKey: string` 必填；`columnSettings: boolean = true` | toolbar 插槽，其余 el-table 属性、事件和插槽透传；不承诺公开 el-table 的 ref 方法 |
| FormDialog | title=""、description?、noteIcon?；onConfirm?: () => Promise<void>；closeOnClickModal=false、closeOnPressEscape=true、destroyOnClose=false；maxWidth=500；size='large'；confirmBtnType='primary'；confirmBtnText='确认'；cancelBtnText='取消' | `v-model` 默认 false，`v-model:form` 默认 {}；default 插槽提供 `{formRef}`，校验规则放 el-form-item |
| FormNote | title、description 为必填 string；icon='InfoFilled' | 无自定义事件或方法 |
| TableTime | value?: string/number/Date/null；emptyText='—'；suffix?: string | 无自定义事件或方法；无效时间显示 emptyText，数字按毫秒 |
| IconSelect | `v-model` 为图标标识，例如 iconoir:box | 通过 update:modelValue 更新，选择器内置搜索与分页 |
| ConfigField | configKey: string、fields: ConfigValue[]、form: ConfigForm，均必填 | 通过 form 读写与保存，不额外创建表单状态 |
| FileUpload | target?、policy?、storages?、autoUpload=true、disabled=false、allowedExtensions?、maxSize? | 完整事件、插槽及 ref 方法见文件上传小节 |

FormDialog 的 size 可用 large/default/small，confirmBtnType 可用 primary/danger；title、description、noteIcon 和按钮文案为字符串。提交失败应让 onConfirm 拒绝；如果业务自己吞掉异常并正常返回，组件会认为提交成功而关闭。

表单与展示组件组合示例，业务 API 放在 `src/apis/product.ts` 并提供返回 Promise 的 `ProductApi.Create`：

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {FormDialog, FormNote, IconSelect, TableTime} from '@gary-yez/go-admin-web'
import {ProductApi} from '../../apis/product'

const visible = ref(false)
const form = ref<{name?: string; icon?: string}>({})
function openCreate() {
  form.value = {name: '', icon: 'iconoir:box'}
  visible.value = true
}
async function save() {
  await ProductApi.Create({name: form.value.name, icon: form.value.icon})
}
</script>

<template>
  <FormNote title="商品资料" description="填写业务所需信息。" />
  <el-button @click="openCreate">新增</el-button>
  <FormDialog v-model="visible" v-model:form="form" title="新增商品" :on-confirm="save">
    <el-form-item prop="name" label="名称" :rules="[{required: true, message: '请输入名称', trigger: 'blur'}]">
      <el-input v-model="form.name" />
    </el-form-item>
    <el-form-item label="图标"><IconSelect v-model="form.icon" /></el-form-item>
  </FormDialog>
  <TableTime :value="Date.now()" suffix="本地时间" />
</template>
```

这是组件接入示例，ProductApi 为宿主业务代码，须与后端实际字段对齐；FormDialog 关闭会将 form 清为空对象，因此示例字段声明为可选。

### 删除确认与工具函数

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

subject: string、count: number、onConfirm: () => Promise<unknown> 必填，description?: string、target?: string、extraContent?: () => VNodeChild 可选。extraContent 用于额外确认内容，例如“仅删除记录”选项。返回 Promise<void>；count <= 0 直接结束。组件管理提交状态，删除失败保留弹窗；取消会正常结束 Promise，因此把依赖删除成功的刷新放进 onConfirm。内部 DeleteNotice 不是公开组件，参数类型可用 Parameters<typeof confirmDelete>[0] 推导。

`formatTime(time: number)` 将毫秒时间戳格式化为本地年月日时分秒。`copyText(text: string)` 复制内容并统一提示结果。

```ts
import {defaultSortFields, formatTime, copyText} from '@gary-yez/go-admin-web'

const sortFields = defaultSortFields({productName: 'name'})
const displayTime: string = formatTime(Date.now()) // YYYY-MM-DD HH:mm:ss，本地时区
await copyText(displayTime) // Promise<void>，内部处理复制结果提示
```

`defaultSortFields(extra: Record<string,string> = {})` 返回新的 Record<string,string>；`formatTime` 返回 string，调用方传有效毫秒时间戳。`copyText` 内部有 Clipboard 降级逻辑，Promise 正常结束不构成“已成功复制”的业务凭证。

### 状态接口

| Store | 常用状态和操作 |
| --- | --- |
| `useUserStore()` | UserData、UserMenu、IsLogin、SwitchingRole；getUserData()、switchRole(roleId)、logout(showMessage?) |
| `useSiteStore()` | info 包含 name/title/logo/favicon/copyright；load() 重新读取公开站点信息 |
| `useCommonStore()` | theme、isDev、currentTime；setTheme('light' / 'dark')、setTime() |

UserStore 还暴露 AccessToken、setAccessToken、setUserData；普通页面优先使用既有登录流程和 switchRole/logout，避免只修改令牌而遗漏菜单与会话重建。使用响应式解构时通过 Pinia 的 storeToRefs，不要直接解构状态导致丢失响应性。

不要在每个业务页面挂载时重复请求当前用户；登录恢复由路由守卫处理。需要导航可用 Vue Router 的 useRouter，或 createAdminApp 返回的 router。

各 Store 的全部自有状态、getter 和 action：

| Store | 状态 / getter | action 签名与行为 |
| --- | --- | --- |
| useUserStore | defaultAvatarURL string、AccessToken string、IsLogin bool、SwitchingRole bool、SessionVersion number、UserData；getter avatarURL string、UserMenu any[] | setAccessToken(payload: string): void 写令牌及本地存储；setUserData(payload: Object): void 更新资料并标记登录；getUserData(): Promise<void> 请求当前资料；switchRole(roleId: number): Promise<void> 切换并重建菜单；logout(showMessage=true): Promise<void> 清理本地会话并跳转 |
| useSiteStore | info 的 name/title/logo/favicon/copyright 均为 string；getter logoURL、faviconURL 提供默认资源回退 | load(): Promise<void> 加载站点信息，失败保留现有展示 |
| useCommonStore | isDev boolean、currentTime string、theme string | setTime(): void 更新一次时间；setTheme(theme?: string): void 设置/应用主题，业务使用 light/dark，省略参数仅应用当前主题 |

UserData 字段均可选：id、role_id 为 number，roles 为 `{id:number;name:string}[]`，avatar/username/nickname/phone/email 为 string，avatar_file_id 为 number/null，role 含 id、name、default_menu?、menus。以服务器返回资料为准，未登录时可能为空对象；SessionVersion 用于会话切换，不应由普通页面自行增加。上表 bool 表示 TypeScript boolean，Pinia 自带的 $patch 等方法不属于本包自定义 API。

```ts
import {storeToRefs} from 'pinia'
import {useUserStore, useSiteStore, useCommonStore} from '@gary-yez/go-admin-web'

const user = useUserStore()
const {UserData, avatarURL} = storeToRefs(user)
const site = useSiteStore()
const common = useCommonStore()
common.setTheme('dark')
// 用户主动操作时：await user.switchRole(roleId)、await user.logout()
// 需要刷新站点信息时：await site.load()
```

### 追加请求处理

通过 createAdminApp 的 requestHooks 配置扩展处理，无需手动注册 Axios 拦截器：

```ts
createAdminApp({
  apiBaseURL: import.meta.env.VITE_API_BASE_URL,
  pages,
  requestHooks: {
    beforeRequest(config, context) {
      config.headers['X-Tenant-ID'] = 'tenant-001'
      return config
    },
    afterResponse(data, context) {
      // data 是 {code, message, data} 业务响应体，不是 AxiosResponse。
      return data
    },
  },
})
```

执行顺序为：框架设置登录令牌 → beforeRequest → 发送请求 → 框架校验业务状态 → afterResponse → 返回调用方。两个回调都支持 async，必须返回处理后的配置或数据；抛出异常会使请求失败，后续成功处理不再执行。失败响应不会调用 afterResponse。

建议保留业务响应体结构，系统页面也使用同一个请求客户端。框架在异步回调结束后核对登录会话，角色切换或退出后的旧结果不会交给页面。扩展不能绕过框架原有匿名请求限制。

回调统一保存在运行容器中，重新调用 createAdminApp 时替换，不叠加注册；省略 requestHooks 会清除此前的回调。模块热更新不会额外添加扩展拦截器。宿主启动文件是否完整刷新仍遵循 Vite 的热更新边界。

两个回调的第二个参数均为公开类型 AdminContext，提供只读属性 pinia、router、dev。业务 Store 可通过 useYourStore(context.pinia) 获取，路由通过 context.router 使用。上下文不暴露请求实例、拦截器编号或清理函数。

公开类型签名（类型从包根导入）：

```ts
interface AdminContext {
  readonly pinia: Pinia
  readonly router: Router
  readonly dev: boolean
}
interface RequestHooks {
  beforeRequest?: (config: InternalAxiosRequestConfig, context: AdminContext) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
  afterResponse?: (data: any, context: AdminContext) => any | Promise<any>
}
```

这里的 Pinia、Router、InternalAxiosRequestConfig 分别来自 pinia、vue-router、axios，是签名说明，不需要业务重复声明这两个接口。

只读属性禁止替换实例，仍允许正常修改 Store 和调用 router.push()。context.dev 会读取当前运行配置。模板 main.ts 默认保留空的 requestHooks 和注释示例，无需扩展时保持为空即可。

### 自定义配置分组布局

通过 createAdminApp 的 configLayouts 注册 Vue 组件，可以替换单个分组或合并多个分组。未声明的分组继续使用默认表单。存储账号由独立的存储管理页面维护，不再占用系统配置分组；自定义分组布局能力保持可用。

```ts
import BusinessSettingsLayout from './components/BusinessSettingsLayout.vue'

createAdminApp({
  apiBaseURL: import.meta.env.VITE_API_BASE_URL,
  pages,
  configLayouts: [
    {
      title: '业务设置',
      groups: ['订单设置', '支付设置'],
      component: BusinessSettingsLayout,
    },
  ],
})
```

groups 对应后端配置定义的分组名称，不修改数据库。自定义布局优先于内置布局；一个分组只能被一个自定义布局声明，标题也不能重复。空标题、缺少组件/分组、重复标题或分组会在注册时抛错，阻止应用正常创建。分组名称变更后应同步注册项。未注册的无效配置项使用默认表单展示。

自定义组件收到以下 props：

| 参数 | 作用 |
| --- | --- |
| fields | 当前搜索条件匹配的字段；布局应展示这些字段 |
| allFields | 该布局所属分组的全部字段，可读取布局依赖的选择项 |
| form | 公共的草稿读取、修改、保存、恢复默认及状态方法 |
| filtering | 是否正在按关键词搜索，条件布局应展示所有匹配项 |

复用 ConfigField，无需复制控件、保存按钮及错误处理：

```vue
<script setup lang="ts">
import {ConfigField} from '@gary-yez/go-admin-web'
import type {ConfigLayoutProps} from '@gary-yez/go-admin-web'

defineProps<ConfigLayoutProps>()
</script>

<template>
  <div class="business-settings">
    <el-form label-position="top" @submit.prevent>
      <ConfigField
        v-for="field in fields"
        :key="field.key"
        :config-key="field.key"
        :fields="fields"
        :form="form"
      />
    </el-form>
  </div>
</template>
```

ConfigField 根据字段定义渲染单选、密码、下拉、文本等控件，复用原有保存和恢复默认逻辑。也可以自行排列指定 Key 的 ConfigField；注意为新增字段提供遍历兜底，避免配置项被布局遗漏。

form 提供 getValue、setValue、getError、isDisabled、isChanged、isSaving、save、reset，参数均以配置 Key 定位。reset 只把默认值填入草稿，save 才写入数据库。save 的校验和请求错误由页面维护并交给 ConfigField 展示，不以 Promise 完成判断是否保存成功。不要直接修改 fields 中的已保存值。页面刷新时保留未保存草稿，布局切换不丢失其他分组的修改。

布局组件只负责呈现，列表请求、保存、缓存同步、清理无效项仍由配置管理页面统一处理。注册信息跨热更新保留，不创建第二套请求实例或表单状态。

#### 配置扩展类型

| 导出类型 | 全部字段 / 方法 |
| --- | --- |
| `ConfigLayout` | title: string；groups: string[]；component: Vue Component |
| `ConfigLayoutProps` | fields: ConfigValue[]；allFields: ConfigValue[]；form: ConfigForm；filtering: boolean |
| `ConfigForm` | getValue(key: string): any；setValue(key: string, value: any): void；getError(key: string): string；isDisabled/isChanged/isSaving(key: string): boolean；save(key: string): Promise<void>；reset(key: string): void |
| `ConfigValue` | registered: boolean；group/key/label/description/updated_at: string；type: 'string'/'bool'/'int'/'float64'/'[]string'；control: ''/'textarea'/'password'/'select'/'radio'/'multi-select'；rows: number；options: {label: string; value: string/boolean/number}[]；default/value: string/boolean/number/string[] |

表中斜杠表示类型联合或同类型字段分组。ConfigField 的 configKey 在 fields 中找不到时不渲染。配置定义中的 ConfigField 接口未从包根导出，不能与这里同名的 Vue 组件混淆。

例如在收到 props 的布局组件中，`props.form.setValue('order.timeout', 60)` 修改草稿，`await props.form.save('order.timeout')` 请求保存，然后读取 `getError/isChanged` 展示真实结果；`reset` 仅还原草稿，不写数据库。不要仅凭 await 正常结束提示保存成功。


### 文件管理页面

公共前端内置“系统运维 → 文件管理”，包含“文件列表”和“存储管理”两个子菜单，随系统菜单自动加载，无需在模板中复制页面。后端需要使用包含 sys_file 模块的版本，并在角色中配置菜单及对应 API 权限。

页面沿用公共筛选、列选择、分页及删除确认组件。支持上传、图片/媒体/PDF/文本预览、下载和批量删除；上传阈值和分片大小读取后端策略，当前后端默认超过 100 MiB 分片，每片 20 MiB。上传抽屉展示进度，可以暂停，刷新或重启后从列表“继续上传”重新选择原文件；页面核对文件名、大小和修改时间，并跳过服务端已经确认的分片。

“清理过期上传”按会话 expires_at 清理，当前后端默认有效期 1 天，创建后不随配置改变。删除已完成文件默认同时删除存储对象，也支持仅删除记录；业务引用可能失效。预览/下载可能返回公开地址、云存储签名或本地临时凭证，私有链接当前默认 3600 秒；本地相对路径通过统一请求的 API 基础地址解析。具体以服务端配置和返回值为准，不在业务页面写死阈值或有效期。

存储管理支持同一引擎的多个账号，按所选引擎显示配置表单。可以修改名称、凭据、启用状态和默认账号；账号已被文件引用时，页面禁用位置字段，后端也会验证。密码原值不回显，编辑时留空保留。

上传窗口可选择已启用的存储账号，默认选中默认账号；续传固定原账号，不能中途更换。文件列表显示账号名称，并支持按账号筛选。默认账号变化只影响新的默认选择，不改变已有文件归属。


#### 业务文件上传

FileUpload 自动接入文件管理上传接口，加载全局上传配置和存储账号，处理普通上传、分片、进度、暂停、续传与取消。组件不包含抽屉或弹窗，不传插槽时展示默认上传界面；传入默认作用域插槽后，由业务完全自定义界面，上传逻辑保持不变。

例如头像选择界面（上传后还需将文件 ID 提交给自己的资料接口）：

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {FileUpload, SysFileApi, type ManagedFile} from '@gary-yez/go-admin-web'

const avatarUrl = ref('')
const avatarFileId = ref<number>()

async function uploaded(file: ManagedFile) {
  avatarFileId.value = file.id
  avatarUrl.value = await SysFileApi.Link(file.id, true)
  // 保存资料时提交 avatarFileId，后端校验文件归属、完成状态及图片内容。
}
</script>

<template>
  <FileUpload :allowed-extensions="['jpg', 'png', 'webp']"
              :max-size="5 * 1024 * 1024"
              @success="uploaded">
    <template #default="{ select, canSelect, uploading, processing, progress, error, loading, reload }">
      <el-avatar :src="avatarUrl" :size="80"/>
      <el-button :disabled="!canSelect" :loading="uploading || loading" @click="select">
        更换头像
      </el-button>
      <el-progress v-if="uploading" :percentage="progress" :indeterminate="processing"/>
      <el-text v-if="error" type="danger">{{ error }}</el-text>
      <el-button v-if="error && !uploading" text @click="reload">重新加载配置</el-button>
    </template>
  </FileUpload>
</template>
```

不需要自定义界面时：

```vue
<FileUpload @success="uploaded"/>
```

默认选择文件后自动上传。传入 :auto-upload="false" 可改为手动开始。文件管理页面自行用 el-drawer 包裹该组件，并采用手动上传。

| 参数 / 事件 | 用途 |
|---|---|
| auto-upload | 默认 true，选中文件且校验通过后自动上传 |
| disabled | 禁止选择、开始、修改存储和取消；正在运行的请求仍可暂停 |
| allowed-extensions | 可选业务扩展名数组，与全局限制取交集 |
| max-size | 可选业务大小上限，单位字节 |
| target | 续传的文件记录，需要重新选择原文件 |
| policy、storages | 可选；两者都传入时复用调用方数据，否则组件挂载时加载配置 |
| success(file) | 上传完成，返回 ManagedFile；业务保存 file.id |
| session(file) | 创建或读取分片会话后返回文件记录，调用方可保存用于重新挂载续传 |
| cancelled | 会话已成功取消 |
| error(message) | 文件校验或上传、取消失败 |
| changed | 上传尝试结束或取消后触发，供列表刷新；不代表成功 |

默认插槽提供以下状态和操作，业务不用重新编写上传请求：

| 插槽属性 | 用途 |
|---|---|
| file、result | 所选浏览器文件、上传成功后的文件记录 |
| uploading、processing、cancelling、completed | 上传中、存储处理或合并中、取消中、已完成 |
| progress、error、message、loading | 进度、错误、状态提示、配置加载状态 |
| policy、storages、storageId、sessionId | 上传策略、可用存储账号、当前账号、会话 ID |
| allowedExtensions、accept | 全局与业务限制的交集、文件选择器 accept 字符串 |
| canSelect、canStart | 当前是否可以选择文件或开始上传 |
| select() | 打开组件内置的文件选择器 |
| chooseFile(file) | 接收业务拖拽等方式取得的 File，复用校验和自动上传 |
| setStorage(id) | 选择存储账号；上传中和已有会话时禁止更换 |
| start()、resume()、pause() | 开始、继续、暂停请求；暂停保留分片会话 |
| cancel() | 取消未完成会话并清理已上传分片；请先暂停并等待 uploading 为 false，可由业务自行确认 |
| reset() | 暂停并重置本地状态，重新加载配置；不会删除服务器上的会话 |
| reload() | 重新加载配置，不清空当前文件和会话 |

select、chooseFile、start、resume、pause、cancel、reset、reload 也通过组件 ref 公开。默认界面取消会话时带确认弹窗；自定义插槽调用 cancel() 不强制弹窗。

组件卸载会中止请求。关闭外部抽屉时应通过 v-if 卸载组件，或者用组件 ref 调用 pause()；仅 v-show 隐藏不会暂停。需要重新挂载后续传时，保留 session 事件返回的记录并通过 target 传回；组件不持久化会话，也不会自动读取浏览器本地文件。清空业务保存的会话引用时注意区分“上传成功”和“暂停”，避免丢失续传入口。

组件使用 GET /sys_file/options，不需要文件列表查询权限。角色需拥有 options、upload 以及分片所需 begin、session、part、complete、abort 接口权限；预览需要 link 权限，组件不会自动授予权限。

业务限制属于前端交互限制，业务后端仍需校验关联文件的归属、完成状态、大小和真实内容。全局扩展名限制由上传后端强制执行。上传不会自动修改头像字段或其他业务数据。

实际文件预览可调用公开的 SysFileApi.Link(file.id, true)。返回地址可能过期，业务持久化文件 ID，不保存临时地址。上面的头像示例需要预先启用默认存储账号；若没有默认账号，自定义界面应通过 storages 和 setStorage(id) 提供账号选择。

#### SysFileApi 全部方法

除 Link 返回 `Promise<string>` 外，方法均返回 Promise 业务响应体，数据在 `.data`。有明确数据结构的方法在表中标出，其余方法完成时检查统一 request 的成功/失败结果即可。

| 方法签名 | `.data` / 返回值 | 实际用途 |
| --- | --- | --- |
| `Options(signal?: AbortSignal)` | `{policy: UploadPolicy; storages: StorageOption[]}` | 加载上传策略和可选账号 |
| `List(query)` | `{list: ManagedFile[]; total: number; policy: UploadPolicy; storages: StorageOption[]}` | query 含 page、limit 数字，filters: {field, operator, value: string}[]，sorts: {field, order}[] |
| `Upload(file: File, storageId: number, signal: AbortSignal, onUploadProgress)` | ManagedFile | 普通上传；进度回调 `(event: AxiosProgressEvent) => void` |
| `Begin(file: File, storageId: number, signal: AbortSignal)` | UploadSession | 创建会话，自动发送文件名/大小/修改时间 |
| `Session(id: number, signal?: AbortSignal)` | UploadSession | 取得会话、已有分片和固定分片大小 |
| `Part(id: number, number: number, blob: Blob, signal: AbortSignal, onUploadProgress)` | 成功业务响应 | 按编号上传单片，进度回调同 Upload |
| `Complete(id: number, signal: AbortSignal)` | ManagedFile | 合并分片，取得完成记录 |
| `Abort(id: number)` | 成功业务响应 | 取消会话并清理分片 |
| `Delete(ids: number[], recordsOnly = false)` | 成功业务响应 | 默认连同存储对象删除；true 仅删除数据库记录/回执 |
| `Cleanup()` | `{count: number}` | 清理已过期的未完成上传 |
| `Link(id: number, preview = false, signal?: AbortSignal)` | string URL（直接返回） | true 获取预览链接，false 获取下载链接；内部解析相对地址 |

这些方法复用框架鉴权，各自需要对应后端接口权限；Options 不需要文件列表权限。FileQuery 没有包根导出，需要显式类型时可用 `Parameters<typeof SysFileApi.List>[0]`。不要为普通上传重新编写分片状态机，默认使用 FileUpload；SysFileApi 适用于确需控制底层调用的业务。

```ts
import {SysFileApi} from '@gary-yez/go-admin-web'

const controller = new AbortController()
const {data: options} = await SysFileApi.Options(controller.signal)
const {data: listing} = await SysFileApi.List({page: 1, limit: 10, filters: [], sorts: []})
const first = listing.list.find(file => file.status === 'ready')
if (first) {
  const previewURL: string = await SysFileApi.Link(first.id, true, controller.signal)
  // 交给图片/媒体预览组件；业务只保存 first.id。
}
// 主动销毁当前业务流程时：controller.abort()
```

下列为调用形式，需放在用户明确选择文件或确认删除的业务流程中：

```ts
await SysFileApi.Upload(file, storageId, controller.signal, event => {
  progress.value = event.total ? Math.round(event.loaded / event.total * 100) : 0
})
await SysFileApi.Delete(selectedIds)       // 删除对象和记录
await SysFileApi.Delete(selectedIds, true) // 仅删除记录，远端对象需另外管理
const {data: cleaned} = await SysFileApi.Cleanup()
```

分片调用顺序为 Begin → Part → Complete；续传先 Session，按其 part_size 切片并跳过 parts 中已收到的编号，取消用 Abort。FileUpload 已实现这条流程以及失败、取消和重新选择文件校验，优先复用。

#### 文件与上传数据类型

| 类型 | 全部字段 | 单位与含义 |
| --- | --- | --- |
| `ManagedFile` | id、size、storage_id、user_id、last_modified: number；name、content_type、storage_name、engine、username、created_at、updated_at: string；status: 'uploading'/'ready'；is_owner、multipart: boolean；expires_at: string/null | size 为字节；last_modified 为原文件修改时间毫秒值；业务关联 id，不保存临时 URL |
| `UploadPolicy` | allowed_extensions: string[]；ordinary_limit、part_size、max_size、session_days: number | 三个大小字段均为字节，session_days 为天；读取服务端策略，不硬编码 |
| `UploadSession` | file: ManagedFile；parts: {number: number; size: number}[]；part_size: number | 分片编号从 1 开始，size 和 part_size 为字节 |
| `StorageOption` | id: number；name: string；engine: 'local'/'tencent'/'aliyun'/'s3'；is_default、enabled: boolean | 仅账号选项，不含凭据 |

前端类型体现当前响应结构，不构成可信输入校验。归属、权限、上传完成状态和文件内容仍由后端业务校验。

## 5. 使用注意事项与升级

本包由宿主执行类型检查和构建，例如模板中的 `yarn build`。仅安装 npm 包不会产生可部署管理端。

升级公共前端后，重新编译宿主并部署新产物；已生成的业务 Vue 文件仍属于业务项目，不会被 npm 升级自动重写。升级后端接口时同步检查前端版本、菜单组件 Key 和 peerDependencies，提交更新后的锁文件。

- 本包面向浏览器 SPA，依赖 DOM 与 localStorage；不要在 SSR 服务端直接执行入口。
- 使用统一应用、路由、Pinia 和 request；扩展请求使用 requestHooks。afterResponse 也影响系统页面，应保留业务响应协议。
- 新增业务页面要同时注册页面映射并配置后端菜单与角色权限。前端 dev 和菜单可见性不控制后端安全边界。
- 统一 request 会拒绝业务错误、网络错误与旧会话结果；页面区分错误和主动取消，完成时清理 loading，不吞错后显示成功。
- FormDialog 关闭会清空表单；confirmDelete 的 Promise 正常结束也可能是取消；ConfigForm.save 和 copyText 内部处理部分错误，不能只凭 Promise 完成判定业务成功。
- FileUpload 隐藏不等于暂停，销毁或调用 pause 才中止请求；暂停保留会话，取消才清理。大小、分片与有效期遵循服务端策略，文件 ID 与临时地址不要混用。
- 文件删除可能使业务关联失效；仅删除记录会保留远端对象。公开存储 URL 不会因前端传 preview=false 就必然强制下载，媒体预览还受浏览器编码及存储跨域配置限制。
- 默认分支文档可能领先于 npm 发布版本，使用新导出前检查当前安装版本；框架内部文件没有包根导出时不得深层导入。

## 6. 文档维护约定

后续 README 始终按“项目介绍 → 系统功能 → 安装与引用 → 全部公开导出与实际用法 → 使用注意事项”组织，服务于独立模板使用者和 AI。新内容放到所属章节，避免文末不断堆叠功能补丁说明。

- 以 package.json 的 exports 和 src/index.ts 为公开清单，覆盖组件、方法、Store、类型与样式入口；内部源码的 export 不冒充公共 API。
- 每个组件说明导入方式、props 类型/默认值、事件、插槽、v-model 与公开 ref 方法；没有的方法不要暗示可用。方法与类型说明输入、返回值、单位和错误行为。
- 为每类公开能力提供实际接入示例，写清宿主需准备的页面、API、样式与构建配置；完整示例与片段明确区分。
- 变更公开能力时同步索引、参数表、示例和注意事项，删除废弃说明。依赖服务端动态策略的值应说明配置来源，不能在多处写死不同默认值。
- 发布前核对 peerDependencies、源码导出和配套后端协议；未验证的浏览器、上传或构建行为不能写成已验证结果。
