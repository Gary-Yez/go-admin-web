import {adminRuntime} from "../runtime";
import {createRouter, createWebHashHistory} from 'vue-router';
import {useUserStore} from "../stores/user.ts";
import {addSyncRouter, getBaseRouter, layoutsModules} from "./syncMenu.ts";
//@ts-ignore
import NProgress from "nprogress"

const router = adminRuntime.router ?? createRouter({
    history: createWebHashHistory(),
    routes:[{
        path:"/",
        redirect:"/login"
    },{
        path:"/login",
        name:'login',
        component:layoutsModules["../layouts/login.vue"],
    },getBaseRouter()],
})


adminRuntime.router = router
// 复用路由实例时，只替换框架注册的守卫。
adminRuntime.routeGuards.forEach(remove => remove())
adminRuntime.routeGuards = []

adminRuntime.routeGuards.push(router.beforeEach(async (to, _, next) => {
    NProgress.start();
    const userStore = useUserStore()
    if (userStore.AccessToken && !userStore.IsLogin){
        try {
            await userStore.getUserData()
            addSyncRouter(userStore.UserMenu,userStore.UserData.role?.default_menu)
            return next(to.redirectedFrom?.path === '/dashboard' ? '/dashboard' : to.fullPath)
        }catch (e) {
            if (userStore.AccessToken) await userStore.logout(false)
            return next("/login")
        }
    }
    if (!userStore.IsLogin && to.name !== "login"){
        return next('/login')
    }else if (userStore.IsLogin && to.name === "login"){
        return next('/dashboard')
    }
    if (userStore.IsLogin && to.matched.length === 0){
        return next('/dashboard')
    }
    next()
}))

adminRuntime.routeGuards.push(router.afterEach(() => {
    NProgress.done();
}))

export default router;
