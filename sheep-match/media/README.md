# 四季原创游戏配乐

为羊羊牧场重新编写旋律、和声、节奏和配器，替换此前的《普通 DISCO》。四首均为无歌词的器乐曲，没有使用下载的歌曲、第三方录音、采样包或 SoundFont。旋律、编曲和合成音色的可复现源代码位于 `../tools/compose-seasons.py`。

| 季节 | 曲目 | 编曲 | 速度 / 拍号 | 循环长度 |
| --- | --- | --- | --- | --- |
| 春 | 春日蹦蹦芽 | 木琴主旋律、轻笛应答、拨弦伴奏 | 112 BPM / 4拍 | 68.571秒 |
| 夏 | 夏日汽水湾 | 明亮钢鼓音色、吉他拨弦、手鼓切分 | 124 BPM / 4拍 | 61.935秒 |
| 秋 | 秋日栗子舞 | 温暖钢琴、轻刷节奏、三拍小圆舞曲 | 108 BPM / 3拍 | 53.333秒 |
| 冬 | 冬日雪花铃 | 音乐盒、铃音、柔和背景和声 | 110 BPM / 4拍 | 69.818秒 |

每首32小节，使用A/B主题与再现，包含立体声定位、轻微力度变化和短混响。音符释放与混响尾音循环回卷，避免人为加长尾音破坏节拍；AAC文件保留编码器延迟与有效帧数信息。四首PCM平均电平统一为约 -18.42 dBFS，峰值低于 -5.9 dBFS，没有削波。测量数据在 `composition-report.json`。

## 重新生成

需要 Python 3 和 NumPy。当前四首文件由该脚本渲染为44.1kHz、16位、双声道WAV后，通过macOS系统 `afconvert` 编码为AAC-LC / M4A，目标128kbps。

```sh
python3 tools/compose-seasons.py --output /tmp/sheep-seasonal-audio
for season in spring summer autumn winter; do
  afconvert -f m4af -d aac -b 128000 -q 127 "/tmp/sheep-seasonal-audio/$season-pasture.wav" "media/$season-pasture.m4a"
done
```

游戏按关卡的春夏秋冬自动选择曲目，重玩和恢复存档也使用相应季节。音乐开关、音量、后台暂停继续沿用；操作与消除音效独立控制。只在用户操作后播放，同季节的选牌和界面重绘不重启音乐。试听页面在 `../previews/seasonal-music/`，不会随正式游戏发布。

发布白名单仅包含四首 `*-pasture.m4a`。旧歌曲、生成脚本、测试、说明及测量文件不会发布到站点。
