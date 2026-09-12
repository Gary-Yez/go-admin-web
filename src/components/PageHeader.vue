<template>
  <div class="page-header">
    <div class="page-heading">
      <span class="page-heading-icon"><iconify-icon v-if="displayIcon.includes(':')" :icon="displayIcon" /><el-icon v-else><component :is="displayIcon" /></el-icon></span>
      <div class="page-heading-text"><h2>{{ title }}</h2><p v-if="description">{{ description }}</p></div>
    </div>
    <div v-if="$slots.default" class="page-header-extra"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import {computed} from "vue";
import {useRoute} from "vue-router";
const route = useRoute()
defineProps<{title:string, description?:string}>()
const displayIcon = computed(()=>typeof route.meta.icon === 'string' && route.meta.icon.trim() ? route.meta.icon : 'Grid')
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }
.page-header:last-child { margin-bottom: 0; }
.page-heading { display: flex; align-items: center; gap: 6px; min-width: 0; }
.page-heading-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; font-size: 20px; line-height: 1; color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.page-heading-icon > iconify-icon, .page-heading-icon > .el-icon { display: block; width: 20px; height: 20px; line-height: 1; }
.page-heading-text { min-width: 0; }
.page-heading h2 { margin: 0; font-size: 18px; font-weight: 600; line-height: 24px; color: var(--el-text-color-primary); overflow-wrap: anywhere; }
.page-heading p { margin: 2px 0 0; font-size: 13px; line-height: 20px; color: var(--el-text-color-secondary); }
.page-header-extra { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--el-text-color-secondary); }
@media (max-width: 600px) {
  .page-header { margin-bottom: 16px; }
  .page-header-extra { margin-left: 46px; }
}
</style>
