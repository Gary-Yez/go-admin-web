<template>
  <template v-for="menu in props.menus" :key="BuildMenuPath(menu)">
    <el-menu-item v-if="!menu.hidden && !menu.children?.length" :index="BuildMenuPath(menu)">
      <el-icon>
        <iconify-icon :icon="menu.icon || 'iconoir:view-grid'"></iconify-icon>
      </el-icon>
      <template #title><span>{{ menu.name }}</span></template>
    </el-menu-item>
    <el-sub-menu v-else-if="!menu.hidden" :index="BuildMenuPath(menu)" popper-class="sidebar-menu-popper">
      <template #title>
        <el-icon>
          <iconify-icon :icon="menu.icon || 'iconoir:view-grid'"></iconify-icon>
        </el-icon>
        <span>{{ menu.name }}</span>
      </template>
      <MenuItem :prefix="BuildMenuPath(menu)" :menus="menu.children"></MenuItem>
    </el-sub-menu>
  </template>
</template>

<script setup lang="ts">
const props:any = defineProps({
  menus:{
    type:Array,
    default:()=>{
      return []
    }
  },
  prefix:{
    type:String,
    default:()=>{
      return "/dashboard"
    }
  }
})
const BuildMenuPath = (menu:any) => {
  return props.prefix + "/" + menu.path
}
</script>
