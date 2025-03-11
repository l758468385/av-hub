// Tab切换功能

function switchTab(tabName) {

    // 更新按钮状态

    document.querySelectorAll('.tab-button').forEach(button => {

        button.classList.remove('active');

        if (button.dataset.tab === tabName) {

            button.classList.add('active');

        }

    });



    // 更新内容显示

    document.querySelectorAll('.tab-content').forEach(content => {

        content.classList.add('hidden');

    });

    document.getElementById(`${tabName}Tab`).classList.remove('hidden');



    // 如果切换到合集标签页，且还没有加载过数据，则加载数据

    if (tabName === 'collections' && !document.getElementById('collectionList').children.length) {

        loadCollections();

    }

    // 如果切换到视频播放标签页，则加载视频
    if (tabName === 'player') {
        loadVideo();
    }

}



// 添加 API 配置
const API_CONFIG = {
    BASE_URL: 'http://127.0.0.1:8000/v1',
    ENDPOINTS: {
        SEARCH: '/avcode',
        COLLECTIONS: '/hacg',
        VIDEO: '/get_video'
    }
};

// 搜索磁力链接

async function searchMagnet() {

    const input = document.getElementById('searchInput');

    const resultsDiv = document.getElementById('searchResults');

    const searchTerm = input.value.replace(/\s+/g, '').trim();

    const notification = document.getElementById('notification');

    const container = document.getElementById('coverImageContainer');

    const regex = /^[A-Za-z][\w\s]*\d$/;

    if (!searchTerm || !regex.test(searchTerm)) {

        // 空搜索警告通知

        notification.innerHTML = `

            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>

            </svg>

            <span>${translations[currentLang].emptySearchWarning}</span>

        `;

        notification.style.background = '#dc2626'; // 红色背景

        notification.classList.add('show');

        if (container) {

            container.classList.add('hidden');

        }

        setTimeout(() => {

            notification.classList.remove('show');

            notification.style.background = ''; // 重置背景色为默认值

        }, 3000);

        return;

    }

    // 隐藏之前的图片和搜索结果

    if (container) {

        container.classList.add('hidden');

        container.style.opacity = '0';

    }

    resultsDiv.innerHTML = '';

    // 显示加载动画

    const loadingTemplate = document.getElementById('loadingTemplate');

    resultsDiv.innerHTML = loadingTemplate.innerHTML;

    setLanguage(currentLang); // 更新加载文本的语言

    try {

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH}/${searchTerm}`);

        const data = await response.json();

        if (Array.isArray(data.data) && data.data.length > 0) {

            // 先显示搜索结果

            const formattedResults = data.data.map(result => {

                if (Array.isArray(result)) {

                    return result;

                }

                // 如果结果是字符串，尝试解析

                try {

                    return JSON.parse(result.replace(/'/g, '"'));

                } catch (e) {

                    console.error('解析结果出错:', e);

                    return null;

                }

            }).filter(result => result !== null);

            displaySearchResults(formattedResults);

            // 等待搜索结果渲染完成后再显示图片

            setTimeout(() => showCoverImage(searchTerm), 300);

        } else {

            resultsDiv.innerHTML = `<p class="text-center text-inherit opacity-75">${translations[currentLang].noResults}</p>`;

            // 没有搜索结果时隐藏图片

            if (container) {

                container.classList.add('hidden');

            }

        }

    } catch (error) {

        console.error('搜索出错:', error);

        resultsDiv.innerHTML = `<p class="text-center text-inherit opacity-75">${translations[currentLang].searchError}</p>`;

        // 搜索出错时隐藏图片

        if (container) {

            container.classList.add('hidden');

        }

    }

}

// 显示搜索结果

function displaySearchResults(results) {

    const resultsDiv = document.getElementById('searchResults');

    if (!results || !results.length) {

        resultsDiv.innerHTML = `<p class="text-center text-inherit opacity-75">${translations[currentLang].noResults}</p>`;

        // 没有搜索结果时隐藏图片

        const container = document.getElementById('coverImageContainer');

        if (container) {

            container.classList.add('hidden');

        }

        return;

    }

    const html = results.map(([magnet, title, size, date]) => {

        const tags = extractTags(title);

        const tagsHtml = tags.map(tag => {

            return `<div class="tag" data-type="${tag.type}">${getTagLabel(tag.type)}</div>`;

        }).join('');

        return `

            <div class="magnet-item p-6 rounded-xl">

                <div class="flex flex-col gap-4">

                    <h3 class="font-medium text-inherit break-all">${title}</h3>

                    <div class="flex flex-wrap gap-2">

                        ${tagsHtml}

                    </div>

                    <p class="text-sm text-inherit opacity-75">

                        ${translations[currentLang].size}: ${size} | ${translations[currentLang].date}: ${date}

                    </p>

                    <button onclick="copyToClipboard('${magnet}')" 

                            class="copy-button w-full px-4 py-2 rounded-lg text-sm font-medium text-white">

                        ${translations[currentLang].copyButton}

                    </button>

                </div>

            </div>

        `;

    }).join('');

    resultsDiv.innerHTML = html;

}

// 处理番号格式并显示封面图片

function showCoverImage(searchTerm) {

    const container = document.getElementById('coverImageContainer');

    const image = document.getElementById('coverImage');

    const modal = document.getElementById('imageModal');

    const modalImage = document.getElementById('modalImage');

    // 如果搜索词为空，隐藏图片

    if (!searchTerm) {

        container.classList.add('hidden');

        return;

    }

    // 正则表达式匹配番号格式

    const avMatch = searchTerm.match(/([a-zA-Z]+)[-]?(\d+)/i);

    if (avMatch) {

        // 提取番号的字母和数字部分

        const prefix = avMatch[1].toLowerCase();

        const number = avMatch[2].padStart(3, '0'); // 确保数字部分至少有3位

        // 构建标准格式的番号 (例如: ipx-096)

        const formattedAV = `${prefix}-${number}`;

        // 构建图片URL

        const imageUrl = `https://fourhoi.com/${formattedAV}/cover-n.jpg`;

        // 设置图片源并显示容器

        image.src = imageUrl;

        container.style.opacity = '0';

        container.classList.remove('hidden');
        
        // 移除之前的 loaded 类
        image.classList.remove('loaded');

        // 处理图片加载完成
        image.onload = () => {
            requestAnimationFrame(() => {
                container.style.transition = 'opacity 0.3s ease';
                container.style.opacity = '1';
                image.classList.add('loaded');
            });
        };

        // 处理图片加载错误
        image.onerror = () => {
            container.classList.add('hidden');
        };

        // 点击图片显示大图

        container.onclick = () => {

            modalImage.src = imageUrl;

            modal.classList.remove('hidden');

            setTimeout(() => {

                modal.classList.add('active');

            }, 10);

        };

    } else {

        // 如果不是番号格式，隐藏图片容器

        container.classList.add('hidden');

    }

}

