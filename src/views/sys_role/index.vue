<template>
  <el-card class="container" shadow="never">
    <PageHeader description="按角色分配菜单与接口权限，统一管理访问范围" title="角色管理"/>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <ColumnTable v-loading="pageLoading" :data="tableData" size="large"
                 storage-key="core/views/sys_role/index:table-1" @sort-change="handleSortChange">
      <template #toolbar>
        <el-button :loading="pageLoading" icon="Refresh" @click="getPageData">刷新</el-button>
        <el-button icon="Plus" type="primary" @click="()=>handleAdd({})">新增角色</el-button>
      </template>
      <el-table-column :width="100" label="编号" prop="id" sortable="custom"></el-table-column>
      <el-table-column label="名称" prop="name"></el-table-column>
      <el-table-column label="类型" prop="is_super_admin">
        <template #default="{ row }">
          <el-tag v-if="row.is_super_admin" type="primary">系统管理员</el-tag>
          <el-tag v-else type="success">自定义</el-tag>
        </template>
      </el-table-column>
      <el-table-column :width="380" align="center" fixed="right" label="操作">
        <template #default="{ row }">
          <div class="table-btn-group">
            <el-button :disabled="row.is_super_admin" icon="Setting" plain size="small" type="primary"
                       @click="()=>handleEditPermission(row.id)">权限管理
            </el-button>
            <el-button icon="CopyDocument" plain size="small" type="primary" @click="handleCopy(row)">拷贝</el-button>
            <el-button :disabled="row.is_super_admin" icon="Edit" plain size="small" type="primary"
                       @click="()=>handleAdd(row)">修改
            </el-button>
            <el-button :disabled="row.is_super_admin" icon="Delete" plain size="small" type="danger"
                       @click="()=>handleDelete([row.id])">删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : '暂无角色'" :image-size="70"/>
      </template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination v-model:current-page="queryForm.page" v-model:page-size="queryForm.limit"
                     :page-sizes="[10,30,50,100]" :total="total" background
                     layout="total, sizes, prev, pager, next, jumper"/>
    </div>
    <FormDialog v-model="dialogOpen" v-model:form="submitForm"
                :on-confirm="handleSubmit" :title="submitForm.id ? '修改角色' : '新增角色'" description="设置角色名称后，可在权限管理中分配菜单与接口权限。"
                note-icon="UserFilled">
      <el-form-item :rules="[{required:true,message:'请输入角色名称'}]" label="角色名称" prop="name">
        <el-input v-model="submitForm.name" placeholder="请输入角色名称" size="large"></el-input>
      </el-form-item>
    </FormDialog>
    <FormDialog v-model="copyOpen" v-model:form="copyForm" :on-confirm="handleSubmitCopy"
                confirm-btn-text="确认拷贝" description="复制当前菜单和 API 权限，副本与原角色独立维护。" note-icon="CopyDocument" title="拷贝角色">
      <el-form-item label="来源角色"><span>{{ copySourceName }}</span></el-form-item>
      <el-form-item :rules="[{required:true,whitespace:true,message:'请输入新角色名称'}]" label="新角色名称"
                    prop="name">
        <el-input v-model="copyForm.name" maxlength="100" placeholder="请输入新角色名称" size="large"/>
      </el-form-item>
    </FormDialog>
    <FormDialog v-model="permissionOpen" v-model:form="permissionForm" :on-confirm="handleSubmitPermission"
                description="分别配置菜单可见范围和接口访问权限。" note-icon="Setting" title="权限管理">
      <el-tabs type="border-card">
        <el-tab-pane label="菜单权限">
          <p class="text-[12px] text-[var(--el-text-color-secondary)] mb-[12px]">
            默认菜单用于登录和切换角色后的首页，仅可选择可访问的页面。</p>
          <el-tree ref="menuTreeRef" :data="menus" :props="{label:'name',disabled:(data:any)=>data.key === permissionForm.default_menu}" default-expand-all node-key="id"
                   show-checkbox
                   @check="handleMenuCheck">
            <template #default="{node,data}">
              <div class="role-menu-node">
                <span>{{ data.name }}</span>
                <el-tag v-if="data.key === permissionForm.default_menu" size="small">默认首页</el-tag>
                <el-button v-else-if="data.component && !data.hidden && node.checked" link size="small" type="primary"
                           @click.stop="setDefaultMenu(data)">设为默认
                </el-button>
              </div>
            </template>
          </el-tree>
        </el-tab-pane>
        <el-tab-pane label="API权限">
          <el-tree ref="apiTreeRef" :data="apis" :props="{label:'description'}" default-expand-all node-key="id"
                   show-checkbox>
            <template #default="{ data }">
              <div class="flex justify-between w-full">
                <span>{{ data.description }}</span>
                <span>{{ data.path }}</span>
              </div>
            </template>
          </el-tree>
        </el-tab-pane>
      </el-tabs>
    </FormDialog>
  </el-card>
</template>

<script lang="ts" setup>
import {nextTick, onMounted, ref, watch} from "vue";
import {confirmDelete} from "../../utils/confirmDelete";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import {SysRoleApi} from "../../apis/sys_role";
import {ElMessage} from "element-plus";
import FormDialog from "../../components/FormDialog.vue";

