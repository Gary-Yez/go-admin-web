<template>
  <el-card class="container" shadow="never">
    <PageHeader title="登录日志" description="查看账号登录结果与来源，排查异常访问并清理历史记录" />
    <el-form class="search-form" @submit.prevent="handleSearch">
      <el-input v-model="searchForm.username" size="large" prefix-icon="Search" clearable placeholder="搜索登录账号" maxlength="191" @blur="handleSearch" />
      <el-input v-model="searchForm.ip" size="large" clearable placeholder="搜索来源 IP" maxlength="45" @blur="handleSearch" />
      <el-select v-model="searchForm.status" size="large" clearable placeholder="全部结果" @change="handleSearch">
        <el-option label="成功" value="success" />
        <el-option label="失败" value="failed" />
        <el-option label="锁定拦截" value="blocked" />
      </el-select>
      <el-date-picker v-model="searchForm.time" size="large" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" start-placeholder="开始时间" end-placeholder="结束时间" range-separator="至" @change="handleSearch" />
      <el-button icon="RefreshLeft" @click="handleReset">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :title="listError" type="error" :closable="false" show-icon />
    </div>
    <ColumnTable @sort-change="handleSortChange" storage-key="core/views/sys_login_log/index:table-1" size="large" :data="tableData" row-key="id" v-loading="pageLoading" @selection-change="handleSelectionChange">
      <template #toolbar>
        <el-button v-if="!selectedIds.length" icon="Refresh" :loading="pageLoading" @click="getPageData">刷新</el-button>
        <el-button v-if="selectedIds.length" icon="Delete" type="danger" :disabled="pageLoading || deleting" @click="handleDelete(selectedIds)">批量删除</el-button>
        <el-button v-if="!selectedIds.length" icon="Delete" :disabled="deleting" @click="openCleanup">清理历史</el-button>
      </template>
      <el-table-column type="selection" width="48" />
      <el-table-column prop="id" sortable="custom" label="编号" width="90" />
      <el-table-column prop="username" label="登录账号" min-width="140" show-overflow-tooltip />
      <el-table-column prop="ip" label="来源 IP" min-width="160" show-overflow-tooltip />
      <el-table-column prop="status" label="登录结果" width="110">
        <template #default="{row}">
          <el-tag :type="row.status === 'success' ? 'success' : row.status === 'blocked' ? 'warning' : 'danger'" effect="light">{{ statusLabels[row.status as LoginLog['status']] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="结果说明" min-width="240" show-overflow-tooltip />
      <el-table-column prop="user_agent" label="客户端信息" min-width="220" show-overflow-tooltip />
      <el-table-column prop="duration" label="耗时" width="110">
        <template #default="{row}">
          <el-tag type="success">{{ row.duration }} ms</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="登录时间" width="160">
        <template #default="{row}"><TableTime :value="row.created_at" /></template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right" align="center">
        <template #default="{row}">
          <div class="table-btn-group"><el-button icon="Delete" type="danger" plain size="small" :disabled="deleting" @click="handleDelete([row.id])">删除</el-button></div>
        </template>
      </el-table-column>
      <template #empty><el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : queryForm.filters.length ? '没有匹配的登录日志' : '暂无登录日志'" :image-size="70" /></template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination v-model:current-page="queryForm.page" v-model:page-size="queryForm.limit" :page-sizes="[10,30,50,100]" background layout="total, sizes, prev, pager, next, jumper" :total="total"  />
    </div>
    <FormDialog v-model="cleanupOpen" v-model:form="cleanupForm" title="清理历史登录日志" description="仅删除指定保留天数之前的记录，不受列表筛选条件影响。" note-icon="Delete" confirm-btn-type="danger" confirm-btn-text="确认清理" :on-confirm="handleCleanup">
      <el-form-item label="保留最近天数" prop="days" :rules="[{required:true,type:'integer',min:1,max:36500,message:'请输入 1–36500 之间的整数',trigger:'blur'}]">
        <el-input-number v-model="cleanupForm.days" size="large" :controls="false" :min="1" :max="36500" :precision="0" />
      </el-form-item>
      <el-alert title="清理后无法恢复，请确认历史记录已不再需要。" type="warning" show-icon :closable="false" />
    </FormDialog>
  </el-card>
</template>

<script setup lang="ts">
import {watch} from "vue";
import {onMounted, onUnmounted, ref} from "vue";
import {ElMessage} from "element-plus";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import TableTime from "../../components/TableTime.vue";
import FormDialog from "../../components/FormDialog.vue";
import {confirmDelete} from "../../utils/confirmDelete.ts";
import {SysLoginLogApi, type LoginLog, type LoginLogQuery} from "../../apis/sys_login_log.ts";

const statusLabels = {success:'成功',failed:'失败',blocked:'锁定拦截'}
const emptySearch = ()=>({username:'',ip:'',status:'',time:null as string[] | null})
const searchForm = ref(emptySearch())
const queryForm = ref<LoginLogQuery>({page:1,limit:10,filters:[],sorts:[]})
const tableData = ref<LoginLog[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])
const pageLoading = ref(false)
const listError = ref('')
const deleting = ref(false)
const cleanupOpen = ref(false)
const cleanupForm = ref({days:30})
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
  const filters:LoginLogQuery['filters'] = []
  for (const field of ['username','ip'] as const) {
    const value = searchForm.value[field].trim()
    if (value) filters.push({field,operator:'like',value})
  }
  if (searchForm.value.status) filters.push({field:'status',operator:'=',value:searchForm.value.status})
  if (searchForm.value.time?.length === 2) filters.push({field:'created_at',operator:'between',value:[...searchForm.value.time]})
  queryForm.value = {...queryForm.value,page:1,filters}
}
function handleReset() { searchForm.value = emptySearch(); handleSearch() }
function handleSelectionChange(rows:LoginLog[]) { selectedIds.value = rows.map(row=>row.id) }
async function handleDelete(ids:number[]) {
  if (deleting.value) return
  const targets = [...ids]
  await confirmDelete({subject:'登录日志',count:targets.length,description:'仅删除所选登录记录，不影响账号及登录状态。',onConfirm:async()=>{
    deleting.value = true
    try {
      await SysLoginLogApi.Delete(targets)
      ElMessage.success('登录日志已删除')
      if (queryForm.value.page === 1) await getPageData()
      else queryForm.value.page = 1
    } finally { deleting.value = false }
  }})
}
function openCleanup() { cleanupForm.value = {days:30}; cleanupOpen.value = true }
async function handleCleanup() {
  const response = await SysLoginLogApi.Cleanup(cleanupForm.value.days)
  ElMessage.success(`已清理 ${response.data.count} 条登录日志`)
  if (queryForm.value.page === 1) await getPageData()
  else queryForm.value.page = 1
}
onMounted(getPageData)
onUnmounted(()=>{listRequest++})
const handleSortChange = ({prop,order}:{prop:string;order:'ascending'|'descending'|null})=>{
  queryForm.value.sorts = ['id'].includes(prop) && order ? [{field:prop,order:order === 'ascending' ? 'asc' : 'desc'}] : []
  queryForm.value.page = 1
}
watch(queryForm, ()=>{ getPageData() }, {deep:true})
</script>
