<template>
  <el-container :class="{'sidebar-collapsed':sidebarCollapsed}" class="main-layout">
    <el-header class="main-header">
      <div class="header-inner">
        <div class="header-left">
          <div class="logo">
            <img :src="siteStore.logoURL" alt="" class="logo-img">
            <div :title="siteStore.info.name" class="logo-text">{{ siteStore.info.name || 'Go Admin' }}</div>
          </div>
          <button :aria-expanded="!sidebarCollapsed" :aria-label="sidebarCollapsed ? '展开菜单' : '收起菜单'" :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
                  aria-controls="dashboard-sidebar" class="sidebar-toggle"
                  type="button" @click="sidebarCollapsed = !sidebarCollapsed">
            <el-icon>
              <Expand v-if="sidebarCollapsed"/>
              <Fold v-else/>
            </el-icon>
          </button>
          <div class="header-location">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item v-for="item in $route.matched" :key="item.path">{{
                  item.meta.name
                }}
              </el-breadcrumb-item>
            </el-breadcrumb>
            <div class="header-time">当前时间：{{ commonStore.currentTime }}</div>
          </div>
        </div>
        <div class="header-actions">
          <el-select v-if="(userStore.UserData.roles?.length || 0) > 1" :disabled="userStore.SwitchingRole" :loading="userStore.SwitchingRole"
                     :model-value="userStore.UserData.role_id" aria-label="切换当前角色"
                     class="role-switch" size="large" @change="handleSwitchRole">
            <template #prefix>
              <el-icon>
                <User/>
              </el-icon>
            </template>
            <el-option v-for="role in userStore.UserData.roles" :key="role.id" :label="role.name" :value="role.id"/>
          </el-select>
          <a aria-label="在新标签页打开 Go Admin 脚手架 GitHub 仓库" class="header-icon-btn" href="https://github.com/Gary-Yez/go-admin-template"
             rel="noopener noreferrer" target="_blank"
             title="GitHub · Go Admin 脚手架">
            <iconify-icon icon="iconoir:github"/>
          </a>
          <button :aria-label="commonStore.theme === 'dark' ? '切换浅色主题' : '切换深色主题'" :title="commonStore.theme === 'dark' ? '切换浅色主题' : '切换深色主题'"
                  class="header-icon-btn"
                  type="button"
                  @click="commonStore.setTheme(commonStore.theme === 'dark' ? 'light' : 'dark')">
            <iconify-icon :icon="commonStore.theme === 'dark' ? 'iconoir:sun-light' : 'iconoir:half-moon'"/>
          </button>
          <el-dropdown :hide-timeout="150" :show-timeout="100" placement="bottom-end" trigger="hover"
                       @command="handleCommand" @visible-change="(visible:boolean)=>accountMenuOpen = visible">
            <button :aria-expanded="accountMenuOpen" :class="{'is-open':accountMenuOpen}" aria-haspopup="menu" aria-label="用户菜单"
                    class="account-trigger" type="button">
              <el-avatar :size="32" :src="userStore.avatarURL"/>
              <span class="account-trigger-name">{{ userStore.UserData.nickname || userStore.UserData.username }}</span>
              <el-icon class="account-arrow">
                <ArrowDown/>
              </el-icon>
            </button>
            <template #dropdown>
              <div class="account-panel">
                <div class="account-summary">
                  <div class="account-summary-name">{{
                      userStore.UserData.nickname || userStore.UserData.username
                    }}
                  </div>
                  <div class="account-summary-role"><span
                      class="account-role-dot"></span>{{ userStore.UserData.role?.name || '未分配角色' }}
                  </div>
                </div>
                <el-dropdown-menu class="account-menu">
                  <el-dropdown-item :icon="User" command="userinfo">个人信息</el-dropdown-item>
                  <el-dropdown-item :icon="Key" command="api-token">API 密钥</el-dropdown-item>
                  <el-dropdown-item :icon="SwitchButton" class="account-logout" command="logout" divided>退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </div>
            </template>
          </el-dropdown>

        </div>
      </div>
    </el-header>
    <el-container class="content-layout">
      <el-aside id="dashboard-sidebar" class="content-aside">
        <div class="aside">
          <el-menu :collapse="sidebarCollapsed" :collapse-transition="false" :default-active="$route.path" class="main-slider-menu"
                   router>
            <MenuItem :menus="menus"></MenuItem>
          </el-menu>
        </div>
      </el-aside>
      <el-main class="content-content">
        <el-tabs v-model="activeTab" class="nav-tabs" type="card" @tab-remove="removeTab" @tab-click="onTabClick">
          <el-tab-pane v-for="(tab, tabIndex) in visitedTabs" :key="tab.fullPath" :closable="visitedTabs.length > 1 && !tabBusy && !userStore.SwitchingRole"
                       :disabled="tabBusy || userStore.SwitchingRole"
                       :name="tab.fullPath">
            <template #label>
              <el-dropdown trigger="contextmenu">
                <div class="tab-label">
                  <iconify-icon :icon="tab.meta.icon || 'iconoir:view-grid'"></iconify-icon>
                  <span>{{ tab.meta.name }}</span>
                </div>
                <template #dropdown>
                  <el-dropdown-menu class="tab-context-menu">
                    <el-dropdown-item :disabled="tabBusy || userStore.SwitchingRole" :icon="Refresh"
                                      @click="handleTabAction('refresh', tab.fullPath)">刷新页面
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="tabBusy || userStore.SwitchingRole || visitedTabs.length <= 1"
                                      :icon="Close"
                                      @click="handleTabAction('current', tab.fullPath)">关闭当前
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="tabBusy || userStore.SwitchingRole || visitedTabs.length <= 1"
                                      :icon="Remove"
                                      @click="handleTabAction('other', tab.fullPath)">关闭其他
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="tabBusy || userStore.SwitchingRole || tabIndex === 0" :icon="Back"
                                      divided
                                      @click="handleTabAction('left', tab.fullPath)">关闭左侧
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="tabBusy || userStore.SwitchingRole || tabIndex === visitedTabs.length - 1"
                                      :icon="Right"
                                      @click="handleTabAction('right', tab.fullPath)">关闭右侧
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="tabBusy || userStore.SwitchingRole" :icon="CircleClose" divided
                                      @click="handleTabAction('all', tab.fullPath)">关闭全部
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-tab-pane>
        </el-tabs>
        <div v-loading="userStore.SwitchingRole" class="dashboard-page" element-loading-text="正在切换角色">
          <router-view v-slot="{ Component }">
            <transition appear mode="out-in" name="dashboard-route">
              <div v-if="!userStore.SwitchingRole" :key="route.fullPath + ':' + pageRevision" class="route-page">
                <component :is="Component" v-if="Component"/>
                <el-empty v-else description="当前角色暂无可访问页面，请联系管理员配置菜单"/>
              </div>
            </transition>
          </router-view>
        </div>
        <footer v-if="siteStore.info.copyright" class="dashboard-copyright">{{ siteStore.info.copyright }}</footer>
      </el-main>
    </el-container>
  </el-container>
