# 一、说明
本项目基于 [du-i18n](https://github.com/ctq123/du-i18n) 二次开发完成。

# 二、国际多语言本地开发解决方案
### 1. 介绍
提供一键扫描中文、提取文案、文案回显、翻译漏检、切换语言以及分析统计等功能。i18n技术栈，兼容vue2，vue3，react，js/ts。

项目开源地址：https://github.com/softworm/mi18n

### 2. 功能
- 支持文案回显
- 支持一键扫描中文
- 支持中文提取到指定文件
- 支持翻译漏检功能
- 支持语言切换显示
- 支持分析统计
- 支持配置化，满足不同开发场景

### 3. 兼容性
- 技术栈：i18n，兼容vue2，vue3，react（含js和ts）

### 4. 使用
#### 1）配置
安装好之后，点击设置，自动生成配置文件 mi18n.config.json

![image](https://github.com/user-attachments/assets/8afc8eb3-ccd7-41ea-861c-3f7b556b28e5)

#### 3）一键扫描中文
![image](https://github.com/user-attachments/assets/32abcb10-d224-4fbf-a74f-dcd8c7fd1193)

![image](https://github.com/user-attachments/assets/41f7adbd-d743-48ac-94e0-de68ee2699d2)

![image](https://github.com/user-attachments/assets/8335e5b4-8a98-4539-91ab-9ef647829047)

在/src/i18n/temp/自动生成随机文件，路径和文件名都可以自主配置，生成随机文件名主要是解决代码冲突问题；当然也可生成一个固定的文件，自主配置即可


#### 2）文案回显
![image](https://github.com/user-attachments/assets/34d7e291-874f-4830-a16e-3b69517e7c56)

#### 5）翻译漏检
主要用于检查翻译遗漏情况，哪些没有翻译的文案会检测出来
![image](https://github.com/user-attachments/assets/12b4cef8-a108-4567-a5c7-97763a703e12)
![image](https://github.com/user-attachments/assets/f5f8d861-8eee-4933-955f-cac7fb63a895)