// 视频播放功能
let hls = null;
let autoplayEnabled = false;

// 初始化自动播放设置
function initializeAutoplaySettings() {
    const autoplayToggle = document.getElementById('autoplayToggle');
    if (autoplayToggle) {
        // 从localStorage读取自动播放设置
        autoplayEnabled = localStorage.getItem('autoplayEnabled') === 'true';
        autoplayToggle.checked = autoplayEnabled;
        
        // 监听自动播放设置变化
        autoplayToggle.addEventListener('change', (e) => {
            autoplayEnabled = e.target.checked;
            localStorage.setItem('autoplayEnabled', autoplayEnabled);
        });
    }
}

async function loadVideo() {
    const videoPlayer = document.getElementById('videoPlayer');
    const notification = document.getElementById('notification');
    const sourceUrlElement = document.getElementById('videoSourceUrl');

    try {
        // 添加加载中状态
        videoPlayer.classList.add('loading');
        
        // 显示加载中通知
        notification.innerHTML = `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${translations[currentLang].loadingVideo}</span>
        `;
        notification.classList.add('show');

        // 预加载封面图
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VIDEO}`);
        const data = await response.json();
        
        // 创建一个Image对象来预加载封面图
        const img = new Image();
        img.src = data.img_url;
        
        // 等待封面图加载完成
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // 如果加载失败也继续
        });

        // 销毁之前的HLS实例
        if (hls) {
            hls.destroy();
            hls = null;
        }

        // 设置视频封面
        videoPlayer.poster = data.img_url;

        // 更新视频源地址显示
        sourceUrlElement.textContent = data.url;

        // 根据视频URL类型选择播放方式
        if (data.url.endsWith('.m3u8')) {
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(data.url);
                hls.attachMedia(videoPlayer);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (autoplayEnabled) {
                        videoPlayer.play().catch(e => console.error('Auto-play failed:', e));
                    }
                });
            } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                videoPlayer.src = data.url;
                if (autoplayEnabled) {
                    videoPlayer.play().catch(e => console.error('Auto-play failed:', e));
                }
            }
        } else {
            videoPlayer.src = data.url;
            if (autoplayEnabled) {
                videoPlayer.play().catch(e => console.error('Auto-play failed:', e));
            }
        }

        // 确保播放器控件可见
        videoPlayer.addEventListener('webkitfullscreenchange', () => {
            if (document.webkitFullscreenElement) {
                videoPlayer.style.display = 'block';
                videoPlayer.controls = true;
            }
        });

        videoPlayer.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                videoPlayer.style.display = 'block';
                videoPlayer.controls = true;
            }
        });

        videoPlayer.classList.remove('loading');
        notification.classList.remove('show');
    } catch (error) {
        console.error('加载视频出错:', error);
        videoPlayer.classList.remove('loading');
        sourceUrlElement.textContent = '';
        
        notification.innerHTML = `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${translations[currentLang].videoError}</span>
        `;
        notification.style.background = '#dc2626';
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            notification.style.background = '';
        }, 3000);
    }
}

// 初始化视频播放器
document.addEventListener('DOMContentLoaded', () => {
    initializeAutoplaySettings();
    initializeCopyButton();
    
    const nextVideoButton = document.getElementById('nextVideo');
    if (nextVideoButton) {
        nextVideoButton.addEventListener('click', loadVideo);
    }
});

// 初始化复制按钮功能
function initializeCopyButton() {
    const copyButton = document.getElementById('copySourceUrl');
    const notification = document.getElementById('notification');

    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            const sourceUrlElement = document.getElementById('videoSourceUrl');
            const sourceUrl = sourceUrlElement?.textContent;
            if (!sourceUrl) return;

            try {
                await navigator.clipboard.writeText(sourceUrl);
                
                // 显示复制成功提示
                if (notification) {
                    notification.innerHTML = `
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>${translations[currentLang].copied}</span>
                    `;
                    notification.style.background = '#10B981'; // 成功绿色
                    notification.classList.add('show');
                    setTimeout(() => {
                        notification.classList.remove('show');
                        notification.style.background = '';
                    }, 2000);
                }

                // 更新按钮状态
                copyButton.classList.add('copied');
                const textElement = copyButton.querySelector('.tab-text');
                if (textElement) {
                    const originalText = textElement.textContent;
                    textElement.textContent = translations[currentLang].copied;
                    
                    setTimeout(() => {
                        copyButton.classList.remove('copied');
                        textElement.textContent = originalText;
                    }, 2000);
                }
            } catch (err) {
                console.error('复制失败:', err);
                if (notification) {
                    notification.innerHTML = `
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        <span>${translations[currentLang].copyFailed}</span>
                    `;
                    notification.style.background = '#dc2626';
                    notification.classList.add('show');
                    setTimeout(() => {
                        notification.classList.remove('show');
                        notification.style.background = '';
                    }, 3000);
                }
            }
        });
    }
}

// 语言配置
const translations = {
    zh: {
        search: 'AV搜索',
        collections: '里番合集',
        player: '视频播放',
        searchPlaceholder: '请输入AV番号...',
        searchButton: '搜索',
        copyButton: '复制链接',
        noResults: '未找到相关结果',
        searchError: '搜索出错，请稍后重试',
        size: '大小',
        date: '日期',
        emptySearchWarning: '搜索词为空或有误，请重新输入',
        copySuccess: '已复制到剪贴板',
        copyError: '复制失败，请手动复制',
        loading: '正在搜索中',
        pageSize: '每页显示',
        items: '条',
        total: '共',
        currentPage: '当前第',
        page: '页',
        prevPage: '上一页',
        nextPage: '下一页',
        goToPage: '跳转到',
        sortByDate: '按日期排序',
        sortBySize: '按大小排序',
        newest: '最新',
        oldest: '最早',
        largest: '最大',
        smallest: '最小',
        next: '下一个',
        loadingVideo: '正在加载视频...',
        videoError: '视频加载失败，请稍后重试',
        nsfw: '⚠️ 警告：该内容包含成人内容 (NSFW)，请确保您已年满18岁',
        autoplay: '自动播放',
        sourceUrl: '视频源地址',
        copy: '复制',
        copied: '已复制',
        copyFailed: '复制失败'
    },
    en: {
        search: 'AV Search',
        collections: 'Anime Collection',
        player: 'Video Player',
        searchPlaceholder: 'Enter AV number...',
        searchButton: 'Search',
        copyButton: 'Copy Link',
        noResults: 'No results found',
        searchError: 'Search error, please try again later',
        size: 'Size',
        date: 'Date',
        emptySearchWarning: 'The search term is empty or incorrect, please re-enter',
        copySuccess: 'Copied to clipboard',
        copyError: 'Copy failed, please copy manually',
        loading: 'Searching',
        pageSize: 'Show',
        items: 'items',
        total: 'Total',
        currentPage: 'Page',
        page: '',
        prevPage: 'Previous',
        nextPage: 'Next',
        goToPage: 'Go to page',
        sortByDate: 'Sort by date',
        sortBySize: 'Sort by size',
        newest: 'Newest',
        oldest: 'Oldest',
        largest: 'Largest',
        smallest: 'Smallest',
        next: 'Next',
        loadingVideo: 'Loading video...',
        videoError: 'Failed to load video, please try again later',
        nsfw: '⚠️ Warning: This content contains adult material (NSFW), ensure you are 18+',
        autoplay: 'Auto Play',
        sourceUrl: 'Video Source URL',
        copy: 'Copy',
        copied: 'Copied',
        copyFailed: 'Copy Failed'
    }
};

// 语言图标配置
const LANGUAGES = {
    zh: {
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946z"/>
              </svg>`,
        label: '中文'
    },
    en: {
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2.133 0h2.732l1.658 4.51L11.2 5h2.667l-2.667 7.43V16H8.867v-3.57L6.133 5z"/>
              </svg>`,
        label: 'English'
    }
};

// 当前语言
let currentLang = 'zh';

// 主题配置
const THEMES = {
    dark: {
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
              </svg>`,
        label: { zh: '夜间', en: 'Dark' }
    },
    light: {
        icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
              </svg>`,
        label: { zh: '日间', en: 'Light' }
    },
    emerald: {
        icon: `<svg t="1741614536732" class="icon" viewBox="0 0 1024 1024" version="1.1"
                xmlns="http://www.w3.org/2000/svg" p-id="5381" width="20" height="20">
                <path d="M469.333333 896 469.333333 714.24C449.28 721.493333 427.946667 725.333333 405.333333 725.333333 298.666667 725.333333 213.333333 640 213.333333 533.333333 213.333333 479.146667 234.666667 430.506667 271.36 395.52 261.546667 372.48 256 346.88 256 320 256 213.333333 341.333333 128 448 128 514.56 128 573.44 162.133333 608 213.333333 611.413333 213.333333 614.826667 213.333333 618.666667 213.333333 748.373333 213.333333 853.333333 318.293333 853.333333 448 853.333333 577.706667 748.373333 682.666667 618.666667 682.666667 597.333333 682.666667 576 679.68 554.666667 673.706667L554.666667 896 469.333333 896Z" p-id="5382" fill="#10b981"></path>
              </svg>`,
        label: { zh: '翠绿', en: 'Emerald' }
    },
    ocean: {
        icon: `<svg t="1741614777271" class="icon" viewBox="0 0 1024 1024" version="1.1"
                xmlns="http://www.w3.org/2000/svg" p-id="11657" id="mx_n_1741614777271" width="200" height="200">
                <path d="M704 341.333333a170.666667 170.666667 0 0 1-124.16-52.906666A90.453333 90.453333 0 0 0 512 256a89.173333 89.173333 0 0 0-67.84 31.573333A174.506667 174.506667 0 0 1 320 341.333333a170.666667 170.666667 0 0 1-124.16-53.333333A90.026667 90.026667 0 0 0 128 256a42.666667 42.666667 0 0 1 0-85.333333 174.506667 174.506667 0 0 1 124.16 53.333333 88.32 88.32 0 0 0 135.253333 0 170.666667 170.666667 0 0 1 248.746667 0 88.746667 88.746667 0 0 0 135.68 0A173.653333 173.653333 0 0 1 896 170.666667a42.666667 42.666667 0 0 1 0 85.333333 90.026667 90.026667 0 0 0-67.84 31.573333A174.506667 174.506667 0 0 1 704 341.333333z" fill="#3b82f6" p-id="11658"></path>
                <path d="M704 597.333333a170.666667 170.666667 0 0 1-124.16-52.906666A90.453333 90.453333 0 0 0 512 512a89.173333 89.173333 0 0 0-67.84 31.573333 170.666667 170.666667 0 0 1-248.32 0A90.026667 90.026667 0 0 0 128 512a42.666667 42.666667 0 0 1 0-85.333333 174.506667 174.506667 0 0 1 124.16 52.906666 88.32 88.32 0 0 0 135.253333 0 170.666667 170.666667 0 0 1 248.746667 0 88.746667 88.746667 0 0 0 135.68 0A173.653333 173.653333 0 0 1 896 426.666667a42.666667 42.666667 0 0 1 0 85.333333 90.026667 90.026667 0 0 0-67.84 31.573333A174.506667 174.506667 0 0 1 704 597.333333z" fill="#3b82f6" p-id="11659"></path>
                <path d="M704 853.333333a170.666667 170.666667 0 0 1-124.16-52.906666A90.453333 90.453333 0 0 0 512 768a89.173333 89.173333 0 0 0-67.84 31.573333 170.666667 170.666667 0 0 1-248.32 0A90.026667 90.026667 0 0 0 128 768a42.666667 42.666667 0 0 1 0-85.333333 174.506667 174.506667 0 0 1 124.16 52.906666 88.32 88.32 0 0 0 135.253333 0 170.666667 170.666667 0 0 1 248.746667 0 88.746667 88.746667 0 0 0 135.68 0A173.653333 173.653333 0 0 1 896 682.666667a42.666667 42.666667 0 0 1 0 85.333333 90.026667 90.026667 0 0 0-67.84 31.573333A174.506667 174.506667 0 0 1 704 853.333333z" fill="#3b82f6" p-id="11660"></path>
              </svg>`,
        label: { zh: '海蓝', en: 'Ocean' }
    },
    amethyst: {
        icon: `<svg t="1741614881262" class="icon" viewBox="0 0 1024 1024" version="1.1"
                xmlns="http://www.w3.org/2000/svg" p-id="5206" width="20" height="20">
                <path d="M512.8 216l185.6 200H327.2l185.6-200z m273.6 200h172.8l-224-288h-56l107.2 288z m-273.6 413.6L732 448H292.8l220 381.6zM647.2 128H377.6L276 412.8 512.8 168l236.8 245.6L647.2 128z m121.6 320l-256 450.4-256-450.4H87.2L512 963.2 933.6 448H768.8z m-530.4-32l107.2-288h-56L68 416h170.4z" p-id="5207" fill="#8b5cf6"></path>
              </svg>`,
        label: { zh: '紫晶', en: 'Amethyst' }
    }
};

// 排序配置
const SORT_OPTIONS = {
    'date-desc': {
        icon: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3z"/>
              </svg>`,
        label: { zh: '最新日期', en: 'Newest' }
    },
    'date-asc': {
        icon: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 000 2h4a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h11a1 1 0 100-2H3z"/>
              </svg>`,
        label: { zh: '最早日期', en: 'Oldest' }
    },
    'size-desc': {
        icon: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
              </svg>`,
        label: { zh: '文件最大', en: 'Largest' }
    },
    'size-asc': {
        icon: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
              </svg>`,
        label: { zh: '文件最小', en: 'Smallest' }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 设置初始主题
    const savedTheme = localStorage.getItem('theme') || 'dark';
    toggleTheme(savedTheme);

    // 设置初始语言
    const savedLang = localStorage.getItem('language') || 'zh';
    setLanguage(savedLang);

    // 初始化所有按钮
    initializeButtons();

    // 加载合集列表
    loadCollections();
    
    // 添加事件监听器
    
    // 语言切换按钮
    const langButton = document.getElementById('languageToggle');
    if (langButton) {
        langButton.onclick = () => showLanguageMenu(langButton);
    }

    // 主题切换按钮
    const themeButton = document.getElementById('themeToggle');
    if (themeButton) {
        themeButton.onclick = () => showThemeMenu(themeButton);
    }
    
    // 搜索输入框添加回车键触发搜索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchMagnet();
            }
        });
    }
    
    // 回到顶部按钮
    const backToTopButton = document.getElementById('backToTop');
    if (backToTopButton) {
        // 初始隐藏按钮
        backToTopButton.classList.add('hidden');
        
        // 监听滚动事件
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopButton.classList.remove('hidden');
            } else {
                backToTopButton.classList.add('hidden');
            }
        });
        
        // 点击事件
        backToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // 初始化大图预览功能
    const modal = document.getElementById('imageModal');
    const closeButton = document.getElementById('closeModal');
    
    // 关闭按钮点击事件
    if (closeButton) {
        closeButton.onclick = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        };
    }
    
    // 点击模态框背景关闭
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.classList.add('hidden');
                }, 300);
            }
        };
    }
    
    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    });
    
    // 下一个视频按钮
    const nextVideoButton = document.getElementById('nextVideo');
    if (nextVideoButton) {
        nextVideoButton.addEventListener('click', loadVideo);
    }
});

// 切换主题功能
function toggleTheme(themeName) {
    // 移除所有主题类
    document.body.removeAttribute('data-theme');
    // 设置新主题
    document.body.setAttribute('data-theme', themeName);
    // 保存主题设置
    localStorage.setItem('theme', themeName);

    // 更新主题按钮图标
    const themeButton = document.getElementById('themeToggle');
    if (themeButton) {
        themeButton.innerHTML = THEMES[themeName].icon;
    }

    // 重新初始化所有按钮事件
    initializeButtons();
}

// 初始化所有按钮事件
function initializeButtons() {
    // 初始化标签页按钮
    document.querySelectorAll('.tab-button').forEach(button => {
        const tabName = button.dataset.tab;
        button.onclick = () => switchTab(tabName);
    });

    // 初始化主题切换按钮
    const themeButton = document.getElementById('themeToggle');
    if (themeButton) {
        themeButton.onclick = () => showThemeMenu(themeButton);
    }

    // 初始化语言切换按钮
    const langButton = document.getElementById('languageToggle');
    if (langButton) {
        langButton.onclick = () => showLanguageMenu(langButton);
    }

    // 初始化排序按钮
    const sortButton = document.getElementById('sortButton');
    if (sortButton) {
        sortButton.onclick = () => showSortMenu(sortButton);
    }
}

// 显示语言菜单
function showLanguageMenu(button) {
    const existingMenu = document.querySelector('.language-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    const menu = document.createElement('div');
    menu.className = 'theme-menu language-menu';
    
    // 对号图标 SVG
    const checkmarkSvg = `<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;
    
    menu.innerHTML = `
        <button class="theme-menu-item" data-lang="zh" data-active="${currentLang === 'zh'}">
            ${currentLang === 'zh' ? checkmarkSvg : '<span class="w-5 h-5 mr-2"></span>'}
            <span>中文</span>
        </button>
        <button class="theme-menu-item" data-lang="en" data-active="${currentLang === 'en'}">
            ${currentLang === 'en' ? checkmarkSvg : '<span class="w-5 h-5 mr-2"></span>'}
            <span>English</span>
        </button>
    `;

    // 将菜单添加到 body
    document.body.appendChild(menu);

    // 计算菜单位置
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    
    // 确保菜单不会超出视口
    let top = buttonRect.bottom;
    let left = Math.min(
        buttonRect.left,
        window.innerWidth - menuRect.width - 10
    );

    // 如果菜单会超出底部，则显示在按钮上方
    if (top + menuRect.height > window.innerHeight) {
        top = buttonRect.top - menuRect.height;
    }
    
    menu.style.position = 'fixed';
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.zIndex = '1000';

    // 窗口滚动时更新菜单位置
    const updateMenuPosition = () => {
        const updatedRect = button.getBoundingClientRect();
        let newTop = updatedRect.bottom;
        
        // 如果菜单会超出底部，则显示在按钮上方
        if (newTop + menuRect.height > window.innerHeight) {
            newTop = updatedRect.top - menuRect.height;
        }
        
        menu.style.top = `${newTop}px`;
        menu.style.left = `${Math.min(updatedRect.left, window.innerWidth - menuRect.width - 10)}px`;
    };

    window.addEventListener('scroll', updateMenuPosition);
    window.addEventListener('resize', updateMenuPosition);

    menu.addEventListener('click', (e) => {
        const langItem = e.target.closest('.theme-menu-item');
        if (langItem) {
            const newLang = langItem.dataset.lang;
            setLanguage(newLang);
            menu.remove();
            window.removeEventListener('scroll', updateMenuPosition);
            window.removeEventListener('resize', updateMenuPosition);
        }
    });

    // 点击其他区域关闭菜单
    const closeMenu = (e) => {
        if (!button.contains(e.target) && !menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', updateMenuPosition);
            window.removeEventListener('resize', updateMenuPosition);
        }
    };

    // 使用 re·uestAnimationFrame 延迟添加点击事件，避免立即触发
    requestAnimationFrame(() => {
        document.addEventListener('click', closeMenu);
    });

    // ESC 键关闭菜单
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            menu.remove();
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', updateMenuPosition);
            window.removeEventListener('resize', updateMenuPosition);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// 语言切换功能
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);

    // 不再需要更新语言按钮文本，因为我们使用固定的"文"字符作为图标
    // const languageButton = document.getElementById('languageToggle');
    // if (languageButton) {
    //     languageButton.querySelector('.language-text').textContent = 
    //         lang === 'zh' ? '中文' : 'English';
    // }

    // 更新所有带有 data-zh 和 data-en 属性的元素
    document.querySelectorAll('[data-zh][data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });

    // 更新搜索框占位符
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = searchInput.getAttribute(`data-${lang}-placeholder`);
    }

    // 更新排序按钮文本
    const sortButton = document.getElementById('sortButton');
    if (sortButton && sortButton.value) {
        const sortOption = SORT_OPTIONS[sortButton.value];
        if (sortOption) {
            sortButton.innerHTML = `
                ${sortOption.icon}
                <span class="ml-2">${sortOption.label[lang]}</span>
            `;
        }
    }

    // 更新主题菜单文本
    const themeMenuItems = document.querySelectorAll('.theme-menu-item');
    themeMenuItems.forEach(item => {
        const themeName = item.dataset.theme;
        if (themeName && THEMES[themeName]) {
            const label = item.querySelector('.theme-label');
            if (label) {
                label.textContent = THEMES[themeName].label[lang];
            }
        }
    });

    // 更新分页控件文本
    updatePaginationText();

    // 更新所有按钮文本
    document.querySelectorAll('button').forEach(button => {
        // 更新搜索按钮
        if (button.classList.contains('search-button')) {
            const searchText = button.querySelector('.tab-text');
            if (searchText) {
                searchText.textContent = translations[lang].searchButton;
            }
        }
        
        // 更新复制按钮
        if (button.classList.contains('copy-button')) {
            button.textContent = translations[lang].copyButton;
        }
    });

    // 重新渲染搜索结果
    const searchResults = document.getElementById('searchResults');
    if (searchResults && searchResults.children.length > 0) {
        const firstChild = searchResults.firstElementChild;
        if (!firstChild.classList.contains('loading-container') && 
            firstChild.tagName.toLowerCase() !== 'p') {
            try {
                const results = Array.from(searchResults.children).map(item => {
                    const title = item.querySelector('h3').textContent;
                    const info = item.querySelector('p').textContent;
                    const [size, date] = info.split('|').map(str => str.split(':')[1].trim());
                    const magnet = item.querySelector('button').getAttribute('onclick').split("'")[1];
                    return [magnet, title, size, date];
                });
                displaySearchResults(results);
            } catch (error) {
                console.error('解析搜索结果失败:', error);
            }
        }
    }

    // 重新加载合集
    const collectionsTab = document.getElementById('collectionsTab');
    if (collectionsTab && !collectionsTab.classList.contains('hidden')) {
        loadCollections();
    }

    // 更新加载动画文本
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = translations[lang].loading;
    }

    // 更新所有错误和提示消息
    document.querySelectorAll('.notification, .error-message, .info-message').forEach(el => {
        const messageKey = el.dataset.messageKey;
        if (messageKey && translations[lang][messageKey]) {
            el.textContent = translations[lang][messageKey];
        }
    });
}