</template>

<script lang="ts" setup>
import {computed, nextTick, onUnmounted, ref, watch} from "vue";
import {
  ArrowDown,
  Back,
  CircleClose,
  Close,
  Expand,
  Fold,
  Key,
  Refresh,
  Remove,
  Right,
  SwitchButton,
  User
} from "@element-plus/icons-vue";
import {useUserStore} from "../stores/user";
import MenuItem from "../components/MenuItem.vue";
import {useCommonStore} from "../stores/common";
import {isNavigationFailure, NavigationFailureType, useRoute, useRouter} from "vue-router";
import {useSiteStore} from "../stores/site";

const siteStore = useSiteStore()
const sidebarCollapsed = ref(false)
const accountMenuOpen = ref(false)
const commonStore = useCommonStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const menus = computed(() => userStore.UserMenu)
commonStore.setTheme()
commonStore.setTime()
const activeTab = ref(route.fullPath)
const visitedTabs = ref([
  {
    fullPath: route.fullPath,
    meta: route.meta,
  },
])

const clockTimer = setInterval(() => {
  commonStore.setTime()
}, 1000)

onUnmounted(() => clearInterval(clockTimer))

const handleSwitchRole = async (roleId: number) => {
  try {
    await userStore.switchRole(roleId)
  } catch { /* 请求错误由拦截器统一提示，保留原角色。 */
  }
}

