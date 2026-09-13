import {adminRuntime} from "../runtime";
import {defineStore} from "pinia";
import router from "../routes";
import {addSyncRouter, resetSyncRouter} from "../routes/syncMenu.ts";
import {ElMessage} from "element-plus";
import {SysAuthApi} from "../apis/sys_auth.ts";

export const useUserStore = defineStore("sys_user", {
    state: () => ({
        AccessToken: localStorage.getItem("access_token") || "",
        IsLogin: false,
        SwitchingRole: false,
        SessionVersion: 0,
        UserData:{} as {
            id?:number,
            role_id?:number,
            roles?:Array<{id:number,name:string}>,
            avatar?:string,
            username?:string,
            nickname?:string,
            phone?:string,
            email?:string,
            role?:{
                id:number,
                name:string,
                default_menu?:string,
                menus:[]
            }
        },
    }),
    actions: {
        setAccessToken(payload:string){
            this.AccessToken = payload
            localStorage.setItem("access_token", this.AccessToken)
        },
        setUserData(payload:Object){
            this.UserData = payload
            this.IsLogin = true
            ElMessage.success("已成功登录")
        },
        async getUserData(){
            const response = await SysAuthApi.GetMe()
            this.setUserData(response.data)
        },
        async switchRole(roleId:number){
            if (this.SwitchingRole || roleId === this.UserData.role_id) return
            this.SwitchingRole = true
            const previousToken = this.AccessToken
            let applied = false
            try {
                const response = await SysAuthApi.SwitchRole(roleId)
                // 新角色资料加载完成前不替换本地身份，失败时保留当前角色。
                const profile = await SysAuthApi.GetMe(response.data.token)
                if (this.AccessToken !== previousToken) return
                this.setAccessToken(response.data.token)
                this.UserData = profile.data
                this.IsLogin = true
                applied = true
                addSyncRouter(this.UserMenu,this.UserData.role?.default_menu)
                await router.replace('/dashboard')
                this.SessionVersion++
                ElMessage.success(`已切换为${this.UserData.role?.name || '所选角色'}`)
            } catch (error) {
                if (applied) await this.logout()
                throw error
            } finally {
                this.SwitchingRole = false
            }
        },
        async logout(showMessage = true){
            localStorage.removeItem("access_token")
            this.AccessToken = ""
            this.IsLogin = false
            this.UserData = {}
            resetSyncRouter()
            this.SessionVersion++
            await router.replace("/login")
            if (showMessage) ElMessage.success("已成功退出登录")
        }
    },
    getters:{
        UserMenu(state):Array<any>{
            let menus:any = [...(state.UserData?.role?.menus || [])]
            if (adminRuntime.dev){
                menus.push({
                    name: "开发工具",
                    icon: "iconoir:terminal",
                    path: "sys_devtools",
                    children: [{
                        name:      "代码生成",
                        icon:      "iconoir:code-brackets",
                        path:      "autocode",
                        component: "../core/views/sys_devtools/autocode.vue",
                    }, {
                        name:      "生成历史",
                        icon:      "iconoir:clock-rotate-right",
                        path:      "autocode_history",
                        component: "../core/views/sys_devtools/autocode_history.vue",
                    }, {
                        name:      "配置定义",
                        icon:      "iconoir:settings",
                        path:      "config_definition",
                        component: "../core/views/sys_config/index.vue",
                    }],
                })
            }
            return menus
        }
    }
})
