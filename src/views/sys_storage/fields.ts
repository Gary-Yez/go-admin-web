import type {StorageEngine, StorageParams} from "../../apis/sys_storage";

export interface StorageField {
    key:keyof StorageParams
    label:string
    placeholder?:string
    required?:boolean
    secret?:boolean
    location?:boolean
}
const bucket:StorageField = {key:'bucket', label:'存储桶', required:true, location:true, placeholder:'请输入存储桶名称，例如 admin-files'}
const secret:StorageField = {key:'secret_key', label:'访问密钥 Secret', secret:true, placeholder:'请输入访问密钥 Secret Access Key'}
const access:StorageField = {key:'access_key', label:'访问密钥 ID', required:true, placeholder:'请输入访问密钥 Access Key ID'}
const publicURL:StorageField = {key:'public_url', label:'公开访问地址', placeholder:'填写后预览、下载优先直连此地址，需已配置公开访问'}
export const storageFields:Record<StorageEngine,StorageField[]> = {
    local:[
        {key:'root',label:'存储目录',required:true,location:true,placeholder:'例如 ./uploads'},
        publicURL,
    ],
    tencent:[
        {key:'endpoint',label:'存储桶地址',required:true,location:true,placeholder:'https://bucket-appid.cos.ap-guangzhou.myqcloud.com'},
        {...access,label:'SecretID',placeholder:'请输入腾讯云 API 密钥 SecretID'}, {...secret,label:'SecretKey',placeholder:'请输入腾讯云 API 密钥 SecretKey'}, publicURL,
    ],
    aliyun:[
        {key:'endpoint',label:'服务地址',required:true,location:true,placeholder:'https://oss-cn-hangzhou.aliyuncs.com'},
        {key:'region',label:'区域',required:true,location:true,placeholder:'例如 cn-hangzhou'},
        bucket,access,secret,publicURL,
    ],
    s3:[
        {key:'endpoint',label:'服务地址',location:true,placeholder:'AWS 可留空，MinIO、R2 填写完整 HTTP(S) 地址'},
        {key:'region',label:'区域',required:true,location:true,placeholder:'AWS 填桶区域，R2 填 auto，MinIO 通常为 us-east-1'},
        bucket,access,secret,publicURL,
    ],
}
