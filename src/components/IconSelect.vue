<template>
  <el-dropdown ref="dropdownRef" trigger="click">
    <el-input v-model="selectIcon" placeholder="请选择图标" readonly size="large">
      <template v-if="selectIcon" #prepend>
        <iconify-icon :key="selectIcon" :icon="selectIcon" class="text-[18px]"></iconify-icon>
      </template>
    </el-input>
    <template #dropdown>
      <div class="icon-selector-content">
        <div class="mb-[10px]">
          <el-input ref="searchRef" v-model="search" clearable placeholder="要搜索的图标" size="large"
                    @input="()=>{queryForm.page = 1;filterIcons()}">
            <template #prefix>
              <iconify-icon icon="iconoir:search"></iconify-icon>
            </template>
          </el-input>
        </div>
        <ul class="icon-list">
          <li v-for="icon in currentIcons" :key="icon" class="icon-item" @click="()=>handleSelected(icon)">
            <iconify-icon :icon="icon" class="text-[24px]"></iconify-icon>
          </li>
        </ul>
        <div class="mt-[10px] flex justify-center">
          <el-pagination v-model:current-page="queryForm.page" :page-size="queryForm.size" :total="total"
                         background layout="prev, pager, next" @change="filterIcons"></el-pagination>
        </div>
      </div>
    </template>
  </el-dropdown>
</template>

<script lang="ts" setup>
import iconoir from "@iconify-json/iconoir/metadata.json"
import {onMounted, reactive, ref} from "vue";

const dropdownRef = ref();
const searchRef = ref()
const search = ref("")
const iconList: Array<string> = []
const queryForm = reactive({
  page: 1,
  size: 35,
})
const total = ref(0)
Object.values(iconoir.categories).flat().forEach(item => {
  iconList.push(`iconoir:${item}`)
})
const currentIcons: any = ref([])

const selectIcon = defineModel()


const filterIcons = () => {
  let data = iconList
  if (search.value != "") {
    data = iconList.filter(item => item.indexOf(search.value.toLocaleLowerCase()) > -1)
  }
  total.value = data.length
  let start = (queryForm.page - 1) * queryForm.size
  currentIcons.value = data.slice(start, start + queryForm.size)
}

const handleSelected = (icon: string) => {
  selectIcon.value = icon
  dropdownRef.value.handleClose()
}

onMounted(() => {
  filterIcons()
})

</script>

<style lang="less" scoped>
.icon-selector-content {
  padding: 15px;

  .icon-list {
    min-width: 430px;
    display: grid;
    grid-template-columns: repeat(7, 1fr); /* 3列等宽平分 */

    .icon-item {
      display: flex;
      width: 50px;
      height: 50px;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      &:hover {
        background-color: rgba(0, 0, 0, .2);
      }
    }
  }
}
</style>
