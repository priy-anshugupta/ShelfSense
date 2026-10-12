$taskPidFile = Join-Path $PSScriptRoot 'logs\started-processes.json'
if (!(Test-Path -LiteralPath $taskPidFile)) { Write-Output 'No script-managed processes recorded.'; exit }
$taskProcesses = @(Get-Content -LiteralPath $taskPidFile -Raw | ConvertFrom-Json)
function Stop-TaskTree([int]$taskProcessId) {
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $taskProcessId" -ErrorAction SilentlyContinue
    if (!$taskProcess) { return }
    $taskChildren = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $taskProcessId" -ErrorAction SilentlyContinue)
    foreach ($taskChild in $taskChildren) { Stop-TaskTree $taskChild.ProcessId }
    Stop-Process -Id $taskProcessId -ErrorAction SilentlyContinue
}
foreach ($taskRecord in $taskProcesses) {
    $taskProcessId = if ($taskRecord -is [long] -or $taskRecord -is [int]) { [int]$taskRecord } else { [int]$taskRecord.processId }
    if (!$taskProcessId) { continue }
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $taskProcessId" -ErrorAction SilentlyContinue
    if (!$taskProcess) { continue }
    if ($taskRecord.createdTicks) {
        if ([long]$taskRecord.createdTicks -ne $taskProcess.CreationDate.ToUniversalTime().Ticks) { continue }
    } elseif ($taskRecord.createdAt) {
        if (([datetime]$taskRecord.createdAt).ToUniversalTime().Ticks -ne $taskProcess.CreationDate.ToUniversalTime().Ticks) { continue }
    } elseif ($taskProcess.CreationDate -lt (Get-Item -LiteralPath $taskPidFile).LastWriteTime.AddMinutes(-2)) { continue }
    Stop-TaskTree $taskProcessId
}
Set-Content -LiteralPath $taskPidFile -Value '[]'
Write-Output 'Stopped script-managed ShelfSense processes.'
