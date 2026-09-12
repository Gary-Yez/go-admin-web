<template>
  <el-card class="container" shadow="never">
    <PageHeader title="API 管理" description="查看已同步的接口，维护分组说明与清理失效记录" />
    <el-form class="search-form" :model="searchForm" @submit.prevent="handleSearch">
      <el-input prefix-icon="Search" size="large" v-model="searchForm.keyword" placeholder="搜索路径或描述" clearable maxlength="100" style="--search-control-width: 260px" @blur="handleSearch" />
      <el-select size="large" v-model="searchForm.method" placeholder="全部方法" clearable style="--search-control-width: 140px" @change="handleSearch">
        <el-option v-for="method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE']" :key="method" :label="method" :value="method" />
      </el-select>
      <el-select size="large" v-model="searchForm.group" placeholder="全部分组" clearable filterable style="--search-control-width: 210px" @change="handleSearch">
        <el-option v-for="group in groups" :key="group" :label="group" :value="group" />
      </el-select>
      <el-button icon="RefreshLeft" @click="handleReset">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :title="listError" type="error" :closable="false" show-icon />
    </div>
    <ColumnTable @sort-change="handleSortChange" storage-key="core/views/sys_apis/index:table-1" size="large" v-loading="pageLoading" :data="tableData"  @selection-change="handleSelectionChange">
      <template #toolbar>
        <el-button v-if="multipleSelection.length <= 0" icon="Refresh" :loading="pageLoading" @click="getPageData">刷新</el-button>
        <el-button v-if="multipleSelection.length <= 0" type="primary" icon="Delete" @click="handleCleanupAPI">清理失效 API</el-button>
        <el-button v-if="multipleSelection.length > 0" type="danger" icon="Delete" @click="()=>handleDelete(multipleSelection)">批量删除</el-button>
      </template>
      <el-table-column type="selection"></el-table-column>
      <el-table-column label="编号" prop="id" sortable="custom" :width="100"></el-table-column>
      <el-table-column label="路径" prop="path" min-width="220"><template #default="{ row }"><code class="table-code">{{ row.path }}</code></template></el-table-column>
      <el-table-column label="方法" prop="method">
        <template #default="{ row }">
          <el-tag :type="MethodType[row.method] || 'warning'">{{ row.method }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分组" prop="group"></el-table-column>
      <el-table-column label="描述" prop="description"></el-table-column>
      <el-table-column label="操作" :width="190" fixed="right" align="center">
        <template #default="{ row }">
          <div class="table-btn-group">
            <el-button type="primary" icon="Edit" plain size="small" @click="()=>handleShowFormDialog(row)">修改</el-button>
            <el-button type="danger" icon="Delete" plain size="small" @click="()=>handleDelete([row.id])">删除</el-button>
          </div>
        </template>
      </el-table-column>
    <template #empty><el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : (queryForm.keyword || queryForm.method || queryForm.group) ? '没有匹配的API' : '暂无API'" :image-size="70" /></template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.limit"
          :page-sizes="[10, 30, 50, 100]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          
      />
    </div>
    <FormDialog description="维护接口分组和描述，路径与请求方法由路由同步。" note-icon="Connection" v-model="dialogOpen" v-model:form="submitForm" title="修改 API 信息" :on-confirm="handleSubmit">
      <el-form-item label="分组" prop="group" :rules="[{required:true,message:'分组不能为空'}]">
        <el-select size="large"
            v-model="submitForm.group"
            filterable
            allow-create
            default-first-option
            :reserve-keyword="false"
            placeholder="选择或新增分组"
        >
          <el-option
              v-for="item in groups"
              :key="item"
              :label="item"
              :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="描述" prop="description" :rules="[{required:true,message:'描述不能为空'}]">
        <el-input size="large" v-model="submitForm.description" placeholder="请输入描述"></el-input>
      </el-form-item>
    </FormDialog>
    <CleanupAPI ref="cleanupRef" @cleaned="handleCleaned" />
  </el-card>
</template>

<script setup lang="ts">
import {watch} from "vue";
import {confirmDelete} from "../../utils/confirmDelete";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import { SysApisApi } from "../../apis/sys_apis";
import { ElMessage } from "element-plus";
import FormDialog from "../../components/FormDialog.vue";
import {onMounted, ref} from "vue";
import CleanupAPI from "./cleanup_api.vue";
import {MethodType} from "./method_type.ts";
const cleanupRef = ref();
const dialogOpen = ref(false)
const queryForm = ref({
  page:1,
    sorts:[] as Array<{field:string;order:string}>,
  limit:10,
  keyword:"",
  method:"",
  group:"",
})
const searchForm = ref({ keyword:"", method:"", group:"" })
let listRequest = 0
const handleSearch = ()=>{
  queryForm.value = { ...queryForm.value, ...searchForm.value, keyword:searchForm.value.keyword.trim(), page:1 }
}
const handleReset = ()=>{
  searchForm.value = { keyword:"", method:"", group:"" }
  handleSearch()
}
const listError = ref('')
const pageLoading = ref(true)
const total = ref(0)
const multipleSelection:any = ref([])
const tableData = ref([])
const submitForm = ref({id:0, group:"", description:""})
const groups:any = ref([])
const getPageData = async () => {
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  multipleSelection.value = []
  try {
    const response = await SysApisApi.List({ ...queryForm.value })
    if (request !== listRequest) return
    tableData.value = response.data.list ?? []
    total.value = response.data.total
    SysApisApi.GetGroups().then(res => {
      if (request === listRequest) groups.value = res.data
    }).catch(console.error)
  } catch (error) {
    if (request !== listRequest) return
    tableData.value = []
    total.value = 0
    listError.value = '列表加载失败，请点击刷新重试'
    console.error(error)
  } finally {
    if (request === listRequest) pageLoading.value = false
  }
}


const handleSelectionChange = (val:Array<any>) => {
  multipleSelection.value = val.map(item=>item.id)
}

const handleShowFormDialog = (defaultForm:any)=>{
  submitForm.value = {
    id:defaultForm.id,
    group:defaultForm.group,
    description:defaultForm.description
  }
  dialogOpen.value = true
}

const handleCleanupAPI = ()=>{
  cleanupRef.value.show()
}

const handleCleaned = async ()=>{
  if (queryForm.value.page === 1) await getPageData()
  else queryForm.value.page = 1
}

const handleDelete = (ids:Array<any>) => confirmDelete({
  subject:"API",
  count:ids.length,
  description:"删除接口记录及对应角色授权，不会删除后端路由代码。",
  onConfirm:async ()=>{
    await SysApisApi.Delete(ids)
    ElMessage.success("删除成功")
    await getPageData()
  },
})

const handleSubmit = async ()=>{
  await SysApisApi.Edit(submitForm.value)
  ElMessage.success("修改成功")
  await getPageData()
}

onMounted(()=>{
  getPageData()
})
const handleSortChange = ({prop,order}:{prop:string;order:'ascending'|'descending'|null})=>{
  queryForm.value.sorts = ['id'].includes(prop) && order ? [{field:prop,order:order === 'ascending' ? 'asc' : 'desc'}] : []
  queryForm.value.page = 1
}
watch(queryForm, ()=>{ getPageData() }, {deep:true})
</script>