// 更新分页控件文本
function updatePaginationText() {
    const paginationElements = document.querySelectorAll('.pagination-container');
    paginationElements.forEach(container => {
        const prevBtn = container.querySelector('.prev-page');
        const nextBtn = container.querySelector('.next-page');
        const pageInfo = container.querySelector('.page-info');
        const pageSizeSelect = container.querySelector('.page-size-select');
        
        if (prevBtn) prevBtn.textContent = translations[currentLang].prevPage;
        if (nextBtn) nextBtn.textContent = translations[currentLang].nextPage;
        
        if (pageInfo) {
            const currentPage = pageInfo.dataset.currentPage;
            const totalPages = pageInfo.dataset.totalPages;
            const pageSize = pageInfo.dataset.pageSize;
            
            pageInfo.textContent = `${translations[currentLang].currentPage}${currentPage}${translations[currentLang].page} / ${translations[currentLang].total}${totalPages}${translations[currentLang].page}`;
        }
        
        if (pageSizeSelect) {
            const label = pageSizeSelect.previousElementSibling;
            if (label) {
                label.textContent = `${translations[currentLang].pageSize}: `;
            }
            const suffix = pageSizeSelect.nextElementSibling;
            if (suffix) {
                suffix.textContent = ` ${translations[currentLang].items}`;
            }
        }
    });
}