// 添加新标签页
const addTab = (route: any) => {
  if (!visitedTabs.value.find((t) => t.fullPath === route.fullPath)) {
    visitedTabs.value.push({
      fullPath: route.fullPath,
      meta: route.meta,
    })
  }
  activeTab.value = route.fullPath
}

const tabBusy = ref(false)
const pageRevision = ref(0)

// 切换标签页时导航。
const onTabClick = async (tab: any) => {
  try {
    await router.push(tab.paneName)
  } finally {
    activeTab.value = route.fullPath
  }
}

type TabAction = 'refresh' | 'current' | 'other' | 'left' | 'right' | 'all'
const handleTabAction = async (action: TabAction, targetName: string) => {
  if (tabBusy.value || userStore.SwitchingRole) return
  const tabs = [...visitedTabs.value]
  const index = tabs.findIndex(tab => tab.fullPath === targetName)
  if (index < 0) return
  if (action === 'current' && tabs.length <= 1) return
  const sessionVersion = userStore.SessionVersion
  tabBusy.value = true
  try {
    if (action === 'refresh') {
      const failure = await router.push(targetName)
      if (!failure && route.fullPath === targetName && sessionVersion === userStore.SessionVersion) pageRevision.value++
      // 当前页重复导航也需要重新挂载。
      else if (isNavigationFailure(failure, NavigationFailureType.duplicated) && route.fullPath === targetName && sessionVersion === userStore.SessionVersion) pageRevision.value++
      return
    }
    if (action === 'all') {
      const failure = await router.push('/dashboard')
      if (failure && !isNavigationFailure(failure, NavigationFailureType.duplicated)) return
      await nextTick()
      if (sessionVersion !== userStore.SessionVersion) return
      visitedTabs.value = [{fullPath: route.fullPath, meta: route.meta}]
      activeTab.value = route.fullPath
      return
    }
    const remaining = tabs.filter((_tab, i) => {
      if (action === 'current') return i !== index
      if (action === 'other') return i === index
      if (action === 'left') return i >= index
      return i <= index
    })
    if (!remaining.length) return
    const currentRemains = remaining.some(tab => tab.fullPath === route.fullPath)
    if (!currentRemains) {
      const destination = action === 'current' ? (tabs[index + 1] || tabs[index - 1]).fullPath : targetName
      const failure = await router.push(destination)
      if (failure && !isNavigationFailure(failure, NavigationFailureType.duplicated)) return
    }
    await nextTick()
    if (sessionVersion !== userStore.SessionVersion) return
    visitedTabs.value = remaining
    activeTab.value = route.fullPath
  } catch (error) {
    console.error(error)
  } finally {
    tabBusy.value = false
  }
}
const removeTab = (targetName: string | number) => handleTabAction('current', String(targetName))

const handleCommand = (command: string) => {
  switch (command) {
    case "userinfo":
      router.push("/dashboard/sys_userinfo")
      break
    case "api-token":
      router.push("/dashboard/sys_api_token")
      break
    case "logout":
      userStore.logout()
      break
  }
}

// 监听路由变化添加标签
watch(
    () => route.fullPath,
    (_newPath: string) => {
      addTab(route)
    },
    {immediate: true}
)


</script>

<style lang="less" scoped>
.tab-context-menu {
  min-width: 156px;
  padding: 6px;

  :deep(.el-dropdown-menu__item) {
    min-height: 34px;
    border-radius: 4px;
    font-size: 13px;
  }

  :deep(.el-dropdown-menu__item .el-icon) {
    margin-right: 10px;
    font-size: 16px;
  }
}

