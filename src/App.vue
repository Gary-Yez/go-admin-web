<template>
  <el-config-provider :locale="zhCn">
    <router-view :key="userStore.SessionVersion"></router-view>
  </el-config-provider>
</template>

<script setup lang="ts">
import {useUserStore} from "./stores/user.ts";
import {watch, onMounted} from "vue";
import {useSiteStore} from "./stores/site.ts";
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

import zhCn from 'element-plus/es/locale/lang/zh-cn'

</script>