const menuTreeRef = ref()
const apiTreeRef = ref()
const listError = ref('')
let listRequest = 0
const pageLoading = ref(true)
const menus = ref([])
const apis = ref([])
const apisIdMap: any = ref({})
const tableData = ref([])
const queryForm = ref({page: 1, limit: 10, sorts: [] as Array<{ field: string; order: string }>})
const total = ref(0)
const dialogOpen = ref(false)
const permissionOpen = ref(false)
const copyOpen = ref(false)
const copySourceName = ref('')
const copyForm = ref({id: 0, name: ''})
const handleCopy = (row: any) => {
  copySourceName.value = row.name
  copyForm.value = {id: row.id, name: `${row.name}副本`.slice(0, 100)}
  copyOpen.value = true
}
const handleSubmitCopy = async () => {
  await SysRoleApi.Copy(copyForm.value.id, copyForm.value.name.trim())
  ElMessage.success('角色拷贝成功')
  await getPageData()
}
const submitForm: any = ref({})
const permissionForm: any = ref({})

const menuByKey = (key: string, items: any[] = menus.value): any => {
  for (const item of items) {
    if (item.key === key) return item
    const child = menuByKey(key, item.children || [])
    if (child) return child
  }
}
const setDefaultMenu = (menu: any) => {
  permissionForm.value.default_menu = menu.key
  menuTreeRef.value.setChecked(menu.id, true, false)
}
const handleMenuCheck = () => {
  const current = menuByKey(permissionForm.value.default_menu)
  if (current) menuTreeRef.value.setChecked(current.id, true, false)
}
const setApiOptions = (options: any[]) => {
  const apisMap: any = {}
  const idMap: any = {}
  options.forEach((item: any) => {
    item.id = item.method + item.path
    if (!apisMap[item.group]) {
      apisMap[item.group] = {
        description: item.group,
        children: [item]
      }
    } else {
      apisMap[item.group].children.push(item)
    }
    idMap[item.id] = item
  })
  apisIdMap.value = idMap
  apis.value = Object.values(apisMap)
}

const getPageData = async () => {
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  try {
    const response = await SysRoleApi.List({...queryForm.value})
    if (request !== listRequest) return
    tableData.value = response.data.list ?? []
    total.value = response.data.total
    menus.value = response.data.menu_options ?? []
    setApiOptions(response.data.api_options ?? [])
  } catch (error) {
    if (request !== listRequest) return
    tableData.value = []
    total.value = 0
    menus.value = []
    setApiOptions([])
    listError.value = '列表加载失败，请点击刷新重试'
    console.error(error)
  } finally {
    if (request === listRequest) pageLoading.value = false
  }
}

const handleEditPermission = async (id: number) => {
  if (pageLoading.value || listError.value) return
  const response = await SysRoleApi.Get(id)
  permissionForm.value = response.data
  permissionOpen.value = true
  await nextTick(() => {
    apiTreeRef.value.setCheckedKeys(permissionForm.value.apis.map((item: any) => item.method + item.path))
    // 父目录由子节点推导勾选状态，避免半选目录回显时选中未授权的同级菜单。
    menuTreeRef.value.setCheckedKeys([])
    menuTreeRef.value.setCheckedKeys(permissionForm.value.menus
        .map((item: any) => item.id)
        .filter((id: number) => {
          const node = menuTreeRef.value.getNode(id)
          return node && node.childNodes.length === 0
        }))
    const home = menuByKey(permissionForm.value.default_menu)
    if (home?.component && !home.hidden) menuTreeRef.value.setChecked(home.id, true, false)
    else permissionForm.value.default_menu = ''
  })
}

const handleAdd = (defaultForm: any) => {
  submitForm.value = {
    ...defaultForm,
  }
  dialogOpen.value = true
}

onMounted(() => {
  getPageData()
})

const handleSubmitPermission = async () => {
  handleMenuCheck()
  const menus = [...new Set<number>([...menuTreeRef.value.getCheckedKeys(), ...menuTreeRef.value.getHalfCheckedKeys()])]
  let apis = apiTreeRef.value.getCheckedKeys().filter((item: any) => item).map((item: any) => {
    return {
      path: apisIdMap.value[item].path,
      method: apisIdMap.value[item].method,
    }
  })
  await SysRoleApi.UpdatePermission(permissionForm.value.id, menus, apis, permissionForm.value.default_menu)
  ElMessage.success("权限修改成功")
}

const handleSubmit = async () => {
  if (!submitForm.value.id) {
    await SysRoleApi.Create({
      ...submitForm.value,
      default_menu: 'sys_home',
      menus: menuByKey('sys_home') ? [{id: menuByKey('sys_home').id}] : [],
    })
    ElMessage.success("创建成功")
  } else {
    await SysRoleApi.Edit(submitForm.value)
    ElMessage.success("修改成功")
  }
  getPageData()
}

const handleDelete = (ids: Array<any>) => confirmDelete({
  subject: "角色",
  count: ids.length,
  description: "删除后该角色的权限将不可用，请先确认用户的角色分配。",
  onConfirm: async () => {
    await SysRoleApi.Delete(ids)
    ElMessage.success("删除成功")
    await getPageData()
  },
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

<style scoped>
.role-menu-node {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding-right: 8px;
}

.role-menu-node > .el-button {
  margin-left: auto;
}

</style>
