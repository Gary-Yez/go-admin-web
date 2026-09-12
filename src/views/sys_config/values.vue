<template>
  <el-card class="container" shadow="never">
    <PageHeader description="按分组维护配置，保存后同步更新数据库与缓存" title="配置管理"/>
    <el-form class="search-form" @submit.prevent="search">
      <el-input v-model="keyword" clearable placeholder="搜索配置名称或 Key" prefix-icon="Search" size="large"
                @blur="search"/>
      <el-select v-model="groupFilter" size="large" clearable filterable placeholder="全部分组"
                 :empty-values="[null, undefined]" :value-on-clear="null" @change="search">
        <el-option v-for="group in groupOptions" :key="group" :label="group || '未分组'" :value="group"/>
      </el-select>
      <el-select v-model="status" size="large" @change="search">
        <el-option label="正常配置" value="active"/>
        <el-option label="无效配置" value="invalid"/>
      </el-select>
      <el-button icon="RefreshLeft" @click="resetSearch">重置</el-button>
    </el-form>
    <div class="config-toolbar">
      <div class="config-actions">
        <el-button :disabled="!!operation" :loading="loading" icon="Refresh" @click="load">刷新</el-button>
        <el-button :disabled="busy" :loading="operation === 'sync'" icon="Refresh" plain type="primary"
                   @click="syncCache">同步缓存
        </el-button>
        <el-button :disabled="busy || !!listError || !invalidConfigs.length" :loading="operation === 'cleanup'" icon="Delete" plain
                   type="danger" @click="cleanupInvalid">
          删除无效配置{{ invalidConfigs.length ? ' (' + invalidConfigs.length + ')' : '' }}
        </el-button>
      </div>
      <span class="config-pending">{{
          changedCount ? changedCount + ' 项配置未保存' : '修改后点击对应配置的保存按钮'
        }}</span>
    </div>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <div v-if="maintenanceError" class="mb-[12px]">
      <el-alert :closable="false" :title="maintenanceError" show-icon type="error"/>
    </div>
    <div v-loading="loading" class="config-content">
      <el-tabs v-if="groups.length" v-model="activeGroup" class="config-tabs">
        <el-tab-pane v-for="group in groups" :key="group.name" :name="group.name" lazy>
          <template #label><span class="config-tab-label">{{ group.name || '未分组' }}<span
              class="config-tab-count">{{ group.items.length }}</span><span v-if="group.items.some(isChanged)"
                                                                            class="config-tab-dirty"
                                                                            title="此分组有未保存的修改"/></span>
          </template>
          <el-form label-position="top" @submit.prevent>
            <div v-for="row in group.items" :key="row.key" class="config-row">
              <div class="config-label">
                <label :for="'config-' + row.key">{{ row.label }}</label>
                <code>{{ row.key }}</code>
                <p v-if="row.description">{{ row.description }}</p>
              </div>
              <div class="config-control">
                <el-form-item :error="errors[row.key]">
                  <el-switch v-if="row.type === 'bool'" :id="'config-' + row.key" v-model="drafts[row.key]"
                             :disabled="busy || !!listError || !row.registered" active-text="开启"
                             inactive-text="关闭"/>
                  <el-input-number v-else-if="row.type === 'int' || row.type === 'float64'" :id="'config-' + row.key"
                                   v-model="drafts[row.key]" :controls="false"
                                   :disabled="busy || !!listError || !row.registered"
                                   :max="row.type === 'int' ? Number.MAX_SAFE_INTEGER : Number.MAX_VALUE"
                                   :min="row.type === 'int' ? Number.MIN_SAFE_INTEGER : -Number.MAX_VALUE"
                                   :precision="row.type === 'int' ? 0 : undefined"
                                   size="large"/>
                  <el-select v-else-if="row.type === '[]string'" :id="'config-' + row.key" v-model="drafts[row.key]"
                             :disabled="busy || !!listError || !row.registered" :reserve-keyword="false" allow-create
                             default-first-option filterable multiple placeholder="输入内容后按回车添加"
                             size="large"/>
                  <el-input v-else-if="row.key === 'jwt.secret'" :id="'config-' + row.key" size="large" v-model="drafts[row.key]" :disabled="busy || !!listError || !row.registered" type="password" show-password autocomplete="new-password" placeholder="请输入至少 32 字节的签名密钥" />
                <el-input v-else :id="'config-' + row.key" v-model="drafts[row.key]" :autosize="{ minRows: 1, maxRows: 6 }"
                            :disabled="busy || !!listError || !row.registered" placeholder="请输入配置值"
                            size="large" type="textarea"/>
                </el-form-item>
                <div class="config-hint"><span>默认值：{{ row.key === 'jwt.secret' ? '首次安装时随机生成的密钥' : formatValue(row.default) }}</span><span v-if="isChanged(row)"
                                                                                                 class="config-changed">未保存</span>
                </div>
              </div>
              <div v-if="row.registered" class="config-row-actions">
                <el-button :disabled="busy || !!listError || !isChanged(row)" :loading="operation === 'save:' + row.key" icon="Check" plain
                           type="primary" @click="save(row)">保存
                </el-button>
                <el-tooltip content="将默认值填入表单，点击保存后生效">
                  <el-button :disabled="busy || !!listError" icon="RefreshLeft" text @click="restoreDefault(row)">
                    恢复默认
                  </el-button>
                </el-tooltip>
              </div>
              <el-tag v-else class="config-invalid" effect="plain" type="info">无效配置</el-tag>
            </div>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <el-empty v-if="!groups.length && !loading"
                :description="listError ? '配置加载失败，请重试' : filter.status === 'invalid' ? '暂无无效配置' : '暂无匹配配置'"
                :image-size="80"/>
    </div>
  </el-card>
