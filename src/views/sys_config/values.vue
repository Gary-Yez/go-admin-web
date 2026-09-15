<template>
  <el-card class="container" shadow="never">
    <PageHeader description="按分组维护配置，保存后同步更新数据库与缓存" title="配置管理"/>
    <el-form class="search-form" @submit.prevent="search">
      <el-input v-model="keyword" clearable placeholder="搜索配置名称或 Key" prefix-icon="Search" size="large"
                @blur="search"/>
      <el-select v-model="groupFilter" :empty-values="[null, undefined]" :value-on-clear="null" clearable filterable
                 placeholder="全部分组" size="large" @change="search">
        <el-option v-for="group in groupOptions" :key="group.value" :label="group.label" :value="group.value"/>
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
        <el-button :disabled="busy || !!listError || !invalidConfigs.length" :loading="operation === 'cleanup'"
                   icon="Delete" plain
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
        <el-tab-pane v-for="group in groups" :key="group.id" :name="group.id" lazy>
          <template #label><span class="config-tab-label">{{ group.name || '未分组' }}<span
              class="config-tab-count">{{ group.items.length }}</span><span v-if="group.items.some(isChanged)"
                                                                            class="config-tab-dirty"
                                                                            title="此分组有未保存的修改"/></span>
          </template>
          <component :is="group.component" v-if="group.component" :all-fields="group.allItems" :fields="group.items"
                     :filtering="!!filter.keyword" :form="form"/>
          <el-form v-else label-position="top" @submit.prevent>
            <ConfigField v-for="row in group.items" :key="row.key" :config-key="row.key" :fields="group.items"
                         :form="form"/>
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
import {useSiteStore} from "../../stores/site";
import type {Component} from 'vue'
import {computed, onMounted, ref, watch} from 'vue'
import ConfigField from '../../components/ConfigField.vue'
import type {ConfigForm} from '../../configLayouts'
import {configLayouts} from '../../configLayouts'
import {ElMessage} from 'element-plus'
import PageHeader from '../../components/PageHeader.vue'
import {confirmDelete} from '../../utils/confirmDelete'
import type {ConfigValue} from '../../apis/sys_config'
import {SysConfigApi} from '../../apis/sys_config'

const siteStore = useSiteStore()

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
const groupOptions = computed(() => allGroups.value.map(group => ({label: group.name || '未分组', value: group.id})))
const filter = ref<{ keyword: string; status: string; group: string | null }>({
  keyword: '',
  status: 'active',
  group: null
})
const layoutDefinitions = configLayouts
const allGroups = computed(() => {
  const grouped = new Map<string, { id: string; name: string; items: ConfigValue[]; component?: Component }>()
  for (const row of list.value) {
    if (filter.value.status === 'active' ? !row.registered : row.registered) continue
    const layoutIndex = row.registered ? layoutDefinitions.value.findIndex(layout => layout.groups.includes(row.group)) : -1
    const layout = layoutDefinitions.value[layoutIndex]
    const id = layout ? 'layout:' + layoutIndex : 'group:' + row.group
    if (!grouped.has(id)) grouped.set(id, {
      id,
      name: layout?.title ?? row.group,
      component: layout?.component,
      items: []
    })
    grouped.get(id)!.items.push(row)
  }
  return [...grouped.values()]
})
const groups = computed(() => allGroups.value
    .filter(group => filter.value.group === null || group.id === filter.value.group)
    .map(group => ({
      ...group,
      allItems: group.items,
      items: group.items.filter(row => (row.key + row.label).toLowerCase().includes(filter.value.keyword))
    }))
    .filter(group => group.items.length))
watch(groupOptions, options => {
  if (filter.value.group !== null && !options.some(option => option.value === filter.value.group)) {
    filter.value.group = null
    groupFilter.value = null
  }
})
watch(groups, (items) => {
  if (!items.some(group => group.id === activeGroup.value)) activeGroup.value = items[0]?.id || ''
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
  activeGroup.value = groups.value[0]?.id || ''
}
const findRow = (key: string) => list.value.find(row => row.key === key)
const form: ConfigForm = {
  getValue: key => drafts.value[key],
  setValue(key, value) {
    if (!form.isDisabled(key)) {
      drafts.value[key] = value;
      delete errors.value[key]
    }
  },
  getError: key => errors.value[key] || '',
  isDisabled: key => busy.value || !!listError.value || !findRow(key)?.registered,
  isChanged: key => {
    const row = findRow(key);
    return !!row && isChanged(row)
  },
  isSaving: key => operation.value === 'save:' + key,
  async save(key) {
    const row = findRow(key);
    if (row && !form.isDisabled(key)) await save(row)
  },
  reset(key) {
    const row = findRow(key);
    if (row && !form.isDisabled(key)) restoreDefault(row)
  },
}
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

.config-toolbar, .config-actions {
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

.config-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.config-pending {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.config-content {
  min-height: 160px;
}

</style>
