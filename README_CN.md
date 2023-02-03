# Install (Docker)

**[English](./README.md)** | 中文文檔

## 安裝程序

- 必需安裝：`Docker` 和 `Docker Compose v2.0+`
- 支持環境：`Centos/Debian/Ubuntu/macOS`
- 硬體建議：2核4G以上

### 部署項目

```bash
# 1. clone項目到您的本地端或伺服器端

# 通過github clone項目
git clone --depth=1 https://github.com/kuaifan/dootask.git

# 2. 進入目錄
cd dootask

# 3. 一鑑安裝項目（自定義端口安裝 ./cmd install --port 2222）
./cmd install
```

### 重置密碼

```bash
# 重置默認管理員密碼
./cmd repassword
```

### 更換端口

```bash
./cmd port 2222
```

### 停止服務

```bash
./cmd stop

# 一旦應用程序被設置，無論何時你想要啟動服務器(如果它被停止)運行以下命令
./cmd start
```

### 開發編譯

```bash
# 開發模式，僅限 macOS
./cmd dev
   
# 編譯項目，僅限 macOS
./cmd prod  
```

### 運行命令的快捷方式

```bash
# 你可以使用以下命令來執行
./cmd artisan "your command"          # 運行 artisan 命令
./cmd php "your command"              # 運行 php 命令
./cmd nginx "your command"            # 運行 nginx 命令
./cmd redis "your command"            # 運行 redis 命令
./cmd composer "your command"         # 運行 composer 命令
./cmd supervisorctl "your command"    # 運行 supervisorctl 命令
./cmd test "your command"             # 運行 phpunit 命令
./cmd mysql "your command"            # 運行 mysql 命令 (backup: 備份數據庫，recovery: 還原數據庫)
```

### NGINX 代理 SSL

```bash 
# 1. Nginx 代理配置添加
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

# 2. 在項目下運行命令
./cmd https
```

## 升級更新

**注意：在升級之前請備份好你的數據！**

```bash
# 方法1：在項目下運行命令
./cmd update

# （或者）方法2：如果方法1失敗請使用此方法
git pull
./cmd mysql backup
./cmd uninstall
./cmd install
./cmd mysql recovery
```

如果升級後出現502請運行 `./cmd restart` 重啟服務即可。

## 遷移項目

在新項目安裝好之後按照以下步驟完成項目遷移：

1. 備份原數據庫

```bash
# 在舊的項目下運行命令
./cmd mysql backup
```

2. 將`數據庫備份文件`及`public/uploads`目錄拷貝至新項目

3. 還原數據庫至新項目
```bash
# 在新的項目下運行命令
./cmd mysql recovery
```

## 卸載項目

```bash
# 在項目下運行命令
./cmd uninstall
```
