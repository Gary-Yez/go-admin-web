<template>
  <el-config-provider :locale="zhCn">
    <router-view :key="userStore.SessionVersion"></router-view>
  </el-config-provider>
</template>

<script lang="ts" setup>
import {useUserStore} from "./stores/user.ts";
import {onMounted, watch} from "vue";
import {useSiteStore} from "./stores/site.ts";
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const userStore = useUserStore()
const siteStore = useSiteStore()
onMounted(() => siteStore.load())
watch(() => [siteStore.info.title, siteStore.info.name, siteStore.info.favicon], () => {
  document.title = siteStore.info.title || siteStore.info.name || 'Go Admin'
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }
  icon.removeAttribute('type')
  icon.href = siteStore.info.favicon || '/logo.png'
}, {immediate: true})
</script>
