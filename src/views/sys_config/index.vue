<template>
  <el-card class="container" shadow="never">
    <PageHeader description="维护配置名称、Key、分组、类型、默认值和说明" title="配置定义"/>
    <el-form class="search-form" @submit.prevent="search">
      <el-input v-model="keyword" clearable placeholder="搜索名称、Key 或分组" prefix-icon="Search" size="large"
                @blur="search"/>
      <el-select v-model="groupFilter" :empty-values="[null, undefined]" :value-on-clear="null" clearable filterable
                 placeholder="全部分组" size="large" @change="search">
        <el-option v-for="group in groupOptions" :key="group" :label="group || '未分组'" :value="group"/>
      </el-select>
      <el-button icon="RefreshLeft" @click="resetSearch">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <ColumnTable v-loading="loading" :column-settings="false" :data="rows" row-key="name" size="large"
                 storage-key="core/sys_config"
                 @selection-change="(items: ConfigField[]) => selected = items.map(item => item.name)">
      <template #toolbar>
        <el-button v-if="!selected.length" :disabled="!editable" icon="Plus" type="primary" @click="openForm()">
          新增配置
        </el-button>
        <el-button v-if="!selected.length" :disabled="busy" :loading="loading" icon="Refresh" @click="load">刷新
        </el-button>
        <el-button v-if="!selected.length" :disabled="!editable || !current?.fields.length" icon="Sort"
                   @click="openSort">排序
        </el-button>
        <el-button v-if="selected.length" :disabled="!editable" icon="Delete" type="danger"
                   @click="remove(selected)">删除所选{{ selected.length ? ' (' + selected.length + ')' : '' }}
        </el-button>
      </template>
      <el-table-column type="selection" width="44"/>
      <el-table-column label="名称" min-width="160">
        <template #default="{ row }"><strong>{{ row.label }}</strong></template>
      </el-table-column>
      <el-table-column label="Key" min-width="190">
        <template #default="{ row }"><code>{{ row.key }}</code></template>
      </el-table-column>
      <el-table-column label="分组" min-width="140">
        <template #default="{ row }">{{ row.group || '未分组' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag type="info">{{ typeLabels[row.type as ConfigType] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="默认值" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ formatConfigDefault(row) }}</template>
      </el-table-column>
      <el-table-column label="说明" min-width="200" prop="description" show-overflow-tooltip/>
      <el-table-column align="center" fixed="right" label="操作" width="190">
        <template #default="{ row }">
          <div class="table-btn-group">
            <el-button :disabled="!editable" icon="Edit" plain size="small" type="primary" @click="openForm(row)">修改
            </el-button>
            <el-button :disabled="!editable" icon="Delete" plain size="small" type="danger" @click="remove([row.name])">
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="listError ? '配置加载失败，请处理后刷新' : '暂无配置定义'" :image-size="80"/>
      </template>
    </ColumnTable>
    <el-dialog v-model="sortOpen" :close-on-click-modal="false" :close-on-press-escape="!busy" title="配置排序"
               width="760px" @closed="clearDrag">
      <p class="sort-tip">拖动分组和配置项调整顺序，预览并确认后保存。内置配置按 BaseConfig 声明顺序排列。</p>
      <div :class="{ active: dropTarget }" aria-live="polite" class="sort-drop-status">{{ dropHint }}</div>
      <div class="config-sort">
        <div class="sort-groups">
          <div v-for="group in sortGroups" :key="group.name"
               :class="[{ active: sortGroup === group.name, 'is-dragging': drag?.kind === 'group' && drag.key === group.name }, dropClass('group', group.name)]"
               :draggable="!group.fixed && !busy"
               class="sort-group" @dragend="clearDrag"
               @dragleave="leaveDrop($event, 'group', group.name)"
               @dragstart.stop="startDrag($event, 'group', group.name)"
               @dragover.prevent.stop="hoverDrop($event, 'group', group.name)"
               @drop.prevent.stop="dropGroup(group.name)">
            <button type="button" @click="sortGroup = group.name">
              <el-icon>
                <Lock v-if="group.fixed"/>
                <Rank v-else/>
              </el-icon>
              <span>{{ group.name || '未分组' }}</span><small>{{ group.items.length }}</small>
            </button>
          </div>
        </div>
        <div class="sort-fields">
          <div class="sort-heading">{{ sortGroup || '未分组' }}<span>拖动调整组内顺序</span></div>
          <div v-for="field in activeSortGroup?.items || []" :key="field.key"
               :class="[{ 'is-dragging': drag?.kind === 'field' && drag.key === field.key }, dropClass('field', field.key)]"
               :draggable="!busy"
               class="sort-field" @dragend="clearDrag"
               @dragleave="leaveDrop($event, 'field', field.key)"
               @dragstart.stop="startDrag($event, 'field', field.key)"
               @dragover.prevent.stop="hoverDrop($event, 'field', field.key)" @drop.prevent.stop="dropField(field.key)">
            <el-icon>
              <Rank/>
            </el-icon>
            <div><strong>{{ field.label }}</strong><code>{{ field.key }}</code></div>
          </div>
          <p v-if="activeSortGroup?.fixed" class="sort-tip">
            此分组包含内置配置，分组位置固定；业务配置显示在内置配置之后。</p>
          <el-empty v-if="!activeSortGroup?.items.length" :image-size="60" description="此分组只有内置配置"/>
        </div>
      </div>
      <template #footer>
        <el-button :disabled="busy" @click="sortOpen = false">取消</el-button>
        <el-button :disabled="!sortChanged" :loading="busy" type="primary" @click="previewSort">预览排序</el-button>
      </template>
    </el-dialog>
    <FormDialog v-model="formOpen" v-model:form="form" :on-confirm="previewForm"
                :title="editing ? '修改配置定义' : '新增配置定义'" confirm-btn-text="预览代码"
                description="定义保存到数据库，并生成配置结构体字段；保留已有实际值和内置配置">
      <el-form-item :rules="[{ required:true, message:'请填写配置名称' }]" label="名称" prop="label">
        <el-input v-model="form.label" maxlength="100" placeholder="例如：允许注册" size="large"/>
      </el-form-item>
      <el-form-item :rules="[{ required:true, message:'请填写配置标识' }]" label="配置标识" prop="key">
        <el-input v-model="form.key" :disabled="editing" maxlength="191" placeholder="例如：name" size="large"/>
      </el-form-item>
      <el-form-item label="分组">
        <el-select v-model="form.group" :reserve-keyword="false" allow-create clearable default-first-option filterable
                   placeholder="选择已有分组，或输入新分组后按回车" size="large">
          <el-option v-for="group in groups" :key="group" :label="group" :value="group"/>
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="form.type" :disabled="editing" size="large" @change="changeType">
          <el-option v-for="(label, value) in typeLabels" :key="value" :label="label" :value="value"/>
        </el-select>
      </el-form-item>
      <el-form-item label="展示控件">
        <el-select v-model="form.control" :empty-values="[null, undefined]" :value-on-clear="''"
                   size="large" @change="changeControl">
          <el-option v-for="option in controlOptions" :key="option.value" :label="option.label" :value="option.value"/>
        </el-select>
      </el-form-item>
      <el-form-item v-if="hasOptions" label="候选项" required>
        <div class="option-editor">
          <div v-for="(option, index) in form.options" :key="index" class="option-row">
            <el-input v-model="option.label" maxlength="100" placeholder="显示名称" size="large"/>
            <el-input-number v-if="form.type === 'int' || form.type === 'float64'" v-model="option.value"
                             :controls="false" :precision="form.type === 'int' ? 0 : undefined"
                             placeholder="候选值" size="large"/>
            <el-input v-else v-model="option.value" maxlength="500" placeholder="候选值" size="large"/>
            <el-button icon="Delete" text type="danger" @click="form.options.splice(index, 1)"/>
          </div>
          <el-button icon="Plus" plain @click="addOption">添加候选项</el-button>
        </div>
      </el-form-item>
      <el-form-item v-if="form.control === 'textarea'" label="默认行数" required>
        <el-input-number v-model="form.rows" :max="20" :min="1" :precision="0" size="large"/>
      </el-form-item>
      <el-form-item :required="isSingleChoice" label="默认值">
        <el-select v-if="form.control === 'select'" v-model="form.default" :empty-values="[null, undefined]"
                   placeholder="请选择默认值" size="large">
          <el-option v-for="(option, index) in form.options" :key="index" :label="option.label || '未命名候选项'"
                     :value="option.value"/>
        </el-select>
        <el-radio-group v-else-if="form.control === 'radio'" v-model="form.default">
          <el-radio v-for="(option, index) in form.options" :key="index" :value="option.value">
            {{ option.label || '未命名候选项' }}
          </el-radio>
        </el-radio-group>
        <el-select v-else-if="form.control === 'multi-select'" v-model="form.default" filterable multiple
                   placeholder="请选择默认值" size="large">
          <el-option v-for="(option, index) in form.options" :key="index" :label="option.label || '未命名候选项'"
                     :value="option.value"/>
        </el-select>
        <el-input v-else-if="form.control === 'password'" v-model="form.default" placeholder="请输入默认值"
                  show-password size="large" type="password"/>
        <el-input v-else-if="form.control === 'textarea'" v-model="form.default" :rows="form.rows || 3"
                  placeholder="默认值可以为空字符串" size="large" type="textarea"/>
        <el-switch v-else-if="form.type === 'bool'" v-model="form.default"/>
        <el-input-number v-else-if="form.type === 'int' || form.type === 'float64'" v-model="form.default"
                         :controls="false"
                         :max="form.type === 'int' ? Number.MAX_SAFE_INTEGER : Number.MAX_VALUE"
                         :min="form.type === 'int' ? Number.MIN_SAFE_INTEGER : -Number.MAX_VALUE"
                         :precision="form.type === 'int' ? 0 : undefined" size="large"
                         style="width:100%"/>
        <el-select v-else-if="form.type === '[]string'" v-model="form.default" :reserve-keyword="false" allow-create
                   default-first-option
                   filterable multiple placeholder="输入内容后按回车添加" size="large"/>
        <el-input v-else v-model="form.default" placeholder="默认值可以为空字符串" size="large"/>
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="form.description" :rows="3" maxlength="500" placeholder="说明配置的用途" show-word-limit
                  size="large"
                  type="textarea"/>
      </el-form-item>
    </FormDialog>
    <el-dialog v-model="previewOpen" :before-close="(done: () => void) => !busy && done()" :close-on-click-modal="false"
               :close-on-press-escape="!busy" :title="removedCount ? '移除代码入口' : '预览配置定义'"
               width="90%">
      <template v-if="preview">
        <DeleteNotice v-if="removedCount" :count="removedCount"
                      description="将从配置结构体中移除所选字段，数据库中的定义和实际值保留。"
                      subject="代码入口"/>
        <div class="config-path">
          <el-icon>
            <Document/>
          </el-icon>
          <span>{{ preview.path }}</span></div>
        <CodeHighlight v-if="preview.action === 'create'" :code="preview.after" :path="preview.path"
                       class="config-source"/>
        <CodeDiff v-else :key="previewRevision" :after="preview.after" :before="preview.before" :path="preview.path"/>
        <div v-if="previewError" class="mb-[12px]">
          <el-alert :closable="false" :title="previewError" show-icon type="error"/>
        </div>
        <div :class="{ 'is-confirmed': confirmed }" class="config-confirm">
          <el-checkbox v-model="confirmed" :disabled="busy || !!previewError || preview.action === 'unchanged'">
            我已核对差异，确认{{ removedCount ? '移除所选代码入口' : '写入配置定义' }}
          </el-checkbox>
        </div>
      </template>
      <template #footer>
        <el-button :disabled="busy" @click="previewOpen = false">取消</el-button>
        <el-button :disabled="busy" @click="refreshPreview">重新预览</el-button>
        <el-button :disabled="!confirmed || !!previewError" :loading="busy" :type="removedCount ? 'danger' : 'primary'"
                   @click="apply">确认{{ removedCount ? '删除' : '生成' }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script lang="ts" setup>
import {formatConfigDefault} from '../../utils/configValue'
import {computed, onMounted, ref} from 'vue'
import {ElMessage} from 'element-plus'
import {Document, Lock, Rank} from '@element-plus/icons-vue'
import PageHeader from '../../components/PageHeader.vue'
import ColumnTable from '../../components/ColumnTable.vue'
import FormDialog from '../../components/FormDialog.vue'
import DeleteNotice from '../../components/DeleteNotice.vue'
import CodeDiff from '../sys_devtools/CodeDiff.vue'
import CodeHighlight from '../sys_devtools/CodeHighlight.vue'
import type {ConfigBody, ConfigDefinition, ConfigField, ConfigPreview, ConfigType} from '../../apis/sys_config'
import {SysConfigApi} from '../../apis/sys_config'

const typeLabels: Record<ConfigType, string> = {
  string: '字符串',
  bool: '布尔值',
  int: '整数',
  float64: '小数',
  '[]string': '字符串列表'
}
const current = ref<ConfigDefinition>()
const keyword = ref('')
const groupFilter = ref<string | null>(null)
const appliedKeyword = ref('')
const appliedGroup = ref<string | null>(null)
const groupOptions = computed(() => [...new Set((current.value?.fields || []).map(field => field.group))])
const selected = ref<string[]>([])
const loading = ref(false)
const busy = ref(false)
const listError = ref('')
const groups = computed(() => current.value?.groups || [])
const editable = computed(() => !!current.value && !listError.value && !loading.value && !busy.value)
const rows = computed(() => (current.value?.fields || []).filter(field =>
    (appliedGroup.value === null || field.group === appliedGroup.value) &&
    (field.label + field.key + field.group).toLowerCase().includes(appliedKeyword.value)))
const search = () => {
  appliedKeyword.value = keyword.value.trim().toLowerCase()
  appliedGroup.value = groupFilter.value
}
const resetSearch = () => {
  groupFilter.value = null
  keyword.value = '';
  search()
}
const message = (error: unknown) => error instanceof Error ? error.message : String(error || '操作失败，请重试')
let requestID = 0

async function load() {
  const id = ++requestID
  loading.value = true
  listError.value = ''
  try {
    const response = await SysConfigApi.List()
    if (id !== requestID) return
    current.value = response.data
    selected.value = []
  } catch (error) {
    if (id === requestID) listError.value = message(error)
  } finally {
    if (id === requestID) loading.value = false
  }
}

interface SortGroup {
  name: string;
  items: ConfigField[];
  fixed: boolean
}

const sortOpen = ref(false)
const sortGroups = ref<SortGroup[]>([])
const sortGroup = ref('')
const drag = ref<{ kind: 'group' | 'field'; key: string }>()
const dropTarget = ref<{ kind: 'group' | 'field'; key: string; after: boolean }>()
const dropHint = computed(() => {
  const target = dropTarget.value
  if (!target) return '拖到目标上半部插入前方，下半部插入后方，以蓝色插入线为准'
  const label = target.kind === 'group' ? target.key || '未分组' : activeSortGroup.value?.items.find(field => field.key === target.key)?.label || target.key
  return `松开后插入「${label}」${target.after ? '后面' : '前面'}`
})

function clearDrag() {
  drag.value = undefined
  dropTarget.value = undefined
}

function dropClass(kind: 'group' | 'field', key: string) {
  const target = dropTarget.value
  return {
    'drop-before': target?.kind === kind && target.key === key && !target.after,
    'drop-after': target?.kind === kind && target.key === key && target.after
  }
}

function hoverDrop(event: DragEvent, kind: 'group' | 'field', key: string) {
  if (busy.value || drag.value?.kind !== kind || drag.value.key === key ||
      (kind === 'group' && sortGroups.value.find(group => group.name === key)?.fixed)) {
    dropTarget.value = undefined
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
    return
  }
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  dropTarget.value = {kind, key, after: event.clientY >= bounds.top + bounds.height / 2}
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function leaveDrop(event: DragEvent, kind: 'group' | 'field', key: string) {
  const element = event.currentTarget as HTMLElement
  if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return
  if (dropTarget.value?.kind === kind && dropTarget.value.key === key) dropTarget.value = undefined
}

function moveToDrop<T>(items: T[], from: number, to: number, after: boolean) {
  const insertion = to + (after ? 1 : 0)
  const destination = insertion - (from < insertion ? 1 : 0)
  if (from === destination) return
  const [item] = items.splice(from, 1)
  items.splice(destination, 0, item!)
}

const activeSortGroup = computed(() => sortGroups.value.find(group => group.name === sortGroup.value))
const sortedFields = computed(() => sortGroups.value.flatMap(group => group.items))
const sortChanged = computed(() => JSON.stringify(sortedFields.value.map(field => field.key)) !== JSON.stringify(current.value?.fields.map(field => field.key) || []))

function openSort() {
  if (!current.value || !editable.value) return
  const grouped = new Map<string, SortGroup>()
  for (const name of current.value.builtin_groups) grouped.set(name, {name, items: [], fixed: true})
  for (const field of current.value.fields) {
    if (!grouped.has(field.group)) grouped.set(field.group, {name: field.group, items: [], fixed: false})
    grouped.get(field.group)!.items.push({...field})
  }
  sortGroups.value = [...grouped.values()]
  sortGroup.value = sortGroups.value.find(group => group.items.length)?.name || ''
  clearDrag()
  sortOpen.value = true
}

function startDrag(event: DragEvent, kind: 'group' | 'field', key: string) {
  if (busy.value || (kind === 'group' && sortGroups.value.find(group => group.name === key)?.fixed)) {
    event.preventDefault()
    return
  }
  dropTarget.value = undefined
  drag.value = {kind, key}
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }
}

function dropGroup(name: string) {
  const target = dropTarget.value
  if (busy.value || drag.value?.kind !== 'group' || target?.kind !== 'group' || target.key !== name) {
    clearDrag()
    return
  }
  const from = sortGroups.value.findIndex(group => group.name === drag.value!.key)
  const to = sortGroups.value.findIndex(group => group.name === name)
  if (from >= 0 && to >= 0 && from !== to && !sortGroups.value[from]!.fixed && !sortGroups.value[to]!.fixed) {
    moveToDrop(sortGroups.value, from, to, target.after)
  }
  clearDrag()
}

function dropField(key: string) {
  const target = dropTarget.value
  if (busy.value || drag.value?.kind !== 'field' || !activeSortGroup.value || target?.kind !== 'field' || target.key !== key) {
    clearDrag()
    return
  }
  const items = activeSortGroup.value.items
  const from = items.findIndex(field => field.key === drag.value!.key)
  const to = items.findIndex(field => field.key === key)
  if (from >= 0 && to >= 0 && from !== to) moveToDrop(items, from, to, target.after)
  clearDrag()
}

async function previewSort() {
  try {
    await prepare(sortedFields.value)
    sortOpen.value = false
  } catch (error) {
    ElMessage.error(message(error))
  }
}

const formOpen = ref(false)
const editing = ref(false)
const form = ref<any>({})

function openForm(field?: ConfigField) {
  editing.value = !!field
  form.value = field ? {
    ...JSON.parse(JSON.stringify(field)),
    control: field.control || '',
    rows: field.rows || 0,
    options: field.options || []
  } : {
    name: '',
    key: '',
    group: '',
    label: '',
    type: 'string',
    control: '',
    rows: 0,
    options: [],
    default: '',
    description: ''
  }
  formOpen.value = true
}

function changeType(type: ConfigType) {
  form.value.default = type === 'bool' ? false : type === 'int' || type === 'float64' ? 0 : type === '[]string' ? [] : ''
  form.value.options = []
  form.value.control = ''
  form.value.rows = 0
}

const controlOptions = computed(() => {
  const defaultLabels: Record<ConfigType, string> = {
    string: '单行输入框',
    bool: '开关',
    int: '数字输入框',
    float64: '数字输入框',
    '[]string': '自由输入列表'
  }
  const common = [{label: defaultLabels[form.value?.type as ConfigType] || '默认控件', value: ''}]
  if (form.value?.type === 'string') return [...common, {label: '多行文本框', value: 'textarea'}, {
    label: '密码框',
    value: 'password'
  }, {label: '下拉选择', value: 'select'}, {label: '单选框', value: 'radio'}]
  if (form.value?.type === 'int') return [...common, {label: '下拉选择', value: 'select'}, {
    label: '单选框',
    value: 'radio'
  }]
  if (form.value?.type === 'float64') return [...common, {label: '下拉选择', value: 'select'}, {
    label: '单选框',
    value: 'radio'
  }]
  if (form.value?.type === '[]string') return [...common, {label: '多选下拉', value: 'multi-select'}]
  return common
})
const hasOptions = computed(() => ['select', 'radio', 'multi-select'].includes(form.value?.control))
const isSingleChoice = computed(() => form.value?.control === 'select' || form.value?.control === 'radio')

function changeControl(control: string) {
  if (!['select', 'radio', 'multi-select'].includes(control)) form.value.options = []
  else if (!Array.isArray(form.value.options)) form.value.options = []
  form.value.rows = control === 'textarea' ? 3 : 0
  if (control === 'select' || control === 'radio') form.value.default = undefined
}

function addOption() {
  const value = form.value.type === 'int' || form.value.type === 'float64' ? 0 : ''
  form.value.options.push({label: '', value})
}

const previewOpen = ref(false)
const preview = ref<ConfigPreview>()
const pending = ref<ConfigBody>()
const confirmed = ref(false)
const previewError = ref('')
const previewRevision = ref(0)
const removedCount = ref(0)

async function prepare(fields: ConfigField[], removed = 0) {
  if (!current.value || !editable.value) return
  const body: ConfigBody = {hash: current.value.hash, fields: JSON.parse(JSON.stringify(fields))}
  busy.value = true
  try {
    const response = await SysConfigApi.Preview(body)
    pending.value = body
    preview.value = response.data
    removedCount.value = removed
    confirmed.value = false
    previewError.value = ''
    previewRevision.value++
    previewOpen.value = true
  } finally {
    busy.value = false
  }
}

async function previewForm() {
  if (form.value.default === undefined || form.value.default === null) {
    ElMessage.error('请填写默认值');
    throw new Error('请填写默认值')
  }
  if (hasOptions.value) {
    if (!form.value.options.length || form.value.options.some((option: any) => !option.label.trim())) {
      ElMessage.error('请完整填写下拉候选项')
      throw new Error('请完整填写下拉候选项')
    }
    const defaults = Array.isArray(form.value.default) ? form.value.default : [form.value.default]
    if (!defaults.every((value: any) => form.value.options.some((option: any) => option.value === value))) {
      ElMessage.error('默认值必须来自下拉候选项')
      throw new Error('默认值必须来自下拉候选项')
    }
  }
  form.value.key = form.value.key.trim()
  form.value.group = (form.value.group || '').trim()
  const fields = [...(current.value?.fields || [])]
  if (!editing.value && fields.some(field => field.key === form.value.key)) {
    ElMessage.error('配置标识已存在')
    throw new Error('配置标识已存在')
  }
  const field = JSON.parse(JSON.stringify(form.value)) as ConfigField
  await prepare(editing.value ? fields.map(item => item.name === field.name ? field : item) : [...fields, field])
}

async function remove(names: string[]) {
  try {
    await prepare((current.value?.fields || []).filter(field => !names.includes(field.name)), names.length)
  } catch (error) {
    ElMessage.error(message(error))
  }
}

async function refreshPreview() {
  if (!pending.value) return
  confirmed.value = false
  busy.value = true
  previewError.value = ''
  try {
    const response = await SysConfigApi.Preview(pending.value)
    preview.value = response.data
    previewRevision.value++
  } catch (error) {
    previewError.value = message(error)
  } finally {
    busy.value = false
  }
}

async function apply() {
  if (!pending.value || !confirmed.value || previewError.value || busy.value) return
  busy.value = true
  previewError.value = ''
  try {
    await SysConfigApi.Apply(pending.value)
    previewOpen.value = false
    ElMessage.success('数据库定义与代码入口已更新；代码变更需重新编译并重启')
    await load()
  } catch (error) {
    previewError.value = message(error)
    confirmed.value = false
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style lang="less" scoped>
.config-sort {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}

.sort-tip {
  margin: 0 0 14px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.sort-groups {
  padding: 10px;
  background: var(--el-fill-color-light);
  border-right: 1px solid var(--el-border-color-lighter);
  max-height: 420px;
  overflow-y: auto;
}

.sort-group {
  margin-bottom: 6px;
  border-radius: 6px;
}

.sort-group button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 10px;
  border: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
}

.sort-group[draggable="true"], .sort-field {
  cursor: grab;
}

.sort-group span {
  flex: 1;
  overflow-wrap: anywhere;
}

.sort-group small {
  color: var(--el-text-color-secondary);
}

.sort-group.active {
  background: var(--el-color-primary-light-9);
}

.sort-group.active button {
  color: var(--el-color-primary);
}

.sort-fields {
  padding: 16px;
  max-height: 420px;
  overflow-y: auto;
}

.sort-heading {
  margin-bottom: 14px;
  font-weight: 600;
}

.sort-heading span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.sort-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
}

.sort-field:hover {
  border-color: var(--el-color-primary-light-5);
}

.sort-field .el-icon {
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.sort-field strong {
  display: block;
  font-size: 14px;
}

.sort-field code {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}

.sort-drop-status {
  min-height: 20px;
  margin: -4px 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sort-drop-status.active {
  color: var(--el-color-primary);
  font-weight: 600;
}

.sort-group, .sort-field {
  position: relative;
  transition: background-color .15s, border-color .15s;
}

.drop-before, .drop-after {
  background: var(--el-color-primary-light-9);
}

.drop-before::before, .drop-after::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 2px;
  background: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-bg-color);
  pointer-events: none;
  z-index: 2;
}

.drop-before::after, .drop-after::after {
  content: '';
  position: absolute;
  left: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-color-primary);
  pointer-events: none;
  z-index: 3;
}

.drop-before::before {
  top: -5px;
}

.drop-before::after {
  top: -7px;
}

.drop-after::before {
  bottom: -5px;
}

.drop-after::after {
  bottom: -7px;
}

.is-dragging {
  opacity: .4;
}

@media (max-width: 640px) {
  .config-sort {
    grid-template-columns: 140px minmax(0, 1fr);
  }

  .sort-fields {
    padding: 10px;
  }
}

.config-path {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  margin: 12px 0;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;
}

.config-source {
  max-height: 52vh;
  overflow: auto;
}

.option-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr) 40px;
  gap: 10px;
  align-items: center;
}

.config-confirm {
  padding: 12px 16px;
  margin-top: 14px;
  border: 1px solid var(--el-color-warning-light-5);
  border-left: 4px solid var(--el-color-warning);
  border-radius: 8px;
  background: var(--el-color-warning-light-9);
}

.config-confirm.is-confirmed {
  border-color: var(--el-color-success-light-5);
  border-left-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.config-confirm :deep(.el-checkbox) {
  height: auto;
  min-height: 28px;
}

.config-confirm :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 22px;
}
</style>
