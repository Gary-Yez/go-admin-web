<template>
  <el-card class="container token-page" shadow="never">
    <PageHeader description="为不同应用分配角色与有效期，管理你的接口访问凭证" title="API 密钥">
      <el-icon>
        <User/>
      </el-icon>
      仅本人可管理
    </PageHeader>
    <el-form :model="search" class="search-form" @submit.prevent="handleSearch">
      <el-input v-model="search.remark" :prefix-icon="Search" clearable maxlength="200"
                placeholder="搜索密钥备注" size="large" style="--search-control-width: 260px" @blur="handleSearch"/>
      <el-select v-model="search.role_id" clearable placeholder="全部角色" size="large" @change="handleSearch">
        <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id"/>
      </el-select>
      <el-button icon="RefreshLeft" @click="resetSearch">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <ColumnTable v-loading="loading" :column-settings="false" :data="rows" size="large"
                 storage-key="core/views/sys_api_token/index:table-1">
      <template #toolbar>
        <el-button icon="Plus" type="primary" @click="openForm()">新增密钥</el-button>
        <el-button :loading="loading" icon="Refresh" @click="load">刷新</el-button>
      </template>
      <el-table-column label="密钥" min-width="200" prop="prefix">
        <template #default="{row}">
          <div class="token-identity"><span class="token-key-icon"><el-icon><Key/></el-icon></span><code
              class="table-code">{{ row.prefix }}…</code></div>
        </template>
      </el-table-column>
      <el-table-column label="角色" min-width="130" prop="role_id">
        <template #default="{row}">
          <el-tag :type="roles.some(role => role.id === row.role_id) ? 'info' : 'danger'" class="token-role"
                  effect="plain">
            {{ roles.find(role => role.id === row.role_id)?.name || '角色已移除' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="180" prop="remark" show-overflow-tooltip>
        <template #default="{row}"><span :class="{'table-muted':!row.remark}">{{ row.remark || '未填写备注' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="有效期" min-width="150" prop="expires_at">
        <template #default="{row}">
          <TableTime v-if="row.expires_at" :value="row.expires_at" suffix="到期"/>
          <span v-else class="token-permanent"><el-icon><Clock/></el-icon>永久有效</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="110">
        <template #default="{row}">
          <el-tag :type="status(row).type">{{ status(row).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="140" prop="created_at">
        <template #default="{row}">
          <TableTime :value="row.created_at"/>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" label="操作" width="190">
        <template #default="{row}">
          <div class="table-btn-group">
            <el-button icon="Edit" plain size="small" type="primary" @click="openForm(row)">修改</el-button>
            <el-button :loading="deleting === row.id" icon="Delete" plain size="small" type="danger"
                       @click="handleDelete(row)">删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty v-if="!loading" :description="listError ? '加载失败，请刷新重试' : '暂无 API 密钥'" :image-size="70"/>
      </template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.limit" :page-sizes="[10,30,50,100]"
                     :total="total" background layout="total, sizes, prev, pager, next, jumper" @change="load"/>
    </div>
    <FormDialog v-model="dialogOpen" v-model:form="form" :description="form.id ? '角色和有效期的修改将在后续请求中生效。' : '创建后请保存完整密钥，之后仅展示密钥前缀。'"
                :on-confirm="save" :title="form.id ? '修改 API 密钥' : '新增 API 密钥'"
                note-icon="Key">
      <el-form-item :rules="[{required:true,message:'请选择角色'}]" label="角色" prop="role_id">
        <el-select v-model="form.role_id" placeholder="请选择你拥有的角色" size="large">
          <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id"/>
        </el-select>
      </el-form-item>
      <el-form-item label="有效期">
        <el-radio-group v-model="permanent">
          <el-radio-button :value="false">指定时间</el-radio-button>
          <el-radio-button :value="true">永久有效</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="!permanent" :rules="[{required:true,message:'请选择到期时间'},{validator:validateExpiry,trigger:'change'}]" label="有效期至"
                    prop="expires_at">
        <el-date-picker v-model="form.expires_at" placeholder="请选择到期时间" size="large" style="width:100%"
                        type="datetime"/>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" :rows="3" maxlength="200" placeholder="例如：订单同步程序" show-word-limit size="large"
                  type="textarea"/>
      </el-form-item>
      <p class="token-hint">角色权限独立于网页当前角色；角色被移除后，密钥将无法使用。</p>
    </FormDialog>
    <el-dialog v-model="secretOpen" :close-on-click-modal="false" title="API 密钥已创建" width="min(560px, 94vw)"
               @closed="secret = ''">
      <div class="mb-[12px]">
        <el-alert :closable="false" show-icon title="完整密钥仅显示这一次，请复制并妥善保存。" type="warning"/>
      </div>
      <el-input :model-value="secret" :rows="3" aria-label="新建 API 密钥" class="token-secret" readonly resize="none" size="large"
                type="textarea"/>
      <p class="token-hint">调用接口时，在 Authorization 请求头中使用 Bearer 加空格及此密钥。</p>
      <template #footer>
        <el-button @click="secretOpen = false">关闭</el-button>
        <el-button icon="CopyDocument" type="primary" @click="copyText(secret)">复制密钥</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script lang="ts" setup>
import {confirmDelete} from "../../utils/confirmDelete";
import PageHeader from "../../components/PageHeader.vue";
import TableTime from "../../components/TableTime.vue";
import {onMounted, onUnmounted, ref} from "vue";
import {ElMessage} from "element-plus";
import {Clock, Key, Search, User} from "@element-plus/icons-vue";
import ColumnTable from "../../components/ColumnTable.vue";
import FormDialog from "../../components/FormDialog.vue";
import {SysApiTokenApi} from "../../apis/sys_api_token";
import {copyText} from "../../utils/utils";

type TokenRow = {
  id: number,
  prefix: string,
  role_id: number,
  expires_at: string | null,
  remark: string,
  created_at: string
}
type TokenForm = { id: number, role_id: number | undefined, expires_at: Date | null, remark: string }
const rows = ref<TokenRow[]>([])
const roles = ref<{ id: number, name: string }[]>([])
const search = ref({remark: '', role_id: undefined as number | undefined})
const query = ref({page: 1, limit: 10, filters: [] as { field: string, operator: string, value: string | number }[]})
const total = ref(0)
const loading = ref(false)
const listError = ref('')
const dialogOpen = ref(false)
const permanent = ref(false)
const form = ref<TokenForm>({id: 0, role_id: undefined, expires_at: null, remark: ''})
const secret = ref('')
const secretOpen = ref(false)
const deleting = ref(0)
const now = ref(Date.now())
const timer = setInterval(() => {
  now.value = Date.now()
}, 1000)
let requestId = 0
onUnmounted(() => {
  clearInterval(timer);
  requestId++
})
const status = (row: TokenRow): { label: string, type: 'info' | 'warning' | 'success' | 'danger' } => {
  if (!roles.value.some(role => role.id === row.role_id)) return {label: '角色已移除', type: 'danger'}
  if (row.expires_at && new Date(row.expires_at).getTime() <= now.value) return {label: '已过期', type: 'warning'}
  return {label: '有效', type: 'success'}
}
const load = async () => {
  const id = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await SysApiTokenApi.List(query.value)
    if (id !== requestId) return
    rows.value = response.data.list
    roles.value = response.data.role_options
    total.value = response.data.total
  } catch {
    if (id !== requestId) return
    rows.value = []
    total.value = 0
    listError.value = '列表加载失败，请刷新重试'
  } finally {
    if (id === requestId) loading.value = false
  }
}
const handleSearch = () => {
  query.value.page = 1
  query.value.filters = []
  if (search.value.remark.trim()) query.value.filters.push({
    field: 'remark',
    operator: 'like',
    value: search.value.remark.trim()
  })
  if (search.value.role_id) query.value.filters.push({field: 'role_id', operator: '=', value: search.value.role_id})
  void load()
}
const resetSearch = () => {
  search.value = {remark: '', role_id: undefined};
  handleSearch()
}
const openForm = (row?: TokenRow) => {
  form.value = row ? {
        id: row.id,
        role_id: roles.value.some(role => role.id === row.role_id) ? row.role_id : undefined,
        expires_at: row.expires_at ? new Date(row.expires_at) : null,
        remark: row.remark
      }
      : {id: 0, role_id: undefined, expires_at: new Date(Date.now() + 30 * 86400000), remark: ''}
  permanent.value = !!row && row.expires_at === null
  dialogOpen.value = true
}
const validateExpiry = (_rule: unknown, value: Date | null, callback: (error?: Error) => void) => {
  callback(!value || new Date(value).getTime() <= Date.now() ? new Error('有效期必须晚于当前时间') : undefined)
}
const save = async () => {
  const response = await SysApiTokenApi.Save({
    ...form.value,
    expires_at: permanent.value ? null : form.value.expires_at!.toISOString()
  })
  ElMessage.success(form.value.id ? '修改成功' : '创建成功')
  if (response.data.token) {
    secret.value = response.data.token;
    secretOpen.value = true
  }
  await load()
}
const handleDelete = (row: TokenRow) => confirmDelete({
  subject: 'API 密钥',
  count: 1,
  target: row.remark || row.prefix + '…',
  description: '删除后此密钥立即失效，使用该密钥的应用将无法继续访问接口。',
  onConfirm: async () => {
    deleting.value = row.id
    try {
      await SysApiTokenApi.Delete(row.id)
      ElMessage.success('已删除')
      if (rows.value.length === 1 && query.value.page > 1) query.value.page--
      await load()
    } finally {
      deleting.value = 0
    }
  },
})
onMounted(load)
</script>

<style scoped>
.token-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.token-key-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-extra-light);
}

.token-role {
  max-width: 100%;
}

.token-role :deep(.el-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.token-permanent {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-regular);
}

.token-permanent .el-icon {
  color: var(--el-text-color-secondary);
}

.token-hint {
  margin: 12px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.token-secret :deep(.el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  padding: 12px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

</style>