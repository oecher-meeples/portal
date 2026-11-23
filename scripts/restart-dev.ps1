#!/usr/bin/env pwsh
# Beendet den Prozess, der auf Port 3002 lauscht (dev-Server), und startet ihn neu.
param(
    [int]$Port = 3002
)

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
        Write-Host "Beende Prozess $_ auf Port $Port..."
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 500
} else {
    Write-Host "Kein Prozess auf Port $Port aktiv."
}

Write-Host "Starte dev-Server neu..."
pnpm dev