</template>

<script lang="ts" setup>
import {useSiteStore} from "../../stores/site.ts";
const siteStore = useSiteStore()
import {computed, onMounted, ref, watch} from 'vue'
import {ElMessage} from 'element-plus'
import PageHeader from '../../components/PageHeader.vue'
import {confirmDelete} from '../../utils/confirmDelete'
import type {ConfigValue} from '../../apis/sys_config'
import {SysConfigApi} from '../../apis/sys_config'

const list = ref<ConfigValue[]>([])
const drafts = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const operation = ref('')
const loading = ref(false)
const listError = ref('')
const maintenanceError = ref('')
const busy = computed(() => loading.value || !!operation.value)
const invalidConfigs = computed(() => list.value.filter(row => !row.registered))
const keyword = ref('')
const groupFilter = ref<string | null>(null)
const activeGroup = ref('')
const status = ref('active')
const groupOptions = computed(() => [...new Set(list.value.map(row => row.group))])
const filter = ref<{keyword: string; status: string; group: string | null}>({keyword: '', status: 'active', group: null})
const rows = computed(() => list.value.filter(row =>
    (filter.value.group === null || row.group === filter.value.group) &&
    (row.key + row.label).toLowerCase().includes(filter.value.keyword) &&
    (filter.value.status === 'active' ? row.registered : !row.registered)))
const groups = computed(() => {
  const grouped = new Map<string, ConfigValue[]>()
  for (const row of rows.value) {
    if (!grouped.has(row.group)) grouped.set(row.group, [])
    grouped.get(row.group)!.push(row)
  }
  return [...grouped].map(([name, items]) => ({name, items}))
})
watch(groups, (items) => {
  if (!items.some(group => group.name === activeGroup.value)) activeGroup.value = items[0]?.name || ''
}, {immediate: true})
const isChanged = (row: ConfigValue) => row.registered && JSON.stringify(drafts.value[row.key]) !== JSON.stringify(row.value)
const changedCount = computed(() => list.value.filter(isChanged).length)
const clone = <T, >(value: T): T => JSON.parse(JSON.stringify(value))
const search = () => {
  filter.value = {keyword: keyword.value.trim().toLowerCase(), status: status.value, group: groupFilter.value}
}
const resetSearch = () => {
  groupFilter.value = null
  keyword.value = '';
  status.value = 'active';
  search();
  activeGroup.value = groups.value[0]?.name || ''
}
const formatValue = (value: unknown) => typeof value === 'boolean' ? value ? '开启' : '关闭' : typeof value === 'string' ? value || '（空字符串）' : Array.isArray(value) ? value.join('、') || '（空列表）' : String(value)
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error || '操作失败，请重试')
let requestID = 0

