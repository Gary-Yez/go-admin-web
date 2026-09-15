<template>
  <div class="form-note">
    <el-icon>
      <component :is="icon"/>
    </el-icon>
    <div><strong>{{ title }}</strong>
      <p>{{ description }}</p></div>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{ title: string, description: string, icon?: string }>(), {icon: 'InfoFilled'})
</script>

<style scoped>
.form-note {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 20px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.form-note > .el-icon {
  margin-top: 3px;
  font-size: 18px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.form-note strong {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.form-note p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
</style>
