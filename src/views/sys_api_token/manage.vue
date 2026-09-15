<template>
  <el-card class="container" shadow="never">
    <PageHeader description="统一查看所有用户的接口访问凭证，删除异常或不再使用的密钥" title="API 密钥管理"/>
    <el-form class="search-form" @submit.prevent="handleSearch">
      <el-input v-model="search.username" clearable placeholder="搜索所属账号" prefix-icon="Search" size="large"
                @blur="handleSearch"/>
      <el-input v-model="search.remark" clearable maxlength="200" placeholder="搜索密钥备注" size="large"
                @blur="handleSearch"/>
      <el-select v-model="search.role_id" clearable filterable placeholder="全部角色" size="large"
                 @change="handleSearch">
        <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id"/>
      </el-select>
      <el-select v-model="search.status" clearable placeholder="全部状态" size="large" @change="handleSearch">
        <el-option label="有效" value="active"/>
        <el-option label="永久有效" value="permanent"/>
        <el-option label="已过期" value="expired"/>
        <el-option label="账号或角色已失效" value="invalid"/>
      </el-select>
      <el-button icon="RefreshLeft" @click="resetSearch">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <ColumnTable v-loading="loading" :data="rows"
                 row-key="id" size="large" storage-key="core/views/sys_api_token/manage:table-1" @sort-change="handleSortChange" @selection-change="selectionChange">
      <template #toolbar>
        <el-button v-if="!selectedIds.length" :loading="loading" icon="Refresh" @click="load">刷新</el-button>
        <el-button v-if="selectedIds.length" :disabled="loading || deleting" icon="Delete" type="danger"
                   @click="remove(selectedIds)">批量删除
        </el-button>
      </template>
      <el-table-column type="selection" width="48"/>
      <el-table-column label="编号" prop="id" sortable="custom" width="100"/>
      <el-table-column label="密钥前缀" min-width="160" prop="prefix">
        <template #default="{row}"><code class="table-code">{{ row.prefix }}…</code></template>
      </el-table-column>
      <el-table-column label="所属账号" min-width="160" prop="username" show-overflow-tooltip>
        <template #default="{row}">{{ row.username || `用户已删除（${row.admin_id}）` }}</template>
      </el-table-column>
      <el-table-column label="用户昵称" min-width="120" prop="nickname" show-overflow-tooltip/>
      <el-table-column label="授权角色" min-width="150" prop="role_name" show-overflow-tooltip>
        <template #default="{row}">{{ row.role_name || `角色已删除（${row.role_id}）` }}</template>
      </el-table-column>
      <el-table-column label="备注" min-width="180" prop="remark" show-overflow-tooltip/>
      <el-table-column label="状态" prop="status" width="120">
        <template #default="{row}">
          <el-tag :type="row.status === 'invalid' ? 'danger' : row.status === 'expired' ? 'warning' : 'success'">
            {{ statusLabels[row.status as ManagedToken['status']] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效期" min-width="150" prop="expires_at">
        <template #default="{row}">
          <TableTime v-if="row.expires_at" :value="row.expires_at"/>
          <span v-else>永久</span></template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="150" prop="created_at" sortable="custom">
        <template #default="{row}">
          <TableTime :value="row.created_at"/>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" label="操作" width="100">
        <template #default="{row}">
          <div class="table-btn-group">
            <el-button :disabled="deleting" icon="Delete" plain size="small" type="danger" @click="remove([row.id])">
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty v-if="!loading"
                  :description="listError ? '加载失败，请刷新重试' : query.filters.length ? '没有匹配的 API 密钥' : '暂无 API 密钥'"
                  :image-size="70"/>
      </template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.limit" :page-sizes="[10,30,50,100]"
                     :total="total" background layout="total, sizes, prev, pager, next, jumper"/>
    </div>
  </el-card>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import TableTime from "../../components/TableTime.vue";
import {confirmDelete} from "../../utils/confirmDelete";
import {type ManagedToken, SysApiTokenManageApi, type TokenQuery} from "../../apis/sys_api_token";

const statusLabels = {active: '有效', permanent: '永久有效', expired: '已过期', invalid: '已失效'}
const emptySearch = () => ({username: '', remark: '', role_id: undefined as number | undefined, status: ''})
const search = ref(emptySearch())
const query = ref<TokenQuery>({page: 1, limit: 10, filters: [], sorts: []})
const rows = ref<ManagedToken[]>([])
const roles = ref<{ id: number; name: string }[]>([])
const selectedIds = ref<number[]>([])
const total = ref(0)
const loading = ref(false)
const deleting = ref(false)
const listError = ref('')
let requestId = 0

async function load() {
  const current = ++requestId
  loading.value = true
  listError.value = ''
  selectedIds.value = []
  try {
    const response = await SysApiTokenManageApi.List({...query.value})
    if (current !== requestId) return
    rows.value = response.data.list || []
    roles.value = response.data.role_options || []
    total.value = response.data.total
  } catch {
    if (current !== requestId) return
    rows.value = []
    roles.value = []
    total.value = 0
    listError.value = 'API 密钥加载失败，请刷新重试'
  } finally {
    if (current === requestId) loading.value = false
  }
}

function handleSearch() {
  const filters: TokenQuery['filters'] = []
  for (const field of ['username', 'remark'] as const) {
    const value = search.value[field].trim()
    if (value) filters.push({field, operator: 'like', value})
  }
  if (search.value.role_id) filters.push({field: 'role_id', operator: '=', value: search.value.role_id})
  if (search.value.status) filters.push({
    field: 'status',
    operator: search.value.status === 'active' ? 'in' : '=',
    value: search.value.status === 'active' ? ['active', 'permanent'] : search.value.status
  })
  query.value = {...query.value, page: 1, filters}
}

function resetSearch() {
  search.value = emptySearch();
  handleSearch()
}

function selectionChange(items: ManagedToken[]) {
  selectedIds.value = items.map(row => row.id)
}

async function remove(ids: number[]) {
  if (deleting.value) return
  const targets = [...ids]
  await confirmDelete({
    subject: 'API 密钥',
    count: targets.length,
    description: '删除后会清除认证缓存，相关应用的后续请求将无法使用这些密钥。',
    onConfirm: async () => {
      deleting.value = true
      try {
        await SysApiTokenManageApi.Delete(targets)
        ElMessage.success('API 密钥已删除')
        if (query.value.page === 1) await load()
        else query.value.page = 1
      } finally {
        deleting.value = false
      }
    }
  })
}

onMounted(load)
onUnmounted(() => {
  requestId++
})
const handleSortChange = ({prop, order}: { prop: string; order: 'ascending' | 'descending' | null }) => {
  query.value.sorts = ['id', 'created_at'].includes(prop) && order ? [{
    field: prop,
    order: order === 'ascending' ? 'asc' : 'desc'
  }] : []
  query.value.page = 1
}
watch(query, () => {
  load()
}, {deep: true})
</script>
