@echo off
chcp 65001 >nul
title 美团外卖视频店招制作 - 开发服务器

echo ========================================
echo   美团外卖视频店招制作 - 启动服务器
echo ========================================
echo.

cd /d "%~dp0"

:: 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [INFO] 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [ERROR] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] 启动开发服务器...
echo [INFO] 访问地址: http://localhost:3000
echo [INFO] 按 Ctrl+C 停止服务器
echo.

call npm run dev

pause
