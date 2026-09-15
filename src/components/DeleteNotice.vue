<template>
  <div class="delete-notice-content">
    <span class="delete-notice-icon"><el-icon><Delete/></el-icon></span>
    <div class="delete-notice-text">
      <h3>确认删除{{ subject }}？</h3>
      <p class="delete-notice-summary">已选择 <strong>{{ count }}</strong> 项{{ subject }}<span
          v-if="target"> · {{ target }}</span></p>
      <p class="delete-notice-detail">{{ description || '删除后无法在此页面恢复，请确认所选内容。' }}</p>
      <p v-if="error" class="delete-notice-error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {Delete} from "@element-plus/icons-vue";

defineProps<{ subject: string, count: number, description?: string, target?: string, error?: string }>()
</script>
<style scoped>
.delete-notice-content {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
}

.delete-notice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 22px;
}

.delete-notice-text {
  min-width: 0;
  flex: 1;
}

.delete-notice-text h3 {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}

.delete-notice-summary {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.delete-notice-summary strong {
  color: var(--el-color-danger);
}

.delete-notice-detail {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.delete-notice-error {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--el-color-danger);
  line-height: 1.6;
  overflow-wrap: anywhere;
}
</style>
