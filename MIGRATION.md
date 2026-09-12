# 前端公共包抽离变更清单

公共源码从 web/src 移入 packages/go-admin-web/src，系统页面的业务逻辑与样式保留。下面列出每个原文件的新位置。

| 原路径 | 新路径 |
| --- | --- |
| web/public/js/iconify-icon.min.js | packages/go-admin-web/src/assets/iconify-icon.js |
| web/src/App.vue | packages/go-admin-web/src/App.vue |
| web/src/assets/css/global.less | packages/go-admin-web/src/assets/css/global.less |
| web/src/assets/css/tailwind.less | web/src/style.css |
| web/src/assets/css/theme.less | packages/go-admin-web/src/assets/css/theme.less |
| web/src/components/core/ColumnTable.vue | packages/go-admin-web/src/components/ColumnTable.vue |
| web/src/components/core/DeleteNotice.vue | packages/go-admin-web/src/components/DeleteNotice.vue |
| web/src/components/core/FormDialog.vue | packages/go-admin-web/src/components/FormDialog.vue |
| web/src/components/core/FormNote.vue | packages/go-admin-web/src/components/FormNote.vue |
| web/src/components/core/IconSelect.vue | packages/go-admin-web/src/components/IconSelect.vue |
| web/src/components/core/MenuItem.vue | packages/go-admin-web/src/components/MenuItem.vue |
| web/src/components/core/PageHeader.vue | packages/go-admin-web/src/components/PageHeader.vue |
| web/src/components/core/TableTime.vue | packages/go-admin-web/src/components/TableTime.vue |
| web/src/core/apis/sys_admin.ts | packages/go-admin-web/src/apis/sys_admin.ts |
| web/src/core/apis/sys_api_token.ts | packages/go-admin-web/src/apis/sys_api_token.ts |
| web/src/core/apis/sys_api_token_manage.ts | packages/go-admin-web/src/apis/sys_api_token_manage.ts |
| web/src/core/apis/sys_apis.ts | packages/go-admin-web/src/apis/sys_apis.ts |
| web/src/core/apis/sys_auth.ts | packages/go-admin-web/src/apis/sys_auth.ts |
| web/src/core/apis/sys_config.ts | packages/go-admin-web/src/apis/sys_config.ts |
| web/src/core/apis/sys_cron_job.ts | packages/go-admin-web/src/apis/sys_cron_job.ts |
| web/src/core/apis/sys_devtools.ts | packages/go-admin-web/src/apis/sys_devtools.ts |
| web/src/core/apis/sys_login_log.ts | packages/go-admin-web/src/apis/sys_login_log.ts |
| web/src/core/apis/sys_menu.ts | packages/go-admin-web/src/apis/sys_menu.ts |
| web/src/core/apis/sys_monitor.ts | packages/go-admin-web/src/apis/sys_monitor.ts |
| web/src/core/apis/sys_role.ts | packages/go-admin-web/src/apis/sys_role.ts |
| web/src/core/views/sys_admin/index.vue | packages/go-admin-web/src/views/sys_admin/index.vue |
| web/src/core/views/sys_api_token/index.vue | packages/go-admin-web/src/views/sys_api_token/index.vue |
| web/src/core/views/sys_api_token_manage/index.vue | packages/go-admin-web/src/views/sys_api_token_manage/index.vue |
| web/src/core/views/sys_apis/cleanup_api.vue | packages/go-admin-web/src/views/sys_apis/cleanup_api.vue |
| web/src/core/views/sys_apis/index.vue | packages/go-admin-web/src/views/sys_apis/index.vue |
| web/src/core/views/sys_apis/method_type.ts | packages/go-admin-web/src/views/sys_apis/method_type.ts |
| web/src/core/views/sys_config/index.vue | packages/go-admin-web/src/views/sys_config/index.vue |
| web/src/core/views/sys_config/values.vue | packages/go-admin-web/src/views/sys_config/values.vue |
| web/src/core/views/sys_cron_job/helper.ts | packages/go-admin-web/src/views/sys_cron_job/helper.ts |
| web/src/core/views/sys_cron_job/index.vue | packages/go-admin-web/src/views/sys_cron_job/index.vue |
| web/src/core/views/sys_cron_job/logs.vue | packages/go-admin-web/src/views/sys_cron_job/logs.vue |
| web/src/core/views/sys_devtools/CodeDiff.vue | packages/go-admin-web/src/views/sys_devtools/CodeDiff.vue |
| web/src/core/views/sys_devtools/CodeHighlight.vue | packages/go-admin-web/src/views/sys_devtools/CodeHighlight.vue |
| web/src/core/views/sys_devtools/autocode.vue | packages/go-admin-web/src/views/sys_devtools/autocode.vue |
| web/src/core/views/sys_devtools/autocode_history.vue | packages/go-admin-web/src/views/sys_devtools/autocode_history.vue |
| web/src/core/views/sys_devtools/codeDiff.ts | packages/go-admin-web/src/views/sys_devtools/codeDiff.ts |
| web/src/core/views/sys_home/index.vue | packages/go-admin-web/src/views/sys_home/index.vue |
| web/src/core/views/sys_login_log/index.vue | packages/go-admin-web/src/views/sys_login_log/index.vue |
| web/src/core/views/sys_menu/index.vue | packages/go-admin-web/src/views/sys_menu/index.vue |
| web/src/core/views/sys_monitor/index.vue | packages/go-admin-web/src/views/sys_monitor/index.vue |
| web/src/core/views/sys_role/index.vue | packages/go-admin-web/src/views/sys_role/index.vue |
| web/src/core/views/sys_userinfo/index.vue | packages/go-admin-web/src/views/sys_userinfo/index.vue |
| web/src/layouts/dashboard.vue | packages/go-admin-web/src/layouts/dashboard.vue |
| web/src/layouts/login.vue | packages/go-admin-web/src/layouts/login.vue |
| web/src/routes/componentModules.ts | packages/go-admin-web/src/routes/componentModules.ts |
| web/src/routes/index.ts | packages/go-admin-web/src/routes/index.ts |
| web/src/routes/syncMenu.ts | packages/go-admin-web/src/routes/syncMenu.ts |
| web/src/stores/common.ts | packages/go-admin-web/src/stores/common.ts |
| web/src/stores/site.ts | packages/go-admin-web/src/stores/site.ts |
| web/src/stores/user.ts | packages/go-admin-web/src/stores/user.ts |
| web/src/utils/confirmDelete.ts | packages/go-admin-web/src/utils/confirmDelete.ts |
| web/src/utils/formatTime.ts | packages/go-admin-web/src/utils/formatTime.ts |
| web/src/utils/passwordPolicy.ts | packages/go-admin-web/src/utils/passwordPolicy.ts |
| web/src/utils/rememberAccount.ts | packages/go-admin-web/src/utils/rememberAccount.ts |
| web/src/utils/request.ts | packages/go-admin-web/src/utils/request.ts |
| web/src/utils/sort.ts | packages/go-admin-web/src/utils/sort.ts |
| web/src/utils/utils.ts | packages/go-admin-web/src/utils/utils.ts |

