import {adminRuntime} from "../runtime";
import {defineStore} from "pinia";
import { formatTime } from "../utils/formatTime";
import {ElMessage} from "element-plus";

export const useCommonStore = defineStore("sys_common", {
    state: () => ({
        isDev:adminRuntime.dev,
        currentTime:"",
        theme:localStorage.getItem("theme") || "light",
    }),
    actions: {
        setTime(){
          this.currentTime = formatTime(Date.now())
        },
        setTheme(theme?:string){
            if (theme){
                this.theme = theme
                localStorage.setItem("theme",theme)
            }
            let html:any = document.querySelector("html")
            if (this.theme === 'light'){
                html.classList.remove("dark")
            }else {
                html.classList.add("dark")
            }
            if (theme){
                ElMessage.success("主题切换成功")
            }
        }
    }
})

