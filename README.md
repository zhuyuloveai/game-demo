# Game Demo · 小游戏合集

独立小游戏与玩法原型，包含浏览器游戏和 Godot 航海贸易项目。各目录独立运行，源码、素材、测试和设计说明一起维护。

| 项目 | 内容 | 入口与说明 |
| --- | --- | --- |
| 小厨合合 | 粉色竖屏厨房合成经营，世界料理、食谱、装修与音乐 | [kitchen-merge](kitchen-merge/) · [在线试玩](http://1.92.214.23/) |
| 下班突围 | 职场主题动作生存，六臂武器、升级、商店与 Boss | [overtime-arena](overtime-arena/) |
| With You | 都市生活、经营与角色相处的 30 天原型 | [with-you](with-you/) |
| 青屿航记 | Godot 航行、港口贸易与船只成长 | [sailing-trade](extraction-demo/prototypes/sailing-trade/) |
| 农场 | 种植、生长、收获与金币经营 | [farm](farm/) |
| 赤色战线 | 横版射击小游戏 | [contra](contra/) |
| 飞机大战 | 纵向射击、僚机与音效 | [plane-war](plane-war/) |

## 浏览器游戏

在仓库根目录运行静态服务：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

打开对应地址：

- 小厨合合：http://127.0.0.1:8000/kitchen-merge/dist/
- With You：http://127.0.0.1:8000/with-you/
- 农场：http://127.0.0.1:8000/farm/
- 赤色战线：http://127.0.0.1:8000/contra/
- 飞机大战：http://127.0.0.1:8000/plane-war/

这些项目直接使用 HTML、CSS 与 JavaScript，无需构建。浏览器存档按站点隔离，本地地址与线上地址的进度独立。

下班突围使用 TypeScript、Vite 和 Phaser，在该目录执行：

```sh
cd overtime-arena
npm ci
npm run dev
```

运行测试和构建需要支持 `--experimental-strip-types` 的 Node.js 版本（Node.js 22.12 或更新版本）。

## Godot 游戏

用 Godot 4 导入 `extraction-demo/prototypes/sailing-trade/project.godot` 后运行，或使用该目录中的 `launch.command`。详细操作与测试见项目 README。Godot 运行时和导入缓存由本机提供。

## 验证

```sh
node --test kitchen-merge/tests/engine.test.mjs
npm --prefix overtime-arena test
npm --prefix overtime-arena run build
npm --prefix with-you test
```

`kitchen-merge/dist/` 存放手写源码并纳入版本管理；其他构建产物、依赖、编辑器缓存和本机工具配置由 `.gitignore` 排除。厨房界面截图位于 `kitchen-merge-preview/`。