## 实际调整的公共代码

- src/index.ts：新增 createAdminApp、公开组件、工具及状态管理入口。
- src/runtime.ts：由宿主传入开发模式。
- src/icons.ts：注册随包提供的 Iconoir 图标；assets/iconify-icon.js 保留原脚本。
- src/style.ts：统一公共样式入口，Tailwind 入口留在宿主。
- src/routes/componentModules.ts：系统页面由包收集，业务页面改由宿主注册，保留原菜单组件路径格式。
- src/utils/request.ts：不再读取 import.meta.env，API 地址通过 createAdminApp 配置现有请求实例。
- src/stores/common.ts、src/stores/user.ts、src/views/sys_devtools/autocode.vue：从启动参数读取开发模式。

## 模板项目接入文件

- web/src/main.ts：调用公共包启动，并处理业务页面映射热更新。
- web/src/pages.ts：宿主 import.meta.glob 收集业务页面。
- web/src/style.css：宿主 Tailwind 及业务样式入口。
- web/index.html：删除单独加载图标脚本的标签。
- web/package.json、web/yarn.lock：安装本地公共包，公共功能依赖移至包清单。
- web/vite.config.ts：公共源码包排除预构建，底层依赖正常预构建，去重 Vue 等共享库。
- web/tailwind.config.js：扫描安装包内的样式类。
- Dockerfile：安装前端依赖前复制本地包，继续先编译前端再编译 Go。
- README.md：更新项目结构与公共包调用方式。
- packages/go-admin-web/package.json、README.md、MIGRATION.md：包描述、使用发布说明及本清单。

## go-admin 框架配套修改

- internal/templates/web/api.ts.tmpl：生成的业务 API 从公共包导入 request。
- internal/templates/web/view.vue.tmpl：生成的业务页面从公共包导入表格、标题、弹窗、时间、排序及删除确认。

需发布包含这两项模板改动的 go-admin 版本后，再更新业务项目依赖；本次没有修改 server/go.mod 或发布任何包。