// 解析文件大小
function parseFileSize(sizeStr) {
    try {
        // 确保输入是字符串
        sizeStr = String(sizeStr).trim();
        
        // 匹配数字和单位
        const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/i);
        if (!match) return 0;
        
        const [, value, unit] = match;
        const size = parseFloat(value);
        
        // 转换到字节
        switch (unit.toUpperCase()) {
            case 'KB':
                return size * 1024;
            case 'MB':
                return size * 1024 * 1024;
            case 'GB':
                return size * 1024 * 1024 * 1024;
            case 'TB':
                return size * 1024 * 1024 * 1024 * 1024;
            case 'B':
            default:
                return size;
        }
    } catch (error) {
        console.error('解析文件大小错误:', error);
        return 0;
    }
}

// 排序功能
function sortResults(sortType) {
    const resultsDiv = document.getElementById('searchResults');
    const results = Array.from(resultsDiv.children);
    
    if (results.length === 0 || results[0].classList.contains('loading-container')) {
        return;
    }

    results.sort((a, b) => {
        try {
            const aInfo = a.querySelector('p').textContent;
            const bInfo = b.querySelector('p').textContent;
            
            // 提取大小和日期
            const [aSize, aDate] = aInfo.split('|').map(str => str.split(':')[1].trim());
            const [bSize, bDate] = bInfo.split('|').map(str => str.split(':')[1].trim());
            
            switch (sortType) {
                case 'date-desc':
                    return new Date(bDate || 0) - new Date(aDate || 0);
                case 'date-asc':
                    return new Date(aDate || 0) - new Date(bDate || 0);
                case 'size-desc':
                    return parseFileSize(bSize) - parseFileSize(aSize);
                case 'size-asc':
                    return parseFileSize(aSize) - parseFileSize(bSize);
                default:
                    return 0;
            }
        } catch (error) {
            console.error('排序比较错误:', error);
            return 0;
        }
    });

    // 清空并重新添加排序后的结果
    resultsDiv.innerHTML = '';
    results.forEach(result => resultsDiv.appendChild(result));
}