.account-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: 220px;
  padding: 6px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  cursor: pointer;
  transition: background-color .2s;

  &:hover, &.is-open {
    background: var(--el-fill-color-light);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-5);
    outline-offset: 2px;
  }

  .el-avatar {
    flex-shrink: 0;
  }
}

.account-trigger-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.account-arrow {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  transition: transform .2s;
}

.account-trigger.is-open .account-arrow {
  transform: rotate(180deg);
}

.account-panel {
  width: 220px;
  max-width: calc(100vw - 32px);
}

.account-summary {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.account-summary-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
}

.account-summary-role {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}

.account-role-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--el-color-primary);
}

.account-menu {
  padding: 6px;

  :deep(.el-dropdown-menu__item) {
    min-height: 38px;
    padding: 0 10px;
    border-radius: 4px;
    font-size: 13px;
  }

  :deep(.el-dropdown-menu__item .el-icon) {
    margin-right: 10px;
    font-size: 16px;
  }

  :deep(.el-dropdown-menu__item--divided) {
    margin-top: 6px;
  }

  :deep(.account-logout) {
    color: var(--el-color-danger);
  }

  :deep(.account-logout:not(.is-disabled):hover),
  :deep(.account-logout:focus) {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }
}


.main-layout {
  --dashboard-header-height: 60px;
  --dashboard-sidebar-width: 240px;
  width: 100%;
  height: 100%;
  background: var(--main-bg-light-color);
}

.main-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 20;
  height: var(--dashboard-header-height);
  padding: 0 18px;
  background: var(--main-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 18px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 202px;
  overflow: hidden;
  transition: width .24s ease;
}

.logo-img {
  display: block;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.logo-text {
  min-width: 0;
  line-height: 28px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 600;
}

.header-location {
  min-width: 0;
  padding-left: 0;
}

.header-location :deep(.el-breadcrumb) {
  font-size: 13px;
  line-height: 20px;
}

.header-location :deep(.el-breadcrumb__inner) {
  color: var(--el-text-color-secondary);
  font-weight: 400;
}

.header-location :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.header-time {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.role-switch {
  width: 164px;
}

.header-icon-btn {
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--main-bg-color);
  color: var(--el-text-color-regular);
  font-size: 18px;
  cursor: pointer;
  transition: background-color .2s, color .2s;
}

.header-icon-btn:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.header-icon-btn:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}

.content-layout {
  height: 100%;
  padding-top: var(--dashboard-header-height);
  box-sizing: border-box;
  min-height: 0;
}

