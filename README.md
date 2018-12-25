# portable-electron-update

**Use `yarn install --ignore-scripts` to init the project!**

gulp tasks:
* default - compile once
* watch - watch change and compile
* release:<win32, linux, darwin> - create released electron app
* release - create released app for all platform
* build - create release, and then compress them

#### # TODO
1. 启动时检查更新
1. 作为小型下载器，下载目标、解压、运行
1. 单实例运行
1. 支持多个版本、处理错误并自动回退
1. 可选数个单一版本的慢速更新项目
1. 提供本地数据文件夹