// 显示动漫合集
function displayCollections(collections) {
    const collectionList = document.getElementById('collectionList');
    
    // 清空现有内容
    collectionList.innerHTML = '';
    
    // 检查collections是否为数组
    if (Array.isArray(collections)) {
        // 处理数组类型的数据
        collections.forEach(collection => {
            const collectionItem = document.createElement('div');
            collectionItem.className = 'magnet-item p-6 rounded-xl';
            collectionItem.innerHTML = `
                <div class="flex flex-col gap-4">
                    <h3 class="font-medium text-inherit break-all">${collection.title}</h3>
                    <button onclick="copyToClipboard('${collection.link}')" 
                            class="copy-button w-full px-4 py-2 rounded-lg text-sm font-medium text-white">
                        ${translations[currentLang].copyButton}
                    </button>
                </div>
            `;
            collectionList.appendChild(collectionItem);
        });
    } else if (collections && typeof collections === 'object') {
        // 处理对象类型的数据
        Object.entries(collections).forEach(([title, link]) => {
            const collectionItem = document.createElement('div');
            collectionItem.className = 'magnet-item p-6 rounded-xl';
            collectionItem.innerHTML = `
                <div class="flex flex-col gap-4">
                    <h3 class="font-medium text-inherit break-all">${title}</h3>
                    <button onclick="copyToClipboard('${link}')" 
                            class="copy-button w-full px-4 py-2 rounded-lg text-sm font-medium text-white">
                        ${translations[currentLang].copyButton}
                    </button>
                </div>
            `;
            collectionList.appendChild(collectionItem);
        });
    } else {
        // 没有数据或数据格式不正确
        collectionList.innerHTML = `<p class="text-center text-inherit opacity-75">${translations[currentLang].noResults}</p>`;
    }
}

