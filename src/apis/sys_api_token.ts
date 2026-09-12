import {request} from "../utils/request";
export const SysApiTokenApi = {
    List(query:{page:number,limit:number,filters:object[]}){
        const params = new URLSearchParams({page:String(query.page),limit:String(query.limit)});
        query.filters.forEach(filter=>params.append("filters", JSON.stringify(filter)));
        return request.get("/sys_api_token/mine/list", {params});
    },
    Save(form:object){ return request.post("/sys_api_token/mine/save", form); },
    Delete(id:number){ return request.post("/sys_api_token/mine/delete", {id}); },
}