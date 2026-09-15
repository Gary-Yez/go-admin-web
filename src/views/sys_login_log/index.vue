<template>
  <el-card class="container" shadow="never">
    <PageHeader description="查看账号登录结果与来源，排查异常访问并清理历史记录" title="登录日志"/>
    <el-form class="search-form" @submit.prevent="handleSearch">
      <el-input v-model="searchForm.username" clearable maxlength="191" placeholder="搜索登录账号" prefix-icon="Search"
                size="large" @blur="handleSearch"/>
      <el-input v-model="searchForm.ip" clearable maxlength="45" placeholder="搜索来源 IP" size="large"
                @blur="handleSearch"/>
      <el-select v-model="searchForm.status" clearable placeholder="全部结果" size="large" @change="handleSearch">
        <el-option label="成功" value="success"/>
        <el-option label="失败" value="failed"/>
        <el-option label="锁定拦截" value="blocked"/>
      </el-select>
      <el-date-picker v-model="searchForm.time" end-placeholder="结束时间" range-separator="至" size="large"
                      start-placeholder="开始时间" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss"
                      @change="handleSearch"/>
      <el-button icon="RefreshLeft" @click="handleReset">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <ColumnTable v-loading="pageLoading" :data="tableData" row-key="id"
                 size="large" storage-key="core/views/sys_login_log/index:table-1" @sort-change="handleSortChange" @selection-change="handleSelectionChange">
      <template #toolbar>
        <el-button v-if="!selectedIds.length" :loading="pageLoading" icon="Refresh" @click="getPageData">刷新
        </el-button>
        <el-button v-if="selectedIds.length" :disabled="pageLoading || deleting" icon="Delete" type="danger"
                   @click="handleDelete(selectedIds)">批量删除
        </el-button>
        <el-button v-if="!selectedIds.length" :disabled="deleting" icon="Delete" @click="openCleanup">清理历史
        </el-button>
      </template>
      <el-table-column type="selection" width="48"/>
      <el-table-column label="编号" prop="id" sortable="custom" width="90"/>
      <el-table-column label="登录账号" min-width="140" prop="username" show-overflow-tooltip/>
      <el-table-column label="来源 IP" min-width="160" prop="ip" show-overflow-tooltip/>
      <el-table-column label="登录结果" prop="status" width="110">
        <template #default="{row}">
          <el-tag :type="row.status === 'success' ? 'success' : row.status === 'blocked' ? 'warning' : 'danger'"
                  effect="light">{{ statusLabels[row.status as LoginLog['status']] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="结果说明" min-width="240" prop="message" show-overflow-tooltip/>
      <el-table-column label="客户端信息" min-width="220" prop="user_agent" show-overflow-tooltip/>
      <el-table-column label="耗时" prop="duration" width="110">
        <template #default="{row}">
          <el-tag type="success">{{ row.duration }} ms</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="登录时间" prop="created_at" width="160">
        <template #default="{row}">
          <TableTime :value="row.created_at"/>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" label="操作" width="100">
        <template #default="{row}">
          <div class="table-btn-group">
            <el-button :disabled="deleting" icon="Delete" plain size="small" type="danger"
                       @click="handleDelete([row.id])">删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty v-if="!pageLoading"
                  :description="listError ? '加载失败，请刷新重试' : queryForm.filters.length ? '没有匹配的登录日志' : '暂无登录日志'"
                  :image-size="70"/>
      </template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination v-model:current-page="queryForm.page" v-model:page-size="queryForm.limit"
                     :page-sizes="[10,30,50,100]" :total="total" background
                     layout="total, sizes, prev, pager, next, jumper"/>
    </div>
    <FormDialog v-model="cleanupOpen" v-model:form="cleanupForm" :on-confirm="handleCleanup"
                confirm-btn-text="确认清理" confirm-btn-type="danger"
                description="仅删除指定保留天数之前的记录，不受列表筛选条件影响。" note-icon="Delete" title="清理历史登录日志">
      <el-form-item :rules="[{required:true,type:'integer',min:1,max:36500,message:'请输入 1–36500 之间的整数',trigger:'blur'}]" label="保留最近天数"
                    prop="days">
        <el-input-number v-model="cleanupForm.days" :controls="false" :max="36500" :min="1" :precision="0"
                         size="large"/>
      </el-form-item>
      <el-alert :closable="false" show-icon title="清理后无法恢复，请确认历史记录已不再需要。" type="warning"/>
    </FormDialog>
  </el-card>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import TableTime from "../../components/TableTime.vue";
import FormDialog from "../../components/FormDialog.vue";
import {confirmDelete} from "../../utils/confirmDelete";
import {type LoginLog, type LoginLogQuery, SysLoginLogApi} from "../../apis/sys_login_log";

const statusLabels = {success: '成功', failed: '失败', blocked: '锁定拦截'}
const emptySearch = () => ({username: '', ip: '', status: '', time: null as string[] | null})
const searchForm = ref(emptySearch())
const queryForm = ref<LoginLogQuery>({page: 1, limit: 10, filters: [], sorts: []})
const tableData = ref<LoginLog[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])
const pageLoading = ref(false)
const listError = ref('')
const deleting = ref(false)
const cleanupOpen = ref(false)
const cleanupForm = ref({days: 30})
let listRequest = 0

async function getPageData() {
  const current = ++listRequest
  pageLoading.value = true
  listError.value = ''
  selectedIds.value = []
  try {
    const response = await SysLoginLogApi.List({...queryForm.value})
    if (current !== listRequest) return
    tableData.value = response.data.list || []
    total.value = response.data.total
  } catch {
    if (current !== listRequest) return
    tableData.value = []
    total.value = 0
    listError.value = '登录日志加载失败，请刷新重试'
  } finally {
    if (current === listRequest) pageLoading.value = false
  }
}

function handleSearch() {
  const filters: LoginLogQuery['filters'] = []
  for (const field of ['username', 'ip'] as const) {
    const value = searchForm.value[field].trim()
    if (value) filters.push({field, operator: 'like', value})
  }
  if (searchForm.value.status) filters.push({field: 'status', operator: '=', value: searchForm.value.status})
  if (searchForm.value.time?.length === 2) filters.push({
    field: 'created_at',
    operator: 'between',
    value: [...searchForm.value.time]
  })
  queryForm.value = {...queryForm.value, page: 1, filters}
}

function handleReset() {
  searchForm.value = emptySearch();
  handleSearch()
}

function handleSelectionChange(rows: LoginLog[]) {
  selectedIds.value = rows.map(row => row.id)
}

async function handleDelete(ids: number[]) {
  if (deleting.value) return
  const targets = [...ids]
  await confirmDelete({
    subject: '登录日志',
    count: targets.length,
    description: '仅删除所选登录记录，不影响账号及登录状态。',
    onConfirm: async () => {
      deleting.value = true
      try {
        await SysLoginLogApi.Delete(targets)
        ElMessage.success('登录日志已删除')
        if (queryForm.value.page === 1) await getPageData()
        else queryForm.value.page = 1
      } finally {
        deleting.value = false
      }
    }
  })
}

function openCleanup() {
  cleanupForm.value = {days: 30};
  cleanupOpen.value = true
}

async function handleCleanup() {
  const response = await SysLoginLogApi.Cleanup(cleanupForm.value.days)
  ElMessage.success(`已清理 ${response.data.count} 条登录日志`)
  if (queryForm.value.page === 1) await getPageData()
  else queryForm.value.page = 1
}

onMounted(getPageData)
onUnmounted(() => {
  listRequest++
})
const handleSortChange = ({prop, order}: { prop: string; order: 'ascending' | 'descending' | null }) => {
  queryForm.value.sorts = ['id'].includes(prop) && order ? [{
    field: prop,
    order: order === 'ascending' ? 'asc' : 'desc'
  }] : []
  queryForm.value.page = 1
}
watch(queryForm, () => {
  getPageData()
}, {deep: true})
</script>