// 获取标签文字
function getTagLabel(type) {
    const tagLabels = {
        hd: { zh: '高清', en: 'HD' },
        subtitle: { zh: '字幕', en: 'SUB' },
        uncensored: { zh: '无码', en: 'Uncensored' },
        chinese: { zh: '中文', en: 'Chinese' },
        leak: { zh: '破解', en: 'Leaked' }
    };
    return tagLabels[type][currentLang];
}

// 提取标签
function extractTags(title) {
    const tags = [];
    const tagMap = {
        'HD': {type: 'hd', priority: 1},
        'FHD': {type: 'hd', priority: 1},
        '字幕': {type: 'subtitle', priority: 2},
        '-C': {type: 'subtitle', priority: 2},
        '無修正': {type: 'uncensored', priority: 3},
        '无码': {type: 'uncensored', priority: 3},
        'uncensored': {type: 'uncensored', priority: 3},
        '中文': {type: 'chinese', priority: 4},
        '破解': {type: 'leak', priority: 5},
        'leak': {type: 'leak', priority: 5}
    };

    Object.entries(tagMap).forEach(([keyword, {type, priority}]) => {
        if (title.toLowerCase().includes(keyword.toLowerCase())) {
            if (!tags.find(t => t.type === type)) {
                tags.push({type, priority});
            }
        }
    });

    return tags.sort((a, b) => a.priority - b.priority);
}

