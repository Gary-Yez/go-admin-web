import {ElMessage} from "element-plus";

export function loadZero(i: number) {
    return i < 10 ? '0' + i : '' + i;
}

export const copyText = async (text:string) => {
    try {
        // 使用现代 Clipboard API
        await navigator.clipboard.writeText(text);
        // 2秒后隐藏提示
        ElMessage.success("复制成功");
    } catch (err) {
        console.error('复制失败:', err);
        // 降级方案
        fallbackCopyText(text);
    }
};

// 兼容旧浏览器的降级方案
const fallbackCopyText = (text:string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // 避免滚动
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        ElMessage.success("复制成功");
    } catch (err) {
        ElMessage.error('复制失败，请手动复制');
    } finally {
        document.body.removeChild(textArea);
    }
};
