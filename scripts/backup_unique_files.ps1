param(
  [Parameter(Mandatory = $true)]
  [string[]]$SourceRoots,

  [Parameter(Mandatory = $true)]
  [string]$DestinationRoot,

  [string[]]$ExcludeDirectories = @(
    '$Recycle.Bin',
    'System Volume Information',
    'Windows',
    'Program Files',
    'Program Files (x86)',
    'ProgramData',
    'AppData',
    '.git',
    'node_modules',
    'dist',
    'build',
    '.next',
    '.cache'
  ),

  [string[]]$IncludeExtensions = @(
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf',
    '.txt', '.md', '.csv', '.json', '.sql',
    '.ps1', '.bat', '.py', '.js', '.ts', '.tsx',
    '.zip', '.7z', '.rar',
    '.jpg', '.jpeg', '.png', '.webp', '.mp4',
    '.db', '.sqlite'
  ),

  [long]$MinBytes = 1
)

$ErrorActionPreference = 'Stop'

function Normalize-PathSafe([string]$PathValue) {
  try {
    return [System.IO.Path]::GetFullPath($PathValue)
  } catch {
    return $PathValue
  }
}

function Should-SkipDirectory([string]$FullName, [string[]]$Tokens) {
  foreach ($token in $Tokens) {
    if ($FullName -like "*\${token}\*") {
      return $true
    }
  }
  return $false
}

function Get-SafeRelativePath([string]$BasePath, [string]$FullPath) {
  $base = Normalize-PathSafe $BasePath
  $full = Normalize-PathSafe $FullPath
  if ($full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel = $full.Substring($base.Length).TrimStart('\')
    if ([string]::IsNullOrWhiteSpace($rel)) {
      return [System.IO.Path]::GetFileName($full)
    }
    return $rel
  }
  return [System.IO.Path]::GetFileName($full)
}

$startedAt = Get-Date
New-Item -ItemType Directory -Path $DestinationRoot -Force | Out-Null
$uniqueRoot = Join-Path $DestinationRoot 'unique_files'
New-Item -ItemType Directory -Path $uniqueRoot -Force | Out-Null

$manifest = New-Object System.Collections.Generic.List[object]
$duplicates = New-Object System.Collections.Generic.List[object]
$seenByHash = @{}
$totalScanned = 0

foreach ($root in $SourceRoots) {
  $normalizedRoot = Normalize-PathSafe $root
  if (-not (Test-Path $normalizedRoot)) {
    Write-Warning "Fonte inexistente: $normalizedRoot"
    continue
  }

  Write-Host "Escaneando: $normalizedRoot"
  $files = Get-ChildItem -Path $normalizedRoot -File -Recurse -Force -ErrorAction SilentlyContinue
  foreach ($file in $files) {
    $totalScanned++
    if ($file.Length -lt $MinBytes) {
      continue
    }
    if (Should-SkipDirectory -FullName $file.FullName -Tokens $ExcludeDirectories) {
      continue
    }

    $ext = [System.IO.Path]::GetExtension($file.Name).ToLowerInvariant()
    if ($IncludeExtensions.Count -gt 0 -and -not ($IncludeExtensions -contains $ext)) {
      continue
    }

    try {
      $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
    } catch {
      Write-Warning "Falha hash: $($file.FullName)"
      continue
    }

    if ($seenByHash.ContainsKey($hash)) {
      $duplicates.Add([pscustomobject]@{
        Hash = $hash
        DuplicatePath = $file.FullName
        OriginalPath = $seenByHash[$hash].OriginalPath
      }) | Out-Null
      continue
    }

    $rootName = Split-Path $normalizedRoot -Leaf
    if ([string]::IsNullOrWhiteSpace($rootName)) {
      $rootName = $normalizedRoot.Replace(':', '')
    }
    $safeRootName = $rootName -replace '[^\w\-.]', '_'
    $rel = Get-SafeRelativePath -BasePath $normalizedRoot -FullPath $file.FullName
    $destPath = Join-Path (Join-Path $uniqueRoot $safeRootName) $rel
    $destDir = Split-Path $destPath -Parent
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Copy-Item -Path $file.FullName -Destination $destPath -Force

    $entry = [pscustomobject]@{
      Hash = $hash
      OriginalPath = $file.FullName
      BackupPath = $destPath
      SizeBytes = $file.Length
      LastWriteTime = $file.LastWriteTimeUtc
    }
    $seenByHash[$hash] = $entry
    $manifest.Add($entry) | Out-Null
  }
}

$manifestPath = Join-Path $DestinationRoot 'manifest_unique.csv'
$dupsPath = Join-Path $DestinationRoot 'manifest_duplicates.csv'
$summaryPath = Join-Path $DestinationRoot 'summary.txt'

$manifest | Sort-Object OriginalPath | Export-Csv -Path $manifestPath -NoTypeInformation -Encoding UTF8
$duplicates | Sort-Object DuplicatePath | Export-Csv -Path $dupsPath -NoTypeInformation -Encoding UTF8

$summary = @(
  "Backup started: $($startedAt.ToString('s'))"
  "Backup finished: $((Get-Date).ToString('s'))"
  "Total scanned files: $totalScanned"
  "Unique copied files: $($manifest.Count)"
  "Detected duplicates: $($duplicates.Count)"
  "Destination: $DestinationRoot"
  "Manifest unique: $manifestPath"
  "Manifest duplicates: $dupsPath"
) -join [Environment]::NewLine

Set-Content -Path $summaryPath -Value $summary -Encoding UTF8
Write-Host ''
Write-Host $summary
