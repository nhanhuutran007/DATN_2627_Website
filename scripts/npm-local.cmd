@echo off
setlocal
set "LOCAL_NODE_DIR=%~dp0..\.tools\node-v22.22.3-win-x64"

if not exist "%LOCAL_NODE_DIR%\npm.cmd" (
  echo Node.js portable 22.22.3 is missing from .tools. 1>&2
  exit /b 1
)

set "PATH=%LOCAL_NODE_DIR%;%PATH%"
set "npm_config_cache=%~dp0..\.tools\npm-cache"
call "%LOCAL_NODE_DIR%\npm.cmd" %*
exit /b %ERRORLEVEL%
