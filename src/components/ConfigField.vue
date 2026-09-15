<template>
  <div v-if="row" class="config-row">
    <div class="config-label">
      <label :for="'config-' + row.key">{{ row.label }}</label>
      <code>{{ row.key }}</code>
      <p v-if="row.description">{{ row.description }}</p>
    </div>
    <div class="config-control">
      <el-form-item :error="form.getError(row.key)">
        <el-select v-if="row.control === 'select'" :id="'config-' + row.key" v-model="value"
                   :disabled="form.isDisabled(row.key)" filterable placeholder="请选择" size="large">
          <el-option v-for="(option, index) in row.options" :key="index" :label="option.label" :value="option.value"/>
        </el-select>
        <el-radio-group v-else-if="row.control === 'radio'" :id="'config-' + row.key" v-model="value"
                        :disabled="form.isDisabled(row.key)">
          <el-radio v-for="(option, index) in row.options" :key="index" :value="option.value">{{
              option.label
            }}
          </el-radio>
        </el-radio-group>
        <el-select v-else-if="row.control === 'multi-select'" :id="'config-' + row.key" v-model="value"
                   :disabled="form.isDisabled(row.key)" filterable multiple placeholder="请选择" size="large">
          <el-option v-for="(option, index) in row.options" :key="index" :label="option.label" :value="option.value"/>
        </el-select>
        <el-switch v-else-if="row.type === 'bool'" :id="'config-' + row.key" v-model="value"
                   :disabled="form.isDisabled(row.key)" active-text="开启"
                   inactive-text="关闭"/>
        <el-input-number v-else-if="row.type === 'int' || row.type === 'float64'" :id="'config-' + row.key"
                         v-model="value" :controls="false"
                         :disabled="form.isDisabled(row.key)"
                         :max="row.type === 'int' ? Number.MAX_SAFE_INTEGER : Number.MAX_VALUE"
                         :min="row.type === 'int' ? Number.MIN_SAFE_INTEGER : -Number.MAX_VALUE"
                         :precision="row.type === 'int' ? 0 : undefined"
                         size="large"/>
        <el-select v-else-if="row.type === '[]string'" :id="'config-' + row.key" v-model="value"
                   :disabled="form.isDisabled(row.key)" :reserve-keyword="false" allow-create
                   default-first-option filterable multiple placeholder="输入内容后按回车添加"
                   size="large"/>
        <el-input v-else-if="row.control === 'password'" :id="'config-' + row.key" v-model="value" :disabled="form.isDisabled(row.key)"
                  autocomplete="new-password" placeholder="请输入配置值" show-password size="large"
                  type="password"/>
        <el-input v-else-if="row.control === 'textarea'" :id="'config-' + row.key" v-model="value" :disabled="form.isDisabled(row.key)"
                  :rows="row.rows || 3" placeholder="请输入配置值"
                  size="large" type="textarea"/>
        <el-input v-else :id="'config-' + row.key" v-model="value"
                  :disabled="form.isDisabled(row.key)" placeholder="请输入配置值" size="large"/>
      </el-form-item>
      <div class="config-hint"><span>默认值：{{
          formatConfigDefault(row)
        }}</span><span v-if="form.isChanged(row.key)"
                       class="config-changed">未保存</span>
      </div>
    </div>
    <div v-if="row.registered" class="config-row-actions">
      <el-button :disabled="form.isDisabled(row.key) || !form.isChanged(row.key)" :loading="form.isSaving(row.key)"
                 icon="Check" plain
                 type="primary" @click="form.save(row.key)">保存
      </el-button>
      <el-tooltip content="将默认值填入表单，点击保存后生效">
        <el-button :disabled="form.isDisabled(row.key)" icon="RefreshLeft" text @click="form.reset(row.key)">
          恢复默认
        </el-button>
      </el-tooltip>
    </div>
    <el-tag v-else class="config-invalid" effect="plain" type="info">无效配置</el-tag>
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {formatConfigDefault} from '../utils/configValue'
import type {ConfigValue} from '../apis/sys_config'
import type {ConfigForm} from '../configLayouts'

const props = defineProps<{ configKey: string; fields: ConfigValue[]; form: ConfigForm }>()
const row = computed(() => props.fields.find(item => item.key === props.configKey))
const value = computed({
  get: () => props.form.getValue(props.configKey),
  set: value => props.form.setValue(props.configKey, value)
})
</script>

<style lang="less" scoped>
.config-row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-row-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.config-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(220px, 2.5fr) 180px;
  gap: 24px;
  padding: 20px 18px;
  align-items: start;
}

.config-row + .config-row {
  border-top: 1px solid var(--el-border-color-lighter);
}

.config-label label {
  display: block;
  margin: 3px 0 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.config-label code, .config-label p {
  display: block;
  margin: 0;
  font-size: 12px;
  line-height: 20px;
  overflow-wrap: anywhere;
  color: var(--el-text-color-secondary);
}

.config-label p {
  margin-top: 4px;
}

.config-control {
  min-width: 0;
}

.config-control :deep(.el-form-item) {
  margin-bottom: 0;
}

.config-control :deep(.el-form-item.is-error) {
  margin-bottom: 18px;
}

.config-control :deep(.el-select), .config-control :deep(.el-input-number) {
  width: 100%;
}

.config-control :deep(.el-switch) {
  height: 40px;
}

.config-hint {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 7px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.config-changed {
  color: var(--el-color-warning);
}

.config-row-actions {
  justify-content: flex-end;
  padding-top: 4px;
}

.config-invalid {
  justify-self: end;
  margin-top: 7px;
}

@media (max-width: 1000px) {
  .config-row {
    grid-template-columns: minmax(140px, 1fr) minmax(200px, 2fr);
    gap: 14px 20px;
  }

  .config-row-actions {
    grid-column: 2;
    justify-content: flex-start;
    padding-top: 0;
  }

  .config-invalid {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 640px) {
  .config-row {
    grid-template-columns: minmax(0, 1fr);
    padding: 16px;
  }

  .config-row-actions, .config-invalid {
    grid-column: 1;
  }
}
</style>
