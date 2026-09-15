<template>
  <el-card class="container" shadow="never">
    <PageHeader description="查看最近成功生成的配置，回填编辑或管理模块文件" title="生成历史"/>
    <el-form class="search-form" @submit.prevent="search">
      <el-input v-model="keyword" :disabled="deleting" clearable maxlength="100" placeholder="搜索模块名称或结构体名称"
                prefix-icon="Search" size="large" style="--search-control-width: 290px" @blur="search"/>
      <el-button :disabled="deleting" icon="RefreshLeft" @click="handleReset">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <ColumnTable ref="tableRef" v-loading="pageLoading || deleting" :column-settings="false"
                 :data="tableData" row-key="id" size="large" storage-key="core/views/sys_devtools/autocode_history:table-1"
                 @selection-change="(rows: GeneratorHistory[]) => selected = rows.map(row => row.id)">
      <template #toolbar>
        <el-button v-if="!selected.length" icon="Plus" type="primary" @click="handleGoAdd">生成代码</el-button>
        <el-button v-if="!selected.length" :disabled="deleting" :loading="pageLoading" icon="Refresh"
                   @click="getPageData">刷新
        </el-button>
        <el-button v-if="selected.length" :disabled="deleting || pageLoading" icon="Delete" type="danger"
                   @click="handleDelete(selected)">删除所选 {{ selected.length ? `(${selected.length})` : '' }}
        </el-button>
      </template>
      <el-table-column type="selection" width="44"/>
      <el-table-column label="模块" min-width="180">
        <template #default="{ row }"><strong>{{ row.chinese_module_name || row.module_name }}</strong>
          <div class="module-name">{{ row.module_name }}</div>
        </template>
      </el-table-column>
      <el-table-column label="结构体" min-width="140" prop="model_name"/>
      <el-table-column label="生成类型" width="120">
        <template #default="{ row }">
          <el-tag v-if="!row.config_valid" type="danger">配置异常</el-tag>
          <el-tag v-else :type="row.create_curd ? 'primary' : 'info'">{{
              row.create_curd ? '增删改查' : '模块骨架'
            }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="字段数" width="80">
        <template #default="{ row }">{{ row.config_valid ? row.field_count : '—' }}</template>
      </el-table-column>
      <el-table-column label="首次生成" width="175">
        <template #default="{ row }">
          <TableTime :value="row.created_at"/>
        </template>
      </el-table-column>
      <el-table-column label="最近生成" width="175">
        <template #default="{ row }">
          <TableTime :value="row.updated_at"/>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" label="操作" width="300">
        <template #default="{ row }">
          <div class="table-btn-group">
            <el-button icon="View" plain size="small" type="primary" @click="showDetail(row)">详情</el-button>
            <el-button :disabled="!row.config_valid || deleting" icon="RefreshRight" plain size="small" type="primary"
                       @click="handleEdit(row.id)">重新生成
            </el-button>
            <el-button :disabled="deleting" icon="Delete" plain size="small" type="danger"
                       @click="handleDelete([row.id])">删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
            :description="listError ? '加载失败，请刷新重试' : query.keyword ? '没有匹配的生成记录' : '暂无生成记录，成功生成后会自动保存'"
            :image-size="70"/>
      </template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.limit" :page-sizes="[10, 30, 50, 100]"
                     :total="total" background layout="total, sizes, prev, pager, next, jumper" @change="getPageData"/>
    </div>
    <el-dialog v-model="detailOpen" title="生成配置详情" width="min(1000px, 94vw)">
      <div v-loading="detailLoading" class="detail-body">
        <el-alert v-if="detailError" :closable="false" :title="detailError" type="error"/>
        <template v-else-if="detailConfig && detailRow">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="模块名称">{{ detailConfig.module_name }}</el-descriptions-item>
            <el-descriptions-item label="中文名称">{{ detailConfig.chinese_module_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="菜单">
              {{ detailConfig.create_menu ? (detailConfig.menu_name || detailConfig.chinese_module_name) : '不添加' }}
            </el-descriptions-item>
            <el-descriptions-item label="父菜单标识">{{ detailConfig.menu_parent_key || '顶级' }}</el-descriptions-item>
            <el-descriptions-item label="结构体">{{ detailConfig.model_name }}</el-descriptions-item>
            <el-descriptions-item label="生成类型">{{
                detailConfig.create_curd ? '增删改查' : '模块骨架'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="首次生成">{{ formatTime(detailRow.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="最近生成">{{ formatTime(detailRow.updated_at) }}</el-descriptions-item>
            <el-descriptions-item v-if="detailConfig.create_curd" label="允许操作">
              查询{{ detailConfig.allow_create ? '、新增' : '' }}{{
                detailConfig.allow_edit ? '、修改' : ''
              }}{{ detailConfig.allow_delete ? '、删除' : '' }}
            </el-descriptions-item>
            <el-descriptions-item label="软删除">{{
                detailConfig.use_soft_delete ? '启用' : '关闭'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="字段数量">{{ detailConfig.fields.length }}</el-descriptions-item>
          </el-descriptions>
          <ColumnTable v-if="detailConfig.create_curd" :column-settings="false"
                       :data="detailConfig.fields" class="detail-fields" max-height="350" size="large"
                       storage-key="core/views/sys_devtools/autocode_history:table-2">
            <el-table-column label="字段名称" min-width="110" prop="name"/>
            <el-table-column label="Go 字段" min-width="110" prop="key"/>
            <el-table-column label="中文名称" min-width="100" prop="chinese_name"/>
            <el-table-column label="类型" prop="type" width="100"/>
            <el-table-column label="筛选" width="110">
              <template #default="{ row }">{{ row.query_type || '不筛选' }}</template>
            </el-table-column>
            <el-table-column label="索引" width="110">
              <template #default="{ row }">{{ row.index_type || '无' }}</template>
            </el-table-column>
            <el-table-column v-for="flag in fieldFlags" :key="flag.key" :label="flag.label" width="78">
              <template #default="{ row }">{{ row[flag.key] ? '是' : '否' }}</template>
            </el-table-column>
            <template #empty>
              <el-empty :description="detailError ? '配置加载失败，请重试' : '暂无字段配置'" :image-size="70"/>
            </template>
          </ColumnTable>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailOpen = false">关闭</el-button>
        <el-button :disabled="detailLoading || !detailConfig || !!detailError" type="primary"
                   @click="detailRow && handleEdit(detailRow.id)">回填并重新生成
        </el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="deleteOpen" :before-close="(done: () => void) => !deleting && done()" :close-on-click-modal="false" :close-on-press-escape="!deleting"
               title="删除生成记录" width="min(760px, 94vw)">
      <DeleteNotice :count="deleteIds.length" :description="deleteFiles ? '将同时删除本地文件，请核对下方清单后确认。' : '仅删除生成记录，本地代码文件会保留。'"
                    subject="生成记录"/>
      <el-checkbox v-model="deleteFiles" :disabled="deleting">同时删除生成的本地文件</el-checkbox>
      <div class="mb-[12px]">
        <el-alert :closable="false" :title="deleteFiles ? '将删除清单中的代码文件（包括生成后手动修改的内容），并移除对应模块注册。数据库表和菜单保留。' : '仅删除生成记录，保留本地代码文件。'" :type="deleteFiles ? 'warning' : 'info'"
                  show-icon/>
      </div>
      <div v-if="deleteFiles" v-loading="deletePreviewLoading" class="delete-preview">
        <el-alert v-if="deleteError" :closable="false" :title="deleteError" type="error"/>
        <template v-if="deletePlan">
          <ColumnTable :column-settings="false" :data="deletePlan.files.filter(file => file.action === 'delete' || file.action === 'modify')"
                       max-height="300"
                       size="large"
                       storage-key="core/views/sys_devtools/autocode_history:table-3">
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-tag :type="row.action === 'delete' ? 'danger' : 'warning'">
                  {{ row.action === 'delete' ? '删除文件' : '移除注册' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="本地文件" prop="path" show-overflow-tooltip/>
            <template #empty>
              <el-empty :description="deleteError ? '删除清单加载失败，请重试' : '没有需要删除或更新的本地文件'"
                        :image-size="70"/>
            </template>
          </ColumnTable>
          <p class="delete-help">
            已缺失的文件会跳过；删除后自动清理空的模块和页面目录，有其他文件或子目录时保留。文件变化后需要重新确认。</p>
          <el-checkbox :disabled="deleting"
                       :model-value="deleteConfirmed" @update:model-value="(value: unknown) => deleteConfirmed = value === true">
            我已核对清单，同意删除上述本地文件并更新模块注册
          </el-checkbox>
        </template>
      </div>
      <template #footer>
        <el-button :disabled="deleting" @click="deleteOpen = false">取消</el-button>
        <el-button v-if="deleteFiles" :disabled="deleting" :loading="deletePreviewLoading" icon="Refresh"
                   @click="loadDeletePreview">刷新删除清单
        </el-button>
        <el-button :disabled="deleteFiles && (deletePreviewLoading || !deletePlan || !deleteConfirmed || !!deleteError)" :loading="deleting" icon="Delete"
                   type="danger"
                   @click="confirmDelete">{{ deleteFiles ? '删除记录和文件' : '仅删除记录' }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script lang="ts" setup>
import DeleteNotice from "../../components/DeleteNotice.vue";
import PageHeader from "../../components/PageHeader.vue";
import TableTime from "../../components/TableTime.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import {onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'

import {ElMessage} from 'element-plus'
import {parseHistoryConfig, SysDevtoolsApi} from '../../apis/sys_devtools'
import type {GenerateConfig, GeneratorHistory, HistoryDeletePlan, HistoryQuery} from '../../apis/sys_devtools.ts'
import {formatTime as formatTimestamp} from '../../utils/formatTime'

const formatTime = (time: string) => {
  const timestamp = Date.parse(time)
  return Number.isFinite(timestamp) ? formatTimestamp(timestamp) : '—'
}

const router = useRouter()
const tableRef = ref()
const pageLoading = ref(false), deleting = ref(false)
const tableData = ref<GeneratorHistory[]>([]), selected = ref<number[]>([])
const total = ref(0), keyword = ref(''), listError = ref('')
const query = ref<HistoryQuery>({page: 1, limit: 10, keyword: ''})
let listRequest = 0, detailRequest = 0
const detailOpen = ref(false), detailLoading = ref(false), detailError = ref('')
const detailRow = ref<GeneratorHistory | null>(null)
const detailConfig = ref<GenerateConfig | null>(null)
const deleteOpen = ref(false), deleteFiles = ref(false), deleteConfirmed = ref(false), deletePreviewLoading = ref(false)
const deleteIds = ref<number[]>([]), deletePlan = ref<HistoryDeletePlan | null>(null), deleteError = ref('')
let deleteRequest = 0
const fieldFlags = [{key: 'table_show', label: '列表显示'}, {key: 'editable', label: '可编辑'}, {
  key: 'required',
  label: '必填'
}, {key: 'hidden', label: '隐藏'}]

async function getPageData() {
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  selected.value = []
  tableRef.value?.clearSelection()
  try {
    const response = await SysDevtoolsApi.History({...query.value})
    if (request !== listRequest) return
    total.value = response.data.total
    const lastPage = Math.max(1, Math.ceil(total.value / query.value.limit))
    if (query.value.page > lastPage) {
      query.value.page = lastPage;
      await getPageData();
      return
    }
    tableData.value = response.data.list ?? []
  } catch (error) {
    if (request !== listRequest) return
    console.error(error)
    tableData.value = []
    total.value = 0
    listError.value = '生成历史加载失败，请点击刷新重试'
  } finally {
    if (request === listRequest) pageLoading.value = false
  }
}

function search() {
  if (deleting.value) return;
  query.value.keyword = keyword.value.trim();
  query.value.page = 1;
  void getPageData()
}

function handleReset() {
  if (deleting.value) return;
  keyword.value = '';
  search()
}

function handleGoAdd() {
  void router.push('/dashboard/sys_devtools/autocode')
}

function handleEdit(id: number) {
  detailOpen.value = false;
  void router.push({path: '/dashboard/sys_devtools/autocode', query: {id}})
}

async function showDetail(row: GeneratorHistory) {
  const request = ++detailRequest
  detailOpen.value = true;
  detailLoading.value = true;
  detailError.value = '';
  detailConfig.value = null;
  detailRow.value = row
  try {
    const response = await SysDevtoolsApi.GetHistory(row.id)
    if (request !== detailRequest) return
    detailConfig.value = parseHistoryConfig(response.data.form)
    detailRow.value = {...row, ...response.data}
  } catch (error) {
    if (request === detailRequest) detailError.value = error instanceof Error ? error.message : String(error || '配置详情加载失败')
  } finally {
    if (request === detailRequest) detailLoading.value = false
  }
}

function handleDelete(ids: number[]) {
  if (!ids.length || deleting.value) return
  deleteRequest++
  deleteIds.value = [...ids]
  deleteFiles.value = false
  deleteConfirmed.value = false
  deletePreviewLoading.value = false
  deletePlan.value = null
  deleteError.value = ''
  deleteOpen.value = true
}

async function loadDeletePreview() {
  if (!deleteFiles.value || !deleteOpen.value || deleting.value) return
  const request = ++deleteRequest
  deletePreviewLoading.value = true;
  deleteConfirmed.value = false;
  deletePlan.value = null;
  deleteError.value = ''
  try {
    const response = await SysDevtoolsApi.PreviewDelete([...deleteIds.value])
    if (request !== deleteRequest) return
    const plan = response.data as HistoryDeletePlan
    if (!plan?.token || !Array.isArray(plan.files)) throw new Error('删除清单不完整，请更新后端后重试')
    deletePlan.value = plan
  } catch (error) {
    if (request === deleteRequest) deleteError.value = error instanceof Error ? error.message : String(error || '删除清单加载失败')
  } finally {
    if (request === deleteRequest) deletePreviewLoading.value = false
  }
}

watch(deleteFiles, value => {
  deleteRequest++;
  deleteConfirmed.value = false;
  deletePlan.value = null;
  deleteError.value = '';
  deletePreviewLoading.value = false
  if (value) void loadDeletePreview()
})
watch(deleteOpen, value => {
  if (!value) {
    deleteRequest++;
    deletePreviewLoading.value = false;
    deleteConfirmed.value = false
  }
})

async function confirmDelete() {
  if (deleting.value || !deleteIds.value.length || !deleteOpen.value) return
  if (deleteFiles.value && (deletePreviewLoading.value || !deletePlan.value || !deleteConfirmed.value || deleteError.value)) return
  deleting.value = true
  try {
    await SysDevtoolsApi.Delete([...deleteIds.value], deleteFiles.value, deletePlan.value?.token ?? '')
    deleteOpen.value = false
    ElMessage.success(deleteFiles.value ? '生成记录和清单内文件已删除，请手动重启后端使模块注册生效' : '生成记录已删除')

    await getPageData()
  } catch (error) {
    console.error(error)
    deleteConfirmed.value = false
    deletePlan.value = null
    deleteError.value = '删除未完成，请刷新删除清单后重试'
  } finally {
    deleting.value = false
  }
}

onMounted(getPageData)
</script>

<style scoped>
.module-name {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font: 12px Consolas, monospace;
}

.detail-body {
  min-height: 100px;
}

.detail-fields {
  margin-top: 18px;
}

.delete-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}
</style>