// 获取标签样式
function getTagStyle(tag) {
    // 更新标签样式为玻璃态设计
    const styleMap = {
        '高清': 'bg-blue-500/20 text-blue-300',
        '字幕': 'bg-green-500/20 text-green-300',
        '无码': 'bg-red-500/20 text-red-300',
        '有码': 'bg-yellow-500/20 text-yellow-300',
        '中文': 'bg-purple-500/20 text-purple-300',
        '无修正': 'bg-pink-500/20 text-pink-300',
        '破解版': 'bg-indigo-500/20 text-indigo-300'
    };

    return styleMap[tag] || 'bg-gray-500/20 text-gray-300';
}

// 加载动漫合集
async function loadCollections() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COLLECTIONS}`);
        const data = await response.json();
        displayCollections(data.data);
    } catch (error) {
        console.error('加载合集失败:', error);
    }
}

// 复制到剪贴板
function copyToClipboard(text) {
    const notification = document.getElementById('notification');
    
    navigator.clipboard.writeText(text).then(() => {
        // 成功复制通知
        notification.innerHTML = `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>${translations[currentLang].copySuccess}</span>
        `;
        notification.style.setProperty('background', '#1bb76e');
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
            notification.style.background = ''; // 重置背景色为默认值
        }, 3000);
    }).catch(err => {
        // 复制失败通知
        notification.innerHTML = `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <span>${translations[currentLang].copyError}</span>
        `;
        notification.style.background = '#dc2626';
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
            notification.style.background = '';
        }, 3000);
    });
}

// 修改排序下拉菜单
function showSortMenu(button) {
    const existingMenu = document.querySelector('.sort-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    const currentSort = button.value;
    const sortMenu = document.createElement('div');
    sortMenu.className = 'sort-menu';

    button.parentElement.style.position = 'relative';
    
    sortMenu.innerHTML = Object.entries(SORT_OPTIONS).map(([value, option]) => `
        <button class="theme-menu-item" data-sort="${value}" data-active="${value === currentSort}">
            ${option.icon}
            <span>${option.label[currentLang]}</span>
        </button>
    `).join('');

    button.parentElement.appendChild(sortMenu);

    sortMenu.addEventListener('click', (e) => {
        const sortItem = e.target.closest('.theme-menu-item');
        if (sortItem) {
            const newSort = sortItem.dataset.sort;
            button.value = newSort;
            sortResults(newSort);
            button.innerHTML = `
                ${SORT_OPTIONS[newSort].icon}
                <span class="ml-2">${SORT_OPTIONS[newSort].label[currentLang]}</span>
            `;
            sortMenu.remove();
        }
    });

    document.addEventListener('click', (e) => {
        if (!button.contains(e.target) && !sortMenu.contains(e.target)) {
            sortMenu.remove();
        }
    }, { once: true });
}

// 显示主题菜单
function showThemeMenu(button) {
    const existingMenu = document.querySelector('.theme-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    const currentTheme = localStorage.getItem('theme') || 'dark';
    const themeMenu = document.createElement('div');
    themeMenu.className = 'theme-menu';

    themeMenu.innerHTML = Object.entries(THEMES).map(([name, theme]) => `
        <button class="theme-menu-item" data-theme="${name}" data-active="${name === currentTheme}">
            ${theme.icon}
            <span class="theme-label">${theme.label[currentLang]}</span>
        </button>
    `).join('');

    // 将菜单添加到 body 而不是按钮中
    document.body.appendChild(themeMenu);

    // 计算菜单位置
    const buttonRect = button.getBoundingClientRect();
    const menuRect = themeMenu.getBoundingClientRect();
    
    // 确保菜单不会超出视口
    let top = buttonRect.bottom;
    let left = Math.min(
        buttonRect.left,
        window.innerWidth - menuRect.width - 10
    );

    // 如果菜单会超出底部，则显示在按钮上方
    if (top + menuRect.height > window.innerHeight) {
        top = buttonRect.top - menuRect.height;
    }

    themeMenu.style.position = 'fixed';
    themeMenu.style.top = `${top}px`;
    themeMenu.style.left = `${left}px`;
    themeMenu.style.zIndex = '1000';

    // 窗口滚动时更新菜单位置
    const updateMenuPosition = () => {
        const updatedRect = button.getBoundingClientRect();
        let newTop = updatedRect.bottom;
        
        // 如果菜单会超出底部，则显示在按钮上方
        if (newTop + menuRect.height > window.innerHeight) {
            newTop = updatedRect.top - menuRect.height;
        }
        
        themeMenu.style.top = `${newTop}px`;
        themeMenu.style.left = `${Math.min(updatedRect.left, window.innerWidth - menuRect.width - 10)}px`;
    };

    window.addEventListener('scroll', updateMenuPosition);
    window.addEventListener('resize', updateMenuPosition);

    // 点击菜单项时切换主题并关闭菜单
    themeMenu.addEventListener('click', (e) => {
        const themeItem = e.target.closest('.theme-menu-item');
        if (themeItem) {
            const newTheme = themeItem.dataset.theme;
            toggleTheme(newTheme);
            themeMenu.remove();
            window.removeEventListener('scroll', updateMenuPosition);
            window.removeEventListener('resize', updateMenuPosition);
        }
    });

    // 点击其他区域关闭菜单
    const closeMenu = (e) => {
        if (!button.contains(e.target) && !themeMenu.contains(e.target)) {
            themeMenu.remove();
            document.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', updateMenuPosition);
            window.removeEventListener('resize', updateMenuPosition);
        }
    };

    // 使用 requestAnimationFrame 延迟添加点击事件，避免立即触发
    requestAnimationFrame(() => {
        document.addEventListener('click', closeMenu);
    });

    // ESC 键关闭菜单
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            themeMenu.remove();
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', updateMenuPosition);
            window.removeEventListener('resize', updateMenuPosition);
        }
    };
    document.addEventListener('keydown', handleEscape);
}