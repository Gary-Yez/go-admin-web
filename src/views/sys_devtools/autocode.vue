<template>
  <div v-loading="pageLoading" class="container">
    <div v-if="isDev" class="generator-page">
      <el-alert v-if="historyLoadError" :closable="false" :title="historyLoadError" class="mb-[15px]" show-icon
                type="error">
        <el-button link type="primary" @click="router.push('/dashboard/sys_devtools/autocode_history')">返回生成历史
        </el-button>
      </el-alert>
      <el-card shadow="never">
        <PageHeader description="配置模块、字段和操作权限，预览后生成前后端代码" title="代码生成">
          <el-button icon="DocumentCopy" @click="router.push('/dashboard/sys_devtools/autocode_history')">生成历史
          </el-button>
        </PageHeader>
        <el-form ref="formRef" :model="submitForm" label-position="top">
          <el-row :gutter="15">
            <el-col :lg="8" :sm="12" :xs="24">
              <el-form-item :rules="[{required:true,message:'请输入模块名称'}]" label="模块名称" prop="module_name">
                <el-input v-model="submitForm.module_name" :disabled="isEdit" placeholder="请输入模块名称" size="large"
                          @input="(val:any)=>submitForm.model_name = snakeToCamel(val)"></el-input>
              </el-form-item>
            </el-col>
            <el-col :lg="8" :sm="12" :xs="24">
              <el-form-item :rules="[{required:true,message:'请输入中文名称'}]" label="中文名称"
                            prop="chinese_module_name">
                <el-input v-model="submitForm.chinese_module_name" placeholder="请输入中文名称" size="large"></el-input>
              </el-form-item>
            </el-col>
            <el-col :lg="8" :sm="12" :xs="24">
              <el-form-item :rules="[{required:true,message:'结构体名称'}]" label="结构体名称" prop="model_name">
                <el-input v-model="submitForm.model_name" disabled placeholder="根据模块名称自动生成"
                          size="large"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <div class="generator-options">
          <el-checkbox v-model="submitForm.use_common" disabled>使用标准数据结构</el-checkbox>
          <el-checkbox v-model="submitForm.create_curd" @change="handleChangeCURD">生成增删改查</el-checkbox>
          <el-checkbox v-model="submitForm.use_soft_delete" :disabled="!submitForm.create_curd">使用软删除</el-checkbox>
        </div>
        <div v-if="submitForm.create_curd" aria-label="允许操作" class="generator-options operation-options"
             role="group">
          <span class="option-label">允许操作</span>
          <el-checkbox v-model="submitForm.allow_create">新增</el-checkbox>
          <el-checkbox v-model="submitForm.allow_edit">修改</el-checkbox>
          <el-checkbox v-model="submitForm.allow_delete">删除</el-checkbox>
          <span class="option-hint">查询始终保留</span>
        </div>
        <div v-if="submitForm.create_curd" class="operation-options">
          <el-checkbox v-model="submitForm.create_menu">添加菜单</el-checkbox>
          <el-form v-if="submitForm.create_menu" class="mt-[8px]" label-position="top">
            <el-row :gutter="15">
              <el-col :sm="8" :xs="24">
                <el-form-item label="菜单名称">
                  <el-input v-model="submitForm.menu_name" :placeholder="submitForm.chinese_module_name || '默认使用中文名称'"
                            maxlength="100" size="large"/>
                </el-form-item>
              </el-col>
              <el-col :sm="8" :xs="24">
                <el-form-item label="父菜单">
                  <el-tree-select v-model="submitForm.menu_parent_key" :data="parentMenus" :props="{ label: 'name', value: 'key', children: 'children' }" check-strictly
                                  class="w-full" clearable
                                  filterable node-key="key" placeholder="顶级菜单" size="large"/>
                </el-form-item>
              </el-col>
              <el-col :sm="8" :xs="24">
                <el-form-item label="图标">
                  <IconSelect v-model="submitForm.menu_icon" class="w-full"/>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </el-card>
      <el-card v-if="submitForm.create_curd" header="结构体字段" shadow="never">
        <p class="text-[12px] text-[var(--el-text-color-secondary)] mb-[12px]">
          内置字段不可删除或修改名称、类型，固定显示并支持排序，所有配置不可修改；开启排序后可点击对应表头排序。</p>
        <el-form ref="fieldFormRef" :model="submitForm">
          <ColumnTable :column-settings="false" :data="fieldRows"
                       storage-key="core/views/sys_devtools/autocode:table-1">
            <template #toolbar>
              <el-button icon="Plus" plain type="primary" @click="handleAddFiled">新增字段</el-button>
            </template>
            <el-table-column label="字段名称">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.name`"
                    :rules="[{required:true,message:'请输入字段名称'}]">
                  <el-input v-model="row.name" :disabled="row.id < 0" placeholder="请输入字段名称"
                            @input="(val:any)=>handleChangeFieldName(row,val)">
                    <template #prefix>
                      <el-tag :type="row.id < 0 ? 'info' : 'primary'" class="w-[48px] justify-center" size="small">
                        {{ row.id < 0 ? '内置' : '自定义' }}
                      </el-tag>
                    </template>
                  </el-input>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :width="200" label="字段类型">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.type`"
                    :rules="[{required:true,message:'请选择字段类型'}]" class="mb-[0px]">
                  <el-select v-model="row.type" :disabled="row.id < 0" filterable placeholder="字段类型"
                             @change="()=>{ if (row.type === 'time.Time' && row.query_type) row.query_type = 'between'; else if ((row.query_type === 'between' && row.type !== 'time.Time') || (row.query_type === 'like' && row.type !== 'string') || (row.type === 'bool' && !['', '=', '!='].includes(row.query_type))) row.query_type = '' }">
                    <el-option-group label="基础类型">
                      <el-option label="字符串 · string" value="string"/>
                      <el-option label="布尔值 · bool" value="bool"/>
                      <el-option label="日期时间 · time.Time" value="time.Time"/>
                    </el-option-group>
                    <el-option-group label="有符号整数">
                      <el-option label="整数 · int" value="int"/>
                      <el-option label="8 位整数 · int8" value="int8"/>
                      <el-option label="16 位整数 · int16" value="int16"/>
                      <el-option label="32 位整数 · int32" value="int32"/>
                    </el-option-group>
                    <el-option-group label="无符号整数">
                      <el-option label="无符号整数 · uint" value="uint"/>
                      <el-option label="8 位无符号 · uint8" value="uint8"/>
                      <el-option label="16 位无符号 · uint16" value="uint16"/>
                      <el-option label="32 位无符号 · uint32" value="uint32"/>
                    </el-option-group>
                    <el-option-group label="浮点数">
                      <el-option label="单精度浮点 · float32" value="float32"/>
                      <el-option label="双精度浮点 · float64" value="float64"/>
                    </el-option-group>
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="结构体Key">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.key`">
                  <el-input v-model="row.key" disabled placeholder="根据字段名称自动生成"></el-input>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="中文名称">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.chinese_name`">
                  <el-input v-model="row.chinese_name" :disabled="row.id < 0" placeholder="请输入中文名称"></el-input>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :width="80" label="表格可见">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.table_show`">
                  <el-switch v-model="row.table_show" :disabled="row.id < 0"></el-switch>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :width="80" label="可编辑">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.editable`">
                  <el-switch v-model="row.editable" :disabled="row.id < 0"
                             @change="()=>{ if (!row.editable) row.required = false }"></el-switch>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :width="80" label="是否必填">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.required`">
                  <el-switch v-model="row.required" :disabled="!row.editable"></el-switch>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :width="130" label="筛选">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.query_type`">
                  <el-select v-model="row.query_type" :disabled="row.id < 0" clearable placeholder="不筛选">
                    <el-option v-if="row.type === 'time.Time'" label="时间范围" value="between"/>
                    <el-option :disabled="row.type !== 'string'" label="模糊搜索" value="like"/>
                    <el-option :disabled="row.type === 'time.Time'" label="等于" value="="/>
                    <el-option :disabled="row.type === 'time.Time'" label="不等于" value="!="/>
                    <el-option :disabled="row.type === 'bool' || row.type === 'time.Time'" label="大于" value=">"/>
                    <el-option :disabled="row.type === 'bool' || row.type === 'time.Time'" label="大于等于" value=">="/>
                    <el-option :disabled="row.type === 'bool' || row.type === 'time.Time'" label="小于" value="<"/>
                    <el-option :disabled="row.type === 'bool' || row.type === 'time.Time'" label="小于等于" value="<="/>
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :width="100" label="支持排序">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.sortable`">
                  <el-switch v-model="row.sortable" :disabled="row.id < 0"></el-switch>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :width="130" label="索引类型">
              <template #default="{ row,$index }">
                <el-form-item
                    :prop="`${row.id < 0 ? 'builtin_fields' : 'fields'}.${row.id < 0 ? $index : $index - 3}.index_type`">
                  <el-select v-model="row.index_type" :disabled="row.id < 0" clearable placeholder="无索引">
                    <el-option v-if="row.id < 0 && row.name === 'id'" label="主键" value="primaryKey"></el-option>
                    <el-option label="普通索引" value="index"></el-option>
                    <el-option label="唯一索引" value="uniqueIndex"></el-option>
                    <el-option v-if="row.index_type === 'unique'" label="唯一约束" value="unique"></el-option>
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :width="100" label="操作">
              <template #default="{ row }">
                <div class="table-btn-group">
                  <el-button v-if="row.id > 0" :disabled="submitForm.fields.length <= 1" icon="Delete" plain size="small"
                             type="danger" @click="()=>handleDeleteField(row.id)">删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty :description="historyLoadError ? '配置加载失败，请重新加载' : '暂无字段，请添加字段'"
                        :image-size="70"/>
            </template>
          </ColumnTable>
        </el-form>
      </el-card>
      <div class="generator-footer">
        <el-button :disabled="!!historyLoadError" icon="View" type="primary" @click="handlePreview">预览代码</el-button>
      </div>
      <el-dialog v-model="previewShow" :before-close="(done:any)=>!submitLoading && done()" :close-on-click-modal="false" :close-on-press-escape="!submitLoading"
                 class="preview-dialog" title="预览与生成"
                 width="92%">
        <el-alert v-if="previewStale" :closable="false" show-icon title="预览已失效，请重新预览并确认覆盖文件。"
                  type="warning"/>
        <el-alert v-else :closable="false" :title="conflicts.length ? '已有业务文件存在差异。请逐个对比内容，并勾选允许覆盖后再生成。' : '新文件将创建，内容相同的文件保持不变，模块入口自动更新注册。'" :type="conflicts.length ? 'warning' : 'info'"
                  show-icon/>
        <div class="preview-summary">
          <el-tag v-for="action in actions" :key="action" :type="actionType(action)">{{ actionLabel(action) }}
            {{ previewList.filter(file => file.action === action).length }}
          </el-tag>
        </div>
        <el-tabs v-model="activeFile" class="preview-tabs" tab-position="left">
          <el-tab-pane v-for="item in previewList" :key="`${previewRevision}:${item.path}`" :name="item.path">
            <template #label><span :title="item.path" class="file-label">{{ fileName(item.path) }} <el-tag :type="item.requires_overwrite && overwriteSelected[item.path] ? 'success' : actionType(item.action)"
                                                                                                           size="small">{{
                item.requires_overwrite && overwriteSelected[item.path] ? '已同意覆盖' : actionLabel(item.action)
              }}</el-tag></span></template>
            <div class="file-location">
              <span aria-hidden="true" class="file-location-icon">
                <svg fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
                     viewBox="0 0 24 24" width="22"><path
                    d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>
              </span>
              <el-tooltip :content="item.path" :show-after="400" placement="top">
                <div class="file-location-info" tabindex="0">
                  <div class="file-location-heading">
                    <strong class="file-location-name">{{ baseName(item.path) }}</strong>
                    <span class="file-location-extension">{{ fileExtension(item.path) }}</span>
                  </div>
                  <div class="file-location-directory">{{ directoryName(item.path) }}</div>
                </div>
              </el-tooltip>
              <el-button :aria-label="`复制 ${baseName(item.path)} 的完整路径`" class="file-location-copy" size="small"
                         text @click="copyFilePath(item.path)">
                <svg aria-hidden="true" fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                     stroke-width="1.7" viewBox="0 0 24 24" width="15">
                  <rect height="12" rx="2" width="12" x="8" y="8"/>
                  <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>
                </svg>
                <span>复制路径</span>
              </el-button>
            </div>
            <CodeDiff v-if="item.action === 'conflict' || item.action === 'modify'"
                      :after="item.content" :before="item.existing_content ?? ''" :path="item.path"/>
            <div v-else class="code-comparison single-code">
              <section><h4>{{ item.action === 'unchanged' ? '文件内容（无变化）' : '生成后内容' }}</h4>
                <div class="pre-box">
                  <CodeHighlight :code="item.content" :path="item.path"/>
                </div>
              </section>
            </div>
            <div v-if="item.requires_overwrite" :class="{ 'is-confirmed': overwriteSelected[item.path] === true }"
                 class="overwrite-confirm">
              <el-icon aria-hidden="true" class="overwrite-confirm-icon">
                <CircleCheckFilled v-if="overwriteSelected[item.path]"/>
                <WarningFilled v-else/>
              </el-icon>
              <div class="overwrite-confirm-content">
                <div aria-live="polite" class="overwrite-confirm-heading">
                  {{ overwriteSelected[item.path] ? '已同意覆盖此文件' : '此文件有修改，请确认覆盖' }}
                </div>
                <el-checkbox :disabled="submitLoading || previewStale || !item.existing_hash"
                             :model-value="overwriteSelected[item.path] === true"
                             @update:model-value="(value: unknown) => overwriteSelected[item.path] = value === true">我已对比内容，允许覆盖此文件
                </el-checkbox>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
        <template #footer>
          <div style="flex: auto">
            <span v-if="pendingConflicts" class="pending-hint">还有 {{ pendingConflicts }} 个文件未确认覆盖</span>
            <el-button :disabled="submitLoading" size="large" @click="previewShow = false">取消</el-button>
            <el-button :disabled="submitLoading" :loading="pageLoading" size="large" @click="handlePreview">重新预览
            </el-button>
            <el-button :disabled="!canGenerate" :loading="submitLoading" size="large" type="primary"
                       @click="handleConfirm">确认生成
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
    <el-card v-else class="container">
      <el-result icon="error" title="此功能只允许开发环境使用"></el-result>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import {adminRuntime} from "../../runtime";
import {createBuiltinFields, parseHistoryConfig, SysDevtoolsApi} from "../../apis/sys_devtools";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import {computed, onMounted, ref, watch} from 'vue'
import type {GenerateConfig, GeneratorField, PreviewFile} from '../../apis/sys_devtools.ts'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus'
import {CircleCheckFilled, WarningFilled} from '@element-plus/icons-vue'
import CodeHighlight from './CodeHighlight.vue'
import CodeDiff from './CodeDiff.vue'
import IconSelect from '../../components/IconSelect.vue'


const parentMenus = ref<any[]>([])
onMounted(async () => {
  try {
    const response = await SysDevtoolsApi.MenuOptions()
    parentMenus.value = response.data.list ?? []
  } catch (error) {
    console.error(error)
  }
})
const isDev = adminRuntime.dev
const route = useRoute()
const router = useRouter()
const historyLoadError = ref('')
let historyRequest = 0
const isEdit = ref(false)
let nextFieldID = Date.now()
const initForm = (): GeneratorField => ({
  id: nextFieldID++, name: '', key: '', type: 'string', chinese_name: '',
  index_type: '', query_type: '', sortable: false, table_show: true, editable: true, required: true,
})
const formRef = ref()
const fieldFormRef = ref()
const pageLoading = ref(true)
const submitForm = ref<GenerateConfig & { use_common: boolean; builtin_fields: GeneratorField[] }>({
  use_common: true, create_curd: true, use_soft_delete: false,
  create_menu: true, menu_name: '', menu_parent_key: '', menu_icon: 'iconoir:page',
  allow_create: true, allow_edit: true, allow_delete: true,
  chinese_module_name: '', module_name: '', model_name: '', builtin_fields: createBuiltinFields(), fields: [initForm()],
})
const fieldRows = computed(() => [...submitForm.value.builtin_fields, ...submitForm.value.fields])
const previewShow = ref(false)
const previewList = ref<PreviewFile[]>([])
const previewRevision = ref(0)
const previewConfig = ref<GenerateConfig | null>(null)
const previewStale = ref(true)
const activeFile = ref('')
const overwriteSelected = ref<Record<string, boolean>>({})
const submitLoading = ref(false)
const actions: PreviewFile['action'][] = ['create', 'modify', 'conflict', 'unchanged']
const actionLabel = (action: PreviewFile['action']) => ({
  create: '新建',
  modify: '更新注册',
  conflict: '需确认覆盖',
  unchanged: '无变化'
}[action])
const actionType = (action: PreviewFile['action']) => ({
  create: 'success',
  modify: 'primary',
  conflict: 'warning',
  unchanged: 'info'
} as const)[action]
const fileName = (path: string) => path.replace(/\\/g, '/').split('/').slice(-2).join('/')
const baseName = (path: string) => path.replace(/\\/g, '/').split('/').pop() || path
const directoryName = (path: string) => {
  const separator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return separator >= 0 ? path.slice(0, separator + 1) : '当前目录'
}
const fileExtension = (path: string) => {
  const name = baseName(path)
  return name.includes('.') ? name.split('.').pop()!.toUpperCase() : 'FILE'
}
const copyFilePath = async (path: string) => {
  try {
    await navigator.clipboard.writeText(path)
    ElMessage.success('完整路径已复制')
  } catch {
    ElMessage.warning('当前浏览器无法自动复制，请选中路径文字后手动复制')
  }
}
const conflicts = computed(() => previewList.value.filter(file => file.requires_overwrite))
const pendingConflicts = computed(() => conflicts.value.filter(file => !overwriteSelected.value[file.path] || !file.existing_hash).length)
const canGenerate = computed(() => !pageLoading.value && !previewStale.value && !!previewConfig.value && previewList.value.length > 0 && pendingConflicts.value === 0)

watch(submitForm, () => {
  previewStale.value = true
  overwriteSelected.value = {}
}, {deep: true, flush: 'sync'})

function snakeToCamel(str: string) {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
      .replace(/^[a-z]/, match => match.toUpperCase())
}

const handleChangeFieldName = (row: GeneratorField, val: string) => {
  row.key = snakeToCamel(val)
}
const handleChangeCURD = () => {
  submitForm.value.use_soft_delete = false
}
const handleAddFiled = () => {
  submitForm.value.fields.push(initForm())
}
const handleDeleteField = (id: number) => {
  submitForm.value.fields = submitForm.value.fields.filter(item => item.id !== id)
}

function makePayload(): GenerateConfig {
  const form = submitForm.value
  return {
    create_menu: form.create_curd && form.create_menu, menu_name: form.menu_name || '',
    menu_parent_key: form.menu_parent_key || '', menu_icon: form.menu_icon || '',
    module_name: form.module_name, model_name: form.model_name,
    chinese_module_name: form.chinese_module_name, create_curd: form.create_curd,
    allow_create: form.allow_create, allow_edit: form.allow_edit, allow_delete: form.allow_delete,
    use_soft_delete: form.create_curd && form.use_soft_delete,
    fields: form.create_curd ? form.fields.map(field => ({
      ...field,
      index_type: field.index_type || '',
      query_type: field.query_type && field.type === 'time.Time' ? 'between' : field.query_type || ''
    })) : [],
  }
}

const handlePreview = async () => {
  if (submitLoading.value || pageLoading.value || historyLoadError.value) return
  pageLoading.value = true
  previewStale.value = true
  overwriteSelected.value = {}
  // A new preview must discard component-local state even when content is identical.
  previewRevision.value++
  previewConfig.value = null
  try {
    await formRef.value.validate()
    if (submitForm.value.create_curd && fieldFormRef.value) await fieldFormRef.value.validate()
    const payload = makePayload()
    const response = await SysDevtoolsApi.Preview(payload)
    const files = response.data as PreviewFile[]
    if (!Array.isArray(files) || !files.length || files.some(file =>
        !actions.includes(file.action) || typeof file.path !== 'string' || typeof file.content !== 'string' ||
        typeof file.requires_overwrite !== 'boolean' ||
        (file.action === 'conflict' && !file.requires_overwrite) ||
        (file.requires_overwrite && !file.existing_hash))) {
      ElMessage.error('预览结果缺少文件保护信息，请先更新后端后重试')
      return
    }
    if (JSON.stringify(payload) !== JSON.stringify(makePayload())) {
      ElMessage.warning('配置已变化，请重新预览')
      return
    }
    previewList.value = files
    previewConfig.value = payload
    activeFile.value = files.find(file => file.requires_overwrite)?.path ?? files[0]!.path
    previewStale.value = false
    previewShow.value = true
  } catch (error) {
    console.error(error)
  } finally {
    pageLoading.value = false
  }
}

const handleConfirm = async () => {
  if (submitLoading.value || !canGenerate.value || !previewConfig.value) return
  submitLoading.value = true
  const overwriteFiles: Record<string, string> = {}
  for (const file of conflicts.value) overwriteFiles[file.path] = file.existing_hash!
  try {
    await SysDevtoolsApi.Generate({...previewConfig.value, overwrite_files: overwriteFiles})
    previewShow.value = false
    ElMessage.success('生成成功，请手动重启后端并刷新页面，使模块和菜单生效')

  } catch (error) {
    console.error(error)
  } finally {
    // A failed write or a concurrent edit can change the file state. Always refresh.
    previewStale.value = true
    overwriteSelected.value = {}
    submitLoading.value = false
  }
}

watch(() => route.query.id, async (id) => {
  const request = ++historyRequest
  pageLoading.value = true
  historyLoadError.value = ''
  isEdit.value = !!id
  previewShow.value = false
  previewList.value = []
  previewConfig.value = null
  previewStale.value = true
  overwriteSelected.value = {}
  submitForm.value = {
    use_common: true,
    create_curd: true,
    use_soft_delete: false,
    create_menu: true,
    menu_name: '',
    menu_parent_key: '',
    menu_icon: 'iconoir:page',
    allow_create: true,
    allow_edit: true,
    allow_delete: true,
    chinese_module_name: '',
    module_name: '',
    model_name: '',
    builtin_fields: createBuiltinFields(),
    fields: [initForm()],
  }
  try {
    if (id) {
      if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) throw new Error('生成记录编号不正确')
      const response = await SysDevtoolsApi.GetHistory(id)
      if (request !== historyRequest) return
      const saved = parseHistoryConfig(response.data.form)
      const fields = saved.fields.map(field => ({
        ...initForm(), ...field,
        index_type: field.index_type || '',
        query_type: field.query_type && field.type === 'time.Time' ? 'between' : field.query_type || ''
      }))
      // Copy configuration explicitly; never restore overwrite approval from history.
      submitForm.value = {
        builtin_fields: createBuiltinFields(),
        create_menu: saved.create_menu, menu_name: saved.menu_name,
        menu_parent_key: saved.menu_parent_key, menu_icon: saved.menu_icon,
        use_common: true, module_name: saved.module_name, model_name: saved.model_name,
        chinese_module_name: saved.chinese_module_name, create_curd: saved.create_curd,
        allow_create: saved.allow_create, allow_edit: saved.allow_edit, allow_delete: saved.allow_delete,
        use_soft_delete: !!saved.use_soft_delete, fields: fields.length ? fields : [initForm()],
      }
      if (fields.some(field => !['', 'index', 'unique', 'uniqueIndex'].includes(field.index_type))) {
        ElMessage.warning('历史记录包含无效索引，请在字段配置中重新选择索引类型')
      }
    }
  } catch (error) {
    if (request !== historyRequest) return
    console.error(error)
    historyLoadError.value = error instanceof Error ? error.message : String(error || '生成历史加载失败，请返回列表后重试')
  } finally {
    if (request === historyRequest) pageLoading.value = false
  }
}, {immediate: true})
</script>

<style lang="less" scoped>
.el-table {
  .el-form-item {
    margin-bottom: 0 !important;
  }
}

.generator-page {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.generator-options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 24px;
}

.generator-options .el-checkbox {
  margin-right: 0;
}

.operation-options {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.option-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.option-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.generator-footer {
  display: flex;
  justify-content: flex-end;
}

.preview-summary {
  display: flex;
  gap: 10px;
  margin: 16px 0;
  flex-wrap: wrap;
}

.file-label {
  display: flex;
  gap: 8px;
  align-items: center;
}

.file-location {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-light);
}

.file-location-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38px;
  height: 38px;
  border: 1px solid var(--el-color-primary-light-8);
  border-radius: 9px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.file-location-info {
  flex: 1;
  min-width: 0;
}

.file-location-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-location-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.file-location-extension {
  flex-shrink: 0;
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--el-fill-color-darker);
  color: var(--el-text-color-secondary);
  font: 10px/1.2 Consolas, monospace;
  letter-spacing: .5px;
}

.file-location-directory {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
  font: 12px/1.5 Consolas, 'Courier New', monospace;
}

.file-location-copy {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.file-location-copy svg {
  margin-right: 5px;
}

.overwrite-confirm {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 16px;
  border: 1px solid var(--el-color-warning-light-5);
  border-left: 4px solid var(--el-color-warning);
  border-radius: 8px;
  background: var(--el-color-warning-light-9);

  .overwrite-confirm-icon {
    flex-shrink: 0;
    font-size: 24px;
    color: var(--el-color-warning);
  }

  .overwrite-confirm-content {
    min-width: 0;
  }

  .overwrite-confirm-heading {
    font-size: 14px;
    line-height: 22px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .el-checkbox {
    height: auto;
    min-height: 28px;
    margin-right: 0;
  }

  :deep(.el-checkbox__label) {
    white-space: normal;
    line-height: 22px;
  }

  &.is-confirmed {
    border-color: var(--el-color-success-light-5);
    border-left-color: var(--el-color-success);
    background: var(--el-color-success-light-9);

    .overwrite-confirm-icon {
      color: var(--el-color-success);
    }
  }
}

.pending-hint {
  color: #b88230;
  margin-right: 16px;
}

.code-comparison {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;

  &.single-code {
    grid-template-columns: minmax(0, 1fr);
  }

  section {
    min-width: 0;
  }

  h4 {
    margin: 10px 0;
    font-weight: 500;
  }
}

.pre-box {
  overflow: auto;
  height: 48vh;
  padding: 15px;
  background: #0d1117;
  color: #c9d1d9;
  border-radius: 6px;
}

.preview-tabs :deep(.el-tabs__item.is-left) {
  justify-content: flex-start;
}

.preview-tabs :deep(.el-tabs__content) {
  min-width: 0;
}

.preview-tabs :deep(.el-tabs__header.is-left) {
  max-width: 32%;
}

@media (max-width: 900px) {
  .code-comparison {
    grid-template-columns: minmax(0, 1fr);
  }

  .preview-tabs :deep(.el-tabs__header.is-left) {
    max-width: 36%;
  }

  .file-label {
    max-width: 180px;
    overflow: hidden;
  }
}
</style>
