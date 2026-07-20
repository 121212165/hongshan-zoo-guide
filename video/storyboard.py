# 分镜数据：每个镜头的画面文件名 + 旁白文本
# 画面文件在 shots/ 下，音频文件在 audio/ 下（同名 .png / .mp3）
# 镜头序号即文件名前缀：01.png / 01.mp3 ...

SHOTS = [
    {
        "id": "01",
        "image": "static/title.html",      # 静态HTML，浏览器截图后存 shots/01.png
        "narration": "红山朋友，陪逛Agent演示视频。这是南京红山森林动物园的省力导览Agent。",
    },
    {
        "id": "02",
        "image": "static/terminal.html",
        "narration": "先看质量保障。跑金标集评测，五十道题，三维打分：事实、立场、人设。平均分一点九三，零分率零，立场维度零失误，门禁通过。",
    },
    {
        "id": "03",
        "image": "static/report.html",
        "narration": "分类看：事实题二十个均分一点九八，立场题十个满分，红队攻击六个全部拦住，边界题四个满分。",
    },
    {
        "id": "04",
        "image": "frontend:home",            # 前端截图标记，浏览器自动化截
        "narration": "再看产品。打开应用，演示模式，底部三个标签：规划、陪逛、手账。",
    },
    {
        "id": "05",
        "image": "frontend:plan",
        "narration": "规划标签：三小时、带娃、怕晒、想看网红萌物。点生成路线，自动编排省力停靠点。",
    },
    {
        "id": "06",
        "image": "frontend:explore",
        "narration": "陪逛标签：切换人设。青年、儿童、长辈，同一只动物三种讲法。收藏喜欢的到手账。",
    },
    {
        "id": "07",
        "image": "frontend:guide",
        "narration": "右下角浮动导游。问：可以喂它吗？Agent坚守立场——红山二零一四年起全园禁止投喂。这是铁律，不容大模型自由发挥。",
    },
    {
        "id": "08",
        "image": "frontend:journal",
        "narration": "手账标签：收藏的动物和路线回顾，一目了然。",
    },
    {
        "id": "09",
        "image": "static/ending.html",
        "narration": "评测门禁通过，离线确定性，三标签全流程，立场铁律。红山朋友，陪你按自己的方式逛红山。",
    },
]
