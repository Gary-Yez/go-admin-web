import {request} from "../utils/request.ts";

export interface PasswordPolicy {
    min_length:number
    max_bytes:number
}
export const SysAuthApi = {
    PasswordPolicy(){
        return request.get<unknown, {data:PasswordPolicy}>("/sys_auth/password_policy");
    },
    Login(form:Object){
        return request.post("/sys_auth/login",form);
    },
    SwitchRole(roleId:number){
        return request.post("/sys_auth/switch_role", {role_id:roleId});
    },
    GetMe(token?:string){
        return request.get("/sys_auth/me", token ? {headers:{Authorization:`Bearer ${token}`}} : undefined);
    },
    ChangeInfo(form:any){
        return request.post("/sys_auth/change_info",form);
    },
    ChangePassword(form:any){
        return request.post("/sys_auth/change_password",form);
    }
}
