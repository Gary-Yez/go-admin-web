<template>
  <div v-if="date" class="table-time"><span>{{ date.toLocaleDateString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit'}) }}</span><small>{{ date.toLocaleTimeString('zh-CN', {hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}) }}{{ suffix ? ' ' + suffix : '' }}</small></div>
  <span v-else class="table-muted">{{ emptyText }}</span>
</template>

<script setup lang="ts">
import {computed} from "vue";
const props = withDefaults(defineProps<{value?:string | number | Date | null, emptyText?:string, suffix?:string}>(), {emptyText:'—'})
const date = computed(()=>{
  if (props.value === null || props.value === undefined || props.value === '') return null
  const value = new Date(props.value)
  return Number.isNaN(value.getTime()) ? null : value
})
</script>

<style scoped>
.table-time { display: flex; flex-direction: column; gap: 2px; line-height: 1.5; font-variant-numeric: tabular-nums; }
.table-time small { font-size: 12px; color: var(--el-text-color-secondary); }
</style>
