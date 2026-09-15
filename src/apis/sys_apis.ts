import {request} from "../utils/request";

export const SysApisApi = {
    GetInvalidAPIs() {
        return request.get("/sys_apis/invalid_apis");
    },
    GetGroups() {
        return request.get("/sys_apis/get_groups");
    },
    List(query?: any) {
        return request.post("/sys_apis/list", query);
    },
    Edit(form: any) {
        return request.post("/sys_apis/edit", form);
    },
    Delete(ids: Array<number>) {
        return request.post("/sys_apis/delete", {
            ids: ids
        });
    }
}
