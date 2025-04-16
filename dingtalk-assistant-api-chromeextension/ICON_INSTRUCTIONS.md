# 图标生成说明

项目需要以下尺寸的图标文件：
- 16x16像素 (icon16.png)
- 48x48像素 (icon48.png)
- 128x128像素 (icon128.png)

## 从SVG生成PNG的方法

### 方法1：使用在线转换工具
1. 访问像 https://svgtopng.com/ 这样的在线SVG转PNG转换工具
2. 上传 `icon_template.svg` 文件
3. 分别设置输出尺寸为16x16、48x48和128x128像素
4. 下载转换后的PNG文件
5. 将文件重命名为icon16.png、icon48.png和icon128.png
6. 放置在images目录下

### 方法2：使用图像编辑软件
1. 使用像Adobe Illustrator、Inkscape或Photoshop等软件打开SVG文件
2. 导出/保存为不同尺寸的PNG文件
3. 确保文件命名为icon16.png、icon48.png和icon128.png
4. 放置在images目录下

### 方法3：使用命令行工具
如果已安装ImageMagick，可以使用以下命令：

```bash
# 对于16x16
convert -background none -resize 16x16 icon_template.svg images/icon16.png

# 对于48x48
convert -background none -resize 48x48 icon_template.svg images/icon48.png

# 对于128x128
convert -background none -resize 128x128 icon_template.svg images/icon128.png
```

或者使用 rsvg-convert (librsvg):

```bash
# 对于16x16
rsvg-convert -w 16 -h 16 icon_template.svg > images/icon16.png

# 对于48x48
rsvg-convert -w 48 -h 48 icon_template.svg > images/icon48.png

# 对于128x128
rsvg-convert -w 128 -h 128 icon_template.svg > images/icon128.png
```

完成图标转换后，Chrome扩展将显示正确的图标。 