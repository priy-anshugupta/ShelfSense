$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskLogDir = Join-Path $taskRoot 'logs'
New-Item -ItemType Directory -Force -Path $taskLogDir | Out-Null
$taskPython = Join-Path $taskRoot '.venv\Scripts\python.exe'
if (!(Test-Path -LiteralPath $taskPython)) { throw 'Install the Python environment first; see README.md.' }
if (!(Test-Path -LiteralPath (Join-Path $taskRoot 'frontend\node_modules'))) { throw 'Run npm.cmd ci in frontend first.' }
$taskPidFile = Join-Path $taskLogDir 'started-processes.json'
$taskPids = @()
if (Test-Path -LiteralPath $taskPidFile) {
    $taskRecorded = @(Get-Content -LiteralPath $taskPidFile -Raw | ConvertFrom-Json)
    foreach ($taskRecord in $taskRecorded) {
        $taskId = if ($taskRecord -is [long] -or $taskRecord -is [int]) { [int]$taskRecord } else { [int]$taskRecord.processId }
        $taskExisting = Get-CimInstance Win32_Process -Filter "ProcessId = $taskId" -ErrorAction SilentlyContinue
        if (!$taskExisting) { continue }
        $taskCreated = $taskExisting.CreationDate.ToUniversalTime().Ticks
        if ($taskRecord.createdTicks) {
            if ([long]$taskRecord.createdTicks -ne $taskCreated) { continue }
        } elseif ($taskRecord.createdAt) {
            if (([datetime]$taskRecord.createdAt).ToUniversalTime().Ticks -ne $taskCreated) { continue }
        } elseif ($taskExisting.CreationDate -lt (Get-Item -LiteralPath $taskPidFile).LastWriteTime.AddMinutes(-2)) { continue }
        $taskComponent = if ($taskRecord.component) { $taskRecord.component } elseif ($taskExisting.CommandLine -match 'uvicorn') { 'backend' } else { 'frontend' }
        $taskPids += @{ processId = $taskId; createdTicks = $taskCreated; component = $taskComponent }
    }
}
if (!(Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) -and !@($taskPids | Where-Object { $_.component -eq 'backend' }).Count) {
    $taskBackend = Start-Process -FilePath $taskPython -ArgumentList @('-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000') -WorkingDirectory (Join-Path $taskRoot 'backend') -RedirectStandardOutput (Join-Path $taskLogDir 'backend.log') -RedirectStandardError (Join-Path $taskLogDir 'backend-error.log') -WindowStyle Hidden -PassThru
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($taskBackend.Id)"
    $taskPids += @{ processId = $taskBackend.Id; createdTicks = $taskProcess.CreationDate.ToUniversalTime().Ticks; component = 'backend' }
}
if (!(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) -and !@($taskPids | Where-Object { $_.component -eq 'frontend' }).Count) {
    $taskFrontendMode = if (Test-Path -LiteralPath (Join-Path $taskRoot 'frontend\.next\BUILD_ID')) { 'npm.cmd run start' } else { 'npm.cmd run dev' }
    $taskFrontend = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c',$taskFrontendMode) -WorkingDirectory (Join-Path $taskRoot 'frontend') -RedirectStandardOutput (Join-Path $taskLogDir 'frontend.log') -RedirectStandardError (Join-Path $taskLogDir 'frontend-error.log') -WindowStyle Hidden -PassThru
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($taskFrontend.Id)"
    $taskPids += @{ processId = $taskFrontend.Id; createdTicks = $taskProcess.CreationDate.ToUniversalTime().Ticks; component = 'frontend' }
}
ConvertTo-Json -InputObject @($taskPids) | Set-Content -LiteralPath $taskPidFile
Write-Output 'ShelfSense: http://127.0.0.1:3000'
Write-Output 'Allow time for the backend embedding model to initialize. Logs are in logs/.'
