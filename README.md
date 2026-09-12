# @gary-yez/go-admin-web

go-admin 的公共前端包，提供登录、布局、角色切换、系统页面、请求封装及业务组件。业务页面和环境配置由宿主项目维护。

当前版本以 Vue SFC / TypeScript 源码发布，由宿主 Vite 编译，保留类型提示和页面懒加载；它不是可直接放入浏览器 script 标签的预编译脚本。要求 Vue 3.5、Vue Router 4、Pinia 2、Element Plus 2、Vite 8，以及 Vue 插件、Less、Tailwind CSS 3。每个网页只创建一个管理端应用。

逐文件迁移清单见 [MIGRATION.md](MIGRATION.md)。

包内目录已展开为 `src/apis`、`src/views`、`src/components`、`src/layouts`、`src/routes`、`src/stores`、`src/utils`。菜单的 `../core/views/...` 是系统页面的注册 Key，不代表包内物理路径；表格 `storage-key` 也保持原值，保留本地列设置。

## 项目接入

模板已经完成接入。在 `web` 下执行 `yarn install`、`yarn dev` 即可。当前依赖是 `file:../../go-admin-web`，无需访问尚未发布的 npm 包。

```ts
import {createAdminApp} from '@gary-yez/go-admin-web'
import '@gary-yez/go-admin-web/style'
import './style.css'
import {pages} from './pages'

createAdminApp({
    apiBaseURL: import.meta.env.VITE_API_BASE_URL,
    dev: import.meta.env.DEV,
    pages,
})
```

`pages.ts` 必须在宿主项目中收集业务文件：

```ts
import type {Component} from 'vue'
export const pages = import.meta.glob<{default: Component}>('./views/**/*.vue')
```

`./views/product/index.vue` 自动映射到后端菜单的 `../views/product/index.vue`，系统菜单的 `../core/views/...` 路径保持有效。包不扫描宿主目录。模板 main.ts 保留了 pages 模块热更新：新增、删除页面后更新注册表和组件选择列表。

## 公开接口

| 导出 | 职责 |
| --- | --- |
| `createAdminApp(options)` | 创建并挂载应用，返回 app、router、pinia |
| `registerAdminPages(pages)` | 替换业务页面注册表，支持新增、删除页面后的刷新 |
| `request` | 与系统页面共用 Axios 实例，处理令牌、角色切换、业务错误和登录失效 |
| `useUserStore` | 当前账号、角色和登录状态 |
| `useCommonStore` | 主题等公共界面状态 |
| `useSiteStore` | 后端站点配置 |
| `ColumnTable` | 表格、列选择及本地列配置 |
| `PageHeader` | 页面标题及当前菜单图标 |
| `FormDialog`、`FormNote` | 表单弹窗与提示 |
| `TableTime` | 时间展示 |
| `IconSelect` | 图标选择 |
| `confirmDelete` | 统一删除确认 |
| `defaultSortFields` | 默认排序字段 |
| `formatTime`、`copyText` | 时间格式化及文本复制 |

启动参数：

- `apiBaseURL`：必填，宿主读取 .env 后传入；包不读取业务环境文件。
- `pages`：业务页面加载函数映射，可省略。
- `dev`：显示开发工具，默认 false；后端仍通过自己的 dev 配置控制访问。
- `mount`：挂载目标，默认 #app。
- `setup(app)`：在安装状态管理后、启动路由前注册业务插件或组件。

```ts
import {request, ColumnTable, PageHeader} from '@gary-yez/go-admin-web'

const ProductApi = {
    List: (query: unknown) => request.post('/product/list', query),
}
```

保留模板 public 目录里的 logo 和默认头像作为项目品牌资源。Iconify 自定义元素运行脚本已随包加载，无需在 index.html 单独引用。

## 构建配置

公共包需要跳过依赖预构建，底层库正常预构建，避免 CommonJS 导出和重复 Vue 实例问题。使用模板的 vite.config.ts 配置：

```ts
optimizeDeps: {
    exclude: ['@gary-yez/go-admin-web'],
    include: ['vue', 'pinia', 'vue-router', 'element-plus',
        'element-plus/es/locale/lang/zh-cn', '@element-plus/icons-vue',
        'axios', 'nprogress', 'echarts', 'highlight.js', 'dayjs'],
},
resolve: {dedupe: ['vue', 'pinia', 'vue-router', 'element-plus']},
```

Vue 插件应将 `iconify-icon` 标记为自定义元素（模板已配置）。Tailwind 的 content 除业务目录外，还需包含：

```js
'./node_modules/@gary-yez/go-admin-web/src/**/*.{vue,js,ts}'
```

公共样式通过 `@gary-yez/go-admin-web/style` 导入，Tailwind 入口保留在宿主 `src/style.css`，由同一次构建处理系统和业务样式。

## 本地开发与发布

本地源码位于同级 `go-admin-web/src`。在维护总目录执行 `./maintain.ps1 init` 建立源码链接，再通过 `./maintain.ps1 web` 启动；修改组件可直接热更新。依赖清单变化后再次运行 init。详见维护目录 README。

发布前先在 web 目录执行 `yarn build` 验证模板。包目录中可运行：

```sh
npm pack --dry-run
npm pack
```

打包仅包含 package.json、README 和 src，不包含业务代码、配置文件或 node_modules。这个目录可以独立迁入自己的仓库，无需改变包内源码路径。

确认 npm 账号拥有 @gary-yez scope 权限后，由维护者在包目录发布：

```sh
npm publish --access public
```

本次仅抽离代码，没有执行发布。发布后，用户可将本地 file 依赖替换为：

```sh
yarn add @gary-yez/go-admin-web@指定版本
```

使用注册表版本后，Dockerfile 不再需要两行 COPY --from=go-admin-web。系统页面跟随 npm 包更新；业务页面、.env、部署文件仍由用户维护。

代码生成器需搭配包含公共包导入改动的 go-admin 版本发布，旧版本生成器仍生成旧的相对路径。源码包 0.1.0 的后端接口沿用此次抽离前的接口。
