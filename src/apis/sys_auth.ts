import {request} from "../utils/request";

export interface ChangeInfoBody {
    nickname?: string
    phone?: string
    email?: string
    avatar_file_id?: number
}

export interface PasswordPolicy {
    min_length: number
    max_bytes: number
}

export const SysAuthApi = {
    PasswordPolicy() {
        return request.get<unknown, { data: PasswordPolicy }>("/sys_auth/password_policy");
    },
    Login(form: Object) {
        return request.post("/sys_auth/login", form);
    },
    SwitchRole(roleId: number) {
        return request.post("/sys_auth/switch_role", {role_id: roleId});
    },
    async GetMe(token?: string) {
        const response = await request.get("/sys_auth/me", token ? {headers: {Authorization: `Bearer ${token}`}} : undefined);
        if (response.data.avatar_file_id && response.data.avatar) {
            response.data.avatar = avatarURL(response.data.avatar)
        }
        return response
    },
    async ChangeInfo(form: ChangeInfoBody) {
        const response = await request.post<unknown, {data: ChangeInfoBody & {avatar?: string}}>("/sys_auth/change_info", form)
        if (response.data.avatar) response.data.avatar = avatarURL(response.data.avatar)
        return response
    },
    ChangePassword(form: any) {
        return request.post("/sys_auth/change_password", form);
    }
}

function avatarURL(url: string): string {
    return /^https?:\/\//i.test(url) ? url : request.getUri({url})
}
