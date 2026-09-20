<template>
  <el-card class="container" shadow="never">
    <PageHeader description="管理账号资料、角色分配与登录状态" title="管理员管理"/>
    <el-form class="search-form" @submit.prevent="handleSearch">
      <el-input v-model="searchForm.username" clearable placeholder="搜索用户名" size="large" @blur="handleSearch"/>
      <el-input v-model="searchForm.nickname" clearable placeholder="搜索昵称" size="large" @blur="handleSearch"/>
      <el-input v-model="searchForm.phone" clearable placeholder="搜索手机号" size="large" @blur="handleSearch"/>
      <el-input v-model="searchForm.email" clearable placeholder="搜索邮箱" size="large" @blur="handleSearch"/>
      <el-select v-model="searchForm.role_id" clearable filterable placeholder="全部角色" size="large"
                 @change="handleSearch">
        <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id"/>
      </el-select>
      <el-select v-model="searchForm.status" clearable placeholder="全部状态" size="large" @change="handleSearch">
        <el-option :value="1" label="启用"/>
        <el-option :value="0" label="禁用"/>
      </el-select>
      <el-button icon="RefreshLeft" @click="handleReset">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <ColumnTable v-loading="pageLoading" :data="tableData"
                 size="large" storage-key="core/views/sys_admin/index:table-1" @selection-change="handleSelectionChange"
                 @sort-change="handleSortChange">
      <template #toolbar>
        <el-button v-if="!selectedIds.length" :loading="pageLoading" icon="Refresh" @click="getPageData">刷新
        </el-button>
        <el-button v-if="!selectedIds.length" :disabled="pageLoading || !!listError" icon="Plus" type="primary"
                   @click="()=>handleAdd({})">新增管理员
        </el-button>
        <el-button v-if="selectedIds.length" :disabled="pageLoading" icon="Delete" type="danger"
                   @click="handleDelete([...selectedIds])">批量删除
        </el-button>
      </template>
      <el-table-column :selectable="canDelete" type="selection" width="48"/>
      <el-table-column :width="100" label="编号" prop="id" sortable="custom"></el-table-column>
      <el-table-column :width="100" label="头像" prop="avatar">
        <template #default="{ row }">
          <el-avatar :src="row.avatar || userStore.defaultAvatarURL"></el-avatar>
        </template>
      </el-table-column>
      <el-table-column label="昵称" prop="nickname"></el-table-column>
      <el-table-column label="用户名" prop="username"></el-table-column>
      <el-table-column label="角色" prop="role">
        <template #default="{ row }">
          <div class="admin-roles">
            <el-tag v-for="role in row.roles" :key="role.id" :type="role.id === row.role_id ? 'primary' : 'info'">
              {{ role.name }}{{ role.id === row.role_id ? '（默认）' : '' }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="手机号" prop="phone"></el-table-column>
      <el-table-column label="邮箱" prop="email"></el-table-column>
      <el-table-column label="状态" prop="status">
        <template #default="{ row }">
          <el-switch v-model="row.status" :active-value="1" :before-change="()=>handleChangeSwitch(row,'status')"
                     :disabled="row.id === userStore.UserData.id" :inactive-value="0"
                     :loading="row.loading"></el-switch>
        </template>
      </el-table-column>
      <el-table-column :width="190" align="center" fixed="right" label="操作">
        <template #default="{ row }">
          <div class="table-btn-group">
            <el-button icon="Edit" plain size="small" type="primary" @click="()=>handleAdd(row)">修改</el-button>
            <el-button :disabled="!canDelete(row)" icon="Delete" plain size="small" type="danger"
                       @click="()=>handleDelete([row.id])">删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : '暂无管理员'" :image-size="70"/>
      </template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.limit"
          :page-sizes="[10, 30, 50, 100]"
          :total="total"
          background
          layout="total, sizes, prev, pager, next, jumper"

      />
    </div>
    <FormDialog v-model="dialogOpen" v-model:form="submitForm" :on-confirm="handleSubmit"
                :title="submitForm.id ? '修改管理员' : '新增管理员'" description="配置账号资料与所属角色，默认角色用于登录。"
                note-icon="User">
      <el-form-item :rules="[{required:true,message:'用户名不能为空'}]" label="用户名" prop="username">
        <el-input v-model="submitForm.username" placeholder="请输入用户名" size="large"></el-input>
      </el-form-item>
      <el-form-item :rules="[{required:true,type:'array',min:1,message:'请至少选择一个角色'}]" label="角色"
                    prop="role_ids">
        <el-select v-model="submitForm.role_ids" filterable multiple placeholder="请选择角色" size="large"
                   @change="handleRolesChange">
          <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id"
                     placeholder="请选择角色"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :rules="[{required:true,message:'请选择默认角色'}]" label="默认角色" prop="role_id">
        <el-select v-model="submitForm.role_id" placeholder="登录时默认使用的角色" size="large">
          <el-option v-for="role in selectedRoles" :key="role.id" :label="role.name" :value="role.id"/>
        </el-select>
      </el-form-item>
      <el-form-item :rules="[{required:true,message:'昵称不能为空'}]" label="昵称" prop="nickname">
        <el-input v-model="submitForm.nickname" placeholder="请输入昵称" size="large"></el-input>
      </el-form-item>
      <el-form-item :rules="[{required:true,message:'手机号不能为空'}]" label="手机号" prop="phone">
        <el-input v-model="submitForm.phone" placeholder="请输入手机号" size="large"></el-input>
      </el-form-item>
      <el-form-item :rules="[{required:true,message:'邮箱不能为空'}]" label="邮箱" prop="email">
        <el-input v-model="submitForm.email" placeholder="请输入邮箱" size="large"></el-input>
      </el-form-item>
      <el-form-item :rules="passwordRules" label="密码" prop="password">
        <el-input v-model="submitForm.password" :placeholder="submitForm.id ? `留空不修改；${passwordHint}` : passwordHint" autocomplete="new-password" show-password size="large"
                  type="password"></el-input>
      </el-form-item>
    </FormDialog>
  </el-card>
</template>

<script lang="ts" setup>
import {useUserStore} from "../../stores/user";
import {watch} from "vue";
import {confirmDelete} from "../../utils/confirmDelete";
import {usePasswordPolicy} from "../../utils/passwordPolicy";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import {SysAdminApi} from "../../apis/sys_admin";
import {computed, onMounted, ref} from "vue";
import {ElMessage} from "element-plus";
import FormDialog from "../../components/FormDialog.vue";

const userStore = useUserStore()
const dialogOpen = ref(false)
const roles: any = ref([])
const queryForm = ref({
  page: 1,
  role_id: undefined as number | undefined,
  sorts: [] as Array<{ field: string; order: string }>,
  filters: [] as Array<{ field: string; operator: string; value: string | number }>,
  limit: 10
})
const listError = ref('')
let listRequest = 0
const pageLoading = ref(true)
const total = ref(0)
const tableData = ref([])
const selectedIds = ref<number[]>([])
const canDelete = (row: { id: number }) => row.id !== userStore.UserData.id
const handleSelectionChange = (rows: Array<{ id: number }>) => {
  selectedIds.value = rows.filter(canDelete).map(row => row.id)
}
const submitForm: any = ref({})
const {
  hint: passwordHint,
  rules: passwordRules,
  load: loadPasswordPolicy
} = usePasswordPolicy(() => !submitForm.value.id)


const selectedRoles = computed(() => roles.value.filter((role: any) => (submitForm.value.role_ids || []).includes(role.id)))
const handleRolesChange = () => {
  if (!submitForm.value.role_ids.includes(submitForm.value.role_id)) {
    submitForm.value.role_id = submitForm.value.role_ids[0]
  }
}

const getPageData = async () => {
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  selectedIds.value = []
  try {
    const response = await SysAdminApi.List({...queryForm.value})
    if (request !== listRequest) return
    tableData.value = response.data.list ?? []
    roles.value = response.data.role_options ?? []
    total.value = response.data.total
  } catch (error) {
    if (request !== listRequest) return
    tableData.value = []
    roles.value = []
    total.value = 0
    listError.value = '列表加载失败，请点击刷新重试'
    console.error(error)
  } finally {
    if (request === listRequest) pageLoading.value = false
  }
}

const handleAdd = async (defaultForm: any) => {
  if (pageLoading.value || listError.value) return
  try {
    await loadPasswordPolicy()
  } catch {
    return
  }
  submitForm.value = {...defaultForm, role_ids: [...(defaultForm.role_ids || [])], password: ""}
  dialogOpen.value = true
}

const handleDelete = (ids: Array<any>) => confirmDelete({
  subject: "管理员",
  count: ids.length,
  description: "删除后对应账号将无法登录，请确认不再需要该账号。",
  onConfirm: async () => {
    await SysAdminApi.Delete(ids)
    ElMessage.success("删除成功")
    const lastPage = Math.max(1, Math.ceil((total.value - ids.length) / queryForm.value.limit))
    if (queryForm.value.page > lastPage) queryForm.value.page = lastPage
    else await getPageData()
  },
})

const handleChangeSwitch = async (row: any, key: string) => {
  row.loading = true
  try {
    await SysAdminApi.Edit({
      ...row,
      [key]: row[key] ? 0 : 1,
    })
    ElMessage.success("修改成功")
    row.loading = false
    return true
  } catch (e) {
    row.loading = false
    return false
  }
}

const handleSubmit = async () => {
  if (!submitForm.value.id) {
    await SysAdminApi.Create(submitForm.value)
    ElMessage.success("创建成功")
  } else {
    await SysAdminApi.Edit(submitForm.value)
    ElMessage.success("修改成功")
  }
  getPageData()
}

onMounted(() => {
  getPageData()
})
const emptySearch = () => ({
  username: '',
  nickname: '',
  phone: '',
  email: '',
  role_id: undefined as number | undefined,
  status: undefined as number | undefined
})
const searchForm = ref(emptySearch())
const handleSearch = () => {
  const filters: typeof queryForm.value.filters = []
  for (const field of ['username', 'nickname', 'phone', 'email'] as const) {
    const value = searchForm.value[field].trim()
    if (value) filters.push({field, operator: 'like', value})
  }
  if (typeof searchForm.value.status === 'number') filters.push({
    field: 'status',
    operator: '=',
    value: searchForm.value.status
  })
  queryForm.value = {...queryForm.value, page: 1, filters, role_id: searchForm.value.role_id || undefined}
}
const handleReset = () => {
  searchForm.value = emptySearch();
  handleSearch()
}
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


<style scoped>
.admin-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

</style>
