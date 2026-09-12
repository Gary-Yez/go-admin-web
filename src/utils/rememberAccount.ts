const storageKey = "remember_username"

// 只读取账号，并清除可能残留的旧明文记录。
export function readRememberedUsername():string {
    try {
        localStorage.removeItem("remember")
        return localStorage.getItem(storageKey) ?? ""
    } catch { /* 浏览器禁用存储时，仍允许正常登录。 */ }
    return ""
}

export function saveRememberedUsername(username:string):boolean {
    try {
        localStorage.removeItem("remember")
        if (username) localStorage.setItem(storageKey, username)
        else localStorage.removeItem(storageKey)
        return true
    } catch { return false }
}