async function load() {
  const id = ++requestID
  loading.value = true
  listError.value = ''
  const changed = new Set(list.value.filter(isChanged).map(row => row.key))
  try {
    const response = await SysConfigApi.Values()
    if (id !== requestID) return
    const latest: ConfigValue[] = response.data.list || []
    const next: Record<string, any> = {}
    const nextErrors: Record<string, string> = {}
    for (const row of latest) {
      next[row.key] = changed.has(row.key) && row.registered ? drafts.value[row.key] : clone(row.value)
      if (changed.has(row.key) && errors.value[row.key]) nextErrors[row.key] = errors.value[row.key]
    }
    drafts.value = next
    errors.value = nextErrors
    list.value = latest
  } catch (error) {
    if (id === requestID) listError.value = errorText(error)
  } finally {
    if (id === requestID) loading.value = false
  }
}

function restoreDefault(row: ConfigValue) {
  drafts.value[row.key] = clone(row.default)
  delete errors.value[row.key]
}

async function save(row: ConfigValue) {
  if (busy.value || !row.registered || !isChanged(row)) return
  errors.value[row.key] = ''
  const value = drafts.value[row.key]
  if (value === null || value === undefined) {
    errors.value[row.key] = '请填写配置值';
    return
  }
  operation.value = 'save:' + row.key
  try {
    const submitted = clone(value)
    await SysConfigApi.UpdateValue({key: row.key, value: submitted})
    row.value = submitted
    ElMessage.success('配置已保存')
    if (row.key.startsWith('site.')) await siteStore.load()
    await load()
  } catch (error) {
    errors.value[row.key] = errorText(error)
  } finally {
    operation.value = ''
  }
}

async function syncCache() {
  operation.value = 'sync'
  maintenanceError.value = ''
  try {
    const response = await SysConfigApi.SyncCache()
    await siteStore.load()
    ElMessage.success('已同步 ' + response.data.count + ' 项配置到缓存')
    await load()
  } catch (error) {
    maintenanceError.value = errorText(error)
  } finally {
    operation.value = ''
  }
}

async function cleanupInvalid() {
  const candidates = invalidConfigs.value.map(row => ({key: row.key}))
  if (!candidates.length) return
  operation.value = 'cleanup'
  maintenanceError.value = ''
  try {
    await confirmDelete({
      subject: '无效配置', count: candidates.length, target: candidates.map(item => item.key).join('、'),
      description: '按当前实例启动时注册的配置结构判断，将永久删除这些数据库配置及对应缓存。请确认其他版本实例也已停止使用；修改代码后需先重启再清理。',
      onConfirm: async () => {
        try {
          const response = await SysConfigApi.CleanupInvalid({items: candidates})
          ElMessage.success('已删除 ' + response.data.count + ' 项无效配置')
        } finally {
          await load()
        }
      },
    })
  } finally {
    operation.value = ''
  }
}

onMounted(load)
</script>

<style lang="less" scoped>
.config-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.config-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--el-border-color-light);
}

.config-tabs :deep(.el-tabs__item) {
  height: 44px;
}

.config-tabs :deep(.el-tab-pane > .el-form) {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
}

.config-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.config-tab-count {
  padding: 1px 7px;
  border-radius: 10px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 18px;
  font-weight: 400;
}

.config-tabs :deep(.is-active) .config-tab-count {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.config-tab-dirty {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-warning);
}

.config-toolbar, .config-actions, .config-row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-toolbar {
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.config-actions {
  flex-wrap: wrap;
}

.config-actions :deep(.el-button + .el-button), .config-row-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.config-pending {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.config-content {
  min-height: 160px;
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