.content-aside {
  width: var(--dashboard-sidebar-width);
  flex-shrink: 0;
  height: 100%;
  background: var(--main-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  padding: 12px;
  overflow: hidden;
  transition: width .24s ease, padding .24s ease;
}

.aside {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.main-slider-menu {
  border-right: 0;
  background: transparent;
  --el-menu-item-height: 46px;
  --el-menu-sub-item-height: 44px;
  --el-menu-hover-bg-color: var(--el-fill-color-light);

  :deep(.el-menu) {
    background: transparent;
  }

  :deep(.el-menu-item), :deep(.el-sub-menu__title) {
    margin-bottom: 5px;
    border-radius: 7px;
    font-size: 14px;
    color: var(--el-text-color-regular);
    transition: background-color .2s, color .2s;
  }

  :deep(.el-menu-item .el-icon), :deep(.el-sub-menu__title .el-icon) {
    font-size: 19px;
  }

  :deep(.el-menu-item.is-active) {
    color: var(--el-color-white);
    background: var(--el-color-primary);
    font-weight: 500;
    box-shadow: 0 3px 8px var(--el-color-primary-light-8);
    animation: menu-select .24s ease-out;
  }

  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: var(--el-color-primary);
  }
}

.content-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.nav-tabs {
  flex-shrink: 0;
  padding: 0 14px;
  background: var(--main-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);

  :deep(.el-tabs__header) {
    border: 0;
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__nav) {
    border: 0 !important;
    padding: 8px 0;
    display: flex;
    gap: 6px;
  }

  :deep(.el-tabs__item) {
    height: 32px;
    padding: 0 12px !important;
    border: 1px solid transparent !important;
    border-radius: 6px;
    color: var(--el-text-color-secondary);
    transition: background-color .2s, color .2s;
  }

  :deep(.el-tabs__item:hover) {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
  }

  :deep(.el-tabs__item.is-active) {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-8) !important;
  }

  :deep(.el-tabs__item .el-dropdown) {
    color: inherit;
    height: 100%;
  }

  :deep(.el-tabs__item .el-tooltip__trigger) {
    display: flex;
    align-items: center;
    height: 100%;
  }

  :deep(.el-tabs__nav-next), :deep(.el-tabs__nav-prev) {
    line-height: 48px;
  }

  :deep(.el-tabs__content) {
    display: none;
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  white-space: nowrap;
}

.tab-label iconify-icon {
  font-size: 15px;
}

.dashboard-copyright {
  flex-shrink: 0;
  padding: 8px 16px;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.dashboard-page {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 12px;
}

@media (max-width: 1100px) {
  .main-layout {
    --dashboard-sidebar-width: 200px;
  }

  .logo {
    width: auto;
  }

  .header-left {
    gap: 16px;
  }

  .header-location {
    padding-left: 16px;
  }

  .header-time {
    display: none;
  }

  .account-trigger {
    max-width: 160px;
  }
}

@media (max-width: 760px) {
  .main-layout {
    --dashboard-header-height: 60px;
    --dashboard-sidebar-width: 170px;
  }

  .main-header {
    padding: 0 12px;
  }

  .header-inner {
    gap: 10px;
  }

  .logo-text, .header-location, .account-trigger-name {
    display: none;
  }

  .logo-img {
    width: 30px;
    height: 30px;
  }

  .header-actions {
    gap: 8px;
  }

  .role-switch {
    width: 138px;
  }

  .account-trigger {
    padding: 4px;
    gap: 5px;
  }

  .content-aside {
    padding: 12px 6px;
  }

  .main-slider-menu {
    --el-menu-base-level-padding: 12px;
    --el-menu-level-padding: 12px;
  }

  .main-slider-menu :deep(.el-menu-item), .main-slider-menu :deep(.el-sub-menu__title) {
    font-size: 13px;
  }

  .dashboard-page {
    padding: 10px;
  }

  .nav-tabs {
    padding: 0 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-icon-btn, .account-arrow, .nav-tabs :deep(.el-tabs__item), .main-slider-menu :deep(.el-menu-item), .main-slider-menu :deep(.el-sub-menu__title) {
    transition: none;
  }
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  color: var(--el-text-color-regular);
  background: transparent;
  font-size: 20px;
  cursor: pointer;
}

.sidebar-toggle:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.sidebar-toggle:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}

.main-layout.sidebar-collapsed {
  --dashboard-sidebar-width: 68px;
}

.sidebar-collapsed .logo {
  width: 34px;
}

.sidebar-collapsed .logo-text {
  display: none;
}

.sidebar-collapsed .content-aside {
  padding: 12px 8px;
}

.sidebar-collapsed .main-slider-menu {
  width: 100%;
}

.sidebar-collapsed .main-slider-menu :deep(.el-menu-item),
.sidebar-collapsed .main-slider-menu :deep(.el-sub-menu__title) {
  padding: 0 !important;
  justify-content: center;
}

.sidebar-collapsed .main-slider-menu :deep(.el-menu-item > .el-menu-tooltip__trigger) {
  padding: 0 !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
}

.sidebar-collapsed .main-slider-menu :deep(.el-icon) {
  margin-right: 0;
}

.route-page {
  min-width: 0;
  width: 100%;
}

.dashboard-route-enter-active {
  transition: opacity .22s ease-out, transform .22s ease-out;
}

.dashboard-route-leave-active {
  transition: opacity .14s ease-in, transform .14s ease-in;
}

.dashboard-route-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.dashboard-route-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes menu-select {
  from {
    opacity: .65;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .content-aside, .logo, .dashboard-route-enter-active, .dashboard-route-leave-active {
    transition: none;
  }

  .main-slider-menu :deep(.el-menu-item.is-active) {
    animation: none;
  }
}
</style>
