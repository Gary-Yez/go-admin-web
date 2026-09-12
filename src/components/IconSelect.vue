<template>
  <el-dropdown ref="dropdownRef" trigger="click">
    <el-input size="large" v-model="selectIcon" readonly placeholder="请选择图标">
      <template #prepend v-if="selectIcon">
        <iconify-icon class="text-[18px]" :icon="selectIcon" :key="selectIcon"></iconify-icon>
      </template>
    </el-input>
    <template #dropdown>
      <div class="icon-selector-content">
        <div class="mb-[10px]">
          <el-input size="large" v-model="search" ref="searchRef" clearable placeholder="要搜索的图标" @input="()=>{queryForm.page = 1;filterIcons()}">
            <template #prefix>
              <iconify-icon icon="iconoir:search"></iconify-icon>
            </template>
          </el-input>
        </div>
        <ul class="icon-list">
          <li class="icon-item" v-for="icon in currentIcons" :key="icon" @click="()=>handleSelected(icon)">
            <iconify-icon class="text-[24px]" :icon="icon"></iconify-icon>
          </li>
        </ul>
        <div class="mt-[10px] flex justify-center">
          <el-pagination v-model:current-page="queryForm.page" :page-size="queryForm.size" background layout="prev, pager, next" :total="total" @change="filterIcons"></el-pagination>
        </div>
      </div>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
  import iconoir from "@iconify-json/iconoir/metadata.json"
  import { onMounted, reactive, ref} from "vue";
  const dropdownRef = ref();
  const searchRef = ref()
  const search = ref("")
  const iconList:Array<string> = []
  const queryForm = reactive({
    page:1,
    size:35,
  })
  const total = ref(0)
  Object.values(iconoir.categories).flat().forEach(item=>{
    iconList.push(`iconoir:${item}`)
  })
  const currentIcons:any = ref([])

  const selectIcon = defineModel()


  const filterIcons = ()=>{
    let data = iconList
    if (search.value != "") {
      data = iconList.filter(item=>item.indexOf(search.value.toLocaleLowerCase()) > -1)
    }
    total.value = data.length
    let start = (queryForm.page - 1) * queryForm.size
    currentIcons.value = data.slice(start,start + queryForm.size)
  }

  const handleSelected = (icon:string) => {
    selectIcon.value = icon
    dropdownRef.value.handleClose()
  }

  onMounted(()=>{
    filterIcons()
  })

</script>

<style scoped lang="less">
.icon-selector-content{
  padding: 15px;
  .icon-list{
    min-width: 430px;
    display: grid;
    grid-template-columns: repeat(7, 1fr); /* 3列等宽平分 */
    .icon-item{
      display: flex;
      width: 50px;
      height: 50px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      &:hover{
        background-color: rgba(0,0,0,.2);
      }
    }
  }
}
</style>
